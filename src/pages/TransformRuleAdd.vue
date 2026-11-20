<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createTransformRule,
  previewTransformRule as requestTransformPreview,
} from '@/api/transformRuleApi'
import { parseXmlTree } from '@/utils/xmlUtils'

const router = useRouter()

const isSaving = ref(false)
const isPreviewing = ref(false)
const errorMessage = ref('')
const sampleError = ref('')
const sampleValidated = ref(false)
const sampleData = ref('')

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
const previewResult = ref(null)
const previewError = ref('')
const isPreviewed = ref(false)
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
    return { valid: false, value: null, error: '샘플 데이터를 입력해주세요.' }
  }

  if (version.value.dataFormat === 'JSON') {
    try {
      const value = JSON.parse(sampleData.value)

      if (value === null || typeof value !== 'object') {
        return {
          valid: false,
          value: null,
          error: 'JSON 샘플은 객체 또는 배열이어야 합니다.',
        }
      }

      return { valid: true, value, error: '' }
    } catch {
      return { valid: false, value: null, error: 'JSON 형식이 올바르지 않습니다.' }
    }
  }

  const result = parseXmlTree(sampleData.value)

  return {
    valid: result.valid,
    value: result.root,
    error: result.error,
  }
})

const resetSampleValidation = () => {
  sampleValidated.value = false
  sampleError.value = ''
}

const validateSample = () => {
  sampleValidated.value = true
  sampleError.value = parsedSample.value.error

  return parsedSample.value.valid
}

// 추출 필드 추가
const addField = () => {
  fields.value.push({
    sourcePaths: [''],
    transformType: 'DIRECT',
    separator: '',
    targetName: '',
    dataType: 'STRING',
    valueFormat: '',
    requiredYn: 'N',
  })
}

// 추출 필드 삭제
const removeField = (index) => {
  fields.value.splice(index, 1)
}

// 가공 방식에 따라 원본 경로 개수와 출력 데이터 타입을 설정한다.
const changeTransformType = (field) => {
  // 1. 기존 첫 번째 원본 경로는 유지한다.
  const firstPath = field.sourcePaths[0] ?? ''

  // 2. 가공 방식별 필수 원본 경로를 설정한다.
  if (field.transformType === 'DATE_COMBINE') {
    field.sourcePaths = [firstPath, '', '']
    field.dataType = 'STRING'
  } else if (field.transformType === 'CONCAT') {
    field.sourcePaths = [firstPath, '']
    field.dataType = 'STRING'
  } else {
    field.sourcePaths = [firstPath]
  }

  // 3. 이전 가공 방식의 변환 옵션을 초기화한다.
  field.separator = ''
  field.valueFormat = ''
}

// CONCAT 원본 경로 추가
const addSourcePath = (field) => {
  if (field.transformType !== 'CONCAT') {
    return
  }

  field.sourcePaths.push('')
}

// CONCAT 원본 경로 삭제
const removeSourcePath = (field, index) => {
  if (field.transformType !== 'CONCAT' || field.sourcePaths.length <= 2) {
    return
  }

  field.sourcePaths.splice(index, 1)
}

// 필드 입력값을 API 요청 구조로 변환한다.
const buildFields = () =>
  fields.value.map((field, index) => ({
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
  }))

