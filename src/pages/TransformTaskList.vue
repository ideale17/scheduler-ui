<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getExternalApiList } from '@/api/externalApi'
import { getRawDataList } from '@/api/rawDataApi'
import { getTransformRuleList } from '@/api/transformRuleApi'
import { createManualTransformTasks } from '@/api/transformTaskApi'

// 화면 상태
const router = useRouter()

const externalApiList = ref([])
const transformRuleList = ref([])
const rawDataList = ref([])

const selectedExternalApiId = ref('')
const selectedTransformRuleId = ref('')
const selectedRawDataIds = ref([])

const isExternalApiLoading = ref(false)
const isTransformRuleLoading = ref(false)
const isRawDataLoading = ref(false)
const isRegistering = ref(false)

const externalApiErrorMessage = ref('')
const transformRuleErrorMessage = ref('')
const rawDataErrorMessage = ref('')

const currentPage = ref(1)
const pageSize = 10
const totalCount = ref(0)

// API 변경 중 이전 요청 결과가 반영되지 않도록 관리한다.
let rawDataRequestId = 0

// 페이징 계산
const totalPages = computed(() => {
  if (totalCount.value === 0) {
    return 1
  }

  return Math.ceil(totalCount.value / pageSize)
})

// 현재 페이지 Raw Data ID 목록
const currentPageRawDataIds = computed(() => {
  return rawDataList.value.map((item) => item.rawDataId)
})

// 현재 페이지 전체 선택 여부
const isCurrentPageSelected = computed(() => {
  if (currentPageRawDataIds.value.length === 0) {
    return false
  }

  return currentPageRawDataIds.value.every((rawDataId) =>
    selectedRawDataIds.value.includes(rawDataId),
  )
})

// 선택한 가공 규칙
const selectedTransformRule = computed(() => {
  return transformRuleList.value.find(
    (rule) => String(rule.transformRuleId) === selectedTransformRuleId.value,
  )
})

// External API 목록 조회
const fetchExternalApiList = async () => {
  isExternalApiLoading.value = true
  externalApiErrorMessage.value = ''

  try {
    const response = await getExternalApiList()

    externalApiList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('External API 목록 조회 실패:', error)

    externalApiList.value = []
    externalApiErrorMessage.value = 'External API 목록을 불러오지 못했습니다.'
  } finally {
    isExternalApiLoading.value = false
  }
}

// 가공 규칙 목록 조회
const fetchTransformRuleList = async () => {
  isTransformRuleLoading.value = true
  transformRuleErrorMessage.value = ''

  try {
    const response = await getTransformRuleList()

    transformRuleList.value = Array.isArray(response.data)
      ? response.data.filter((rule) => rule.enabled === 'Y')
      : []
  } catch (error) {
    console.error('가공 규칙 목록 조회 실패:', error)

    transformRuleList.value = []
    transformRuleErrorMessage.value = '가공 규칙 목록을 불러오지 못했습니다.'
  } finally {
    isTransformRuleLoading.value = false
  }
}

// Raw Data 목록 조회
const fetchRawDataList = async () => {
  const requestId = ++rawDataRequestId

  // External API가 선택되지 않은 경우 목록을 비운다.
  if (!selectedExternalApiId.value) {
    rawDataList.value = []
    totalCount.value = 0
    isRawDataLoading.value = false
    rawDataErrorMessage.value = ''
    return
  }

  isRawDataLoading.value = true
  rawDataErrorMessage.value = ''

  try {
    const response = await getRawDataList({
      externalApiId: Number(selectedExternalApiId.value),
      transformRuleId: selectedTransformRuleId.value
        ? Number(selectedTransformRuleId.value)
        : undefined,
      page: currentPage.value,
      size: pageSize,
    })

    // 이전 External API 또는 페이지 조회 응답은 무시한다.
    if (requestId !== rawDataRequestId) {
      return
    }

    rawDataList.value = Array.isArray(response.data.content) ? response.data.content : []
    totalCount.value = Number(response.data.totalCount || 0)
  } catch (error) {
    if (requestId !== rawDataRequestId) {
      return
    }

    console.error('Raw Data 목록 조회 실패:', error)

    rawDataList.value = []
    totalCount.value = 0
    rawDataErrorMessage.value = 'Raw Data 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === rawDataRequestId) {
      isRawDataLoading.value = false
    }
  }
}

