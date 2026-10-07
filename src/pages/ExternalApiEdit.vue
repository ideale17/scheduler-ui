<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getExternalApi,
  getExternalApiPaging,
  getExternalApiParams,
  updateExternalApiBasic,
  updateExternalApiAuth,
  updateExternalApiParams,
  saveExternalApiPaging,
  deleteExternalApiPaging,
} from '@/api/externalApi'
import { moveToField, setFieldError } from '@/utils/formValidation'

const route = useRoute()
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

const clearBasicErrors = () => {
  errors.value.apiName = ''
  errors.value.apiUrl = ''
  errors.value.maxRetryCount = ''
  errors.value.retryIntervalSec = ''
}

const clearAuthErrors = () => {
  errors.value.authLocation = ''
  errors.value.authKey = ''
  errors.value.authValue = ''
  errors.value.authUsername = ''
  errors.value.authPassword = ''
}

const clearPagingErrors = () => {
  errors.value.pageParamName = ''
  errors.value.pageStart = ''
  errors.value.sizeParamName = ''
  errors.value.pageSize = ''
  errors.value.totalCountPath = ''
  errors.value.maxRequestCount = ''
}

const clearParamErrors = () => {
  errors.value.params = []
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
  authValueConfigured: false,
  authPasswordConfigured: false,

  retryEnabled: 'N',
  maxRetryCount: '',
  retryIntervalSec: '',
  description: '',
})

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

const pagingConfigured = ref(false)

const params = ref([])
const loading = ref(true)
const savedAuthType = ref('NONE')

const fetchExternalApi = async () => {
  try {
    // 1. URL에서 External API 식별자를 조회한다.
    const externalApiId = route.params.externalApiId

    // 2. External API 기본정보와 파라미터를 조회한다.
    const [externalApiResponse, pagingResponse, paramsResponse] = await Promise.all([
      getExternalApi(externalApiId),
      getExternalApiPaging(externalApiId),
      getExternalApiParams(externalApiId),
    ])

    savedAuthType.value = externalApiResponse.data.authType ?? 'NONE'

    // 3. 조회한 기본정보를 수정 화면에 설정한다.
    externalApi.value = {
      apiName: externalApiResponse.data.apiName,
      apiUrl: externalApiResponse.data.apiUrl,
      httpMethod: externalApiResponse.data.httpMethod,
      enabled: externalApiResponse.data.enabled,

      authType: externalApiResponse.data.authType || 'NONE',
      authLocation: externalApiResponse.data.authLocation || '',
      authKey: externalApiResponse.data.authKey || '',

      // 비밀값은 서버에서 조회하지 않고 새 값 입력용으로 비워둔다.
      authValue: '',

      authUsername: externalApiResponse.data.authUsername || '',

      // 비밀값은 서버에서 조회하지 않고 새 값 입력용으로 비워둔다.
      authPassword: '',

      authValueConfigured: externalApiResponse.data.authValueConfigured ?? false,
      authPasswordConfigured: externalApiResponse.data.authPasswordConfigured ?? false,

      retryEnabled: externalApiResponse.data.retryEnabled ?? 'N',
      maxRetryCount:
        externalApiResponse.data.retryEnabled === 'Y'
          ? (externalApiResponse.data.maxRetryCount ?? '')
          : '',
      retryIntervalSec:
        externalApiResponse.data.retryEnabled === 'Y'
          ? (externalApiResponse.data.retryIntervalSec ?? '')
          : '',
      description: externalApiResponse.data.description || '',
    }

    // 4. 조회한 페이징 설정을 화면에 설정한다.
    if (pagingResponse.data) {
      pagingConfigured.value = true

      paging.value = {
        enabled: pagingResponse.data.enabled ?? 'Y',
        paginationType: pagingResponse.data.paginationType ?? 'PAGE',
        terminationType: pagingResponse.data.terminationType ?? 'TOTAL_COUNT',

        pageParamLocation: pagingResponse.data.pageParamLocation ?? 'QUERY',
        pageParamName: pagingResponse.data.pageParamName ?? '',
        pageStart: pagingResponse.data.pageStart ?? 1,

        sizeParamLocation: pagingResponse.data.sizeParamLocation ?? 'QUERY',
        sizeParamName: pagingResponse.data.sizeParamName ?? '',
        pageSize: pagingResponse.data.pageSize ?? '',

        totalCountPath: pagingResponse.data.totalCountPath ?? '',
        maxRequestCount: pagingResponse.data.maxRequestCount ?? 100,
      }
    } else {
      pagingConfigured.value = false

      paging.value = {
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
      }
    }

    // 5. 조회한 파라미터를 수정 화면에 설정한다.
    params.value = Array.isArray(paramsResponse.data)
      ? paramsResponse.data.map((param) => ({
          paramLocation: param.paramLocation,
          paramName: param.paramName,
          valueType: param.valueType,
          paramValue: param.paramValue || '',
          valueFormat: param.valueFormat || '',
          requiredYn: param.requiredYn,
          sortOrder: param.sortOrder,
          description: param.description || '',
        }))
      : []
  } catch (error) {
    console.error('External API 수정 정보 조회 실패:', error)
    alert('External API 수정 정보를 조회하지 못했습니다.')
    router.push('/externalApi')
  } finally {
    loading.value = false
  }
}

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

