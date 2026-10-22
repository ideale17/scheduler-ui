<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTransformResultList } from '@/api/transformResultApi'
import { getExternalApiList } from '@/api/externalApi'
import { getTransformRuleList } from '@/api/transformRuleApi'

const route = useRoute()
const router = useRouter()

// 1. 화면 상태
const transformResultList = ref([])
const externalApiList = ref([])
const transformRuleList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const searchCondition = ref({
  externalApiId: '',
  transformRuleId: '',
  startDate: '',
  endDate: '',
})

const pageSize = ref(10)
const totalCount = ref(0)

// 최신 요청의 응답만 반영하기 위한 식별자
let requestId = 0

// URL 조회조건
const queryValue = (value) => (typeof value === 'string' ? value : '')

const currentPage = computed(() => {
  const page = Number(route.query.page)

  return Number.isSafeInteger(page) && page > 0 ? page : 1
})

const getQueryParams = () => ({
  externalApiId: queryValue(route.query.externalApiId),
  transformRuleId: queryValue(route.query.transformRuleId),
  startDate: queryValue(route.query.startDate),
  endDate: queryValue(route.query.endDate),
  page: currentPage.value,
  size: pageSize.value,
})

// 페이징 계산
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

// URL의 검색조건을 화면에 복원한다.
const applyRouteQuery = () => {
  searchCondition.value = {
    externalApiId: queryValue(route.query.externalApiId),
    transformRuleId: queryValue(route.query.transformRuleId),
    startDate: queryValue(route.query.startDate),
    endDate: queryValue(route.query.endDate),
  }
}

// 검색조건 목록 조회
const fetchSearchOptions = async () => {
  try {
    const [apiResponse, ruleResponse] = await Promise.all([
      getExternalApiList(),
      getTransformRuleList(),
    ])

    externalApiList.value = Array.isArray(apiResponse.data) ? apiResponse.data : []
    transformRuleList.value = Array.isArray(ruleResponse.data) ? ruleResponse.data : []
  } catch (error) {
    console.error('가공 결과 검색조건 조회 실패:', error)

    errorMessage.value = '검색조건 목록을 불러오지 못했습니다.'
  }
}

// 가공 결과 목록 조회
const fetchTransformResultList = async () => {
  const currentRequestId = ++requestId

  const params = getQueryParams()

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getTransformResultList(params)

    // 이전 요청 결과는 화면에 반영하지 않는다.
    if (currentRequestId !== requestId) {
      return
    }

    transformResultList.value = Array.isArray(response.data.content) ? response.data.content : []

    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    if (currentRequestId !== requestId) {
      return
    }

    console.error('가공 결과 목록 조회 실패:', error)

    transformResultList.value = []
    totalCount.value = 0

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 결과 목록을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

// URL Query 갱신
const updateRouteQuery = async (query) => {
  const target = router.resolve({
    path: '/transform-result',
    query,
  })

  if (target.fullPath === route.fullPath) {
    await fetchTransformResultList()
    return
  }

  await router.push({
    path: '/transform-result',
    query,
  })
}

// 검색
const searchTransformResult = async () => {
  if (
    searchCondition.value.startDate &&
    searchCondition.value.endDate &&
    searchCondition.value.startDate > searchCondition.value.endDate
  ) {
    alert('시작일은 종료일보다 늦을 수 없습니다.')
    return
  }

  await updateRouteQuery({
    externalApiId: searchCondition.value.externalApiId || undefined,
    transformRuleId: searchCondition.value.transformRuleId || undefined,
    startDate: searchCondition.value.startDate || undefined,
    endDate: searchCondition.value.endDate || undefined,
    page: '1',
  })
}

// 검색 초기화
const resetSearchCondition = async () => {
  searchCondition.value = {
    externalApiId: '',
    transformRuleId: '',
    startDate: '',
    endDate: '',
  }

  await updateRouteQuery({ page: '1' })
}

// 페이지 변경
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    return
  }

  await updateRouteQuery({
    externalApiId: queryValue(route.query.externalApiId) || undefined,
    transformRuleId: queryValue(route.query.transformRuleId) || undefined,
    startDate: queryValue(route.query.startDate) || undefined,
    endDate: queryValue(route.query.endDate) || undefined,
    page: String(page),
  })
}

