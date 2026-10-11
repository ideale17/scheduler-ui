<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRawDataList } from '@/api/rawDataApi'

// 1. 화면 상태
const route = useRoute()
const router = useRouter()

const rawDataList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const searchCondition = ref({
  apiName: '',
  executionId: '',
  startDate: '',
  endDate: '',
})

const pageSize = ref(10)
const totalCount = ref(0)

// 최신 요청의 응답만 반영하기 위한 식별자
let requestId = 0

// 2. URL 조회조건
const queryValue = (value) => (typeof value === 'string' ? value : '')

const currentPage = computed(() => {
  const page = Number(route.query.page)

  return Number.isSafeInteger(page) && page > 0 ? page : 1
})

const getQueryParams = () => ({
  apiName: queryValue(route.query.apiName),
  executionId: queryValue(route.query.executionId),
  startDate: queryValue(route.query.startDate),
  endDate: queryValue(route.query.endDate),
  page: currentPage.value,
  size: pageSize.value,
})

// 3. 페이징 계산
const totalPages = computed(() => {
  if (totalCount.value === 0) {
    return 1
  }

  return Math.ceil(totalCount.value / pageSize.value)
})

const visiblePages = computed(() => {
  const maxVisiblePages = 5

  let startPage = Math.max(currentPage.value - Math.floor(maxVisiblePages / 2), 1)
  let endPage = startPage + maxVisiblePages - 1

  if (endPage > totalPages.value) {
    endPage = totalPages.value
    startPage = Math.max(endPage - maxVisiblePages + 1, 1)
  }

  const pages = []

  for (let page = startPage; page <= endPage; page++) {
    pages.push(page)
  }

  return pages
})

// 4. URL의 검색조건을 화면에 복원한다.
const applyRouteQuery = () => {
  searchCondition.value = {
    apiName: queryValue(route.query.apiName),
    executionId: queryValue(route.query.executionId),
    startDate: queryValue(route.query.startDate),
    endDate: queryValue(route.query.endDate),
  }
}

// 5. Raw Data 목록 조회
const fetchRawDataList = async () => {
  const currentRequestId = ++requestId

  // URL에 확정된 조건으로 조회한다.
  const params = getQueryParams()

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getRawDataList(params)

    // 이전 요청 결과는 화면에 반영하지 않는다.
    if (currentRequestId !== requestId) {
      return
    }

    rawDataList.value = Array.isArray(response.data.content) ? response.data.content : []

    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    if (currentRequestId !== requestId) {
      return
    }

    console.error('Raw Data 목록 조회 실패:', error)

    rawDataList.value = []
    totalCount.value = 0
    errorMessage.value = 'Raw Data 목록을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

// 6. URL Query 갱신
const updateRouteQuery = async (query) => {
  const target = router.resolve({
    path: '/raw-data',
    query,
  })

  // 같은 조회조건으로 다시 조회한 경우
  if (target.fullPath === route.fullPath) {
    await fetchRawDataList()
    return
  }

  await router.push({
    path: '/raw-data',
    query,
  })
}

// 7. 검색
const searchRawData = async () => {
  if (
    searchCondition.value.startDate &&
    searchCondition.value.endDate &&
    searchCondition.value.startDate > searchCondition.value.endDate
  ) {
    alert('시작일은 종료일보다 늦을 수 없습니다.')
    return
  }

  await updateRouteQuery({
    apiName: searchCondition.value.apiName.trim() || undefined,
    executionId: searchCondition.value.executionId || undefined,
    startDate: searchCondition.value.startDate || undefined,
    endDate: searchCondition.value.endDate || undefined,
    page: '1',
    returnTo: searchCondition.value.executionId ? returnToApiHistory.value || undefined : undefined,
  })
}

// 8. 검색 초기화
const resetSearchCondition = async () => {
  searchCondition.value = {
    apiName: '',
    executionId: '',
    startDate: '',
    endDate: '',
  }

  await updateRouteQuery({
    page: '1',
  })
}

// 9. 페이지 변경
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    return
  }

  await updateRouteQuery({
    apiName: queryValue(route.query.apiName) || undefined,
    executionId: queryValue(route.query.executionId) || undefined,
    startDate: queryValue(route.query.startDate) || undefined,
    endDate: queryValue(route.query.endDate) || undefined,
    page: String(page),
    returnTo: returnToApiHistory.value || undefined,
  })
}

