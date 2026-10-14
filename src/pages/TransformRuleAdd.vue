<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createTransformRule } from '@/api/transformRuleApi'
import { parseXmlTree } from '@/utils/xmlUtils'

const router = useRouter()

const isSaving = ref(false)
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

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500'

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

const addField = () => {
  fields.value.push({
    sourcePath: '',
    targetName: '',
    dataType: 'STRING',
    valueFormat: '',
    requiredYn: 'N',
  })
}

const removeField = (index) => {
  fields.value.splice(index, 1)
}

const validateForm = () => {
  errorMessage.value = ''

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

  if (!validateSample()) {
    errorMessage.value = '샘플 데이터 형식을 확인해주세요.'
    return false
  }

  if (fields.value.length === 0) {
    errorMessage.value = '추출 필드를 최소 1개 이상 추가해주세요.'
    return false
  }

  const targetNames = new Set()

  for (const field of fields.value) {
    const sourcePath = field.sourcePath.trim()
    const targetName = field.targetName.trim()

    if (!sourcePath || !targetName) {
      errorMessage.value = '모든 추출 필드의 원본 경로와 출력 필드명을 입력해주세요.'
      return false
    }

    if (sourcePath.length > 1000 || targetName.length > 100) {
      errorMessage.value = '추출 필드 경로 또는 출력 필드명의 길이가 제한을 초과했습니다.'
      return false
    }

    if (targetNames.has(targetName)) {
      errorMessage.value = `출력 필드명이 중복되었습니다: ${targetName}`
      return false
    }

    targetNames.add(targetName)

    if (field.valueFormat.trim().length > 100) {
      errorMessage.value = '날짜 입력 형식은 100자 이하여야 합니다.'
      return false
    }
  }

  return true
}

const getSourceValue = (data, sourcePath) => {
  return sourcePath.split('.').reduce((value, key) => {
    if (value === null || value === undefined || typeof value !== 'object') {
      return undefined
    }

    if (!Object.hasOwn(value, key)) {
      return undefined
    }

    return value[key]
  }, data)
}

const convertFieldValue = (value, field) => {
  // 1. 필수 필드 여부를 확인한다.
  if (value === null || value === undefined || value === '') {
    if (field.requiredYn === 'Y') {
      throw new Error(`필수 필드 값이 없습니다: ${field.targetName}`)
    }

    return null
  }

  // 2. 설정한 데이터 타입에 맞게 변환한다.
  switch (field.dataType) {
    case 'STRING':
      return typeof value === 'object' ? JSON.stringify(value) : String(value)

    case 'INTEGER': {
      if (typeof value === 'boolean' || typeof value === 'object') {
        throw new Error(`정수 변환에 실패했습니다: ${field.targetName}`)
      }

      const number = Number(value)

      if (!Number.isSafeInteger(number)) {
        throw new Error(`정수 변환에 실패했습니다: ${field.targetName}`)
      }

      return number
    }

    case 'DECIMAL': {
      if (typeof value === 'boolean' || typeof value === 'object') {
        throw new Error(`실수 변환에 실패했습니다: ${field.targetName}`)
      }

      const number = Number(value)

      if (!Number.isFinite(number)) {
        throw new Error(`실수 변환에 실패했습니다: ${field.targetName}`)
      }

      return number
    }

    case 'BOOLEAN':
      if (typeof value === 'boolean') {
        return value
      }

      if (value === 1 || value === '1' || value === 'true') {
        return true
      }

      if (value === 0 || value === '0' || value === 'false') {
        return false
      }

      throw new Error(`BOOLEAN 변환에 실패했습니다: ${field.targetName}`)

    case 'DATETIME': {
      if (field.valueFormat === 'EPOCH_MILLIS') {
        if (typeof value === 'boolean' || typeof value === 'object' || !String(value).trim()) {
          throw new Error(`날짜 변환에 실패했습니다: ${field.targetName}`)
        }

        const millis = Number(value)
        const date = new Date(millis)

        if (!Number.isFinite(millis) || Number.isNaN(date.getTime())) {
          throw new Error(`날짜 변환에 실패했습니다: ${field.targetName}`)
        }

        return date.toISOString()
      }

      if (field.valueFormat === 'ISO_DATETIME') {
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
            value,
          ) ||
          Number.isNaN(Date.parse(value))
        ) {
          throw new Error(`날짜 형식이 올바르지 않습니다: ${field.targetName}`)
        }

        return value
      }

      throw new Error(`날짜 입력 형식을 선택해주세요: ${field.targetName}`)
    }

    default:
      throw new Error(`지원하지 않는 데이터 타입입니다: ${field.dataType}`)
  }
}

