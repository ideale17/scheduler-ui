<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getExternalApiCallHistory } from '@/api/externalApiCallHistoryApi'

// 1. 화면 상태
const historyList = ref([])
const selectedHistoryId = ref(null)

const searchCondition = ref({
  apiName: '',
  status: '',
  startDate: '',
  endDate: '',
})

const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

const route = useRoute()

// 2. 계산값
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

// 3. External API 호출 이력 조회
const fetchCallHistoryList = async () => {
  try {
    // 1. 검색조건과 페이징 정보로 External API 호출 이력을 조회한다.
    const response = await getExternalApiCallHistory({
      apiName: searchCondition.value.apiName.trim(),
      status: searchCondition.value.status,
      startDate: searchCondition.value.startDate,
      endDate: searchCondition.value.endDate,
      page: currentPage.value,
      size: pageSize.value,
    })

    // 2. 조회 결과를 호출 이력 목록에 저장한다.
    historyList.value = Array.isArray(response.data.content) ? response.data.content : []

    // 3. 전체 호출 이력 건수를 저장한다.
    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    console.error('External API 호출 이력 조회 실패:', error)

    historyList.value = []
    totalCount.value = 0
  }
}

// 4. 검색
const searchCallHistory = async () => {
  // 1. 조회 기간을 검증한다.
  if (
    searchCondition.value.startDate &&
    searchCondition.value.endDate &&
    searchCondition.value.startDate > searchCondition.value.endDate
  ) {
    alert('시작일은 종료일보다 늦을 수 없습니다.')
    return
  }

  // 2. 첫 페이지부터 다시 조회한다.
  currentPage.value = 1
  selectedHistoryId.value = null

  // 3. 검색조건으로 호출 이력을 조회한다.
  await fetchCallHistoryList()
}

const resetSearchCondition = async () => {
  // 1. 검색조건을 초기화한다.
  searchCondition.value = {
    apiName: '',
    status: '',
    startDate: '',
    endDate: '',
  }

  // 2. 페이지와 상세 선택 상태를 초기화한다.
  currentPage.value = 1
  selectedHistoryId.value = null

  // 3. 전체 호출 이력을 다시 조회한다.
  await fetchCallHistoryList()
}

// 5. 페이징
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value) {
    return
  }

  currentPage.value = page
  selectedHistoryId.value = null

  await fetchCallHistoryList()
}

// 6. 상세
const toggleHistoryDetail = (executionId) => {
  selectedHistoryId.value = selectedHistoryId.value === executionId ? null : executionId
}

// 7. 화면 표시용 변환
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

// 8. 화면 최초 진입
onMounted(() => {
  // 1. External API 목록에서 전달한 API명이 있으면 검색조건에 반영한다.
  searchCondition.value.apiName = typeof route.query.apiName === 'string' ? route.query.apiName : ''

  // 2. 설정된 검색조건으로 호출 이력을 조회한다.
  fetchCallHistoryList()
})
</script>

