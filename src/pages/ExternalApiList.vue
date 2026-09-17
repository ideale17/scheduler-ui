<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { executeExternalApi, getExternalApiList } from '@/api/externalApi'

const router = useRouter()
const externalApiList = ref([])

const fetchExternalApiList = async () => {
  try {
    const response = await getExternalApiList()

    externalApiList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('External API 목록 조회 실패:', error)
    externalApiList.value = []
  }
}

const executeApi = async (externalApi) => {
  if (!confirm(`${externalApi.apiName} API를 즉시 실행하시겠습니까?`)) {
    return
  }

  try {
    await executeExternalApi(externalApi.externalApiId)

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

const viewDetail = (externalApiId) => {
  router.push(`/externalApi/${externalApiId}`)
}

const viewCallHistory = (externalApi) => {
  router.push({
    path: '/externalApi/history',
    query: {
      apiName: externalApi.apiName,
    },
  })
}

onMounted(() => {
  fetchExternalApiList()
})
</script>

<template>
  <div class="p-4">
    <div class="flex justify-end items-center mb-4">
      <button
        @click="router.push('/externalApi/add')"
        class="bg-blue-500 text-white px-3 py-1 rounded"
      >
        ➕ API 등록
      </button>
    </div>

    <table v-if="externalApiList.length > 0" class="w-full border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">API 이름</th>
          <th class="border px-2 py-1">Method</th>
          <th class="border px-2 py-1">URL</th>
          <th class="border px-2 py-1">상태</th>
          <th class="border px-2 py-1">설명</th>
          <th class="border px-2 py-1">관리</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="externalApi in externalApiList" :key="externalApi.externalApiId">
          <td class="border px-2 py-1">
            {{ externalApi.apiName }}
          </td>

          <td class="border px-2 py-1 text-center">
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              :class="getMethodClass(externalApi.httpMethod)"
            >
              {{ externalApi.httpMethod }}
            </span>
          </td>

          <td class="border px-2 py-1 text-sm">
            {{ externalApi.apiUrl }}
          </td>

          <td class="border px-2 py-1 text-center">
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              :class="getEnabledClass(externalApi.enabled)"
            >
              {{ getEnabledLabel(externalApi.enabled) }}
            </span>
          </td>

          <td class="border px-2 py-1">
            {{ externalApi.description || '-' }}
          </td>

          <td class="border px-2 py-1 text-center whitespace-nowrap">
            <button
              @click="viewDetail(externalApi.externalApiId)"
              class="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-sm mr-1"
            >
              상세
            </button>

            <button
              @click="viewCallHistory(externalApi)"
              class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-sm mr-1"
            >
              호출 이력
            </button>

            <button
              @click="executeApi(externalApi)"
              class="bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 text-sm"
            >
              즉시 실행
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="text-gray-500">📭 등록된 External API가 없습니다.</div>
  </div>
</template>
