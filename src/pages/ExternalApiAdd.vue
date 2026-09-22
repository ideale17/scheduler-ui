<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createExternalApi } from '@/api/externalApi'

const router = useRouter()

const externalApi = ref({
  apiName: '',
  apiUrl: '',
  httpMethod: 'GET',
  enabled: 'Y',
  retryEnabled: 'N',
  maxRetryCount: '',
  retryIntervalSec: '',
  description: '',
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
  if (!externalApi.value.apiName.trim()) {
    alert('API 이름을 입력해주세요.')
    return false
  }

  if (!externalApi.value.apiUrl.trim()) {
    alert('API URL을 입력해주세요.')
    return false
  }

  if (externalApi.value.retryEnabled === 'Y') {
    if (!externalApi.value.maxRetryCount || externalApi.value.maxRetryCount <= 0) {
      alert('최대 재시도 횟수는 1 이상이어야 합니다.')
      return false
    }

    if (!externalApi.value.retryIntervalSec || externalApi.value.retryIntervalSec <= 0) {
      alert('재시도 간격은 1초 이상이어야 합니다.')
      return false
    }
  }

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
    const requestData = {
      externalApi: {
        ...externalApi.value,
      },
      params: params.value.map((param) => ({
        ...param,
        paramValue: param.valueType === 'STATIC' ? param.paramValue || null : null,
        valueFormat: param.valueType === 'STATIC' ? null : param.valueFormat || null,
        description: param.description || null,
      })),
    }

    await createExternalApi(requestData)

    alert('External API 등록 성공')
    router.push('/externalApi')
  } catch (error) {
    console.error('External API 등록 실패:', error)
    alert('External API 등록 실패')
  }
}
</script>

<template>
  <div class="p-4">
    <div class="bg-white border rounded p-4 mb-4">
      <h3 class="text-lg font-semibold mb-4">기본 정보</h3>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1"> API 이름 </label>
          <input
            v-model="externalApi.apiName"
            type="text"
            class="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1"> HTTP Method </label>
          <select v-model="externalApi.httpMethod" class="w-full border rounded px-3 py-2">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div class="col-span-2">
          <label class="block text-sm font-medium mb-1"> API URL </label>
          <input v-model="externalApi.apiUrl" type="text" class="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1"> 사용 여부 </label>
          <select v-model="externalApi.enabled" class="w-full border rounded px-3 py-2">
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1"> 재시도 사용 여부 </label>
          <select v-model="externalApi.retryEnabled" class="w-full border rounded px-3 py-2">
            <option value="N">미사용</option>
            <option value="Y">사용</option>
          </select>
        </div>

        <div v-if="externalApi.retryEnabled === 'Y'">
          <label class="block text-sm font-medium mb-1"> 최대 재시도 횟수 </label>
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
          <label class="block text-sm font-medium mb-1"> 재시도 간격 </label>
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

        <div>
          <label class="block text-sm font-medium mb-1"> 설명 </label>
          <input
            v-model="externalApi.description"
            type="text"
            class="w-full border rounded px-3 py-2"
          />
        </div>
      </div>
    </div>

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
            <input v-model="param.paramName" type="text" class="w-full border rounded px-2 py-1" />
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
        @click="router.push('/externalApi')"
        class="bg-gray-300 px-4 py-2 rounded"
      >
        취소
      </button>

      <button
        type="button"
        @click="addExternalApi"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        등록
      </button>
    </div>
  </div>
</template>