<template>
  <div class="flex min-h-full flex-col p-4">
    <!-- 검색조건 -->
    <div class="mb-4 rounded border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> API명 </label>

          <input
            v-model="searchCondition.apiName"
            type="text"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="API명"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 호출 상태 </label>

          <select
            v-model="searchCondition.status"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">전체</option>
            <option value="SUCCESS">성공</option>
            <option value="FAILED">실패</option>
            <option value="STARTED">실행 중</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 시작일 </label>

          <input
            v-model="searchCondition.startDate"
            type="date"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 종료일 </label>

          <input
            v-model="searchCondition.endDate"
            type="date"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div class="mt-3 flex justify-end gap-2">
        <button
          type="button"
          class="rounded bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600"
          @click="resetSearchCondition"
        >
          초기화
        </button>

        <button
          type="button"
          class="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          @click="searchCallHistory"
        >
          조회
        </button>
      </div>
    </div>

    <!-- 호출 이력 목록 -->
    <div v-if="historyList.length > 0" class="min-h-[420px] overflow-x-auto">
      <table class="w-full border border-gray-300 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-2 py-1">API명</th>
            <th class="border px-2 py-1">시작시간</th>
            <th class="border px-2 py-1">상태</th>
            <th class="border px-2 py-1">시도횟수</th>
            <th class="border px-2 py-1">재시도</th>
            <th class="border px-2 py-1">전체시간</th>
            <th class="border px-2 py-1">API시간</th>
            <th class="border px-2 py-1">실행 구분</th>
            <th class="border px-2 py-1">상세</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="history in historyList" :key="history.executionId">
            <tr>
              <td class="border px-2 py-1">
                {{ history.apiName || `API #${history.externalApiId}` }}
              </td>

              <td class="border px-2 py-1">
                {{ formatDateTime(history.startedAt) }}
              </td>

              <td class="border px-2 py-1 text-center">
                <span
                  v-if="history.status === 'SUCCESS'"
                  class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                >
                  성공
                </span>

                <span
                  v-else-if="history.status === 'FAILED'"
                  class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                >
                  실패
                </span>

                <span
                  v-else
                  class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  {{ history.status }}
                </span>
              </td>

              <td class="border px-2 py-1 text-center">{{ history.attemptCount }}회</td>

              <td class="border px-2 py-1 text-center">{{ history.retryCount }}회</td>

              <td class="border px-2 py-1">
                {{ formatRunMillis(history.totalRunMillis) }}
              </td>

              <td class="border px-2 py-1">
                {{ formatRunMillis(history.apiRunMillis) }}
              </td>

              <td class="border px-2 py-1 text-center">
                {{ getExecutionType(history.fireInstanceId) }}
              </td>

              <td class="border px-2 py-1 text-center">
                <button
                  type="button"
                  class="rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  @click="toggleHistoryDetail(history.executionId)"
                >
                  {{ selectedHistoryId === history.executionId ? '닫기' : '상세' }}
                </button>
              </td>
            </tr>

            <!-- 상세 -->
            <tr v-if="selectedHistoryId === history.executionId">
              <td colspan="9" class="border bg-gray-50 p-4">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div class="rounded border border-gray-200 bg-gray-50 p-3">
                    <div class="mb-1 text-xs text-gray-500">Execution ID</div>
                    <div class="break-all text-sm text-gray-800">
                      {{ history.executionId }}
                    </div>
                  </div>

                  <div class="rounded border border-gray-200 bg-gray-50 p-3">
                    <div class="mb-1 text-xs text-gray-500">External API ID</div>
                    <div class="text-sm text-gray-800">
                      {{ history.externalApiId }}
                    </div>
                  </div>

                  <div class="rounded border border-gray-200 bg-gray-50 p-3">
                    <div class="mb-1 text-xs text-gray-500">Fire Instance ID</div>
                    <div class="break-all text-sm text-gray-800">
                      {{ history.fireInstanceId ?? '-' }}
                    </div>
                  </div>

                  <div class="rounded border border-gray-200 bg-gray-50 p-3">
                    <div class="mb-1 text-xs text-gray-500">종료시간</div>
                    <div class="text-sm text-gray-800">
                      {{ formatDateTime(history.finishedAt) }}
                    </div>
                  </div>

                  <div class="rounded border border-gray-200 bg-gray-50 p-3">
                    <div class="mb-1 text-xs text-gray-500">전체 실행시간</div>
                    <div class="text-sm text-gray-800">
                      {{ formatRunMillis(history.totalRunMillis) }}
                    </div>
                  </div>

                  <div class="rounded border border-gray-200 bg-gray-50 p-3">
                    <div class="mb-1 text-xs text-gray-500">실제 API 호출시간</div>
                    <div class="text-sm text-gray-800">
                      {{ formatRunMillis(history.apiRunMillis) }}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-else class="text-gray-500">📭 External API 호출 이력이 없습니다.</div>

    <!-- 페이징 -->
    <div v-if="totalCount > 0" class="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        :disabled="currentPage === 1"
        class="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        @click="changePage(currentPage - 1)"
      >
        이전
      </button>

      <button
        v-for="page in visiblePages"
        :key="page"
        type="button"
        class="min-w-8 rounded border px-3 py-1 text-sm"
        :class="
          currentPage === page
            ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        "
        @click="changePage(page)"
      >
        {{ page }}
      </button>

      <button
        type="button"
        :disabled="currentPage === totalPages"
        class="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        @click="changePage(currentPage + 1)"
      >
        다음
      </button>
    </div>
  </div>
</template>