// External API 변경
const changeExternalApi = async () => {
  currentPage.value = 1
  selectedRawDataIds.value = []

  // 새 API 조회 전 이전 목록을 초기화한다.
  rawDataList.value = []
  totalCount.value = 0

  await fetchRawDataList()
}

// 가공 규칙 변경
const changeTransformRule = async () => {
  // 1. 규칙이 변경되면 기존 선택 대상을 초기화한다.
  selectedRawDataIds.value = []

  // 2. 선택한 규칙에 해당하는 최신 가공 상태를 다시 조회한다.
  await fetchRawDataList()
}

// 개별 Raw Data 선택
const toggleRawDataSelection = (rawDataId) => {
  if (selectedRawDataIds.value.includes(rawDataId)) {
    selectedRawDataIds.value = selectedRawDataIds.value.filter(
      (selectedId) => selectedId !== rawDataId,
    )
    return
  }

  selectedRawDataIds.value = [...selectedRawDataIds.value, rawDataId]
}

// 현재 페이지 전체 선택 및 해제
const toggleCurrentPageSelection = () => {
  if (isCurrentPageSelected.value) {
    selectedRawDataIds.value = selectedRawDataIds.value.filter(
      (rawDataId) => !currentPageRawDataIds.value.includes(rawDataId),
    )
    return
  }

  selectedRawDataIds.value = [
    ...new Set([...selectedRawDataIds.value, ...currentPageRawDataIds.value]),
  ]
}

// 전체 선택 해제
const clearSelection = () => {
  selectedRawDataIds.value = []
}

// 페이지 변경
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value || isRawDataLoading.value) {
    return
  }

  currentPage.value = page

  await fetchRawDataList()
}

// Raw Data 상세 이동
const goRawDataDetail = (rawDataId) => {
  router.push(`/raw-data/${rawDataId}`)
}

// 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

const registerTransformTasks = async () => {
  // 1. 필수 입력값을 검증한다.
  if (!selectedExternalApiId.value || !selectedTransformRuleId.value) {
    alert('External API와 가공 규칙을 선택해 주세요.')
    return
  }

  if (selectedRawDataIds.value.length === 0) {
    alert('가공할 Raw Data를 선택해 주세요.')
    return
  }

  if (selectedRawDataIds.value.length > 100) {
    alert('한 번에 최대 100건까지 등록할 수 있습니다.')
    return
  }

  if (isRegistering.value) {
    return
  }

  if (
    !confirm(
      `선택한 Raw Data ${selectedRawDataIds.value.length}건을 가공 작업으로 등록하시겠습니까?`,
    )
  ) {
    return
  }

  // 2. 수동 가공 작업을 등록한다.
  isRegistering.value = true

  try {
    const response = await createManualTransformTasks({
      transformRuleId: Number(selectedTransformRuleId.value),
      rawDataIds: [...selectedRawDataIds.value],
    })

    // 3. 등록 결과를 확인한다.
    const transformTaskIds = response.data

    if (!Array.isArray(transformTaskIds)) {
      throw new Error('가공 작업 등록 응답 형식이 올바르지 않습니다.')
    }

    selectedRawDataIds.value = []

    alert(`${transformTaskIds.length}건의 가공 작업이 대기 상태로 등록되었습니다.`)

    await fetchRawDataList()
  } catch (error) {
    console.error('가공 작업 등록 실패:', error)
    alert('가공 작업 등록에 실패했습니다.')
  } finally {
    isRegistering.value = false
  }
}