const changeAuthType = () => {
  // 1. 사용자가 인증 방식을 변경하면 기존 인증 입력값을 초기화한다.
  externalApi.value.authLocation = ''
  externalApi.value.authKey = ''
  externalApi.value.authValue = ''
  externalApi.value.authUsername = ''
  externalApi.value.authPassword = ''

  // 2. 기존 인증 검증 오류를 초기화한다.
  clearAuthErrors()
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

const validateBasicInfo = () => {
  // 1. 기존 기본 정보 검증 오류를 초기화한다.
  clearBasicErrors()

  // 2. API 이름을 검증한다.
  if (!externalApi.value.apiName.trim()) {
    return setFieldError(errors, 'apiName', 'API 이름을 입력해주세요.', apiNameInput.value)
  }

  // 3. API URL을 검증한다.
  if (!externalApi.value.apiUrl.trim()) {
    return setFieldError(errors, 'apiUrl', 'API URL을 입력해주세요.', apiUrlInput.value)
  }

  let url

  try {
    url = new URL(externalApi.value.apiUrl.trim())
  } catch {
    return setFieldError(errors, 'apiUrl', '올바른 URL을 입력해주세요.', apiUrlInput.value)
  }

  // 4. 프로토콜을 검증한다.
  if (!['http:', 'https:'].includes(url.protocol)) {
    return setFieldError(
      errors,
      'apiUrl',
      'HTTP 또는 HTTPS URL만 사용할 수 있습니다.',
      apiUrlInput.value,
    )
  }

  // 5. 재시도 설정을 검증한다.
  if (externalApi.value.retryEnabled === 'Y') {
    if (!externalApi.value.maxRetryCount) {
      return setFieldError(
        errors,
        'maxRetryCount',
        '최대 재시도 횟수를 선택해주세요.',
        maxRetryCountInput.value,
      )
    }

    if (!externalApi.value.retryIntervalSec) {
      return setFieldError(
        errors,
        'retryIntervalSec',
        '재시도 간격을 선택해주세요.',
        retryIntervalSecInput.value,
      )
    }
  }

  return true
}

const validateAuthInfo = () => {
  // 1. 기존 인증 정보 검증 오류를 초기화한다.
  clearAuthErrors()

  // 2. API Key 인증 정보를 검증한다.
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

    const hasExistingAuthValue =
      savedAuthType.value === 'API_KEY' && externalApi.value.authValueConfigured

    if (!hasExistingAuthValue && !externalApi.value.authValue.trim()) {
      return setFieldError(errors, 'authValue', 'API Key 값을 입력해주세요.', authValueInput.value)
    }
  }

  // 3. Bearer Token 인증 정보를 검증한다.
  if (externalApi.value.authType === 'BEARER') {
    const hasExistingAuthValue =
      savedAuthType.value === 'BEARER' && externalApi.value.authValueConfigured

    if (!hasExistingAuthValue && !externalApi.value.authValue.trim()) {
      return setFieldError(
        errors,
        'authValue',
        'Bearer Token을 입력해주세요.',
        authValueInput.value,
      )
    }
  }

  // 4. Basic Auth 인증 정보를 검증한다.
  if (externalApi.value.authType === 'BASIC') {
    if (!externalApi.value.authUsername.trim()) {
      return setFieldError(
        errors,
        'authUsername',
        'Basic Auth Username을 입력해주세요.',
        authUsernameInput.value,
      )
    }

    const hasExistingPassword =
      savedAuthType.value === 'BASIC' && externalApi.value.authPasswordConfigured

    if (!hasExistingPassword && !externalApi.value.authPassword.trim()) {
      return setFieldError(
        errors,
        'authPassword',
        'Basic Auth Password를 입력해주세요.',
        authPasswordInput.value,
      )
    }
  }

  return true
}

