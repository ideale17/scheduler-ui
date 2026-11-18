<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createAnalysisModel, getAnalysisTargetColumns } from '@/api/analysisModelApi'
import {
  getTransformRuleList,
  getTransformRuleVersionList,
  getTransformRuleVersionDetail,
} from '@/api/transformRuleApi'
import { useToastStore } from '@/stores/toastStore'

const router = useRouter()

const toastStore = useToastStore()

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500'

// 1. 모델 기본 정보
const model = ref({
  modelName: '',
  description: '',
  targetSchema: 'public',
  targetTable: '',
  enabled: 'Y',
})

// 2. Transform 규칙 및 출력 필드
const rules = ref([])
const versions = ref([])
const sourceFields = ref([])

const selectedRuleId = ref('')
const selectedVersionId = ref('')

// 3. 대상 업무 테이블 컬럼 및 매핑
const targetColumns = ref([])
const mappings = ref([])

// 4. 화면 상태
const isLoadingRules = ref(false)
const isLoadingVersions = ref(false)
const isLoadingSources = ref(false)
const isLoadingColumns = ref(false)
const isSaving = ref(false)

const errorMessage = ref('')
const tableLoaded = ref(false)
const savedModelId = ref(null)

// 비동기 응답이 뒤늦게 도착해 현재 선택을 덮어쓰지 않도록 관리한다.
let tableRequestId = 0
let versionRequestId = 0
let sourceRequestId = 0

/**
 * 매핑에 사용할 수 있는 변환 방식을 정의한다.
 *
 * 현재 화면은 원본 필드 하나만 사용하는 1:1 매핑을 지원한다.
 */
const convertTypeOptions = [
  { value: 'DIRECT', label: '직접 매핑' },
  { value: 'NUMBER_NORMALIZE', label: '숫자 정리' },
  { value: 'DATE_PARSE', label: '날짜 변환' },
]

/**
 * 실제 DB 컬럼 정보를 바탕으로 매핑 행을 생성한다.
 *
 * 특정 업무 테이블명이나 컬럼명에 따른 분기 처리는 하지 않는다.
 */
const createMapping = (column) => {
  const systemManaged = Boolean(column.systemManaged)
  const required = Boolean(column.required) && !systemManaged

  return {
    targetColumn: column.columnName,
    columnType: column.dataType,
    description: column.description || '',
    nullable: column.nullable,
    required,
    systemManaged,

    selected: required,
    sourceField: '',
    convertType: 'DIRECT',
    convertFormat: '',
    requiredYn: required ? 'Y' : 'N',
  }
}

/**
 * 조회된 DB 컬럼을 매핑 목록으로 구성한다.
 */
const initializeMappings = (columns) => {
  mappings.value = columns.map(createMapping)
}

/**
 * 현재 선택된 매핑 목록
 */
const selectedMappings = computed(() =>
  mappings.value.filter((field) => field.selected && !field.systemManaged),
)

/**
 * 매핑 선택 건수
 */
const mappedCount = computed(() => selectedMappings.value.length)

/**
 * 필수 매핑 컬럼 건수
 */
const requiredCount = computed(() => mappings.value.filter((field) => field.required).length)

/**
 * 입력값의 앞뒤 공백을 제거한다.
 */
const normalize = (value) => String(value ?? '').trim()

/**
 * 화면 오류 메시지를 초기화한다.
 */
const clearError = () => {
  errorMessage.value = ''
}

/**
 * 모델 정보 변경 시 등록 완료 상태를 초기화한다.
 */
const resetSavedState = () => {
  savedModelId.value = null
}

/**
 * 대상 테이블 입력이 변경되면 기존 컬럼 조회 결과를 무효화한다.
 */
const invalidateTargetTable = () => {
  tableRequestId++
  tableLoaded.value = false
  targetColumns.value = []
  mappings.value = []
  savedModelId.value = null
}

/**
 * 스키마 또는 테이블이 변경되면 다시 조회해야 한다.
 */
