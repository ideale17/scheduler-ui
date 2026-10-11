<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getExternalApiCallHistory,
  getExternalApiCallHistoryDetail,
} from '@/api/externalApiCallHistoryApi'

// 화면 상태
const route = useRoute()
const router = useRouter()

const historyList = ref([])
const selectedHistoryId = ref(null)
const detailList = ref([])
const detailLoading = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

// 최신 요청만 결과에 반영하기 위한 식별자
let listRequestId = 0
let detailRequestId = 0

const searchCondition = ref({
  apiName: '',
  status: '',
  fireInstanceId: '',
  startDate: '',
  endDate: '',
})

const pageSize = ref(10)
const totalCount = ref(0)

// URL 조회조건
const queryValue = (value) => (typeof value === 'string' ? value : '')

const currentPage = computed(() => {
  const page = Number(route.query.page)

  return Number.isSafeInteger(page) && page > 0 ? page : 1
})

// 계산값
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

// URL Query를 화면의 검색조건과 페이지에 반영한다.
const applyRouteQuery = () => {
  searchCondition.value = {
    apiName: queryValue(route.query.apiName),
    status: queryValue(route.query.status),
    fireInstanceId: queryValue(route.query.fireInstanceId),
    startDate: queryValue(route.query.startDate),
    endDate: queryValue(route.query.endDate),
  }
}

// 현재 검색조건과 페이지를 URL Query에 반영한다.
const updateRouteQuery = async (query) => {
  const target = router.resolve({
    path: '/externalApi/history',
    query,
  })

  if (target.fullPath === route.fullPath) {
    await fetchCallHistoryList()
    return
  }

  await router.push({
    path: '/externalApi/history',
    query,
  })
}

// External API 호출 이력 조회
const fetchCallHistoryList = async () => {
  const currentRequestId = ++listRequestId

  // URL에 확정된 조건만 조회에 사용한다.
  const params = {
    apiName: queryValue(route.query.apiName),
    status: queryValue(route.query.status),
    fireInstanceId: queryValue(route.query.fireInstanceId),
    startDate: queryValue(route.query.startDate),
    endDate: queryValue(route.query.endDate),
    page: currentPage.value,
    size: pageSize.value,
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getExternalApiCallHistory(params)

    if (currentRequestId !== listRequestId) {
      return
    }

    historyList.value = Array.isArray(response.data.content) ? response.data.content : []

    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    if (currentRequestId !== listRequestId) {
      return
    }

    console.error('External API 호출 이력 조회 실패:', error)

    historyList.value = []
    totalCount.value = 0
    errorMessage.value = 'API 호출 이력을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === listRequestId) {
      isLoading.value = false
    }
  }
}

// 검색
const searchCallHistory = async () => {
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
    status: searchCondition.value.status || undefined,
    fireInstanceId: searchCondition.value.fireInstanceId || undefined,
    startDate: searchCondition.value.startDate || undefined,
    endDate: searchCondition.value.endDate || undefined,
    page: '1',
    returnTo: searchCondition.value.fireInstanceId
      ? returnToJobHistory.value || undefined
      : undefined,
  })
}

const resetSearchCondition = async () => {
  searchCondition.value = {
    apiName: '',
    status: '',
    fireInstanceId: '',
    startDate: '',
    endDate: '',
  }

  await updateRouteQuery({ page: '1' })
}

// 페이징
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    return
  }

  await updateRouteQuery({
    apiName: queryValue(route.query.apiName) || undefined,
    status: queryValue(route.query.status) || undefined,
    fireInstanceId: queryValue(route.query.fireInstanceId) || undefined,
    startDate: queryValue(route.query.startDate) || undefined,
    endDate: queryValue(route.query.endDate) || undefined,
    page: String(page),
    returnTo: returnToJobHistory.value || undefined,
  })
}

// 상세
const toggleHistoryDetail = async (executionId) => {
  const selectedExecutionId = selectedHistoryId.value === executionId ? undefined : executionId

  await router.replace({
    path: '/externalApi/history',
    query: {
      ...route.query,
      selectedExecutionId,
    },
  })
}

// 화면 표시용 변환
const formatRunMillis = (runMillis) => {
  const millis = Number(runMillis)

  if (!Number.isFinite(millis)) {
    return '-'
  }

  if (millis < 1000) {
    return `${millis}ms`
  }

  const seconds = millis / 1000

  return Number.isInteger(seconds) ? `${seconds}초` : `${seconds.toFixed(2)}초`
}