// JSON 가공 결과 미리보기
const previewTransformRule = () => {
  previewResult.value = null
  previewError.value = ''
  isPreviewed.value = false

  // 1. 입력값과 샘플 데이터 형식을 검증한다.
  if (!validateForm()) {
    return
  }

  if (version.value.dataFormat !== 'JSON') {
    previewError.value = '현재 미리보기는 JSON 형식만 지원합니다.'
    return
  }

  try {
    // 2. 반복 경로에 해당하는 데이터를 조회한다.
    const sample = parsedSample.value.value
    const repeatPath = version.value.repeatPath.trim()
    const target = repeatPath ? getSourceValue(sample, repeatPath) : sample

    if (target === null || target === undefined) {
      throw new Error('반복 경로에 해당하는 데이터가 없습니다.')
    }

    if (repeatPath && !Array.isArray(target)) {
      throw new Error('반복 경로는 JSON 배열을 가리켜야 합니다.')
    }

    const targets = Array.isArray(target) ? target : [target]

    // 3. 각 데이터에 필드 추출 및 타입 변환을 적용한다.
    const results = targets.map((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`${index + 1}번째 가공 대상은 JSON 객체여야 합니다.`)
      }

      const entries = fields.value.map((field) => {
        const value = getSourceValue(item, field.sourcePath.trim())

        try {
          return [field.targetName.trim(), convertFieldValue(value, field)]
        } catch (error) {
          throw new Error(`${index + 1}번째 데이터: ${error.message}`)
        }
      })

      return Object.fromEntries(entries)
    })

    // 4. 가공 결과를 화면에 설정한다.
    previewResult.value = Array.isArray(target) ? results : results[0]
    isPreviewed.value = true
  } catch (error) {
    console.error('가공 결과 미리보기 실패:', error)
    previewError.value = error.message || '가공 결과 미리보기에 실패했습니다.'
  }
}

// 입력값 변경 시 이전 미리보기 결과를 초기화한다.
watch(
  [sampleData, version, fields],
  () => {
    previewResult.value = null
    previewError.value = ''
    isPreviewed.value = false
  },
  { deep: true },
)

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
    fields: fields.value.map((field, index) => ({
      sourcePath: field.sourcePath.trim(),
      targetName: field.targetName.trim(),
      dataType: field.dataType,
      valueFormat: field.dataType === 'DATETIME' ? field.valueFormat.trim() || null : null,
      requiredYn: field.requiredYn,
      sortOrder: index,
    })),
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
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
            placeholder="예: USGS 지진 데이터 가공"
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

      <label class="mb-1 block text-sm font-medium text-gray-700"> 반복 경로 </label>

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
        반복 경로는 선택 사항입니다. 지정하지 않으면 최상위 객체는 1건, 최상위 배열은 요소별로
        가공합니다. 반복 경로를 지정하는 경우 JSON 배열을 가리켜야 합니다.
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
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                원본 경로 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="field.sourcePath"
                type="text"
                maxlength="1000"
                placeholder="예: properties.mag"
                :class="inputClass"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                출력 필드명 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="field.targetName"
                type="text"
                maxlength="100"
                placeholder="예: magnitude"
                :class="inputClass"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 데이터 타입 </label>
              <select v-model="field.dataType" :class="inputClass">
                <option value="STRING">STRING</option>
                <option value="INTEGER">INTEGER</option>
                <option value="DECIMAL">DECIMAL</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="DATETIME">DATETIME</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 필수 여부 </label>
              <select v-model="field.requiredYn" :class="inputClass">
                <option value="N">선택</option>
                <option value="Y">필수</option>
              </select>
            </div>

            <div v-if="field.dataType === 'DATETIME'" class="md:col-span-2">
              <label class="mb-1 block text-sm font-medium text-gray-700"> 날짜 입력 형식 </label>
              <select v-model="field.valueFormat" :class="inputClass">
                <option value="">형식 선택</option>
                <option value="ISO_DATETIME">ISO_DATETIME</option>
                <option value="EPOCH_MILLIS">EPOCH_MILLIS</option>
              </select>
              <p class="mt-1 text-xs text-gray-500">
                실제 날짜 변환은 가공 엔진 구현 시 지원합니다.
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
            샘플 JSON에 추출 경로와 데이터 타입 설정을 적용합니다.
          </p>
        </div>

        <button
          type="button"
          :disabled="isSaving || version.dataFormat !== 'JSON'"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="previewTransformRule"
        >
          미리보기 실행
        </button>
      </div>

      <p v-if="version.dataFormat === 'XML'" class="text-sm text-gray-500">
        XML 가공 미리보기는 추후 지원합니다.
      </p>

      <!-- 미리보기 오류 -->
      <div
        v-if="previewError"
        class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ previewError }}
      </div>

      <!-- 가공 결과 -->
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

      <!-- 실행 전 -->
      <div
        v-else-if="!previewError && version.dataFormat === 'JSON'"
        class="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
      >
        미리보기를 실행하면 가공된 JSON 결과가 표시됩니다.
      </div>
    </section>

    <!-- 안내 -->
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
      현재는 가공 규칙 설정만 저장합니다. JSON 샘플 데이터의 가공 결과는 미리보기에서 확인할 수
      있으며, 실제 Raw Data 가공 및 저장은 추후 지원합니다.
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
        {{ isSaving ? '등록 중...' : '규칙 등록' }}
      </button>
    </div>
  </div>
</template>
