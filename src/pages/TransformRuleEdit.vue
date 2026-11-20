<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getTransformRuleDetail,
  updateTransformRule,
  previewTransformRule as requestTransformPreview,
} from '@/api/transformRuleApi'
import { parseXmlTree } from '@/utils/xmlUtils'

const route = useRoute()
const router = useRouter()

const transformRuleId = computed(() => {
  const id = Number(route.params.transformRuleId)
  return Number.isSafeInteger(id) && id > 0 ? id : null
})

const isLoading = ref(false)
const isSaving = ref(false)
const isPreviewing = ref(false)
const errorMessage = ref('')
const previewError = ref('')
const previewResult = ref(null)
const sampleData = ref('')
const sampleError = ref('')
const sampleValidated = ref(false)
const currentVersion = ref(null)

const rule = ref({
  ruleName: '',
  description: '',
  enabled: 'Y',
})

const version = ref({
  dataFormat: 'JSON',
  repeatPath: '',
})

const fields = ref([])

// 새로운 필드를 추가한 뒤 첫 번째 원본 경로 입력란에 포커스한다.
const fieldSourceInputs = ref([])
let previewRequestId = 0

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500'

const transformTypeOptions = [
  { value: 'DIRECT', label: 'DIRECT - 단일 필드 추출' },
  { value: 'CONCAT', label: 'CONCAT - 문자열 결합' },
  { value: 'DATE_COMBINE', label: 'DATE_COMBINE - 날짜 결합' },
]

const parsedSample = computed(() => {
  if (!sampleData.value.trim()) {
    return { valid: false, error: '샘플 데이터를 입력해주세요.' }
  }

  if (version.value.dataFormat === 'JSON') {
    try {
      const data = JSON.parse(sampleData.value)

      return data !== null && typeof data === 'object'
        ? { valid: true, error: '' }
        : { valid: false, error: 'JSON 샘플은 객체 또는 배열이어야 합니다.' }
    } catch {
      return { valid: false, error: 'JSON 형식이 올바르지 않습니다.' }
    }
  }

  const result = parseXmlTree(sampleData.value)
  return { valid: result.valid, error: result.error }
})

const validateSample = () => {
  sampleValidated.value = true
  sampleError.value = parsedSample.value.error

  return parsedSample.value.valid
}

// 필드 추가
const addField = async () => {
  // 1. 새로운 추출 필드를 추가한다.
  fields.value.push({
    sourcePaths: [''],
    transformType: 'DIRECT',
    separator: '',
    targetName: '',
    dataType: 'STRING',
    valueFormat: '',
    requiredYn: 'N',
  })

  // 2. 화면에 새로운 필드가 렌더링될 때까지 대기한다.
  await nextTick()

  // 3. 첫 번째 원본 경로 입력란으로 이동한다.
  const input = fieldSourceInputs.value[fields.value.length - 1]

  input?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })

  // 4. 입력란에 포커스를 설정한다.
  input?.focus({ preventScroll: true })
}

// 필드 삭제
const removeField = (index) => {
  fields.value.splice(index, 1)
  fieldSourceInputs.value.splice(index, 1)
}

// 가공 방식에 따른 입력 경로와 변환 설정 변경
const changeTransformType = (field) => {
  // 1. 기존 첫 번째 경로는 유지한다.
  const firstPath = field.sourcePaths[0] ?? ''

  // 2. 가공 방식에 필요한 입력 경로를 설정한다.
  if (field.transformType === 'DATE_COMBINE') {
    field.sourcePaths = [firstPath, '', '']
    field.dataType = 'STRING'
  } else if (field.transformType === 'CONCAT') {
    field.sourcePaths = [firstPath, '']
    field.dataType = 'STRING'
  } else {
    field.sourcePaths = [firstPath]
  }

  // 3. 이전 변환 설정을 초기화한다.
  field.separator = ''
  field.valueFormat = ''
}

const addSourcePath = (field) => {
  if (field.transformType === 'CONCAT') {
    field.sourcePaths.push('')
  }
}