const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

const getExecutionType = (fireInstanceId) => {
  return fireInstanceId ? '스케줄 실행' : '즉시 실행'
}

// Job 실행 이력에서 이동한 경우에만 복귀 경로를 사용한다.
const returnToJobHistory = computed(() => {
  const returnTo = route.query.returnTo

  if (typeof returnTo !== 'string') {
    return ''
  }

  // 임의의 외부 URL이나 다른 페이지로 이동하지 않도록 경로를 제한한다.
  if (!/^\/JobHistory(?:\?|$)/.test(returnTo)) {
    return ''
  }

  return returnTo
})

const goJobHistory = () => {
  if (!returnToJobHistory.value) {
    return
  }

  router.push(returnToJobHistory.value)
}

// 선택한 API 실행에서 수집한 Raw Data 목록으로 이동한다.
const goRawDataList = (executionId) => {
  if (!executionId) {
    return
  }

  // 1. 현재 API 호출 이력 화면의 URL을 복귀 경로로 사용한다.
  const returnTo = route.fullPath

  // 2. 실행 식별자를 전달하여 Raw Data 목록으로 이동한다.
  router.push({
    path: '/raw-data',
    query: {
      executionId,
      returnTo,
    },
  })
}

watch(
  [
    () => route.query.apiName,
    () => route.query.status,
    () => route.query.fireInstanceId,
    () => route.query.startDate,
    () => route.query.endDate,
    () => route.query.page,
  ],
  () => {
    applyRouteQuery()
    fetchCallHistoryList()
  },
  { immediate: true },
)