const validatePaging = () => {
  // 1. 기존 페이징 검증 오류를 초기화한다.
  clearPagingErrors()

  // 2. 페이지 번호 파라미터명을 검증한다.
  if (!paging.value.pageParamName.trim()) {
    return setFieldError(
      errors,
      'pageParamName',
      '페이지 번호 파라미터명을 입력해주세요.',
      pageParamNameInput.value,
    )
  }

  // 3. 시작 페이지를 검증한다.
  if (paging.value.pageStart === null || paging.value.pageStart < 0) {
    return setFieldError(
      errors,
      'pageStart',
      '시작 페이지는 0 이상이어야 합니다.',
      pageStartInput.value,
    )
  }

  // 4. 페이지 크기 파라미터명을 검증한다.
  if (!paging.value.sizeParamName.trim()) {
    return setFieldError(
      errors,
      'sizeParamName',
      '페이지 크기 파라미터명을 입력해주세요.',
      sizeParamNameInput.value,
    )
  }

  // 5. 페이지당 조회 건수를 검증한다.
  if (!paging.value.pageSize || paging.value.pageSize <= 0) {
    return setFieldError(
      errors,
      'pageSize',
      '페이지당 조회 건수는 1 이상이어야 합니다.',
      pageSizeInput.value,
    )
  }

  // 6. 전체 건수 경로를 검증한다.
  if (!paging.value.totalCountPath.trim()) {
    return setFieldError(
      errors,
      'totalCountPath',
      '전체 건수 경로를 입력해주세요.',
      totalCountPathInput.value,
    )
  }

  // 7. 최대 요청 횟수를 검증한다.
  if (!paging.value.maxRequestCount || paging.value.maxRequestCount <= 0) {
    return setFieldError(
      errors,
      'maxRequestCount',
      '최대 요청 횟수는 1 이상이어야 합니다.',
      maxRequestCountInput.value,
    )
  }

  return true
}

const validateParams = () => {
  // 1. 기존 파라미터 검증 오류를 초기화한다.
  clearParamErrors()

  // 2. 파라미터 입력값을 검증한다.
  for (let i = 0; i < params.value.length; i += 1) {
    const param = params.value[i]

    errors.value.params[i] = {
      paramName: '',
      paramValue: '',
      valueFormat: '',
    }

    if (!param.paramName.trim()) {
      errors.value.params[i].paramName = '파라미터 이름을 입력해주세요.'
      moveToField(paramNameInputs.value[i])
      return false
    }

    if (param.valueType === 'STATIC' && !param.paramValue.trim() && param.requiredYn === 'Y') {
      errors.value.params[i].paramValue = '필수 파라미터 값을 입력해주세요.'
      moveToField(paramValueInputs.value[i])
      return false
    }

    if (param.valueType !== 'STATIC' && !param.valueFormat.trim()) {
      errors.value.params[i].valueFormat = '포맷을 입력해주세요.'
      moveToField(paramFormatInputs.value[i])
      return false
    }
  }

  return true
}

const saveBasicInfo = async () => {
  // 1. 기본 정보 입력값을 검증한다.
  if (!validateBasicInfo()) {
    return
  }

  // 2. 수정 여부를 확인한다.
  if (!confirm('기본 정보를 수정하시겠습니까?')) {
    return
  }

  try {
    // 3. 재시도를 사용하지 않으면 관련 값을 0으로 설정한다.
    const retryEnabled = externalApi.value.retryEnabled

    // 4. 기본 정보 수정 요청 데이터를 구성한다.
    const basic = {
      apiName: externalApi.value.apiName,
      apiUrl: externalApi.value.apiUrl,
      httpMethod: externalApi.value.httpMethod,
      enabled: externalApi.value.enabled,

      retryEnabled,
      maxRetryCount: retryEnabled === 'Y' ? externalApi.value.maxRetryCount : 0,
      retryIntervalSec: retryEnabled === 'Y' ? externalApi.value.retryIntervalSec : 0,

      description: externalApi.value.description || null,
    }

    // 5. External API 기본 정보를 수정한다.
    await updateExternalApiBasic(route.params.externalApiId, basic)

    // 6. 수정된 정보를 다시 조회한다.
    await fetchExternalApi()

    // 7. 수정 성공 결과를 표시한다.
    alert('External API 기본 정보 수정 성공')
  } catch (error) {
    console.error('External API 기본 정보 수정 실패:', error)
    alert('External API 기본 정보 수정 실패')
  }
}