// 가공 결과 상세 이동
const goTransformResultDetail = (transformResultId) => {
  router.push({
    path: `/transform-result/${transformResultId}`,
    query: route.query,
  })
}

// 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

// 검색조건과 페이지 변경 시 목록 조회
watch(
  [
    () => route.query.externalApiId,
    () => route.query.transformRuleId,
    () => route.query.startDate,
    () => route.query.endDate,
    () => route.query.page,
  ],
  () => {
    applyRouteQuery()
    fetchTransformResultList()
  },
  { immediate: true },
)

// 초기 검색조건 조회
onMounted(() => {
  fetchSearchOptions()
})

// 화면 종료 후 이전 요청 결과 반영 방지
onUnmounted(() => {
  requestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- 검색조건 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">External API</label>

          <select
            v-model="searchCondition.externalApiId"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">전체 API</option>

            <option
              v-for="api in externalApiList"
              :key="api.externalApiId"
              :value="String(api.externalApiId)"
            >
              {{ api.apiName }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">가공 규칙</label>

          <select
            v-model="searchCondition.transformRuleId"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">전체 규칙</option>

            <option
              v-for="rule in transformRuleList"
              :key="rule.transformRuleId"
              :value="String(rule.transformRuleId)"
            >
              {{ rule.ruleName }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">가공 시작일</label>

          <input
            v-model="searchCondition.startDate"
            type="date"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">가공 종료일</label>

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
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          @click="resetSearchCondition"
        >
          초기화
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          @click="searchTransformResult"
        >
          {{ isLoading ? '조회 중...' : '조회' }}
        </button>

        <button
          type="button"
          :disabled="isLoading"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          @click="fetchTransformResultList"
        >
          새로고침
        </button>
      </div>
    </div>

    <!-- 조회 오류 -->
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
      가공 결과 목록을 불러오는 중입니다.
    </div>

    <!-- 가공 결과 목록 -->
    <div
      v-else-if="transformResultList.length > 0"
      class="min-h-[420px] overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">결과 ID</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">API명</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">가공 규칙</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">버전</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Raw Data ID</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">가공일시</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">상세</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="item in transformResultList"
            :key="item.transformResultId"
            class="hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-center text-gray-600">
              {{ item.transformResultId }}
            </td>

            <td class="px-4 py-3 text-center font-medium text-gray-900">
              {{ item.apiName || `API #${item.externalApiId}` }}
            </td>

            <td class="px-4 py-3 text-center text-gray-700">
              {{ item.ruleName }}
            </td>

            <td class="px-4 py-3 text-center text-gray-600">
              v{{ item.versionNo }} ({{ item.dataFormat }})
            </td>

            <td class="px-4 py-3 text-center text-gray-600">
              {{ item.rawDataId }}
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
              {{ formatDateTime(item.createdAt) }}
            </td>

            <td class="px-4 py-3 text-center">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                @click="goTransformResultDetail(item.transformResultId)"
              >
                상세
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 데이터 없음 -->
    <div
      v-else
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <p class="text-sm font-medium text-gray-700">조회된 가공 결과가 없습니다.</p>
      <p class="mt-1 text-sm text-gray-500">검색조건을 변경하여 다시 조회해보세요.</p>
    </div>

    <!-- 페이징 -->
    <div v-if="!isLoading && totalCount > 0" class="flex items-center justify-center gap-2">
      <button
        type="button"
        :disabled="currentPage === 1"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        @click="changePage(currentPage + 1)"
      >
        다음
      </button>

      <span class="ml-2 text-xs text-gray-500">총 {{ totalCount }}건</span>
    </div>
  </div>
</template>
