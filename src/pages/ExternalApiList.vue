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
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="text-sm font-medium text-gray-700">External API 목록</div>
        <div class="mt-1 text-sm text-gray-500">
          등록된 External API의 설정과 실행 상태를 관리합니다.
        </div>
      </div>

      <button
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push('/externalApi/add')"
      >
        API 등록
      </button>
    </div>

    <!-- External API 목록 -->
    <div
      v-if="externalApiList.length > 0"
      class="overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              API 이름
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              Method
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">URL</th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              상태
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              설명
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              관리
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="externalApi in externalApiList"
            :key="externalApi.externalApiId"
            class="transition-colors hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-center font-medium text-gray-900">
              {{ externalApi.apiName }}
            </td>

            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getMethodClass(externalApi.httpMethod)"
              >
                {{ externalApi.httpMethod }}
              </span>
            </td>

            <td class="max-w-md px-4 py-3 text-gray-600">
              <div class="truncate" :title="externalApi.apiUrl">
                {{ externalApi.apiUrl }}
              </div>
            </td>

            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getEnabledClass(externalApi.enabled)"
              >
                {{ getEnabledLabel(externalApi.enabled) }}
              </span>
            </td>

            <td class="max-w-xs px-4 py-3 text-gray-600">
              <div class="truncate" :title="externalApi.description || ''">
                {{ externalApi.description || '-' }}
              </div>
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="viewDetail(externalApi.externalApiId)"
                >
                  상세
                </button>

                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="viewCallHistory(externalApi)"
                >
                  호출 이력
                </button>

                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="executeApi(externalApi)"
                >
                  즉시 실행
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 빈 상태 -->
    <div
      v-else
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <p class="text-sm font-medium text-gray-700">등록된 External API가 없습니다.</p>

      <p class="mt-1 text-sm text-gray-500">
        External API를 등록하면 스케줄러에서 호출하고 실행 이력을 관리할 수 있습니다.
      </p>

      <button
        type="button"
        class="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push('/externalApi/add')"
      >
        API 등록
      </button>
    </div>
  </div>
</template>
