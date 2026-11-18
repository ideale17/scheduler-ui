<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toastStore'
import {
  getAnalysisModelDetail,
  getAnalysisTargetColumns,
  updateAnalysisModel,
} from '@/api/analysisModelApi'
import {
  getTransformRuleList,
  getTransformRuleVersionList,
  getTransformRuleVersionDetail,
} from '@/api/transformRuleApi'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

const analysisModelId = computed(() => {
  const id = Number(route.params.analysisModelId)
  return Number.isSafeInteger(id) && id > 0 ? id : null
})

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500'

// 1. 모델 기본 정보
const model = ref({
  modelName: '',
  description: '',
  targetSchema: '',
  targetTable: '',
  enabled: 'Y',
})

const currentVersion = ref(null)

// 2. 가공 규칙 및 출력 필드
const rules = ref([])
const versions = ref([])
const sourceFields = ref([])

const selectedRuleId = ref('')
const selectedVersionId = ref('')

// 3. 업무 테이블 컬럼 및 매핑
const targetColumns = ref([])
const mappings = ref([])

// 4. 화면 상태
const isLoading = ref(false)
const isLoadingVersions = ref(false)
const isLoadingSources = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

// 비동기 응답의 순서를 확인하기 위한 식별자
let loadRequestId = 0
let versionsRequestId = 0
let sourcesRequestId = 0

// 1:1 매핑에서 지원하는 변환 방식
const convertTypeOptions = [
  { value: 'DIRECT', label: '직접 매핑' },
  { value: 'NUMBER_NORMALIZE', label: '숫자 정리' },
  { value: 'DATE_PARSE', label: '날짜 변환' },
]

const normalize = (value) => String(value ?? '').trim()

// 실제 저장할 매핑 목록
const selectedMappings = computed(() =>
  mappings.value.filter((field) => field.selected && !field.systemManaged),
)

// 필수 DB 컬럼 수
const requiredCount = computed(() => mappings.value.filter((field) => field.required).length)

// 수정 버튼 활성화 여부
const canSave = computed(
  () =>
    !isLoading.value &&
    !isLoadingVersions.value &&
    !isLoadingSources.value &&
    !isSaving.value &&
    currentVersion.value !== null &&
    Boolean(selectedVersionId.value) &&
    sourceFields.value.length > 0 &&
    selectedMappings.value.length > 0,
)

const detailPath = () => `/analysis-model/${analysisModelId.value}`

/**
 * DB 컬럼 정보를 기반으로 매핑 행을 생성한다.
 *
 * 특정 업무 컬럼명이나 테이블명은 하드코딩하지 않는다.
 */
const createMapping = (column) => {
  const systemManaged = column.systemManaged === true
  const required = column.required === true && !systemManaged

  return {
    targetColumn: column.columnName,
    columnType: column.dataType,
    description: column.description || '',
    required,
    systemManaged,
    selected: required,
    sourceField: '',
    convertType: 'DIRECT',
    convertFormat: '',
    requiredYn: required ? 'Y' : 'N',

    // 기존 매핑 정보를 보존한다.
    originalSources: [],
    unsupportedMapping: false,
    originalOrder: null,
  }
}

/**
 * DB 컬럼 목록과 기존에 저장된 매핑 설정을 결합한다.
 *
 * 기존 매핑 순서를 유지하여 변경하지 않은 필드 때문에
 * 새 모델 버전이 생성되는 것을 방지한다.
 */
const initializeMappings = (columns, savedFields) => {
  const savedMap = new Map(savedFields.map((field) => [field.targetColumn, field]))

  mappings.value = columns.map((column) => {
    const field = createMapping(column)
    const saved = savedMap.get(field.targetColumn)

    if (!saved || field.systemManaged) {
      return field
    }

    const sources = Array.isArray(saved.sourceFields) ? saved.sourceFields : []

    return {
      ...field,
      selected: true,
      sourceField: sources.length === 1 ? sources[0] : '',
      convertType: saved.convertType,
      convertFormat: saved.convertFormat ?? '',
      requiredYn: field.required ? 'Y' : saved.requiredYn,

      originalSources: [...sources],

      // 복수 필드 매핑이나 현재 지원하지 않는 변환 방식은
      // 자동으로 1:1로 변환하지 않는다.
      unsupportedMapping:
        sources.length !== 1 ||
        !convertTypeOptions.some((type) => type.value === saved.convertType),

      originalOrder: saved.sortOrder,
    }
  })
}

