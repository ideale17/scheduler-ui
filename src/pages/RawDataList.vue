<script setup>
import { computed, onMounted, ref } from 'vue'
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
  startDate: '',
  endDate: '',
})

const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

// 2. 페이징 계산
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

// 3. Raw Data 목록 조회
const fetchRawDataList = async () => {
  if (isLoading.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 1. 검색조건과 페이징 정보로 Raw Data 목록을 조회한다.
    const response = await getRawDataList({
      apiName: searchCondition.value.apiName.trim(),
      startDate: searchCondition.value.startDate,
      endDate: searchCondition.value.endDate,
      page: currentPage.value,
      size: pageSize.value,
    })

    // 2. 조회 결과와 전체 건수를 저장한다.
    rawDataList.value = Array.isArray(response.data.content) ? response.data.content : []
    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    console.error('Raw Data 목록 조회 실패:', error)

    rawDataList.value = []
    totalCount.value = 0
    errorMessage.value = 'Raw Data 목록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 4. 검색
const searchRawData = async () => {
  if (isLoading.value) {
    return
  }

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

  // 3. 검색조건으로 Raw Data 목록을 조회한다.
  await fetchRawDataList()
}

const resetSearchCondition = async () => {
  if (isLoading.value) {
    return
  }

  // 1. 검색조건을 초기화한다.
  searchCondition.value = {
    apiName: '',
    startDate: '',
    endDate: '',
  }

  // 2. 첫 페이지부터 다시 조회한다.
  currentPage.value = 1

  // 3. 전체 Raw Data 목록을 조회한다.
  await fetchRawDataList()
}

// 5. 페이지 변경
const changePage = async (page) => {
  if (isLoading.value || page < 1 || page > totalPages.value) {
    return
  }

  currentPage.value = page

  await fetchRawDataList()
}

// 6. Raw Data 상세 이동
const goRawDataDetail = (rawDataId) => {
  router.push({
    path: `/raw-data/${rawDataId}`,
    query: {
      apiName: searchCondition.value.apiName,
      startDate: searchCondition.value.startDate,
      endDate: searchCondition.value.endDate,
      page: String(currentPage.value),
    },
  })
}

// 7. 화면 표시용 변환
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

// 8. 화면 최초 진입
onMounted(() => {
  // 1. URL에 전달된 검색조건을 복원한다.
  searchCondition.value.apiName = typeof route.query.apiName === 'string' ? route.query.apiName : ''

  searchCondition.value.startDate =
    typeof route.query.startDate === 'string' ? route.query.startDate : ''

  searchCondition.value.endDate = typeof route.query.endDate === 'string' ? route.query.endDate : ''

  // 2. URL에 전달된 페이지 번호를 복원한다.
  const page = Number(route.query.page)

  currentPage.value = Number.isSafeInteger(page) && page > 0 ? page : 1

  // 3. 설정된 검색조건으로 Raw Data 목록을 조회한다.
  fetchRawDataList()
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
