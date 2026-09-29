<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExternalApi, getExternalApiParams, updateExternalApi } from '@/api/externalApi'

const route = useRoute()
const router = useRouter()

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

const params = ref([])
const loading = ref(true)
const savedAuthType = ref('NONE')

const fetchExternalApi = async () => {
  try {
    // 1. URL에서 External API 식별자를 조회한다.
    const externalApiId = route.params.externalApiId

    // 2. External API 기본정보와 파라미터를 조회한다.
    const [externalApiResponse, paramsResponse] = await Promise.all([
      getExternalApi(externalApiId),
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

    // 4. 조회한 파라미터를 수정 화면에 설정한다.
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
  // 기본 정보 입력값을 검증한다.
  if (!externalApi.value.apiName.trim()) {
    alert('API 이름을 입력해주세요.')
    return false
  }

  if (!externalApi.value.apiUrl.trim()) {
    alert('API URL을 입력해주세요.')
    return false
  }

  if (externalApi.value.retryEnabled === 'Y') {
    if (!externalApi.value.maxRetryCount) {
      alert('최대 재시도 횟수를 선택해주세요.')
      return false
    }

    if (!externalApi.value.retryIntervalSec) {
      alert('재시도 간격을 선택해주세요.')
      return false
    }
  }

  // 인증 방식별 필수 입력값을 검증한다.
  if (externalApi.value.authType === 'API_KEY') {
    if (!externalApi.value.authLocation) {
      alert('API Key 전달 위치를 선택해주세요.')
      return false
    }

    if (!externalApi.value.authKey.trim()) {
      alert('API Key 이름을 입력해주세요.')
      return false
    }

    const hasExistingAuthValue =
      savedAuthType.value === 'API_KEY' && externalApi.value.authValueConfigured

    if (!hasExistingAuthValue && !externalApi.value.authValue.trim()) {
      alert('API Key 값을 입력해주세요.')
      return false
    }
  }

  if (externalApi.value.authType === 'BEARER') {
    const hasExistingAuthValue =
      savedAuthType.value === 'BEARER' && externalApi.value.authValueConfigured

    if (!hasExistingAuthValue && !externalApi.value.authValue.trim()) {
      alert('Bearer Token을 입력해주세요.')
      return false
    }
  }

  if (externalApi.value.authType === 'BASIC') {
    if (!externalApi.value.authUsername.trim()) {
      alert('Basic Auth Username을 입력해주세요.')
      return false
    }

    const hasExistingPassword =
      savedAuthType.value === 'BASIC' && externalApi.value.authPasswordConfigured

    if (!hasExistingPassword && !externalApi.value.authPassword.trim()) {
      alert('Basic Auth Password를 입력해주세요.')
      return false
    }
  }

  // 파라미터 입력값을 검증한다.
  for (let i = 0; i < params.value.length; i += 1) {
    const param = params.value[i]

    if (!param.paramName.trim()) {
      alert(`${i + 1}번째 파라미터 이름을 입력해주세요.`)
      return false
    }

    if (param.valueType === 'STATIC' && !param.paramValue.trim() && param.requiredYn === 'Y') {
      alert(`${param.paramName}의 값을 입력해주세요.`)
      return false
    }

    if (param.valueType !== 'STATIC' && !param.valueFormat.trim()) {
      alert(`${param.paramName}의 포맷을 입력해주세요.`)
      return false
    }
  }

  return true
}

const editExternalApi = async () => {
  if (!validateForm()) {
    return
  }

  if (!confirm('External API를 수정하시겠습니까?')) {
    return
  }

  if (externalApi.value.retryEnabled === 'N') {
    externalApi.value.maxRetryCount = 0
    externalApi.value.retryIntervalSec = 0
  }

  try {
    // 1. 인증 방식에 따라 전송할 인증정보를 구분한다.
    const authType = externalApi.value.authType

    // 2. 백엔드 수정 요청 형식으로 데이터를 구성한다.
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
      params: params.value.map((param) => ({
        ...param,
        paramValue: param.valueType === 'STATIC' ? param.paramValue || null : null,
        valueFormat: param.valueType === 'STATIC' ? null : param.valueFormat || null,
        description: param.description || null,
      })),
    }

    // 2. External API 수정 API를 호출한다.
    await updateExternalApi(route.params.externalApiId, requestData)

    // 3. 수정 완료 후 상세 화면으로 이동한다.
    alert('External API 수정 성공')
    router.push(`/externalApi/${route.params.externalApiId}`)
  } catch (error) {
    console.error('External API 수정 실패:', error)
    alert('External API 수정 실패')
  }
}

onMounted(() => {
  fetchExternalApi()
})
</script>

<template>
  <div class="p-4">
    <div v-if="loading" class="text-gray-500">조회 중입니다.</div>

    <template v-else>
      <!-- 기본 정보 -->
      <div class="bg-white border rounded p-4 mb-4">
        <h3 class="text-lg font-semibold mb-4">기본 정보</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">API 이름</label>
            <input
              v-model="externalApi.apiName"
              type="text"
              class="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">HTTP Method</label>
            <select v-model="externalApi.httpMethod" class="w-full border rounded px-3 py-2">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium mb-1">API URL</label>
            <input
              v-model="externalApi.apiUrl"
              type="text"
              class="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">사용 여부</label>
            <select v-model="externalApi.enabled" class="w-full border rounded px-3 py-2">
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">재시도 사용 여부</label>
            <select v-model="externalApi.retryEnabled" class="w-full border rounded px-3 py-2">
              <option value="N">미사용</option>
              <option value="Y">사용</option>
            </select>
          </div>

          <div v-if="externalApi.retryEnabled === 'Y'">
            <label class="block text-sm font-medium mb-1">최대 재시도 횟수</label>
            <select
              v-model.number="externalApi.maxRetryCount"
              class="w-full border rounded px-3 py-2"
            >
              <option value="">선택</option>
              <option :value="1">1회</option>
              <option :value="2">2회</option>
              <option :value="3">3회</option>
              <option :value="5">5회</option>
            </select>
          </div>

          <div v-if="externalApi.retryEnabled === 'Y'">
            <label class="block text-sm font-medium mb-1">재시도 간격</label>
            <select
              v-model.number="externalApi.retryIntervalSec"
              class="w-full border rounded px-3 py-2"
            >
              <option value="">선택</option>
              <option :value="5">5초</option>
              <option :value="10">10초</option>
              <option :value="30">30초</option>
              <option :value="60">1분</option>
            </select>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium mb-1">설명</label>
            <input
              v-model="externalApi.description"
              type="text"
              class="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">설명</label>
            <input
              v-model="externalApi.description"
              type="text"
              class="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      <!-- 인증 정보 -->
      <div class="bg-white border rounded p-4 mb-4">
        <h3 class="text-lg font-semibold mb-4">인증 정보</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">인증 방식</label>
            <select
              v-model="externalApi.authType"
              @change="changeAuthType"
              class="w-full border rounded px-3 py-2"
            >
              <option value="NONE">인증 없음</option>
              <option value="API_KEY">API Key</option>
              <option value="BEARER">Bearer Token</option>
              <option value="BASIC">Basic Auth</option>
            </select>
          </div>

          <template v-if="externalApi.authType === 'API_KEY'">
            <div>
              <label class="block text-sm font-medium mb-1">전달 위치</label>
              <select v-model="externalApi.authLocation" class="w-full border rounded px-3 py-2">
                <option value="">선택</option>
                <option value="HEADER">HEADER</option>
                <option value="QUERY">QUERY</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Key 이름</label>
              <input
                v-model="externalApi.authKey"
                type="text"
                class="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">API Key</label>
              <input
                v-model="externalApi.authValue"
                type="password"
                placeholder="변경할 경우에만 입력"
                class="w-full border rounded px-3 py-2"
              />

              <p
                v-if="externalApi.authType === savedAuthType && externalApi.authValueConfigured"
                class="mt-1 text-xs text-gray-500"
              >
                기존 API Key가 등록되어 있습니다. 변경할 경우에만 새 값을 입력하세요.
              </p>
            </div>
          </template>

          <template v-if="externalApi.authType === 'BEARER'">
            <div class="col-span-2">
              <label class="block text-sm font-medium mb-1">Bearer Token</label>
              <input
                v-model="externalApi.authValue"
                type="password"
                placeholder="변경할 경우에만 입력"
                class="w-full border rounded px-3 py-2"
              />

              <p
                v-if="savedAuthType === 'BEARER' && externalApi.authValueConfigured"
                class="mt-1 text-xs text-gray-500"
              >
                기존 Bearer Token이 등록되어 있습니다. 변경할 경우에만 새 값을 입력하세요.
              </p>
            </div>
          </template>

          <template v-if="externalApi.authType === 'BASIC'">
            <div>
              <label class="block text-sm font-medium mb-1">Username</label>
              <input
                v-model="externalApi.authUsername"
                type="text"
                class="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Password</label>
              <input
                v-model="externalApi.authPassword"
                type="password"
                placeholder="변경할 경우에만 입력"
                class="w-full border rounded px-3 py-2"
              />

              <p
                v-if="savedAuthType === 'BASIC' && externalApi.authPasswordConfigured"
                class="mt-1 text-xs text-gray-500"
              >
                기존 Password가 등록되어 있습니다. 변경할 경우에만 새 값을 입력하세요.
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- 파라미터 -->
      <div class="bg-white border rounded p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">파라미터</h3>

          <button type="button" @click="addParam" class="bg-gray-700 text-white px-3 py-1 rounded">
            + 파라미터 추가
          </button>
        </div>

        <div v-if="params.length === 0" class="text-sm text-gray-500">
          등록된 파라미터가 없습니다.
        </div>

        <div v-for="(param, index) in params" :key="index" class="border rounded p-3 mb-3">
          <div class="grid grid-cols-4 gap-3">
            <div>
              <label class="block text-xs mb-1">위치</label>
              <select v-model="param.paramLocation" class="w-full border rounded px-2 py-1">
                <option value="HEADER">HEADER</option>
                <option value="QUERY">QUERY</option>
                <option value="BODY">BODY</option>
              </select>
            </div>

            <div>
              <label class="block text-xs mb-1">이름</label>
              <input
                v-model="param.paramName"
                type="text"
                class="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label class="block text-xs mb-1">값 유형</label>
              <select v-model="param.valueType" class="w-full border rounded px-2 py-1">
                <option value="STATIC">STATIC</option>
                <option value="CURRENT_DATE">CURRENT_DATE</option>
                <option value="CURRENT_TIME">CURRENT_TIME</option>
                <option value="CURRENT_DATETIME">CURRENT_DATETIME</option>
              </select>
            </div>

            <div>
              <label class="block text-xs mb-1">필수 여부</label>
              <select v-model="param.requiredYn" class="w-full border rounded px-2 py-1">
                <option value="N">선택</option>
                <option value="Y">필수</option>
              </select>
            </div>

            <div>
              <label class="block text-xs mb-1">값</label>
              <input
                v-model="param.paramValue"
                type="text"
                :disabled="param.valueType !== 'STATIC'"
                class="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label class="block text-xs mb-1">포맷</label>
              <input
                v-model="param.valueFormat"
                type="text"
                :disabled="param.valueType === 'STATIC'"
                placeholder="예: yyyyMMdd"
                class="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label class="block text-xs mb-1">정렬 순서</label>
              <input
                v-model.number="param.sortOrder"
                type="number"
                min="0"
                class="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label class="block text-xs mb-1">설명</label>
              <input
                v-model="param.description"
                type="text"
                class="w-full border rounded px-2 py-1"
              />
            </div>
          </div>

          <div class="flex justify-end mt-3">
            <button
              type="button"
              @click="removeParam(index)"
              class="bg-red-500 text-white px-2 py-1 rounded text-sm"
            >
              삭제
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button
          type="button"
          @click="router.push(`/externalApi/${route.params.externalApiId}`)"
          class="bg-gray-300 px-4 py-2 rounded"
        >
          취소
        </button>

        <button
          type="button"
          @click="editExternalApi"
          class="bg-blue-500 text-white px-4 py-2 rounded"
        >
          수정
        </button>
      </div>
    </template>
  </div>
</template>