const saveAuthInfo = async () => {
  // 1. 인증 정보 입력값을 검증한다.
  if (!validateAuthInfo()) {
    return
  }

  // 2. 수정 여부를 확인한다.
  if (!confirm('인증 정보를 수정하시겠습니까?')) {
    return
  }

  try {
    // 3. 현재 인증 방식을 확인한다.
    const authType = externalApi.value.authType

    // 4. 인증 방식에 따라 수정 요청 데이터를 구성한다.
    const auth = {
      authType,
      authLocation: authType === 'API_KEY' ? externalApi.value.authLocation || null : null,
      authKey: authType === 'API_KEY' ? externalApi.value.authKey || null : null,
      authValue:
        authType === 'API_KEY' || authType === 'BEARER'
          ? externalApi.value.authValue || null
          : null,
      authUsername: authType === 'BASIC' ? externalApi.value.authUsername || null : null,
      authPassword: authType === 'BASIC' ? externalApi.value.authPassword || null : null,
    }

    // 5. External API 인증 정보를 수정한다.
    await updateExternalApiAuth(route.params.externalApiId, auth)

    // 6. 수정된 정보를 다시 조회한다.
    await fetchExternalApi()

    // 7. 수정 성공 결과를 표시한다.
    alert('External API 인증 정보 수정 성공')
  } catch (error) {
    console.error('External API 인증 정보 수정 실패:', error)
    alert('External API 인증 정보 수정 실패')
  }
}

const savePaging = async () => {
  // 1. 페이징 설정을 검증한다.
  if (!validatePaging()) {
    return
  }

  // 2. 저장 여부를 확인한다.
  if (!confirm('페이징 설정을 저장하시겠습니까?')) {
    return
  }

  try {
    // 3. External API 페이징 설정을 저장한다.
    await saveExternalApiPaging(route.params.externalApiId, paging.value)

    // 4. 페이징 설정 상태를 갱신한다.
    pagingConfigured.value = true

    // 5. 수정된 정보를 다시 조회한다.
    await fetchExternalApi()

    // 6. 저장 성공 결과를 표시한다.
    alert('External API 페이징 설정 저장 성공')
  } catch (error) {
    console.error('External API 페이징 설정 저장 실패:', error)
    alert('External API 페이징 설정 저장 실패')
  }
}

const saveParams = async () => {
  // 1. 파라미터 입력값을 검증한다.
  if (!validateParams()) {
    return
  }

  // 2. 수정 여부를 확인한다.
  if (!confirm('파라미터 정보를 수정하시겠습니까?')) {
    return
  }

  try {
    // 3. 백엔드 수정 요청 형식으로 파라미터를 구성한다.
    const requestParams = params.value.map((param) => ({
      ...param,
      paramValue: param.valueType === 'STATIC' ? param.paramValue || null : null,
      valueFormat: param.valueType === 'STATIC' ? null : param.valueFormat || null,
      description: param.description || null,
    }))

    // 4. External API 파라미터를 수정한다.
    await updateExternalApiParams(route.params.externalApiId, requestParams)

    // 5. 수정된 정보를 다시 조회한다.
    await fetchExternalApi()

    // 6. 수정 성공 결과를 표시한다.
    alert('External API 파라미터 수정 성공')
  } catch (error) {
    console.error('External API 파라미터 수정 실패:', error)
    alert('External API 파라미터 수정 실패')
  }
}

const removePaging = async () => {
  // 1. 등록된 페이징 설정이 없으면 종료한다.
  if (!pagingConfigured.value) {
    alert('삭제할 페이징 설정이 없습니다.')
    return
  }

  // 2. 삭제 여부를 확인한다.
  if (!confirm('페이징 설정을 삭제하시겠습니까?')) {
    return
  }

  try {
    // 3. External API 페이징 설정을 삭제한다.
    await deleteExternalApiPaging(route.params.externalApiId)

    // 4. 수정된 정보를 다시 조회한다.
    await fetchExternalApi()

    // 5. 삭제 성공 결과를 표시한다.
    alert('External API 페이징 설정 삭제 성공')
  } catch (error) {
    console.error('External API 페이징 설정 삭제 실패:', error)
    alert('External API 페이징 설정 삭제 실패')
  }
}