// 가공 작업 상태에 따른 표시 정보
const getTransformStatus = (status) => {
  switch (status) {
    case 'PENDING':
      return { label: '대기', className: 'bg-gray-100 text-gray-700' }
    case 'RUNNING':
      return { label: '진행 중', className: 'bg-blue-50 text-blue-700' }
    case 'SUCCESS':
      return { label: '성공', className: 'bg-green-50 text-green-700' }
    case 'FAILED':
      return { label: '실패', className: 'bg-red-50 text-red-700' }
    default:
      return { label: '미가공', className: 'bg-gray-50 text-gray-500' }
  }
}

// 화면 초기화
onMounted(async () => {
  await Promise.all([fetchExternalApiList(), fetchTransformRuleList()])
})

// 화면 종료 후 이전 요청 결과 반영 방지
onUnmounted(() => {
  rawDataRequestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- 검색 및 가공 규칙 선택 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- External API 선택 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            External API
            <span class="text-red-500">*</span>
          </label>

          <select
            v-model="selectedExternalApiId"
            :disabled="isExternalApiLoading"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100"
            @change="changeExternalApi"
          >
            <option value="">External API를 선택하세요</option>

            <option
              v-for="api in externalApiList"
              :key="api.externalApiId"
              :value="String(api.externalApiId)"
            >
              {{ api.apiName }}
            </option>
          </select>

          <p v-if="externalApiErrorMessage" class="mt-1 text-xs text-red-600">
            {{ externalApiErrorMessage }}
          </p>
        </div>

        <!-- 가공 규칙 선택 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            가공 규칙
            <span class="text-red-500">*</span>
          </label>

          <select
            v-model="selectedTransformRuleId"
            :disabled="isTransformRuleLoading"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100"
            @change="changeTransformRule"
          >
            <option value="">가공 규칙을 선택하세요</option>

            <option
              v-for="rule in transformRuleList"
              :key="rule.transformRuleId"
              :value="String(rule.transformRuleId)"
            >
              {{ rule.ruleName }}
              (v{{ rule.currentVersion }})
            </option>
          </select>

          <p v-if="transformRuleErrorMessage" class="mt-1 text-xs text-red-600">
            {{ transformRuleErrorMessage }}
          </p>
        </div>
      </div>

      <p class="mt-3 text-xs text-gray-500">
        External API를 선택하면 해당 API에서 수집한 Raw Data가 표시됩니다. 가공 규칙은 실행 시 직접
        선택합니다.
      </p>
    </div>

    <!-- 가공 대상 목록 -->
    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <!-- 목록 상단 -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3"
      >
        <div>
          <h3 class="text-sm font-semibold text-gray-900">가공 대상 Raw Data</h3>

          <p class="mt-1 text-xs text-gray-500">
            전체 {{ totalCount }}건 / 선택 {{ selectedRawDataIds.length }}건
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="selectedRawDataIds.length === 0"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="clearSelection"
          >
            선택 해제
          </button>

          <button
            type="button"
            :disabled="
              isRegistering ||
              isRawDataLoading ||
              !selectedExternalApiId ||
              !selectedTransformRuleId ||
              selectedRawDataIds.length === 0 ||
              selectedRawDataIds.length > 100
            "
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            @click="registerTransformTasks"
          >
            {{ isRegistering ? '등록 중...' : '선택 데이터 가공 등록' }}
          </button>
        </div>
      </div>

      <!-- API 미선택 -->
      <div v-if="!selectedExternalApiId" class="p-8 text-center text-sm text-gray-500">
        External API를 선택하면 가공 대상 Raw Data가 표시됩니다.
      </div>

      <!-- 로딩 -->
      <div v-else-if="isRawDataLoading" class="p-6 text-sm text-gray-500">
        Raw Data 목록을 불러오는 중입니다.
      </div>

      <!-- 조회 오류 -->
      <div v-else-if="rawDataErrorMessage" class="p-6 text-sm text-red-600">
        {{ rawDataErrorMessage }}
      </div>

      <!-- 목록 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="isCurrentPageSelected"
                  :disabled="rawDataList.length === 0"
                  aria-label="현재 페이지 전체 선택"
                  @change="toggleCurrentPageSelection"
                />
              </th>
              <th class="px-4 py-3">Raw Data ID</th>
              <th class="px-4 py-3">API명</th>
              <th class="px-4 py-3">요청 순번</th>
              <th class="px-4 py-3">Content-Type</th>
              <th class="px-4 py-3">가공 상태</th>
              <th class="px-4 py-3">수집 일시</th>
              <th class="px-4 py-3">원본</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr v-for="item in rawDataList" :key="item.rawDataId" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="selectedRawDataIds.includes(item.rawDataId)"
                  :aria-label="`Raw Data ${item.rawDataId} 선택`"
                  @change="toggleRawDataSelection(item.rawDataId)"
                />
              </td>

              <td class="px-4 py-3 font-medium text-gray-900">
                {{ item.rawDataId }}
              </td>

              <td class="px-4 py-3 text-gray-700">
                {{ item.apiName || '-' }}
              </td>

              <td class="px-4 py-3 text-gray-700">
                {{ item.requestSequence ?? '-' }}
              </td>

              <td class="px-4 py-3 text-gray-700">
                {{ item.contentType || '-' }}
              </td>

              <td class="px-4 py-3">
                <span
                  v-if="selectedTransformRuleId"
                  :class="[
                    'inline-flex rounded-md px-2 py-1 text-xs font-medium',
                    getTransformStatus(item.transformStatus).className,
                  ]"
                >
                  {{ getTransformStatus(item.transformStatus).label }}
                </span>

                <span v-else class="text-gray-400">-</span>
              </td>

              <td class="px-4 py-3 text-gray-700">
                {{ formatDateTime(item.collectedAt) }}
              </td>

              <td class="px-4 py-3">
                <button
                  type="button"
                  class="text-blue-600 hover:underline"
                  @click="goRawDataDetail(item.rawDataId)"
                >
                  상세
                </button>
              </td>
            </tr>

            <tr v-if="rawDataList.length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                조회된 Raw Data가 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 페이징 -->
      <div
        v-if="selectedExternalApiId"
        class="flex items-center justify-between border-t border-gray-200 px-4 py-3"
      >
        <span class="text-xs text-gray-500"> {{ currentPage }} / {{ totalPages }} 페이지 </span>

        <div class="flex gap-2">
          <button
            type="button"
            :disabled="currentPage <= 1 || isRawDataLoading"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            @click="changePage(currentPage - 1)"
          >
            이전
          </button>

          <button
            type="button"
            :disabled="currentPage >= totalPages || isRawDataLoading"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            @click="changePage(currentPage + 1)"
          >
            다음
          </button>
        </div>
      </div>
    </div>

    <!-- 가공 등록 안내 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <h3 class="mb-2 text-sm font-semibold text-gray-900">가공 작업 등록</h3>

      <div class="space-y-1 text-sm text-gray-600">
        <p>
          선택한 Raw Data:
          <span class="font-medium text-gray-900"> {{ selectedRawDataIds.length }}건 </span>
        </p>

        <p>
          선택한 가공 규칙:
          <span class="font-medium text-gray-900">
            {{
              selectedTransformRule
                ? `${selectedTransformRule.ruleName} (v${selectedTransformRule.currentVersion})`
                : '미선택'
            }}
          </span>
        </p>
      </div>

      <p class="mt-3 text-xs text-gray-500">
        실제 가공 등록 기능은 백엔드 API 연동 후 활성화됩니다. 등록된 작업은 PENDING 상태로 저장되고
        내부 Worker가 순차적으로 처리할 예정입니다.
      </p>
    </div>
  </div>
</template>