watch(
  () => route.query.selectedExecutionId,
  async (selectedExecutionId) => {
    const currentRequestId = ++detailRequestId

    selectedHistoryId.value =
      typeof selectedExecutionId === 'string' && selectedExecutionId ? selectedExecutionId : null

    detailList.value = []

    if (!selectedHistoryId.value) {
      detailLoading.value = false
      return
    }

    detailLoading.value = true

    try {
      const response = await getExternalApiCallHistoryDetail(selectedHistoryId.value)

      if (currentRequestId !== detailRequestId) {
        return
      }

      detailList.value = Array.isArray(response.data) ? response.data : []
    } catch (error) {
      if (currentRequestId !== detailRequestId) {
        return
      }

      console.error('External API 호출 상세 이력 조회 실패:', error)
      detailList.value = []
    } finally {
      if (currentRequestId === detailRequestId) {
        detailLoading.value = false
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  listRequestId++
  detailRequestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- 검색조건 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">API명</label>

          <input
            v-model="searchCondition.apiName"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            placeholder="API명"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">호출 상태</label>

          <select
            v-model="searchCondition.status"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">전체</option>
            <option value="SUCCESS">성공</option>
            <option value="FAILED">실패</option>
            <option value="STARTED">실행 중</option>
          </select>
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
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="resetSearchCondition"
        >
          초기화
        </button>

        <button
          type="button"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          @click="searchCallHistory"
        >
          조회
        </button>
      </div>
    </div>

    <!-- Job 실행 이력에서 이동한 경우 -->
    <div
      v-if="searchCondition.fireInstanceId"
      class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-medium text-blue-900">Job 실행 기준으로 조회 중</div>

          <div class="mt-1 break-all text-xs text-blue-700">
            Fire Instance ID: {{ searchCondition.fireInstanceId }}
          </div>
        </div>

        <button
          v-if="returnToJobHistory"
          type="button"
          class="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="goJobHistory"
        >
          ← Job 실행 이력으로 돌아가기
        </button>
      </div>
    </div>

    <!-- 호출 이력 -->
    <div
      v-if="historyList.length > 0"
      class="min-h-[420px] overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              API명
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              시작시간
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              상태
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              요청횟수
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              재시도
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              전체시간
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              API시간
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              실행 구분
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              상세
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <template v-for="history in historyList" :key="history.executionId">
            <tr class="transition-colors hover:bg-gray-50">
              <td class="px-4 py-3 text-center font-medium text-gray-900">
                {{ history.apiName || `API #${history.externalApiId}` }}
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                {{ formatDateTime(history.startedAt) }}
              </td>

              <td class="px-4 py-3 text-center">
                <span
                  v-if="history.status === 'SUCCESS'"
                  class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                >
                  성공
                </span>

                <span
                  v-else-if="history.status === 'FAILED'"
                  class="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                >
                  실패
                </span>

                <span
                  v-else
                  class="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                >
                  {{ history.status }}
                </span>
              </td>

              <td class="px-4 py-3 text-center text-gray-600">{{ history.requestCount }}회</td>

              <td class="px-4 py-3 text-center text-gray-600">{{ history.retryCount }}회</td>

              <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                {{ formatRunMillis(history.totalRunMillis) }}
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                {{ formatRunMillis(history.apiRunMillis) }}
              </td>

              <td class="px-4 py-3 text-center text-gray-600">
                {{ getExecutionType(history.fireInstanceId) }}
              </td>

              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="toggleHistoryDetail(history.executionId)"
                >
                  {{ selectedHistoryId === history.executionId ? '닫기' : '상세' }}
                </button>
              </td>
            </tr>

            <!-- 상세 -->
            <tr v-if="selectedHistoryId === history.executionId">
              <td colspan="9" class="bg-gray-50 p-4">
                <div
                  v-if="history.status === 'FAILED' && history.errorMessage"
                  class="mb-4 rounded-md border border-red-200 bg-red-50 p-3"
                >
                  <div class="mb-1 text-sm font-semibold text-red-700">실행 실패 사유</div>

                  <div class="break-all text-sm text-red-700">
                    {{ history.errorMessage }}
                  </div>
                </div>

                <div class="rounded-lg border border-gray-200 bg-white p-4">
                  <h4 class="mb-3 text-sm font-semibold text-gray-800">호출 시도 이력</h4>

                  <div v-if="detailLoading" class="py-4 text-sm text-gray-500">
                    호출 이력을 불러오는 중입니다.
                  </div>

                  <div
                    v-else-if="detailList.length > 0"
                    class="overflow-x-auto rounded-md border border-gray-200"
                  >
                    <table class="w-full text-sm">
                      <thead class="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            요청순번
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            호출 구분
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            상태
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            HTTP
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            시작시간
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            호출시간
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                            오류
                          </th>
                        </tr>
                      </thead>

                      <tbody class="divide-y divide-gray-100">
                        <tr
                          v-for="detail in detailList"
                          :key="detail.apiCallLogId"
                          class="hover:bg-gray-50"
                        >
                          <td class="px-3 py-2 text-center text-gray-600">
                            {{ detail.requestSequence }}
                          </td>

                          <td class="px-3 py-2 text-center text-gray-600">
                            {{
                              detail.attemptNo === 1
                                ? '최초 호출'
                                : `재시도 ${detail.attemptNo - 1}`
                            }}
                          </td>

                          <td class="px-3 py-2 text-center">
                            <span
                              v-if="detail.status === 'SUCCESS'"
                              class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                            >
                              성공
                            </span>

                            <span
                              v-else
                              class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                            >
                              실패
                            </span>
                          </td>

                          <td class="px-3 py-2 text-center text-gray-600">
                            {{ detail.httpStatus ?? '-' }}
                          </td>

                          <td class="whitespace-nowrap px-3 py-2 text-center text-gray-600">
                            {{ formatDateTime(detail.startedAt) }}
                          </td>

                          <td class="whitespace-nowrap px-3 py-2 text-center text-gray-600">
                            {{ formatRunMillis(detail.runMillis) }}
                          </td>

                          <td class="max-w-xs px-3 py-2 text-gray-600">
                            <div class="truncate" :title="detail.errorMessage || ''">
                              {{ detail.errorMessage || '-' }}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div v-else class="py-4 text-sm text-gray-500">호출 시도 이력이 없습니다.</div>
                </div>

                <!-- Raw Data 목록 이동 -->
                <div class="mt-4 flex justify-end border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    :disabled="!history.executionId || history.status === 'RUNNING'"
                    class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    @click="goRawDataList(history.executionId)"
                  >
                    Raw Data 보기 →
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 빈 상태 -->
    <div
      v-else
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <p class="text-sm font-medium text-gray-700">External API 호출 이력이 없습니다.</p>

      <p class="mt-1 text-sm text-gray-500">조건을 변경하여 다시 조회해보세요.</p>
    </div>

    <!-- 페이징 -->
    <div v-if="totalCount > 0" class="flex items-center justify-center gap-2">
      <button
        type="button"
        :disabled="currentPage === 1"
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
        :disabled="currentPage === totalPages"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        @click="changePage(currentPage + 1)"
      >
        다음
      </button>
    </div>
  </div>
</template>
