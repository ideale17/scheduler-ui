<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createExternalApi } from '@/api/externalApi'
import { setFieldError } from '@/utils/formValidation'

const router = useRouter()

const apiNameInput = ref(null)
const apiUrlInput = ref(null)

const maxRetryCountInput = ref(null)
const retryIntervalSecInput = ref(null)

const authLocationInput = ref(null)
const authKeyInput = ref(null)
const authValueInput = ref(null)
const authUsernameInput = ref(null)
const authPasswordInput = ref(null)

const pageParamNameInput = ref(null)
const pageStartInput = ref(null)
const sizeParamNameInput = ref(null)
const pageSizeInput = ref(null)
const totalCountPathInput = ref(null)
const maxRequestCountInput = ref(null)

const paramNameInputs = ref([])
const paramValueInputs = ref([])
const paramFormatInputs = ref([])

const errors = ref({
  apiName: '',
  apiUrl: '',

  maxRetryCount: '',
  retryIntervalSec: '',

  authLocation: '',
  authKey: '',
  authValue: '',
  authUsername: '',
  authPassword: '',

  pageParamName: '',
  pageStart: '',
  sizeParamName: '',
  pageSize: '',
  totalCountPath: '',
  maxRequestCount: '',

  params: [],
})

const clearErrors = () => {
  errors.value = {
    apiName: '',
    apiUrl: '',

    maxRetryCount: '',
    retryIntervalSec: '',

    authLocation: '',
    authKey: '',
    authValue: '',
    authUsername: '',
    authPassword: '',

    pageParamName: '',
    pageStart: '',
    sizeParamName: '',
    pageSize: '',
    totalCountPath: '',
    maxRequestCount: '',

    params: [],
  }
}

const externalApi = ref({
  apiName: '',
  apiUrl: '',
  httpMethod: 'GET',
  enabled: 'Y',

  authType: 'NONE',
  authLocation: '',
  authKey: '',
  authValue: '',
  authUsername: '',
  authPassword: '',

  retryEnabled: 'N',
  maxRetryCount: '',
  retryIntervalSec: '',
  description: '',
})

const pagingEnabled = ref('N')

const paging = ref({
  enabled: 'Y',
  paginationType: 'PAGE',
  terminationType: 'TOTAL_COUNT',

  pageParamLocation: 'QUERY',
  pageParamName: '',
  pageStart: 1,

  sizeParamLocation: 'QUERY',
  sizeParamName: '',
  pageSize: '',

  totalCountPath: '',
  maxRequestCount: 100,
})

const params = ref([])

const createEmptyParam = () => {
  return {
    paramLocation: 'QUERY',
    paramName: '',
    valueType: 'STATIC',
    paramValue: '',
    valueFormat: '',
    requiredYn: 'N',
    sortOrder: params.value.length + 1,
    description: '',
  }
}

const addParam = () => {
  params.value.push(createEmptyParam())
}

const removeParam = (index) => {
  params.value.splice(index, 1)

  // 삭제 후 화면 순서에 맞게 정렬 순서를 다시 설정한다.
  params.value.forEach((param, paramIndex) => {
    param.sortOrder = paramIndex + 1
  })
}