watch(() => [model.value.targetSchema, model.value.targetTable], invalidateTargetTable)

/**
 * 가공 규칙 또는 출력 필드가 변경되면 기존 매핑을 초기화한다.
 *
 * 이전 규칙의 출력 필드가 새로운 규칙에서도 유효하다고
 * 가정하지 않는다.
 */
const resetSourceMappings = () => {
  mappings.value.forEach((field) => {
    field.sourceField = ''
  })

  resetSavedState()
}

/**
 * 실제 업무 테이블 컬럼 메타데이터를 조회한다.
 */
const fetchTargetColumns = async () => {
  const targetSchema = normalize(model.value.targetSchema).toLowerCase()
  const targetTable = normalize(model.value.targetTable).toLowerCase()

  if (!targetSchema || !targetTable) {
    errorMessage.value = '스키마와 대상 테이블을 입력해주세요.'
    return
  }

  const requestId = ++tableRequestId

  isLoadingColumns.value = true
  tableLoaded.value = false
  targetColumns.value = []
  mappings.value = []
  savedModelId.value = null
  clearError()

  try {
    // 서버가 허용하는 대상 테이블만 메타데이터 조회가 가능하다.
    const response = await getAnalysisTargetColumns(targetSchema, targetTable)

    if (requestId !== tableRequestId) {
      return
    }

    const columns = Array.isArray(response.data) ? response.data : []

    if (columns.length === 0) {
      throw new Error('조회된 업무 테이블 컬럼이 없습니다.')
    }

    targetColumns.value = columns
    initializeMappings(columns)
    tableLoaded.value = true
  } catch (error) {
    if (requestId !== tableRequestId) {
      return
    }

    console.error('업무 테이블 컬럼 조회 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : error.message || '업무 테이블 컬럼을 조회하지 못했습니다.'
  } finally {
    if (requestId === tableRequestId) {
      isLoadingColumns.value = false
    }
  }
}

/**
 * 사용 가능한 가공 규칙 목록을 조회한다.
 */
const fetchTransformRules = async () => {
  isLoadingRules.value = true
  clearError()

  try {
    const response = await getTransformRuleList({ enabled: 'Y' })

    rules.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('가공 규칙 목록 조회 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 규칙 목록을 불러오지 못했습니다.'
  } finally {
    isLoadingRules.value = false
  }
}

/**
 * 가공 규칙 선택 시 해당 규칙의 버전 목록을 조회한다.
 */
watch(selectedRuleId, async (ruleId) => {
  const requestId = ++versionRequestId

  // 진행 중인 이전 버전 필드 조회도 무효화한다.
  ++sourceRequestId

  selectedVersionId.value = ''
  versions.value = []
  sourceFields.value = []

  isLoadingVersions.value = false
  isLoadingSources.value = false

  resetSourceMappings()
  clearError()

  if (!ruleId) {
    return
  }

  isLoadingVersions.value = true

  try {
    const response = await getTransformRuleVersionList(Number(ruleId))

    if (requestId !== versionRequestId) {
      return
    }

    versions.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== versionRequestId) {
      return
    }

    console.error('가공 규칙 버전 조회 실패:', error)

    errorMessage.value = '가공 규칙 버전 목록을 조회하지 못했습니다.'
  } finally {
    if (requestId === versionRequestId) {
      isLoadingVersions.value = false
    }
  }
})

/**
 * 선택한 가공 규칙 버전의 출력 필드 목록을 조회한다.
 */
watch(selectedVersionId, async (versionId) => {
  const requestId = ++sourceRequestId

  sourceFields.value = []
  isLoadingSources.value = false

  resetSourceMappings()
  clearError()

  if (!versionId || !selectedRuleId.value) {
    return
  }

  const ruleId = Number(selectedRuleId.value)

  isLoadingSources.value = true

  try {
    const response = await getTransformRuleVersionDetail(ruleId, Number(versionId))

    if (requestId !== sourceRequestId) {
      return
    }

    const fields = Array.isArray(response.data?.fields) ? response.data.fields : []

    sourceFields.value = [
      ...new Set(
        fields
          .map((field) => field.targetName)
          .filter((name) => typeof name === 'string' && name.trim()),
      ),
    ]
  } catch (error) {
    if (requestId !== sourceRequestId) {
      return
    }

    console.error('가공 규칙 출력 필드 조회 실패:', error)

    errorMessage.value = '가공 규칙의 출력 필드를 조회하지 못했습니다.'
  } finally {
    if (requestId === sourceRequestId) {
      isLoadingSources.value = false
    }
  }
})

/**
 * 매핑 사용 여부 변경
 */
const changeSelected = (field) => {
  // 시스템 관리 컬럼은 직접 매핑하지 않는다.
  if (field.systemManaged) {
    field.selected = false
    return
  }

  // DB 필수 컬럼은 반드시 매핑해야 한다.
  if (field.required) {
    field.selected = true
    field.requiredYn = 'Y'
    return
  }

  // 매핑을 해제하면 해당 설정을 초기화한다.
  if (!field.selected) {
    field.sourceField = ''
    field.convertType = 'DIRECT'
    field.convertFormat = ''
    field.requiredYn = 'N'
  }

  resetSavedState()
}

/**
 * 변환 방식 변경
 */
const changeConvertType = (field) => {
  // 원본 필드는 변환 방식과 관계없이 항상 1개이다.
  field.convertFormat = ''

  resetSavedState()
}

/**
 * 등록 화면의 입력값을 검증한다.
 */
const validateForm = () => {
  clearError()

  // 1. 모델 기본 정보를 검증한다.
  const modelName = normalize(model.value.modelName)

  if (!modelName) {
    errorMessage.value = '데이터 적재 모델명을 입력해주세요.'
    return false
  }

  if (modelName.length > 100) {
    errorMessage.value = '모델명은 100자 이하여야 합니다.'
    return false
  }

  if (normalize(model.value.description).length > 500) {
    errorMessage.value = '설명은 500자 이하여야 합니다.'
    return false
  }

  // 2. 업무 테이블 조회 여부를 확인한다.
  if (!tableLoaded.value || targetColumns.value.length === 0) {
    errorMessage.value = '업무 테이블 컬럼을 먼저 조회해주세요.'
    return false
  }

  // 3. 가공 규칙 버전 및 출력 필드를 검증한다.
  if (!selectedVersionId.value || sourceFields.value.length === 0) {
    errorMessage.value = '가공 규칙과 버전을 선택해주세요.'
    return false
  }

  // 4. 매핑할 필드가 존재하는지 확인한다.
  const fields = selectedMappings.value

  if (fields.length === 0) {
    errorMessage.value = '매핑할 업무 컬럼을 하나 이상 선택해주세요.'
    return false
  }

  const availableSources = new Set(sourceFields.value)

  // 5. DB 필수 컬럼이 모두 포함되어 있는지 확인한다.
  for (const field of mappings.value) {
    if (field.required && !field.selected) {
      errorMessage.value = `필수 업무 컬럼을 매핑해야 합니다: ${field.targetColumn}`
      return false
    }
  }

  // 6. 각 업무 컬럼의 1:1 매핑을 검증한다.
  for (const field of fields) {
    const sourceField = normalize(field.sourceField)

    if (!sourceField || !availableSources.has(sourceField)) {
      errorMessage.value = `${field.targetColumn}의 가공 결과 필드를 선택해주세요.`
      return false
    }

    if (!convertTypeOptions.some((type) => type.value === field.convertType)) {
      errorMessage.value = `${field.targetColumn}의 변환 방식이 올바르지 않습니다.`
      return false
    }

    // DATE_PARSE는 날짜 입력 형식을 필수로 설정한다.
    if (field.convertType === 'DATE_PARSE') {
      const convertFormat = normalize(field.convertFormat)

      if (!convertFormat) {
        errorMessage.value = `${field.targetColumn}의 날짜 입력 형식을 입력해주세요.`
        return false
      }

      if (convertFormat.length > 100) {
        errorMessage.value = '날짜 입력 형식은 100자 이하여야 합니다.'
        return false
      }
    }

    if (field.required && field.requiredYn !== 'Y') {
      errorMessage.value = `필수 업무 컬럼은 필수 매핑이어야 합니다: ${field.targetColumn}`
      return false
    }
  }

  return true
}

/**
 * API 등록 요청 데이터를 생성한다.
 *
 * DB 컬럼명과 원본 필드명을 그대로 사용하며
 * 업무별 컬럼명 변환이나 특수 분기는 수행하지 않는다.
 */
const createRequestData = () => ({
  model: {
    modelName: normalize(model.value.modelName),
    description: normalize(model.value.description) || null,
    targetSchema: normalize(model.value.targetSchema).toLowerCase(),
    targetTable: normalize(model.value.targetTable).toLowerCase(),
    enabled: model.value.enabled,
  },

  version: {
    transformRuleVersionId: Number(selectedVersionId.value),
  },

  fields: selectedMappings.value.map((field, index) => ({
    targetColumn: field.targetColumn,

    // 백엔드는 List<String> 구조이므로
    // 1:1 매핑도 원소 하나를 가진 배열로 전달한다.
    sourceFields: [normalize(field.sourceField)],

    convertType: field.convertType,

    convertFormat: field.convertType === 'DATE_PARSE' ? normalize(field.convertFormat) : null,

    requiredYn: field.required ? 'Y' : field.requiredYn,
    sortOrder: index,
  })),
})

/**
 * 데이터 적재 모델 등록
 */
const saveModel = async () => {
  // 1. 중복 등록 요청을 방지한다.
  if (isSaving.value || savedModelId.value !== null) {
    return
  }

  // 2. 입력값을 검증한다.
  if (!validateForm()) {
    return
  }

  // 3. 등록 여부를 확인한다.
  if (!confirm('데이터 적재 모델을 등록하시겠습니까?')) {
    return
  }

  isSaving.value = true

  try {
    // 4. 등록 요청 데이터를 구성한다.
    const requestData = createRequestData()

    // 5. 백엔드에 등록 요청한다.
    const response = await createAnalysisModel(requestData)

    // 6. 성공 결과를 표시한다.
    savedModelId.value = response.data

    toastStore.success(
      '데이터 적재 모델 등록 완료',
      '데이터 적재 모델이 정상적으로 등록되었습니다.',
    )

    // 7. 등록된 모델의 상세 화면으로 이동한다.
    await router.push(`/analysis-model/${response.data}`)
  } catch (error) {
    console.error('데이터 적재 모델 등록 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '데이터 적재 모델 등록에 실패했습니다.'

    toastStore.error('데이터 적재 모델 등록 실패', errorMessage.value)
  } finally {
    isSaving.value = false
  }
}

// 화면 최초 진입 시 가공 규칙 목록을 조회한다.
onMounted(fetchTransformRules)
</script>

<template>
  <div class="space-y-5">
    <!-- 1. 모델 기본 정보 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>
        <p class="mt-1 text-sm text-gray-500">데이터 적재 모델의 이름과 사용 여부를 설정합니다.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            모델명
            <span class="text-red-500">*</span>
          </label>

          <input
            v-model="model.modelName"
            :class="inputClass"
            maxlength="100"
            placeholder="데이터 적재 모델명을 입력해주세요."
            @input="resetSavedState"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 사용 여부 </label>

          <select v-model="model.enabled" :class="inputClass" @change="resetSavedState">
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-gray-700"> 설명 </label>

          <textarea
            v-model="model.description"
            :class="inputClass"
            rows="2"
            maxlength="500"
            placeholder="모델의 용도를 입력해주세요."
            @input="resetSavedState"
          />
        </div>
      </div>
    </section>

    <!-- 2. 적재 대상 테이블 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">적재 대상 테이블</h3>

        <p class="mt-1 text-sm text-gray-500">
          스키마와 테이블명을 입력하고 실제 DB 컬럼을 조회합니다.
        </p>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-40 flex-1">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            스키마
            <span class="text-red-500">*</span>
          </label>

          <input v-model="model.targetSchema" :class="inputClass" placeholder="public" />
        </div>

        <div class="min-w-64 flex-[2]">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            테이블명
            <span class="text-red-500">*</span>
          </label>

          <input
            v-model="model.targetTable"
            :class="inputClass"
            placeholder="조회할 테이블명을 입력해주세요."
            @keyup.enter="fetchTargetColumns"
          />
        </div>

        <button
          type="button"
          class="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          :disabled="isLoadingColumns || isSaving"
          @click="fetchTargetColumns"
        >
          {{ isLoadingColumns ? '조회 중...' : '컬럼 조회' }}
        </button>
      </div>

      <p class="mt-3 text-xs text-gray-500">
        실제 조회 가능한 테이블은 백엔드의 허용 대상 정책을 따릅니다.
      </p>
    </section>

    <!-- 3. 가공 규칙 연결 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">가공 규칙 연결</h3>

        <p class="mt-1 text-sm text-gray-500">매핑에 사용할 Transform 규칙과 버전을 선택합니다.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            가공 규칙
            <span class="text-red-500">*</span>
          </label>

          <select
            v-model="selectedRuleId"
            :class="inputClass"
            :disabled="isLoadingRules || isSaving"
          >
            <option value="">가공 규칙 선택</option>

            <option v-for="rule in rules" :key="rule.transformRuleId" :value="rule.transformRuleId">
              {{ rule.ruleName }}
            </option>
          </select>

          <p v-if="isLoadingRules" class="mt-1 text-xs text-gray-500">가공 규칙 목록 조회 중...</p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            가공 규칙 버전
            <span class="text-red-500">*</span>
          </label>

          <select
            v-model="selectedVersionId"
            :class="inputClass"
            :disabled="!selectedRuleId || isLoadingVersions || isSaving"
          >
            <option value="">버전 선택</option>

            <option
              v-for="version in versions"
              :key="version.transformRuleVersionId"
              :value="version.transformRuleVersionId"
            >
              v{{ version.versionNo }} / {{ version.dataFormat }}
            </option>
          </select>

          <p v-if="isLoadingVersions" class="mt-1 text-xs text-gray-500">버전 목록 조회 중...</p>
        </div>
      </div>

      <p v-if="isLoadingSources" class="mt-3 text-xs text-gray-500">
        가공 결과 출력 필드를 조회하고 있습니다.
      </p>

      <p
        v-else-if="selectedVersionId && sourceFields.length === 0"
        class="mt-3 text-sm text-amber-700"
      >
        선택한 버전에서 매핑 가능한 출력 필드를 찾지 못했습니다.
      </p>
    </section>

    <!-- 4. 업무 컬럼 매핑 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-gray-900">업무 컬럼 매핑</h3>

          <p class="mt-1 text-sm text-gray-500">
            DB 컬럼마다 가공 결과 필드 하나를 선택합니다. 시스템 관리 컬럼은 자동으로 제외됩니다.
          </p>
        </div>

        <div v-if="tableLoaded" class="text-sm text-gray-500">
          전체 {{ targetColumns.length }}개 / 매핑 {{ mappedCount }}개 / 필수 {{ requiredCount }}개
        </div>
      </div>

      <div
        v-if="!tableLoaded"
        class="rounded-md border border-gray-200 bg-gray-50 p-5 text-sm text-gray-500"
      >
        대상 스키마와 테이블명을 입력하고 컬럼 조회를 실행해주세요.
      </div>

      <div v-else class="overflow-x-auto rounded-md border border-gray-200">
        <table class="w-full min-w-[1000px] table-fixed text-sm">
          <colgroup>
            <col class="w-14" />
            <col class="w-[25%]" />
            <col class="w-[15%]" />
            <col class="w-[25%]" />
            <col class="w-[20%]" />
            <col class="w-[15%]" />
          </colgroup>

          <thead class="bg-gray-50 text-left text-xs font-medium text-gray-600">
            <tr>
              <th class="px-3 py-3 text-center">선택</th>

              <th class="px-3 py-3">대상 DB 컬럼</th>

              <th class="px-3 py-3">데이터 타입</th>

              <th class="px-3 py-3">가공 결과 필드</th>

              <th class="px-3 py-3">변환 방식</th>

              <th class="px-3 py-3">필수 여부</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="field in mappings"
              :key="field.targetColumn"
              :class="[field.systemManaged ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50/60']"
            >
              <!-- 매핑 선택 -->
              <td class="px-3 py-2 text-center">
                <input
                  v-model="field.selected"
                  type="checkbox"
                  :disabled="field.required || field.systemManaged || isSaving"
                  @change="changeSelected(field)"
                />
              </td>

              <!-- 대상 컬럼 -->
              <td class="px-3 py-2">
                <div class="font-medium">
                  {{ field.targetColumn }}
                </div>

                <div v-if="field.description" class="mt-0.5 text-xs text-gray-500">
                  {{ field.description }}
                </div>

                <div v-if="field.systemManaged" class="mt-1 text-xs text-gray-400">시스템 관리</div>
              </td>

              <!-- DB 타입 -->
              <td class="px-3 py-2 text-xs text-gray-500">
                {{ field.columnType }}
              </td>

              <!-- 가공 결과 필드 : 1개 -->
              <td class="px-3 py-2">
                <select
                  v-model="field.sourceField"
                  :class="inputClass"
                  :disabled="!field.selected || !selectedVersionId || isLoadingSources || isSaving"
                  @change="resetSavedState"
                >
                  <option value="">가공 결과 필드 선택</option>

                  <option v-for="source in sourceFields" :key="source" :value="source">
                    {{ source }}
                  </option>
                </select>

                <!-- 날짜 입력 형식은 필요한 경우만 표시 -->
                <input
                  v-if="field.selected && field.convertType === 'DATE_PARSE'"
                  v-model="field.convertFormat"
                  :class="inputClass + ' mt-1.5'"
                  placeholder="날짜 형식 (예: yyyyMMdd)"
                  maxlength="100"
                  :disabled="isSaving"
                  @input="resetSavedState"
                />
              </td>

              <!-- 변환 방식 -->
              <td class="px-3 py-2">
                <select
                  v-model="field.convertType"
                  :class="inputClass"
                  :disabled="!field.selected || field.systemManaged || isSaving"
                  @change="changeConvertType(field)"
                >
                  <option v-for="type in convertTypeOptions" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </td>

              <!-- 필수 여부 -->
              <td class="px-3 py-2">
                <span v-if="field.systemManaged" class="text-xs text-gray-400"> 자동 처리 </span>

                <span v-else-if="field.required" class="text-xs font-medium text-red-500">
                  필수
                </span>

                <select
                  v-else
                  v-model="field.requiredYn"
                  :class="inputClass"
                  :disabled="!field.selected || isSaving"
                  @change="resetSavedState"
                >
                  <option value="N">선택</option>
                  <option value="Y">필수</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 오류 메시지 -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 등록 성공 결과 -->
    <div
      v-if="savedModelId !== null"
      class="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
    >
      데이터 적재 모델이 등록되었습니다. 모델 ID: {{ savedModelId }}
    </div>

    <!-- 하단 버튼 -->
    <div class="flex justify-end gap-2">
      <!-- 목록 화면 이동 -->
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        :disabled="isSaving"
        @click="router.push('/analysis-model')"
      >
        목록
      </button>

      <!-- 등록 -->
      <button
        type="button"
        class="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        :disabled="isSaving || savedModelId !== null"
        @click="saveModel"
      >
        {{ isSaving ? '등록 중...' : '등록' }}
      </button>
    </div>
  </div>
</template>
