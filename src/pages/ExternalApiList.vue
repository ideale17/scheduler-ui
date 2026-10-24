<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { executeExternalApi, getExternalApiList } from '@/api/externalApi'

const router = useRouter()

const externalApiList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// 검색조건
const searchForm = ref({
  apiName: '',
  httpMethod: '',
  enabled: '',
})

// 마지막으로 조회한 검색조건
const appliedSearch = ref({
  apiName: '',
  httpMethod: '',
  enabled: '',
})

let searchRequestId = 0

// External API 목록 조회
const fetchExternalApiList = async () => {
  // 1. 조회조건을 구성한다.
  const searchParams = {
    apiName: searchForm.value.apiName.trim(),
    httpMethod: searchForm.value.httpMethod,
    enabled: searchForm.value.enabled,
  }

  appliedSearch.value = { ...searchParams }

  // 2. 조회 상태를 초기화한다.
  const requestId = ++searchRequestId
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 3. 백엔드에 검색조건을 전달한다.
    const response = await getExternalApiList(searchParams)

    // 4. 마지막 조회 요청의 결과만 반영한다.
    if (requestId !== searchRequestId) {
      return
    }

    externalApiList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== searchRequestId) {
      return
    }

    console.error('External API 목록 조회 실패:', error)

    externalApiList.value = []
    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : 'External API 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === searchRequestId) {
      isLoading.value = false
    }
  }
}

// 검색조건 초기화
const resetSearch = () => {
  // 1. 검색조건을 초기화한다.
  searchForm.value = {
    apiName: '',
    httpMethod: '',
    enabled: '',
  }

  // 2. 전체 목록을 다시 조회한다.
  fetchExternalApiList()
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
    <!-- 조회조건 -->
    <section class="rounded-lg border border-gray-200 bg-white p-4">
      <form @submit.prevent="fetchExternalApiList">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <!-- API 이름 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> API 이름 </label>

            <input
              v-model="searchForm.apiName"
              type="text"
              maxlength="100"
              placeholder="API 이름 입력"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <!-- HTTP Method -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> HTTP Method </label>

            <select
              v-model="searchForm.httpMethod"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="">전체</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <!-- 사용 여부 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 사용 여부 </label>

            <select
              v-model="searchForm.enabled"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="">전체</option>
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </div>
        </div>

        <!-- 조회 버튼 -->
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            :disabled="isLoading"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="resetSearch"
          >
            초기화
          </button>

          <button
            type="submit"
            :disabled="isLoading"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isLoading ? '조회 중...' : '조회' }}
          </button>
        </div>
      </form>
    </section>

    <!-- API 등록 -->
    <div class="flex justify-end">
      <button
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push('/externalApi/add')"
      >
        API 등록
      </button>
    </div>

    <!-- 조회 오류 -->
    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 조회 중 -->
    <div v-if="isLoading" class="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
      <p class="text-sm text-gray-500">External API 목록을 조회하고 있습니다.</p>
    </div>

    <!-- External API 목록 -->
    <div
      v-else-if="!errorMessage && externalApiList.length > 0"
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
      v-else-if="!errorMessage"
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <template v-if="appliedSearch.apiName || appliedSearch.httpMethod || appliedSearch.enabled">
        <p class="text-sm font-medium text-gray-700">
          조회조건에 해당하는 External API가 없습니다.
        </p>

        <p class="mt-1 text-sm text-gray-500">
          검색조건을 변경하거나 초기화한 후 다시 조회해주세요.
        </p>
      </template>

      <template v-else>
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
      </template>
    </div>
  </div>
</template>