const validateForm = () => {
  // 1. 기존 검증 오류를 초기화한다.
  clearErrors()

  // 2. 기본 정보 입력값을 검증한다.
  if (!externalApi.value.apiName.trim()) {
    return setFieldError(errors, 'apiName', 'API 이름을 입력해주세요.', apiNameInput.value)
  }

  if (!externalApi.value.apiUrl.trim()) {
    return setFieldError(errors, 'apiUrl', 'API URL을 입력해주세요.', apiUrlInput.value)
  }

  // 3. URL 형식과 프로토콜을 검증한다.
  let url

  try {
    url = new URL(externalApi.value.apiUrl.trim())
  } catch {
    return setFieldError(errors, 'apiUrl', '올바른 URL을 입력해주세요.', apiUrlInput.value)
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return setFieldError(
      errors,
      'apiUrl',
      'HTTP 또는 HTTPS URL만 사용할 수 있습니다.',
      apiUrlInput.value,
    )
  }

  // 4. 재시도 설정을 검증한다.
  if (externalApi.value.retryEnabled === 'Y') {
    if (!externalApi.value.maxRetryCount || externalApi.value.maxRetryCount <= 0) {
      return setFieldError(
        errors,
        'maxRetryCount',
        '최대 재시도 횟수는 1 이상이어야 합니다.',
        maxRetryCountInput.value,
      )
    }

    if (!externalApi.value.retryIntervalSec || externalApi.value.retryIntervalSec <= 0) {
      return setFieldError(
        errors,
        'retryIntervalSec',
        '재시도 간격은 1초 이상이어야 합니다.',
        retryIntervalSecInput.value,
      )
    }
  }

  // 5. 인증 방식별 필수 입력값을 검증한다.
  if (externalApi.value.authType === 'API_KEY') {
    if (!externalApi.value.authLocation) {
      return setFieldError(
        errors,
        'authLocation',
        'API Key 전달 위치를 선택해주세요.',
        authLocationInput.value,
      )
    }

    if (!externalApi.value.authKey.trim()) {
      return setFieldError(errors, 'authKey', 'API Key 이름을 입력해주세요.', authKeyInput.value)
    }

    if (!externalApi.value.authValue.trim()) {
      return setFieldError(errors, 'authValue', 'API Key 값을 입력해주세요.', authValueInput.value)
    }
  }

  if (externalApi.value.authType === 'BEARER') {
    if (!externalApi.value.authValue.trim()) {
      return setFieldError(
        errors,
        'authValue',
        'Bearer Token을 입력해주세요.',
        authValueInput.value,
      )
    }
  }

  if (externalApi.value.authType === 'BASIC') {
    if (!externalApi.value.authUsername.trim()) {
      return setFieldError(
        errors,
        'authUsername',
        'Basic Auth Username을 입력해주세요.',
        authUsernameInput.value,
      )
    }

    if (!externalApi.value.authPassword.trim()) {
      return setFieldError(
        errors,
        'authPassword',
        'Basic Auth Password를 입력해주세요.',
        authPasswordInput.value,
      )
    }
  }

  // 6. 페이징 사용 시 입력값을 검증한다.
  if (pagingEnabled.value === 'Y') {
    if (!paging.value.pageParamName.trim()) {
      return setFieldError(
        errors,
        'pageParamName',
        '페이지 번호 파라미터명을 입력해주세요.',
        pageParamNameInput.value,
      )
    }

    if (paging.value.pageStart === null || paging.value.pageStart < 0) {
      return setFieldError(
        errors,
        'pageStart',
        '시작 페이지는 0 이상이어야 합니다.',
        pageStartInput.value,
      )
    }

    if (!paging.value.sizeParamName.trim()) {
      return setFieldError(
        errors,
        'sizeParamName',
        '페이지 크기 파라미터명을 입력해주세요.',
        sizeParamNameInput.value,
      )
    }

    if (!paging.value.pageSize || paging.value.pageSize <= 0) {
      return setFieldError(
        errors,
        'pageSize',
        '페이지당 조회 건수는 1 이상이어야 합니다.',
        pageSizeInput.value,
      )
    }

    if (!paging.value.totalCountPath.trim()) {
      return setFieldError(
        errors,
        'totalCountPath',
        '전체 건수 경로를 입력해주세요.',
        totalCountPathInput.value,
      )
    }

    if (!paging.value.maxRequestCount || paging.value.maxRequestCount <= 0) {
      return setFieldError(
        errors,
        'maxRequestCount',
        '최대 요청 횟수는 1 이상이어야 합니다.',
        maxRequestCountInput.value,
      )
    }
  }

  // 7. 파라미터 입력값을 검증한다.
  for (let i = 0; i < params.value.length; i += 1) {
    const param = params.value[i]

    if (!errors.value.params[i]) {
      errors.value.params[i] = {
        paramName: '',
        paramValue: '',
        valueFormat: '',
      }
    }

    if (!param.paramName.trim()) {
      errors.value.params[i].paramName = '파라미터 이름을 입력해주세요.'
      paramNameInputs.value[i]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      paramNameInputs.value[i]?.focus()

      return false
    }

    if (param.valueType === 'STATIC' && !param.paramValue.trim() && param.requiredYn === 'Y') {
      errors.value.params[i].paramValue = '필수 파라미터 값을 입력해주세요.'
      paramValueInputs.value[i]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      paramValueInputs.value[i]?.focus()

      return false
    }

    if (param.valueType !== 'STATIC' && !param.valueFormat.trim()) {
      errors.value.params[i].valueFormat = '포맷을 입력해주세요.'
      paramFormatInputs.value[i]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      paramFormatInputs.value[i]?.focus()

      return false
    }
  }

  return true
}