/**
 * 현재 모델의 상세 정보, 가공 규칙, 대상 컬럼을 조회한다.
 */
const loadAnalysisModel = async () => {
  const id = analysisModelId.value
  const requestId = ++loadRequestId

  // 이전 비동기 요청을 무효화한다.
  ++versionsRequestId
  ++sourcesRequestId

  currentVersion.value = null
  errorMessage.value = ''

  if (!id) {
    errorMessage.value = '데이터 적재 모델 식별자가 올바르지 않습니다.'
    return
  }

  isLoading.value = true

  try {
    // 1. 모델 상세 정보 및 가공 규칙 목록 조회
    const [detailResponse, rulesResponse] = await Promise.all([
      getAnalysisModelDetail(id),
      getTransformRuleList(),
    ])

    if (requestId !== loadRequestId) {
      return
    }

    const data = detailResponse.data

    if (!data?.model || !data?.version?.transformRuleVersionId) {
      throw new Error('모델 상세 조회 결과가 올바르지 않습니다.')
    }

    // 2. 연결된 가공 규칙 식별자 확인
    const ruleId = data.version.transformRuleId

    if (!ruleId) {
      throw new Error('연결된 가공 규칙 ID가 없습니다. 백엔드 버전 조회 응답을 확인해주세요.')
    }

    // 3. 가공 규칙 버전, 출력 필드, DB 컬럼 조회
    const [versionsResponse, sourceResponse, columnsResponse] = await Promise.all([
      getTransformRuleVersionList(ruleId),
      getTransformRuleVersionDetail(ruleId, data.version.transformRuleVersionId),
      getAnalysisTargetColumns(data.model.targetSchema, data.model.targetTable),
    ])

    if (requestId !== loadRequestId) {
      return
    }

    const columns = Array.isArray(columnsResponse.data) ? columnsResponse.data : []

    if (columns.length === 0) {
      throw new Error('대상 업무 테이블의 컬럼 정보가 없습니다.')
    }

    // 4. 모델 기본 정보 설정
    model.value = {
      modelName: data.model.modelName,
      description: data.model.description ?? '',
      targetSchema: data.model.targetSchema,
      targetTable: data.model.targetTable,
      enabled: data.model.enabled,
    }

    currentVersion.value = data.model.currentVersion

    // 5. 선택 가능한 가공 규칙과 출력 필드 설정
    rules.value = Array.isArray(rulesResponse.data) ? rulesResponse.data : []

    versions.value = Array.isArray(versionsResponse.data) ? versionsResponse.data : []

    sourceFields.value = Array.isArray(sourceResponse.data?.fields)
      ? [...new Set(sourceResponse.data.fields.map((field) => field.targetName).filter(Boolean))]
      : []

    // 6. 대상 컬럼과 기존 매핑 복원
    targetColumns.value = columns

    selectedRuleId.value = ruleId
    selectedVersionId.value = data.version.transformRuleVersionId

    initializeMappings(columns, data.fields ?? [])
  } catch (error) {
    if (requestId !== loadRequestId) {
      return
    }

    console.error('데이터 적재 모델 수정 정보 조회 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : error.message || '데이터 적재 모델 수정 정보를 불러오지 못했습니다.'

    currentVersion.value = null
  } finally {
    if (requestId === loadRequestId) {
      isLoading.value = false
    }
  }
}

/**
 * 가공 규칙 변경 시 해당 규칙의 버전 목록을 조회한다.
 */
const changeRule = async () => {
  const requestId = ++versionsRequestId

  ++sourcesRequestId

  const ruleId = selectedRuleId.value

  selectedVersionId.value = ''
  versions.value = []
  sourceFields.value = []

  isLoadingVersions.value = false
  isLoadingSources.value = false
  errorMessage.value = ''

  // 이전 가공 규칙에서 선택했던 원본 필드를 초기화한다.
  mappings.value.forEach((field) => {
    field.sourceField = ''
  })

  if (!ruleId) {
    return
  }

  isLoadingVersions.value = true

  try {
    const response = await getTransformRuleVersionList(Number(ruleId))

    if (requestId !== versionsRequestId) {
      return
    }

    versions.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== versionsRequestId) {
      return
    }

    console.error('가공 규칙 버전 조회 실패:', error)
    errorMessage.value = '가공 규칙 버전 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === versionsRequestId) {
      isLoadingVersions.value = false
    }
  }
}

