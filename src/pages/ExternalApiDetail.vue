<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { executeExternalApi, getExternalApi, getExternalApiParams } from '@/api/externalApi'

const route = useRoute()
const router = useRouter()

const externalApi = ref(null)
const params = ref([])
const loading = ref(true)

const fetchExternalApiDetail = async () => {
  try {
    // 1. URL에서 External API 식별자를 조회한다.
    const externalApiId = route.params.externalApiId

    // 2. External API 기본정보와 파라미터를 조회한다.
    const [externalApiResponse, paramsResponse] = await Promise.all([
      getExternalApi(externalApiId),
      getExternalApiParams(externalApiId),
    ])

    // 3. 조회 결과를 화면 상태에 저장한다.
    externalApi.value = externalApiResponse.data

    params.value = Array.isArray(paramsResponse.data) ? paramsResponse.data : []
  } catch (error) {
    console.error('External API 상세 조회 실패:', error)
    alert('External API 상세 조회에 실패했습니다.')
    router.push('/externalApi')
  } finally {
    loading.value = false
  }
}

const executeApi = async () => {
  if (!externalApi.value) {
    return
  }

  if (!confirm(`${externalApi.value.apiName} API를 즉시 실행하시겠습니까?`)) {
    return
  }

  try {
    await executeExternalApi(externalApi.value.externalApiId)

    alert('External API 호출 성공')
  } catch (error) {
    console.error('External API 호출 실패:', error)
    alert('External API 호출 실패')
  }
}

const getEnabledLabel = (enabled) => {
  return enabled === 'Y' ? '사용' : '미사용'
}

const getEnabledClass = (enabled) => {
  return enabled === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}

const getMethodClass = (httpMethod) => {
  const methodClasses = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  }

  return methodClasses[httpMethod] || 'bg-gray-100 text-gray-700'
}

onMounted(() => {
  fetchExternalApiDetail()
})
</script>

<template>
  <div class="p-4">
    <div v-if="loading" class="text-gray-500">조회 중입니다.</div>

    <template v-else-if="externalApi">
      <div class="bg-white border rounded p-4 mb-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">기본 정보</h3>

          <div class="flex gap-2">
            <button
              type="button"
              @click="executeApi"
              class="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
            >
              즉시 실행
            </button>

            <button
              type="button"
              @click="router.push('/externalApi')"
              class="bg-gray-300 px-3 py-1 rounded"
            >
              목록
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500">API 이름</div>
            <div class="mt-1">
              {{ externalApi.apiName }}
            </div>
          </div>

          <div>
            <div class="text-sm text-gray-500">HTTP Method</div>

            <span
              class="inline-flex mt-1 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="getMethodClass(externalApi.httpMethod)"
            >
              {{ externalApi.httpMethod }}
            </span>
          </div>

          <div class="col-span-2">
            <div class="text-sm text-gray-500">API URL</div>
            <div class="mt-1 break-all">
              {{ externalApi.apiUrl }}
            </div>
          </div>

          <div>
            <div class="text-sm text-gray-500">사용 여부</div>

            <span
              class="inline-flex mt-1 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="getEnabledClass(externalApi.enabled)"
            >
              {{ getEnabledLabel(externalApi.enabled) }}
            </span>
          </div>

          <div>
            <div class="text-sm text-gray-500">설명</div>
            <div class="mt-1">
              {{ externalApi.description || '-' }}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border rounded p-4">
        <h3 class="text-lg font-semibold mb-4">파라미터</h3>

        <table v-if="params.length > 0" class="w-full border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="border px-2 py-1">위치</th>
              <th class="border px-2 py-1">이름</th>
              <th class="border px-2 py-1">값 유형</th>
              <th class="border px-2 py-1">값</th>
              <th class="border px-2 py-1">포맷</th>
              <th class="border px-2 py-1">필수</th>
              <th class="border px-2 py-1">순서</th>
              <th class="border px-2 py-1">설명</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="param in params" :key="param.paramId">
              <td class="border px-2 py-1 text-center">
                {{ param.paramLocation }}
              </td>

              <td class="border px-2 py-1">
                {{ param.paramName }}
              </td>

              <td class="border px-2 py-1">
                {{ param.valueType }}
              </td>

              <td class="border px-2 py-1">
                {{ param.paramValue || '-' }}
              </td>

              <td class="border px-2 py-1">
                {{ param.valueFormat || '-' }}
              </td>

              <td class="border px-2 py-1 text-center">
                {{ param.requiredYn === 'Y' ? '필수' : '선택' }}
              </td>

              <td class="border px-2 py-1 text-center">
                {{ param.sortOrder }}
              </td>

              <td class="border px-2 py-1">
                {{ param.description || '-' }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="text-gray-500">등록된 파라미터가 없습니다.</div>
      </div>
    </template>
  </div>
</template>