const addExternalApi = async () => {
  if (!validateForm()) {
    return
  }

  if (!confirm('External API를 등록하시겠습니까?')) {
    return
  }

  if (externalApi.value.retryEnabled === 'N') {
    externalApi.value.maxRetryCount = 0
    externalApi.value.retryIntervalSec = 0
  }

  try {
    // 1. 현재 인증 방식을 조회한다.
    const authType = externalApi.value.authType

    // 2. 백엔드 등록 요청 형식으로 데이터를 구성한다.
    const requestData = {
      externalApi: {
        ...externalApi.value,
        authLocation: authType === 'API_KEY' ? externalApi.value.authLocation || null : null,
        authKey: authType === 'API_KEY' ? externalApi.value.authKey || null : null,
        authValue:
          authType === 'API_KEY' || authType === 'BEARER'
            ? externalApi.value.authValue || null
            : null,
        authUsername: authType === 'BASIC' ? externalApi.value.authUsername || null : null,
        authPassword: authType === 'BASIC' ? externalApi.value.authPassword || null : null,
      },

      paging:
        pagingEnabled.value === 'Y'
          ? {
              ...paging.value,
              enabled: 'Y',
            }
          : null,

      params: params.value.map((param) => ({
        ...param,
        paramValue: param.valueType === 'STATIC' ? param.paramValue || null : null,
        valueFormat: param.valueType === 'STATIC' ? null : param.valueFormat || null,
        description: param.description || null,
      })),
    }

    // 3. External API 등록 API를 호출한다.
    await createExternalApi(requestData)

    // 4. 등록 완료 후 목록 화면으로 이동한다.
    alert('External API 등록 성공')
    router.push('/externalApi')
  } catch (error) {
    console.error('External API 등록 실패:', error)
    alert('External API 등록 실패')
  }
}

watch(
  () => externalApi.value.authType,
  () => {
    // 1. 인증 방식이 변경되면 기존 인증 정보를 초기화한다.
    externalApi.value.authLocation = ''
    externalApi.value.authKey = ''
    externalApi.value.authValue = ''
    externalApi.value.authUsername = ''
    externalApi.value.authPassword = ''
  },
)
</script>

