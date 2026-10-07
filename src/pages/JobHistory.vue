<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getJobHistory } from '@/api/jobHistoryApi'

// 1. 화면 상태
const route = useRoute()
const historyList = ref([])
const selectedHistoryId = ref(null)

const searchCondition = ref({
  jobName: '',
  jobGroup: '',
  status: '',
  startDate: '',
  endDate: '',
})

const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

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

// 3. 실행 이력 조회
const fetchJobHistoryList = async () => {
  try {
    // 1. 화면에 입력된 검색조건과 페이징 정보로 실행 이력 조회 API를 호출한다.
    const response = await getJobHistory({
      jobName: searchCondition.value.jobName.trim(),
      jobGroup: searchCondition.value.jobGroup.trim(),
      status: searchCondition.value.status,
      startDate: searchCondition.value.startDate,
      endDate: searchCondition.value.endDate,
      page: currentPage.value,
      size: pageSize.value,
    })

    // 2. 조회 결과를 실행 이력 목록에 저장한다.
    historyList.value = Array.isArray(response.data.content) ? response.data.content : []

    // 3. 전체 실행 이력 건수를 저장한다.
    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    console.error('목록 불러오기 실패:', error)
    historyList.value = []
    totalCount.value = 0
  }
}

// 4. 검색
const searchJobHistory = async () => {
  // 1. 시작일과 종료일이 모두 입력된 경우 기간을 검증한다.
  if (
    searchCondition.value.startDate &&
    searchCondition.value.endDate &&
    searchCondition.value.startDate > searchCondition.value.endDate
  ) {
    alert('시작일은 종료일보다 늦을 수 없습니다.')
    return
  }

  // 2. 페이지를 첫 페이지로 초기화한다.
  currentPage.value = 1

  // 3. 열려 있는 실행 이력 상세를 닫는다.
  selectedHistoryId.value = null

  // 4. 검색조건으로 실행 이력을 다시 조회한다.
  await fetchJobHistoryList()
}

const resetSearchCondition = async () => {
  // 1. 검색조건을 초기값으로 되돌린다.
  searchCondition.value = {
    jobName: '',
    jobGroup: '',
    status: '',
    startDate: '',
    endDate: '',
  }

  // 2. 페이지를 첫 페이지로 초기화한다.
  currentPage.value = 1

  // 3. 열려 있는 실행 이력 상세를 닫는다.
  selectedHistoryId.value = null

  // 4. 전체 실행 이력을 다시 조회한다.
  await fetchJobHistoryList()
}

// 5. 페이징
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value) {
    return
  }

  currentPage.value = page
  selectedHistoryId.value = null

  await fetchJobHistoryList()
}

// 6. 상세
const toggleHistoryDetail = (logId) => {
  selectedHistoryId.value = selectedHistoryId.value === logId ? null : logId
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

// 8. 화면 최초 진입
onMounted(() => {
  // 1. Job 목록에서 전달한 Job명과 그룹이 있으면 검색조건에 반영한다.
  searchCondition.value.jobName = typeof route.query.jobName === 'string' ? route.query.jobName : ''
  searchCondition.value.jobGroup =
    typeof route.query.jobGroup === 'string' ? route.query.jobGroup : ''

  // 2. 설정된 검색조건으로 실행 이력을 조회한다.
  fetchJobHistoryList()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 검색조건 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Job명</label>

          <input
            v-model="searchCondition.jobName"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            placeholder="Job명"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Job 그룹</label>

          <input
            v-model="searchCondition.jobGroup"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            placeholder="Job 그룹"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">실행 상태</label>

          <select
            v-model="searchCondition.status"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">전체</option>
            <option value="SUCCESS">성공</option>
            <option value="FAILED">실패</option>
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
          @click="searchJobHistory"
        >
          조회
        </button>
      </div>
    </div>

    <!-- 실행 이력 -->
    <div
      v-if="historyList.length > 0"
      class="min-h-[420px] overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              Job명
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              Job 그룹
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              Trigger명
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              예정 실행시간
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              실제 실행시간
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              실행 시간
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              상태
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              상세
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <template v-for="h in historyList" :key="h.logId">
            <tr class="transition-colors hover:bg-gray-50">
              <td class="px-4 py-3 text-center font-medium text-gray-900">
                {{ h.jobName }}
              </td>

              <td class="px-4 py-3 text-center text-gray-600">
                {{ h.jobGroup }}
              </td>

              <td class="px-4 py-3 text-center text-gray-600">
                {{ h.triggerName }}
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                {{ formatDateTime(h.scheduledFireTime) }}
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                {{ formatDateTime(h.actualFireTime) }}
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                {{ formatRunMillis(h.runMillis) }}
              </td>

              <td class="px-4 py-3 text-center">
                <span
                  v-if="h.status === 'SUCCESS'"
                  class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                >
                  성공
                </span>

                <span
                  v-else-if="h.status === 'FAILED'"
                  class="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                >
                  실패
                </span>

                <span
                  v-else
                  class="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                >
                  {{ h.status }}
                </span>
              </td>

              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="toggleHistoryDetail(h.logId)"
                >
                  {{ selectedHistoryId === h.logId ? '닫기' : '상세' }}
                </button>
              </td>
            </tr>

            <!-- 상세 -->
            <tr v-if="selectedHistoryId === h.logId">
              <td colspan="8" class="bg-gray-50 p-4">
                <div class="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 class="mb-4 text-sm font-semibold text-gray-800">실행 상세 정보</h3>

                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div class="rounded-md bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">Log ID</div>
                      <div class="text-sm text-gray-800">
                        {{ h.logId ?? '-' }}
                      </div>
                    </div>

                    <div class="rounded-md bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">Fire Instance ID</div>
                      <div class="break-all text-sm text-gray-800">
                        {{ h.fireInstanceId ?? '-' }}
                      </div>
                    </div>

                    <div class="rounded-md bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">Trigger 그룹</div>
                      <div class="text-sm text-gray-800">
                        {{ h.triggerGroup ?? '-' }}
                      </div>
                    </div>

                    <div class="rounded-md bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">종료시간</div>
                      <div class="text-sm text-gray-800">
                        {{ formatDateTime(h.finishedAt) }}
                      </div>
                    </div>

                    <div class="rounded-md bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">생성시간</div>
                      <div class="text-sm text-gray-800">
                        {{ formatDateTime(h.createdAt) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="h.status === 'FAILED'" class="mt-4 border-t border-gray-200 pt-4">
                    <div class="mb-2 text-sm font-medium text-red-700">예외 메시지</div>

                    <div
                      class="whitespace-pre-wrap break-all rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {{ h.exceptionMessage || '예외 메시지가 없습니다.' }}
                    </div>
                  </div>
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
      <p class="text-sm font-medium text-gray-700">실행 이력이 없습니다.</p>
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