onMounted(() => {
  fetchExternalApi()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 조회 중 -->
    <div
      v-if="loading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      External API 정보를 불러오는 중입니다.
    </div>

    <template v-else>
      <!-- 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>
          <p class="mt-1 text-sm text-gray-500">External API의 기본 호출 정보를 수정합니다.</p>
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

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            @click="saveBasicInfo"
          >
            기본 정보 저장
          </button>
        </div>
      </section>

      <!-- 인증 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-gray-900">인증 정보</h3>
          <p class="mt-1 text-sm text-gray-500">API 호출에 사용할 인증 방식을 수정합니다.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 인증 방식 </label>

            <select
              v-model="externalApi.authType"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @change="changeAuthType"
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
                <span v-if="!externalApi.authValueConfigured" class="text-red-500">*</span>
              </label>

              <input
                ref="authValueInput"
                v-model="externalApi.authValue"
                type="password"
                placeholder="변경할 경우에만 입력"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                @input="errors.authValue = ''"
              />

              <p v-if="errors.authValue" class="mt-1 text-sm text-red-600">
                {{ errors.authValue }}
              </p>

              <p
                v-if="externalApi.authType === savedAuthType && externalApi.authValueConfigured"
                class="mt-1 text-xs text-gray-500"
              >
                기존 API Key가 등록되어 있습니다. 변경할 경우에만 새 값을 입력하세요.
              </p>
            </div>
          </template>

          <template v-if="externalApi.authType === 'BEARER'">
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Bearer Token
                <span v-if="!externalApi.authValueConfigured" class="text-red-500">*</span>
              </label>

              <input
                ref="authValueInput"
                v-model="externalApi.authValue"
                type="password"
                placeholder="변경할 경우에만 입력"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                @input="errors.authValue = ''"
              />

              <p v-if="errors.authValue" class="mt-1 text-sm text-red-600">
                {{ errors.authValue }}
              </p>

              <p
                v-if="externalApi.authType === savedAuthType && externalApi.authValueConfigured"
                class="mt-1 text-xs text-gray-500"
              >
                기존 Bearer Token이 등록되어 있습니다. 변경할 경우에만 새 값을 입력하세요.
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
                <span v-if="!externalApi.authPasswordConfigured" class="text-red-500">*</span>
              </label>

              <input
                ref="authPasswordInput"
                v-model="externalApi.authPassword"
                type="password"
                placeholder="변경할 경우에만 입력"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                @input="errors.authPassword = ''"
              />

              <p v-if="errors.authPassword" class="mt-1 text-sm text-red-600">
                {{ errors.authPassword }}
              </p>

              <p
                v-if="externalApi.authType === savedAuthType && externalApi.authPasswordConfigured"
                class="mt-1 text-xs text-gray-500"
              >
                기존 Password가 등록되어 있습니다. 변경할 경우에만 새 값을 입력하세요.
              </p>
            </div>
          </template>
        </div>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            @click="saveAuthInfo"
          >
            인증 정보 저장
          </button>
        </div>
      </section>

      <!-- 페이징 설정 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-gray-900">페이징 설정</h3>
            <p class="mt-1 text-sm text-gray-500">
              여러 페이지로 제공되는 API의 반복 호출 방식을 설정합니다.
            </p>
          </div>

          <span
            class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            :class="pagingConfigured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ pagingConfigured ? '설정됨' : '미설정' }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div class="mt-5 flex justify-end gap-2">
          <button
            v-if="pagingConfigured"
            type="button"
            class="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            @click="removePaging"
          >
            페이징 설정 삭제
          </button>

          <button
            type="button"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            @click="savePaging"
          >
            페이징 설정 저장
          </button>
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

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            @click="saveParams"
          >
            파라미터 저장
          </button>
        </div>
      </section>

      <!-- 하단 이동 -->
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="router.push('/externalApi')"
        >
          목록
        </button>

        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="router.push(`/externalApi/${route.params.externalApiId}`)"
        >
          상세
        </button>
      </div>
    </template>
  </div>
</template>