// 입력값 검증
const validateForm = () => {
  errorMessage.value = ''

  // 1. 가공 규칙 기본 정보를 검증한다.
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

  // 2. 샘플 데이터 형식을 검증한다.
  if (!validateSample()) {
    errorMessage.value = '샘플 데이터 형식을 확인해주세요.'
    return false
  }

  // 3. 추출 필드 존재 여부를 확인한다.
  if (fields.value.length === 0) {
    errorMessage.value = '추출 필드를 최소 1개 이상 추가해주세요.'
    return false
  }

  const targetNames = new Set()

  // 4. 추출 필드별 원본 경로와 가공 설정을 검증한다.
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

// JSON/XML 가공 결과 미리보기
const previewTransformRule = async () => {
  if (isSaving.value || isPreviewing.value) {
    return
  }

  previewResult.value = null
  previewError.value = ''
  isPreviewed.value = false

  // 1. 입력값과 샘플 데이터 형식을 검증한다.
  if (!validateForm()) {
    return
  }

  // 2. 미리보기 요청 데이터를 생성한다.
  const requestData = {
    rawData: sampleData.value,
    version: {
      dataFormat: version.value.dataFormat,
      repeatPath: version.value.repeatPath.trim() || null,
    },
    fields: buildFields(),
  }

  const requestId = ++previewRequestId
  isPreviewing.value = true

  try {
    // 3. 백엔드 가공 엔진을 호출한다.
    const response = await requestTransformPreview(requestData)

    if (requestId !== previewRequestId) {
      return
    }

    // 4. 가공 결과를 화면에 설정한다.
    previewResult.value = response.data
    isPreviewed.value = true
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

// 가공 규칙 등록
const addTransformRule = async () => {
  // 1. 중복 등록 및 입력값을 검증한다.
  if (isSaving.value || !validateForm()) {
    return
  }

  // 2. 사용자에게 등록 여부를 확인한다.
  if (!confirm('가공 규칙을 등록하시겠습니까?')) {
    return
  }

  // 3. 등록 요청 데이터를 생성한다.
  const requestData = {
    rule: {
      ruleName: rule.value.ruleName.trim(),
      description: rule.value.description.trim() || null,
      enabled: rule.value.enabled,
    },
    version: {
      dataFormat: version.value.dataFormat,
      repeatPath: version.value.repeatPath.trim() || null,
    },
    fields: buildFields(),
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    // 4. 가공 규칙을 등록한다.
    await createTransformRule(requestData)

    alert('가공 규칙이 등록되었습니다.')
    router.push('/transform-rule')
  } catch (error) {
    console.error('가공 규칙 등록 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 규칙 등록에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

// 입력값 변경 시 이전 미리보기 결과를 초기화한다.
watch(
  [sampleData, version, fields],
  () => {
    previewRequestId++
    previewResult.value = null
    previewError.value = ''
    isPreviewed.value = false
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-4">
    <!-- 기본 정보 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <h3 class="mb-4 text-base font-semibold text-gray-900">기본 정보</h3>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            규칙명 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="rule.ruleName"
            type="text"
            maxlength="100"
            placeholder="예: 부동산 매매 거래 데이터 가공"
            :class="inputClass"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            데이터 형식 <span class="text-red-500">*</span>
          </label>
          <select v-model="version.dataFormat" :class="inputClass" @change="resetSampleValidation">
            <option value="JSON">JSON</option>
            <option value="XML">XML</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-gray-700">설명</label>
          <textarea
            v-model="rule.description"
            rows="2"
            maxlength="500"
            placeholder="가공 규칙에 대한 설명"
            :class="inputClass"
          ></textarea>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">사용 여부</label>
          <select v-model="rule.enabled" :class="inputClass">
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 샘플 데이터 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-gray-900">샘플 데이터</h3>
          <p class="mt-1 text-xs text-gray-500">
            가공 대상 {{ version.dataFormat }} 데이터를 붙여넣어 주세요. 샘플 원문은 저장하지
            않습니다.
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
        rows="12"
        spellcheck="false"
        :placeholder="
          version.dataFormat === 'JSON'
            ? '{\n  &quot;features&quot;: []\n}'
            : '<response>\n  <items></items>\n</response>'
        "
        :class="inputClass + ' font-mono'"
        @input="resetSampleValidation"
      ></textarea>

      <p v-if="sampleValidated && !sampleError" class="mt-2 text-xs text-green-700">
        {{ version.dataFormat }} 문법 검사가 완료되었습니다.
      </p>

      <p v-if="sampleError" class="mt-2 text-xs text-red-600">
        {{ sampleError }}
      </p>
    </section>

    <!-- 반복 경로 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <h3 class="mb-4 text-base font-semibold text-gray-900">반복 대상</h3>

      <label class="mb-1 block text-sm font-medium text-gray-700">반복 경로</label>

      <input
        v-model="version.repeatPath"
        type="text"
        maxlength="1000"
        :placeholder="
          version.dataFormat === 'JSON' ? '예: features' : '예: response.body.items.item'
        "
        :class="inputClass"
      />

      <p class="mt-2 text-xs text-gray-500">
        반복 경로는 선택 사항입니다. 지정하지 않으면 최상위 객체 또는 배열을 가공합니다. XML에서는
        반복 요소의 경로를 지정할 수 있습니다.
      </p>
    </section>

    <!-- 추출 필드 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-gray-900">추출 필드</h3>
          <p class="mt-1 text-xs text-gray-500">
            반복 대상 요소를 기준으로 원본 경로를 입력합니다.
          </p>
        </div>

        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="addField"
        >
          + 필드 추가
        </button>
      </div>

      <div
        v-if="fields.length === 0"
        class="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
      >
        등록된 추출 필드가 없습니다. 필드를 추가해주세요.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(field, index) in fields"
          :key="index"
          class="rounded-md border border-gray-200 bg-gray-50 p-4"
        >
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-800">필드 {{ index + 1 }}</h4>

            <button
              type="button"
              class="text-sm font-medium text-red-600 hover:text-red-700"
              @click="removeField(index)"
            >
              삭제
            </button>
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

              <input
                v-model="field.targetName"
                type="text"
                maxlength="100"
                placeholder="예: contractDate"
                :class="inputClass"
              />
            </div>

            <!-- 원본 경로 목록 -->
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
                연도, 월, 일 순서로 입력합니다. 결과는 YYYY-MM-DD 형식입니다.
              </p>
            </div>

            <!-- 결합 구분자 -->
            <div v-if="field.transformType === 'CONCAT'" class="md:col-span-2">
              <label class="mb-1 block text-sm font-medium text-gray-700"> 결합 구분자 </label>

              <input
                v-model="field.separator"
                type="text"
                maxlength="20"
                placeholder="예: 공백 또는 -"
                :class="inputClass"
              />

              <p class="mt-1 text-xs text-gray-500">
                빈 값이면 구분자 없이 결합합니다. 공백 구분자를 사용하려면 공백 한 칸을 입력합니다.
              </p>
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

            <!-- 기존 날짜 입력 형식 -->
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

              <p class="mt-1 text-xs text-gray-500">
                외부 API에서 전달하는 날짜 값의 형식을 선택합니다.
              </p>

              <!-- ISO 8601 변환 예시 -->
              <div
                v-if="field.valueFormat === 'ISO_DATETIME'"
                class="mt-3 rounded-md border border-gray-200 bg-white p-3"
              >
                <p class="mb-2 text-xs font-medium text-gray-700">날짜 변환 예시</p>

                <div class="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div>
                    <p class="mb-1 text-gray-500">원본 데이터 (한국 시간)</p>
                    <p class="break-all font-mono text-gray-900">2026-10-24T12:30:00+09:00</p>
                  </div>

                  <div>
                    <p class="mb-1 text-gray-500">가공 결과 (UTC)</p>
                    <p class="break-all font-mono text-gray-900">2026-10-24T03:30:00Z</p>
                  </div>
                </div>
              </div>

              <!-- Unix 타임스탬프 변환 예시 -->
              <div
                v-else-if="field.valueFormat === 'EPOCH_MILLIS'"
                class="mt-3 rounded-md border border-gray-200 bg-white p-3"
              >
                <p class="mb-2 text-xs font-medium text-gray-700">날짜 변환 예시</p>

                <div class="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div>
                    <p class="mb-1 text-gray-500">원본 데이터 (밀리초)</p>
                    <p class="break-all font-mono text-gray-900">1792812600000</p>
                  </div>

                  <div>
                    <p class="mb-1 text-gray-500">가공 결과 (UTC)</p>
                    <p class="break-all font-mono text-gray-900">2026-10-24T03:30:00Z</p>
                  </div>
                </div>
              </div>

              <p class="mt-2 text-xs text-gray-500">
                시간대 정보가 없는 ISO 날짜·시간은 변환할 수 없습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 가공 결과 미리보기 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-gray-900">가공 결과 미리보기</h3>
          <p class="mt-1 text-xs text-gray-500">
            샘플 JSON/XML에 추출 경로 및 결합 설정을 적용합니다.
          </p>
        </div>

        <button
          type="button"
          :disabled="isSaving || isPreviewing"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="previewTransformRule"
        >
          {{ isPreviewing ? '가공 중...' : '미리보기 실행' }}
        </button>
      </div>

      <div
        v-if="previewError"
        class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ previewError }}
      </div>

      <div v-if="isPreviewed">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-medium text-green-700"> 가공이 완료되었습니다. </span>

          <span class="text-xs text-gray-500">
            결과 {{ Array.isArray(previewResult) ? previewResult.length : 1 }}건
          </span>
        </div>

        <pre
          class="max-h-96 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-6 text-gray-800"
          >{{ JSON.stringify(previewResult, null, 2) }}</pre
        >
      </div>

      <div
        v-else-if="!previewError"
        class="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
      >
        미리보기를 실행하면 가공된 JSON 결과가 표시됩니다.
      </div>
    </section>

    <!-- 안내 -->
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
      가공 규칙의 설정만 저장합니다. 샘플 데이터는 미리보기에만 사용되며, 실제 Raw Data의 가공 및
      결과 저장은 가공 작업을 통해 처리합니다.
    </div>

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
        @click="router.push('/transform-rule')"
      >
        취소
      </button>

      <button
        type="button"
        :disabled="isSaving"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="addTransformRule"
      >
        {{ isSaving ? '등록 중...' : '등록' }}
      </button>
    </div>
  </div>
</template>