/**
 * 가공 규칙 버전 변경 시 해당 버전의 출력 필드를 조회한다.
 */
const changeVersion = async () => {
  const requestId = ++sourcesRequestId

  const ruleId = selectedRuleId.value
  const versionId = selectedVersionId.value

  sourceFields.value = []
  isLoadingSources.value = false
  errorMessage.value = ''

  mappings.value.forEach((field) => {
    field.sourceField = ''
  })

  if (!ruleId || !versionId) {
    return
  }

  isLoadingSources.value = true

  try {
    const response = await getTransformRuleVersionDetail(Number(ruleId), Number(versionId))

    if (requestId !== sourcesRequestId) {
      return
    }

    sourceFields.value = Array.isArray(response.data?.fields)
      ? [...new Set(response.data.fields.map((field) => field.targetName).filter(Boolean))]
      : []
  } catch (error) {
    if (requestId !== sourcesRequestId) {
      return
    }

    console.error('가공 규칙 출력 필드 조회 실패:', error)
    errorMessage.value = '가공 규칙 출력 필드를 조회하지 못했습니다.'
  } finally {
    if (requestId === sourcesRequestId) {
      isLoadingSources.value = false
    }
  }
}

/**
 * 컬럼 매핑 선택 상태 변경
 */
const changeSelected = (field) => {
  if (field.systemManaged || field.required) {
    field.selected = field.required && !field.systemManaged
    return
  }

  if (!field.selected) {
    field.sourceField = ''
    field.convertType = 'DIRECT'
    field.convertFormat = ''
    field.requiredYn = 'N'
    field.unsupportedMapping = false
  }
}

/**
 * 변환 방식 변경
 */
const changeConvertType = (field) => {
  field.convertFormat = ''
  // 복수 필드 매핑 여부는 원본 필드를 직접 선택해야 해소된다.
}

/**
 * 등록 요청 유효성 검증
 */
const validateForm = () => {
  errorMessage.value = ''

  // 1. 모델 기본 정보 검증
  if (!normalize(model.value.modelName) || normalize(model.value.modelName).length > 100) {
    errorMessage.value = '모델명을 1~100자로 입력해주세요.'
    return false
  }

  if (model.value.description.length > 500) {
    errorMessage.value = '설명은 500자 이하여야 합니다.'
    return false
  }

  // 2. 가공 규칙 버전 선택 확인
  if (!selectedVersionId.value || !sourceFields.value.length) {
    errorMessage.value = '가공 규칙 버전을 선택해주세요.'
    return false
  }

  if (!selectedMappings.value.length) {
    errorMessage.value = '매핑할 컬럼을 하나 이상 선택해주세요.'
    return false
  }

  const availableSources = new Set(sourceFields.value)

  // 3. 필수 컬럼 검증
  for (const field of mappings.value) {
    if (field.required && !field.selected) {
      errorMessage.value = `필수 DB 컬럼을 매핑해주세요: ${field.targetColumn}`
      return false
    }
  }

  // 4. 선택된 매핑 검증
  for (const field of selectedMappings.value) {
    if (field.unsupportedMapping) {
      errorMessage.value =
        `${field.targetColumn}은 복수 원본 필드 매핑입니다. ` +
        '원본 필드 하나를 선택해 변경해주세요.'
      return false
    }

    if (!availableSources.has(normalize(field.sourceField))) {
      errorMessage.value = `${field.targetColumn}의 가공 결과 필드를 선택해주세요.`
      return false
    }

    if (!convertTypeOptions.some((type) => type.value === field.convertType)) {
      errorMessage.value = `${field.targetColumn}의 변환 방식이 올바르지 않습니다.`
      return false
    }

    if (field.convertType === 'DATE_PARSE' && !normalize(field.convertFormat)) {
      errorMessage.value = `${field.targetColumn}의 날짜 형식을 입력해주세요.`
      return false
    }

    if (normalize(field.convertFormat).length > 100) {
      errorMessage.value = '날짜 형식은 100자 이하여야 합니다.'
      return false
    }
  }

  return true
}