// 10. Raw Data 상세 이동
const goRawDataDetail = (rawDataId) => {
  router.push({
    path: `/raw-data/${rawDataId}`,
    query: route.query,
  })
}

// 11. API 호출 이력 복귀 경로
const returnToApiHistory = computed(() => {
  const returnTo = route.query.returnTo

  if (typeof returnTo !== 'string') {
    return ''
  }

  // 허용된 API 호출 이력 경로만 복귀 대상으로 사용한다.
  if (!/^\/externalApi\/history(?:\?|$)/.test(returnTo)) {
    return ''
  }

  const resolved = router.resolve(returnTo)

  if (resolved.path !== '/externalApi/history') {
    return ''
  }

  return resolved.fullPath
})

const goApiHistory = () => {
  if (!returnToApiHistory.value) {
    return
  }

  router.push(returnToApiHistory.value)
}

// 12. 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

// 13. 검색조건과 페이지 변경 시 목록 조회
watch(
  [
    () => route.query.apiName,
    () => route.query.executionId,
    () => route.query.startDate,
    () => route.query.endDate,
    () => route.query.page,
  ],
  () => {
    applyRouteQuery()
    fetchRawDataList()
  },
  { immediate: true },
)

// 14. 화면 종료 후 이전 요청 결과 반영 방지
onUnmounted(() => {
  requestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- 검색조건 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">API명</label>

          <input
            v-model="searchCondition.apiName"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            placeholder="API명"
            @keyup.enter="searchRawData"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">시작일</label>

          <input
            v-model="searchCondition.startDate"
            type="date"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">종료일</label>

          <input
            v-model="searchCondition.endDate"
            type="date"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          :disabled="isLoading"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="resetSearchCondition"
        >
          초기화
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="searchRawData"
        >
          {{ isLoading ? '조회 중...' : '조회' }}
        </button>
      </div>
    </div>

    <!-- API 실행 이력에서 이동한 경우 -->
    <div
      v-if="searchCondition.executionId"
      class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-medium text-blue-900">API 실행 기준으로 조회 중</div>

          <div class="mt-1 break-all text-xs text-blue-700">
            Execution ID: {{ searchCondition.executionId }}
          </div>
        </div>

        <button
          v-if="returnToApiHistory"
          type="button"
          class="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="goApiHistory"
        >
          ← API 호출 이력으로 돌아가기
        </button>
      </div>
    </div>

    <!-- 오류 메시지 -->
    <div
      v-if="errorMessage"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 로딩 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500"
    >
      Raw Data 목록을 불러오는 중입니다.
    </div>

    <!-- Raw Data 목록 -->
    <div
      v-else-if="rawDataList.length > 0"
      class="min-h-[420px] overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">ID</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">API명</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">요청순번</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Content-Type</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">수집일시</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">상세</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in rawDataList" :key="item.rawDataId" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-center text-gray-600">
              {{ item.rawDataId }}
            </td>

            <td class="px-4 py-3 text-center font-medium text-gray-900">
              {{ item.apiName || `API #${item.externalApiId}` }}
            </td>

            <td class="px-4 py-3 text-center text-gray-600">
              {{ item.requestSequence }}
            </td>

            <td class="px-4 py-3 text-center text-gray-600">
              {{ item.contentType || '-' }}
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
              {{ formatDateTime(item.collectedAt) }}
            </td>

            <td class="px-4 py-3 text-center">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                @click="goRawDataDetail(item.rawDataId)"
              >
                상세
              </button>
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
      <p class="text-sm font-medium text-gray-700">조회된 Raw Data가 없습니다.</p>

      <p class="mt-1 text-sm text-gray-500">검색조건을 변경하여 다시 조회해보세요.</p>
    </div>

    <!-- 페이징 -->
    <div v-if="!isLoading && totalCount > 0" class="flex items-center justify-center gap-2">
      <button
        type="button"
        :disabled="isLoading || currentPage === 1"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        @click="changePage(currentPage - 1)"
      >
        이전
      </button>

      <button
        v-for="page in visiblePages"
        :key="page"
        type="button"
        class="min-w-9 rounded-md border px-3 py-1.5 text-sm"
        :class="
          currentPage === page
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        "
        @click="changePage(page)"
      >
        {{ page }}
      </button>

      <button
        type="button"
        :disabled="isLoading || currentPage === totalPages"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        @click="changePage(currentPage + 1)"
      >
        다음
      </button>
    </div>
  </div>
</template>