<template>
  <div class="space-y-4">
    <!-- 기본 정보 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>
        <p class="mt-1 text-sm text-gray-500">External API의 기본 호출 정보를 설정합니다.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            API 이름
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="apiNameInput"
            v-model="externalApi.apiName"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.apiName = ''"
          />

          <p v-if="errors.apiName" class="mt-1 text-sm text-red-600">
            {{ errors.apiName }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> HTTP Method </label>

          <select
            v-model="externalApi.httpMethod"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            API URL
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="apiUrlInput"
            v-model="externalApi.apiUrl"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.apiUrl = ''"
          />

          <p v-if="errors.apiUrl" class="mt-1 text-sm text-red-600">
            {{ errors.apiUrl }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 사용 여부 </label>

          <select
            v-model="externalApi.enabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 재시도 사용 여부 </label>

          <select
            v-model="externalApi.retryEnabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="N">미사용</option>
            <option value="Y">사용</option>
          </select>
        </div>

        <div v-if="externalApi.retryEnabled === 'Y'">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            최대 재시도 횟수
            <span class="text-red-500">*</span>
          </label>

          <select
            ref="maxRetryCountInput"
            v-model.number="externalApi.maxRetryCount"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @change="errors.maxRetryCount = ''"
          >
            <option value="">선택</option>
            <option :value="1">1회</option>
            <option :value="2">2회</option>
            <option :value="3">3회</option>
            <option :value="5">5회</option>
          </select>

          <p v-if="errors.maxRetryCount" class="mt-1 text-sm text-red-600">
            {{ errors.maxRetryCount }}
          </p>
        </div>

        <div v-if="externalApi.retryEnabled === 'Y'">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            재시도 간격
            <span class="text-red-500">*</span>
          </label>

          <select
            ref="retryIntervalSecInput"
            v-model.number="externalApi.retryIntervalSec"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @change="errors.retryIntervalSec = ''"
          >
            <option value="">선택</option>
            <option :value="5">5초</option>
            <option :value="10">10초</option>
            <option :value="30">30초</option>
            <option :value="60">1분</option>
          </select>

          <p v-if="errors.retryIntervalSec" class="mt-1 text-sm text-red-600">
            {{ errors.retryIntervalSec }}
          </p>
        </div>

        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-gray-700"> 설명 </label>

          <input
            v-model="externalApi.description"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
      </div>
    </section>

    <!-- 인증 정보 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">인증 정보</h3>
        <p class="mt-1 text-sm text-gray-500">API 호출에 사용할 인증 방식을 설정합니다.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 인증 방식 </label>

          <select
            v-model="externalApi.authType"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="NONE">인증 없음</option>
            <option value="API_KEY">API Key</option>
            <option value="BEARER">Bearer Token</option>
            <option value="BASIC">Basic Auth</option>
          </select>
        </div>

        <template v-if="externalApi.authType === 'API_KEY'">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              전달 위치
              <span class="text-red-500">*</span>
            </label>

            <select
              ref="authLocationInput"
              v-model="externalApi.authLocation"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @change="errors.authLocation = ''"
            >
              <option value="">선택</option>
              <option value="HEADER">HEADER</option>
              <option value="QUERY">QUERY</option>
            </select>

            <p v-if="errors.authLocation" class="mt-1 text-sm text-red-600">
              {{ errors.authLocation }}
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Key 이름
              <span class="text-red-500">*</span>
            </label>

            <input
              ref="authKeyInput"
              v-model="externalApi.authKey"
              type="text"
              placeholder="예: serviceKey"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @input="errors.authKey = ''"
            />

            <p v-if="errors.authKey" class="mt-1 text-sm text-red-600">
              {{ errors.authKey }}
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              API Key
              <span class="text-red-500">*</span>
            </label>

            <input
              ref="authValueInput"
              v-model="externalApi.authValue"
              type="password"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @input="errors.authValue = ''"
            />

            <p v-if="errors.authValue" class="mt-1 text-sm text-red-600">
              {{ errors.authValue }}
            </p>
          </div>
        </template>

        <template v-if="externalApi.authType === 'BEARER'">
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Bearer Token
              <span class="text-red-500">*</span>
            </label>

            <input
              ref="authValueInput"
              v-model="externalApi.authValue"
              type="password"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @input="errors.authValue = ''"
            />

            <p v-if="errors.authValue" class="mt-1 text-sm text-red-600">
              {{ errors.authValue }}
            </p>
          </div>
        </template>

        <template v-if="externalApi.authType === 'BASIC'">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Username
              <span class="text-red-500">*</span>
            </label>

            <input
              ref="authUsernameInput"
              v-model="externalApi.authUsername"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @input="errors.authUsername = ''"
            />

            <p v-if="errors.authUsername" class="mt-1 text-sm text-red-600">
              {{ errors.authUsername }}
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              Password
              <span class="text-red-500">*</span>
            </label>

            <input
              ref="authPasswordInput"
              v-model="externalApi.authPassword"
              type="password"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @input="errors.authPassword = ''"
            />

            <p v-if="errors.authPassword" class="mt-1 text-sm text-red-600">
              {{ errors.authPassword }}
            </p>
          </div>
        </template>
      </div>
    </section>

    <!-- 페이징 설정 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">페이징 설정</h3>
        <p class="mt-1 text-sm text-gray-500">
          여러 페이지로 제공되는 API의 반복 호출 방식을 설정합니다.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 페이징 사용 여부 </label>

          <select
            v-model="pagingEnabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="N">미사용</option>
            <option value="Y">사용</option>
          </select>
        </div>
      </div>

      <div
        v-if="pagingEnabled === 'Y'"
        class="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 md:grid-cols-2"
      >
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 페이징 방식 </label>

          <select
            v-model="paging.paginationType"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="PAGE">PAGE</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 종료 조건 </label>

          <select
            v-model="paging.terminationType"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="TOTAL_COUNT">TOTAL_COUNT</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            페이지 번호 전달 위치
          </label>

          <select
            v-model="paging.pageParamLocation"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="QUERY">QUERY</option>
            <option value="BODY">BODY</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            페이지 번호 파라미터명
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="pageParamNameInput"
            v-model="paging.pageParamName"
            type="text"
            placeholder="예: pageNo"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.pageParamName = ''"
          />

          <p v-if="errors.pageParamName" class="mt-1 text-sm text-red-600">
            {{ errors.pageParamName }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            시작 페이지
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="pageStartInput"
            v-model.number="paging.pageStart"
            type="number"
            min="0"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.pageStart = ''"
          />

          <p v-if="errors.pageStart" class="mt-1 text-sm text-red-600">
            {{ errors.pageStart }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            페이지 크기 전달 위치
          </label>

          <select
            v-model="paging.sizeParamLocation"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="QUERY">QUERY</option>
            <option value="BODY">BODY</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            페이지 크기 파라미터명
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="sizeParamNameInput"
            v-model="paging.sizeParamName"
            type="text"
            placeholder="예: numOfRows"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.sizeParamName = ''"
          />

          <p v-if="errors.sizeParamName" class="mt-1 text-sm text-red-600">
            {{ errors.sizeParamName }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            페이지당 조회 건수
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="pageSizeInput"
            v-model.number="paging.pageSize"
            type="number"
            min="1"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.pageSize = ''"
          />

          <p v-if="errors.pageSize" class="mt-1 text-sm text-red-600">
            {{ errors.pageSize }}
          </p>
        </div>

        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            전체 건수 경로
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="totalCountPathInput"
            v-model="paging.totalCountPath"
            type="text"
            placeholder="예: response.body.totalCount"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.totalCountPath = ''"
          />

          <p v-if="errors.totalCountPath" class="mt-1 text-sm text-red-600">
            {{ errors.totalCountPath }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            최대 요청 횟수
            <span class="text-red-500">*</span>
          </label>

          <input
            ref="maxRequestCountInput"
            v-model.number="paging.maxRequestCount"
            type="number"
            min="1"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            @input="errors.maxRequestCount = ''"
          />

          <p v-if="errors.maxRequestCount" class="mt-1 text-sm text-red-600">
            {{ errors.maxRequestCount }}
          </p>

          <p class="mt-1 text-xs text-gray-500">
            페이징 오류로 인한 과도한 API 호출을 방지하는 최대 요청 횟수입니다.
          </p>
        </div>
      </div>
    </section>

    <!-- 파라미터 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-gray-900">파라미터</h3>
          <p class="mt-1 text-sm text-gray-500">
            API 호출 시 전달할 Header, Query, Body 파라미터를 설정합니다.
          </p>
        </div>

        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="addParam"
        >
          파라미터 추가
        </button>
      </div>

      <div
        v-if="params.length === 0"
        class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center"
      >
        <p class="text-sm text-gray-500">등록된 파라미터가 없습니다.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(param, index) in params"
          :key="index"
          class="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 위치 </label>

              <select
                v-model="param.paramLocation"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="HEADER">HEADER</option>
                <option value="QUERY">QUERY</option>
                <option value="BODY">BODY</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                이름
                <span class="text-red-500">*</span>
              </label>

              <input
                :ref="(el) => (paramNameInputs[index] = el)"
                v-model="param.paramName"
                type="text"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
                @input="errors.params[index] && (errors.params[index].paramName = '')"
              />

              <p v-if="errors.params[index]?.paramName" class="mt-1 text-xs text-red-600">
                {{ errors.params[index].paramName }}
              </p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 값 유형 </label>

              <select
                v-model="param.valueType"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="STATIC">STATIC</option>
                <option value="CURRENT_DATE">CURRENT_DATE</option>
                <option value="CURRENT_TIME">CURRENT_TIME</option>
                <option value="CURRENT_DATETIME">CURRENT_DATETIME</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 필수 여부 </label>

              <select
                v-model="param.requiredYn"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="N">선택</option>
                <option value="Y">필수</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                값
                <span
                  v-if="param.valueType === 'STATIC' && param.requiredYn === 'Y'"
                  class="text-red-500"
                >
                  *
                </span>
              </label>

              <input
                :ref="(el) => (paramValueInputs[index] = el)"
                v-model="param.paramValue"
                type="text"
                :disabled="param.valueType !== 'STATIC'"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
                @input="errors.params[index] && (errors.params[index].paramValue = '')"
              />

              <p v-if="errors.params[index]?.paramValue" class="mt-1 text-xs text-red-600">
                {{ errors.params[index].paramValue }}
              </p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                포맷
                <span v-if="param.valueType !== 'STATIC'" class="text-red-500">*</span>
              </label>

              <input
                :ref="(el) => (paramFormatInputs[index] = el)"
                v-model="param.valueFormat"
                type="text"
                :disabled="param.valueType === 'STATIC'"
                placeholder="예: yyyyMMdd"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
                @input="errors.params[index] && (errors.params[index].valueFormat = '')"
              />

              <p v-if="errors.params[index]?.valueFormat" class="mt-1 text-xs text-red-600">
                {{ errors.params[index].valueFormat }}
              </p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 정렬 순서 </label>

              <input
                v-model.number="param.sortOrder"
                type="number"
                min="0"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700"> 설명 </label>

              <input
                v-model="param.description"
                type="text"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>
          </div>

          <div class="mt-3 flex justify-end">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              @click="removeParam(index)"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 하단 버튼 -->
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="router.push('/externalApi')"
      >
        취소
      </button>

      <button
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="addExternalApi"
      >
        등록
      </button>
    </div>
  </div>
</template>