/**
 * 기존 저장 순서를 유지하고 신규 컬럼은 뒤에 배치한다.
 */
const buildFields = () => {
  const ordered = [...selectedMappings.value].sort((a, b) => {
    const aOrder = a.originalOrder ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.originalOrder ?? Number.MAX_SAFE_INTEGER

    return aOrder - bOrder
  })

  return ordered.map((field, index) => ({
    targetColumn: field.targetColumn,

    // 기존 백엔드 DTO가 List<String>을 사용하므로
    // 원본 필드 하나를 배열에 담아 전달한다.
    sourceFields: [normalize(field.sourceField)],

    convertType: field.convertType,

    convertFormat: field.convertType === 'DATE_PARSE' ? normalize(field.convertFormat) : null,

    requiredYn: field.required ? 'Y' : field.requiredYn,
    sortOrder: index,
  }))
}

/**
 * 데이터 적재 모델 수정
 */
const saveModel = async () => {
  if (!canSave.value || !validateForm()) {
    return
  }

  if (!confirm('데이터 적재 모델을 수정하시겠습니까?')) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    // 1. 현재 버전을 포함하여 수정 요청한다.
    await updateAnalysisModel(analysisModelId.value, {
      model: {
        modelName: normalize(model.value.modelName),
        description: normalize(model.value.description) || null,
        enabled: model.value.enabled,
        targetSchema: model.value.targetSchema,
        targetTable: model.value.targetTable,
        currentVersion: currentVersion.value,
      },

      version: {
        transformRuleVersionId: Number(selectedVersionId.value),
      },

      fields: buildFields(),
    })

    // 2. 수정 성공 후 상세 화면으로 이동한다.
    toastStore.success('데이터 적재 모델 수정 완료', '수정 내용을 저장했습니다.')

    await router.push(detailPath())
  } catch (error) {
    console.error('데이터 적재 모델 수정 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '데이터 적재 모델 수정에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

// 동일 컴포넌트 내 URL 파라미터 변경 시 다시 조회한다.
watch(analysisModelId, () => {
  loadAnalysisModel()
})

onMounted(loadAnalysisModel)
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 이동 영역 -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">
        현재 버전의 모델을 수정합니다. 매핑 변경 시 새 버전이 생성됩니다.
      </p>

      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="router.push(detailPath())"
      >
        상세로 돌아가기
      </button>
    </div>

    <!-- 조회 중 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      데이터 적재 모델 수정 정보를 불러오는 중입니다.
    </div>

    <template v-else-if="currentVersion !== null">
      <!-- 1. 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>

          <span class="text-sm text-gray-500"> 현재 버전 v{{ currentVersion }} </span>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              모델명 <span class="text-red-500">*</span>
            </label>

            <input v-model="model.modelName" :class="inputClass" maxlength="100" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 사용 여부 </label>

            <select v-model="model.enabled" :class="inputClass">
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
            ></textarea>
          </div>
        </div>
      </section>

      <!-- 2. 대상 업무 테이블 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <h3 class="mb-4 text-base font-semibold text-gray-900">적재 대상 테이블</h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 대상 스키마 </label>

            <input :value="model.targetSchema" :class="inputClass" disabled />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 대상 테이블 </label>

            <input :value="model.targetTable" :class="inputClass" disabled />
          </div>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          대상 스키마와 테이블은 수정할 수 없습니다. 변경하려면 새 모델을 등록해주세요.
        </p>
      </section>

      <!-- 3. 가공 규칙 연결 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <h3 class="mb-4 text-base font-semibold text-gray-900">가공 규칙 연결</h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              가공 규칙 <span class="text-red-500">*</span>
            </label>

            <select
              v-model="selectedRuleId"
              :class="inputClass"
              :disabled="isSaving"
              @change="changeRule"
            >
              <option value="">규칙 선택</option>

              <option
                v-for="rule in rules"
                :key="rule.transformRuleId"
                :value="rule.transformRuleId"
              >
                {{ rule.ruleName }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              가공 규칙 버전 <span class="text-red-500">*</span>
            </label>

            <select
              v-model="selectedVersionId"
              :class="inputClass"
              :disabled="!selectedRuleId || isLoadingVersions || isSaving"
              @change="changeVersion"
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
          </div>
        </div>
      </section>

      <!-- 4. 업무 컬럼 매핑 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-gray-900">업무 컬럼 매핑</h3>

            <p class="mt-1 text-sm text-gray-500">
              DB 컬럼 하나당 가공 결과 필드 하나를 연결합니다.
            </p>
          </div>

          <span class="text-sm text-gray-500">
            전체 {{ targetColumns.length }}개 / 매핑 {{ selectedMappings.length }}개 / 필수
            {{ requiredCount }}개
          </span>
        </div>

        <div class="overflow-x-auto rounded-md border border-gray-200">
          <table class="w-full min-w-[1000px] text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-3 py-3 text-center">선택</th>
                <th class="px-3 py-3 text-left">대상 DB 컬럼</th>
                <th class="px-3 py-3 text-left">데이터 타입</th>
                <th class="px-3 py-3 text-left">가공 결과 필드</th>
                <th class="px-3 py-3 text-left">변환 방식</th>
                <th class="px-3 py-3 text-center">필수 여부</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="field in mappings"
                :key="field.targetColumn"
                :class="field.systemManaged ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50/60'"
              >
                <!-- 컬럼 매핑 여부 -->
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

                  <p v-if="field.description" class="mt-0.5 text-xs text-gray-500">
                    {{ field.description }}
                  </p>
                </td>

                <!-- DB 데이터 타입 -->
                <td class="px-3 py-2 text-xs text-gray-500">
                  {{ field.columnType }}
                </td>

                <!-- 원본 필드 : 1:1 매핑 -->
                <td class="px-3 py-2">
                  <select
                    v-model="field.sourceField"
                    :class="inputClass"
                    :disabled="!field.selected || isLoadingSources || isSaving"
                    @change="field.unsupportedMapping = false"
                  >
                    <option value="">가공 결과 필드 선택</option>

                    <option v-for="source in sourceFields" :key="source" :value="source">
                      {{ source }}
                    </option>
                  </select>

                  <!-- DATE_PARSE 사용 시에만 입력 -->
                  <input
                    v-if="field.selected && field.convertType === 'DATE_PARSE'"
                    v-model="field.convertFormat"
                    :class="inputClass + ' mt-1.5'"
                    maxlength="100"
                    placeholder="날짜 형식 (예: yyyyMMdd)"
                    :disabled="isSaving"
                  />

                  <!-- 기존 복수 필드 매핑 경고 -->
                  <p
                    v-if="field.selected && field.unsupportedMapping"
                    class="mt-1 text-xs text-amber-700"
                  >
                    기존 매핑:
                    {{ field.originalSources.join(', ') }}. 1:1로 변경하려면 원본 필드 하나를
                    선택해주세요.
                  </p>
                </td>

                <!-- 변환 방식 -->
                <td class="px-3 py-2">
                  <select
                    v-model="field.convertType"
                    :class="inputClass"
                    :disabled="!field.selected || isSaving"
                    @change="changeConvertType(field)"
                  >
                    <option
                      v-for="type in convertTypeOptions"
                      :key="type.value"
                      :value="type.value"
                    >
                      {{ type.label }}
                    </option>
                  </select>
                </td>

                <!-- 필수 여부 -->
                <td class="px-3 py-2 text-center">
                  <span v-if="field.systemManaged" class="text-xs"> 자동 </span>

                  <span v-else-if="field.required" class="text-xs font-medium text-red-600">
                    필수
                  </span>

                  <select
                    v-else
                    v-model="field.requiredYn"
                    :class="inputClass"
                    :disabled="!field.selected || isSaving"
                  >
                    <option value="N">선택</option>
                    <option value="Y">필수</option>
                  </select>
                </td>
              </tr>

              <tr v-if="mappings.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  대상 업무 테이블의 컬럼 정보가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 오류 표시 -->
      <div
        v-if="errorMessage"
        role="alert"
        class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- 수정/취소 버튼 -->
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="router.push(detailPath())"
        >
          취소
        </button>

        <button
          type="button"
          :disabled="!canSave"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          @click="saveModel"
        >
          {{ isSaving ? '수정 중...' : '수정' }}
        </button>
      </div>
    </template>

    <div
      v-else-if="errorMessage"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>