const removeSourcePath = (field, index) => {
  if (field.transformType === 'CONCAT' && field.sourcePaths.length > 2) {
    field.sourcePaths.splice(index, 1)
  }
}

// 현재 버전만 수정 대상으로 사용한다. 과거 버전은 상세 화면에서 조회한다.
const loadTransformRule = async () => {
  if (!transformRuleId.value) {
    errorMessage.value = '가공 규칙 식별자가 올바르지 않습니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 1. 수정할 규칙의 현재 버전을 조회한다.
    const { data } = await getTransformRuleDetail(transformRuleId.value)

    // 2. 기본 정보와 기준 버전을 보관한다.
    rule.value = {
      ruleName: data.rule.ruleName,
      description: data.rule.description ?? '',
      enabled: data.rule.enabled,
    }

    currentVersion.value = data.rule.currentVersion

    // 3. 가공 설정과 추출 필드를 화면에 반영한다.
    version.value = {
      dataFormat: data.version.dataFormat,
      repeatPath: data.version.repeatPath ?? '',
    }

    fields.value = (data.fields ?? []).map((field) => ({
      sourcePaths: Array.isArray(field.sourcePaths) ? [...field.sourcePaths] : [''],
      transformType: field.transformType ?? 'DIRECT',
      separator: field.separator ?? '',
      targetName: field.targetName,
      dataType: field.dataType,
      valueFormat: field.valueFormat ?? '',
      requiredYn: field.requiredYn,
    }))
  } catch (error) {
    console.error('가공 규칙 수정 정보 조회 실패:', error)
    errorMessage.value = '가공 규칙 수정 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 등록 화면과 동일하게 필드 유효성을 검증한다.
// 수정 화면에서는 샘플 데이터가 필수가 아니다.
const validateForm = () => {
  errorMessage.value = ''

  // 1. 기본 정보를 검증한다.
  if (!rule.value.ruleName.trim()) {
    errorMessage.value = '가공 규칙명을 입력해주세요.'
    return false
  }

  if (rule.value.ruleName.trim().length > 100) {
    errorMessage.value = '가공 규칙명은 100자 이하여야 합니다.'
    return false
  }

  if (rule.value.description.length > 500) {
    errorMessage.value = '가공 규칙 설명은 500자 이하여야 합니다.'
    return false
  }

  if (version.value.repeatPath.trim().length > 1000) {
    errorMessage.value = '반복 경로는 1000자 이하여야 합니다.'
    return false
  }

  if (!fields.value.length) {
    errorMessage.value = '추출 필드를 최소 1개 이상 추가해주세요.'
    return false
  }

  const targetNames = new Set()

  // 2. 가공 유형별 원본 경로 및 필드 설정을 검증한다.
  for (const field of fields.value) {
    const targetName = field.targetName.trim()
    const sourcePaths = field.sourcePaths.map((path) => path.trim())

    if (!targetName || sourcePaths.some((path) => !path)) {
      errorMessage.value = '모든 원본 경로와 출력 필드명을 입력해주세요.'
      return false
    }

    if (targetName.length > 100 || sourcePaths.some((path) => path.length > 1000)) {
      errorMessage.value = '원본 경로 또는 출력 필드명의 길이가 제한을 초과했습니다.'
      return false
    }

    if (targetNames.has(targetName)) {
      errorMessage.value = `출력 필드명이 중복되었습니다: ${targetName}`
      return false
    }

    targetNames.add(targetName)

    if (field.transformType === 'DIRECT') {
      if (sourcePaths.length !== 1) {
        errorMessage.value = `DIRECT는 원본 경로 1개가 필요합니다: ${targetName}`
        return false
      }
    } else if (field.transformType === 'CONCAT') {
      if (sourcePaths.length < 2 || field.dataType !== 'STRING') {
        errorMessage.value = `CONCAT은 문자열 원본 경로 2개 이상이 필요합니다: ${targetName}`
        return false
      }

      if (field.separator == null || field.separator.length > 20) {
        errorMessage.value = 'CONCAT 구분자는 20자 이하여야 합니다.'
        return false
      }
    } else if (field.transformType === 'DATE_COMBINE') {
      if (sourcePaths.length !== 3 || field.dataType !== 'STRING') {
        errorMessage.value = `DATE_COMBINE은 연, 월, 일 경로 3개가 필요합니다: ${targetName}`
        return false
      }
    } else {
      errorMessage.value = `지원하지 않는 가공 방식입니다: ${targetName}`
      return false
    }

    if (
      field.transformType === 'DIRECT' &&
      field.dataType === 'DATETIME' &&
      !field.valueFormat.trim()
    ) {
      errorMessage.value = `날짜 입력 형식을 선택해주세요: ${targetName}`
      return false
    }

    if (field.valueFormat.trim().length > 100) {
      errorMessage.value = '날짜 입력 형식은 100자 이하여야 합니다.'
      return false
    }
  }

  return true
}

// 저장·미리보기에서 같은 요청 필드 구조를 사용한다.
const buildRequestData = () => ({
  rule: {
    ruleName: rule.value.ruleName.trim(),
    description: rule.value.description.trim() || null,
    enabled: rule.value.enabled,
    currentVersion: currentVersion.value,
  },
  version: {
    dataFormat: version.value.dataFormat,
    repeatPath: version.value.repeatPath.trim() || null,
  },
  fields: fields.value.map((field, index) => ({
    sourcePaths: field.sourcePaths.map((path) => path.trim()),
    transformType: field.transformType,
    separator: field.transformType === 'CONCAT' ? field.separator : null,
    targetName: field.targetName.trim(),
    dataType: field.dataType,
    valueFormat:
      field.transformType === 'DIRECT' && field.dataType === 'DATETIME'
        ? field.valueFormat.trim() || null
        : null,
    requiredYn: field.requiredYn,
    sortOrder: index,
  })),
})

// 가공 결과 미리보기
const previewTransformRule = async () => {
  if (isLoading.value || isSaving.value || isPreviewing.value) {
    return
  }

  previewResult.value = null
  previewError.value = ''

  if (!validateForm() || !validateSample()) {
    previewError.value = errorMessage.value || sampleError.value
    return
  }

  const requestId = ++previewRequestId
  isPreviewing.value = true

  try {
    // 샘플 데이터는 미리보기 호출에만 사용하고 수정 요청에는 포함하지 않는다.
    const requestData = buildRequestData()

    const { data } = await requestTransformPreview({
      rawData: sampleData.value,
      version: requestData.version,
      fields: requestData.fields,
    })

    if (requestId === previewRequestId) {
      previewResult.value = data
    }
  } catch (error) {
    if (requestId !== previewRequestId) {
      return
    }

    console.error('가공 결과 미리보기 실패:', error)

    previewError.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 결과 미리보기에 실패했습니다.'
  } finally {
    isPreviewing.value = false
  }
}

// 가공 규칙 수정
const saveTransformRule = async () => {
  if (isLoading.value || isSaving.value || currentVersion.value == null || !validateForm()) {
    return
  }

  if (!confirm('가공 규칙을 수정하시겠습니까?')) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    // 1. 조회한 현재 버전을 포함하여 수정한다.
    await updateTransformRule(transformRuleId.value, buildRequestData())

    // 2. 성공 시 상세 화면에서 최신 버전을 다시 조회한다.
    alert('가공 규칙이 수정되었습니다.')
    router.push(`/transform-rule/${transformRuleId.value}`)
  } catch (error) {
    console.error('가공 규칙 수정 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 규칙 수정에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

// 입력값이 변경되면 이전 미리보기 결과를 초기화한다.
watch(
  [sampleData, version, fields],
  () => {
    previewRequestId++
    previewResult.value = null
    previewError.value = ''
    sampleValidated.value = false
    sampleError.value = ''
  },
  { deep: true },
)

onMounted(loadTransformRule)
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">현재 가공 규칙의 최신 버전을 수정합니다.</p>

      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="router.push(`/transform-rule/${transformRuleId}`)"
      >
        상세로 돌아가기
      </button>
    </div>

    <!-- 로딩 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      가공 규칙 정보를 불러오는 중입니다.
    </div>

    <template v-else-if="currentVersion !== null">
      <!-- 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>
          <span class="text-sm text-gray-500"> 현재 버전 v{{ currentVersion }} </span>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              규칙명 <span class="text-red-500">*</span>
            </label>
            <input v-model="rule.ruleName" type="text" maxlength="100" :class="inputClass" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 사용 여부 </label>
            <select v-model="rule.enabled" :class="inputClass">
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-gray-700"> 설명 </label>
            <textarea
              v-model="rule.description"
              rows="2"
              maxlength="500"
              :class="inputClass"
            ></textarea>
          </div>
        </div>
      </section>

      <!-- 가공 설정 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <h3 class="mb-4 text-base font-semibold text-gray-900">가공 설정</h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              데이터 형식 <span class="text-red-500">*</span>
            </label>
            <select v-model="version.dataFormat" :class="inputClass">
              <option value="JSON">JSON</option>
              <option value="XML">XML</option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 반복 경로 </label>
            <input v-model="version.repeatPath" maxlength="1000" type="text" :class="inputClass" />
          </div>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          가공 설정이나 추출 필드를 변경하면 새 버전이 생성됩니다. 이전 버전은 유지됩니다.
        </p>
      </section>

      <!-- 추출 필드 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-gray-900">추출 필드</h3>
            <p class="mt-1 text-sm text-gray-500">추출 필드 {{ fields.length }}개를 설정합니다.</p>
          </div>
        </div>

        <div
          v-if="fields.length === 0"
          class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center"
        >
          <p class="text-sm text-gray-500">등록된 추출 필드가 없습니다.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(field, index) in fields"
            :key="index"
            class="rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div class="mb-3">
              <h4 class="text-sm font-semibold text-gray-800">필드 {{ index + 1 }}</h4>
            </div>

            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <!-- 가공 방식 -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">
                  가공 방식 <span class="text-red-500">*</span>
                </label>

                <select
                  v-model="field.transformType"
                  :class="inputClass"
                  @change="changeTransformType(field)"
                >
                  <option
                    v-for="option in transformTypeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <!-- 출력 필드명 -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">
                  출력 필드명 <span class="text-red-500">*</span>
                </label>

                <input v-model="field.targetName" type="text" maxlength="100" :class="inputClass" />
              </div>

              <!-- 원본 경로 -->
              <div class="md:col-span-2">
                <label class="mb-1 block text-sm font-medium text-gray-700">
                  원본 경로 <span class="text-red-500">*</span>
                </label>

                <div class="space-y-2">
                  <div
                    v-for="(sourcePath, pathIndex) in field.sourcePaths"
                    :key="pathIndex"
                    class="flex items-center gap-2"
                  >
                    <span
                      v-if="field.transformType === 'DATE_COMBINE'"
                      class="w-10 shrink-0 text-sm text-gray-600"
                    >
                      {{ ['연도', '월', '일'][pathIndex] }}
                    </span>

                    <input
                      :ref="pathIndex === 0 ? (el) => (fieldSourceInputs[index] = el) : undefined"
                      v-model="field.sourcePaths[pathIndex]"
                      type="text"
                      maxlength="1000"
                      :placeholder="
                        field.transformType === 'DATE_COMBINE'
                          ? ['dealYear', 'dealMonth', 'dealDay'][pathIndex]
                          : '예: properties.mag'
                      "
                      :class="inputClass"
                    />

                    <button
                      v-if="field.transformType === 'CONCAT' && field.sourcePaths.length > 2"
                      type="button"
                      class="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                      @click="removeSourcePath(field, pathIndex)"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <button
                  v-if="field.transformType === 'CONCAT'"
                  type="button"
                  class="mt-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  @click="addSourcePath(field)"
                >
                  + 원본 경로 추가
                </button>

                <p v-if="field.transformType === 'DATE_COMBINE'" class="mt-2 text-xs text-gray-500">
                  연도, 월, 일 경로 순서로 입력합니다. 결과는 YYYY-MM-DD 형식입니다.
                </p>
              </div>

              <!-- 구분자 -->
              <div v-if="field.transformType === 'CONCAT'" class="md:col-span-2">
                <label class="mb-1 block text-sm font-medium text-gray-700"> 결합 구분자 </label>

                <input
                  v-model="field.separator"
                  type="text"
                  maxlength="20"
                  placeholder="예: 공백 또는 -"
                  :class="inputClass"
                />

                <p class="mt-1 text-xs text-gray-500">빈 값이면 구분자 없이 결합합니다.</p>
              </div>

              <!-- 데이터 타입 -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700"> 데이터 타입 </label>

                <select
                  v-model="field.dataType"
                  :disabled="field.transformType !== 'DIRECT'"
                  :class="inputClass"
                >
                  <option value="STRING">STRING</option>
                  <option value="INTEGER">INTEGER</option>
                  <option value="DECIMAL">DECIMAL</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="DATETIME">DATETIME</option>
                </select>
              </div>

              <!-- 필수 여부 -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700"> 필수 여부 </label>

                <select v-model="field.requiredYn" :class="inputClass">
                  <option value="N">선택</option>
                  <option value="Y">필수</option>
                </select>
              </div>

              <!-- 날짜 입력 형식 -->
              <div
                v-if="field.transformType === 'DIRECT' && field.dataType === 'DATETIME'"
                class="md:col-span-2"
              >
                <label class="mb-1 block text-sm font-medium text-gray-700"> 원본 날짜 형식 </label>

                <select v-model="field.valueFormat" :class="inputClass">
                  <option value="">날짜 형식을 선택하세요</option>
                  <option value="ISO_DATETIME">ISO 8601 날짜·시간 (시간대 포함)</option>
                  <option value="EPOCH_MILLIS">Unix 타임스탬프 (밀리초)</option>
                </select>
              </div>
            </div>

            <!-- 개별 필드 삭제 -->
            <div class="mt-3 flex justify-end">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                @click="removeField(index)"
              >
                삭제
              </button>
            </div>
          </div>
        </div>

        <!-- 하단 필드 추가 버튼 -->
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="addField"
          >
            필드 추가
          </button>
        </div>
      </section>

      <!-- 미리보기 전용 샘플 데이터 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-gray-900">샘플 데이터 (미리보기 전용)</h3>
            <p class="mt-1 text-xs text-gray-500">
              저장되지 않는 데이터입니다. 미리보기를 실행할 때만 입력해주세요.
            </p>
          </div>

          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="validateSample"
          >
            문법 검사
          </button>
        </div>

        <textarea
          v-model="sampleData"
          rows="10"
          spellcheck="false"
          :class="inputClass + ' font-mono'"
        ></textarea>

        <p v-if="sampleValidated && !sampleError" class="mt-2 text-xs text-green-700">
          {{ version.dataFormat }} 문법 검사가 완료되었습니다.
        </p>

        <p v-if="sampleError" class="mt-2 text-xs text-red-600">
          {{ sampleError }}
        </p>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            :disabled="isSaving || isPreviewing"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="previewTransformRule"
          >
            {{ isPreviewing ? '가공 중...' : '미리보기 실행' }}
          </button>
        </div>

        <p v-if="previewError" class="mt-3 text-sm text-red-600">
          {{ previewError }}
        </p>

        <div v-if="previewResult !== null" class="mt-3">
          <p class="mb-2 text-sm font-medium text-green-700">
            가공 결과
            {{ Array.isArray(previewResult) ? previewResult.length : 1 }}건
          </p>

          <pre
            class="max-h-96 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-6 text-gray-800"
            >{{ JSON.stringify(previewResult, null, 2) }}</pre
          >
        </div>
      </section>

      <!-- 오류 메시지 -->
      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- 하단 버튼 -->
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="router.push(`/transform-rule/${transformRuleId}`)"
        >
          취소
        </button>

        <button
          type="button"
          :disabled="isSaving"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          @click="saveTransformRule"
        >
          {{ isSaving ? '수정 중...' : '수정' }}
        </button>
      </div>
    </template>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>
