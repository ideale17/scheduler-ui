<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getExternalApiList } from '@/api/externalApi'
import { getRawDataList } from '@/api/rawDataApi'
import { getTransformRuleList } from '@/api/transformRuleApi'
import { createManualTransformTasks, getTransformTaskHistory } from '@/api/transformTaskApi'

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

// 가공 이력 펼침 영역 상태
const expandedRawDataId = ref(null)
const transformTaskHistory = ref([])
const isHistoryLoading = ref(false)
const historyErrorMessage = ref('')

// 이전 가공 이력 조회 응답을 무시하기 위한 식별자
let historyRequestId = 0

// 페이징 계산
const totalPages = computed(() => {
  if (totalCount.value === 0) {
    return 1
  }

  return Math.ceil(totalCount.value / pageSize)
})

// 현재 규칙 버전으로 가공 작업을 등록할 수 있는지 확인
const isRawDataSelectable = (item) => {
  // 1. External API와 가공 규칙이 선택되었는지 확인한다.
  if (!selectedExternalApiId.value || !selectedTransformRuleId.value) {
    return false
  }

  // 2. 서버에서 반환한 가공 등록 제한 여부를 확인한다.
  return item.transformBlocked === 0
}

// 현재 페이지에서 선택 가능한 Raw Data ID 목록
const currentPageRawDataIds = computed(() => {
  return rawDataList.value.filter(isRawDataSelectable).map((item) => item.rawDataId)
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

  // 1. External API가 선택되지 않은 경우 목록을 비운다.
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
    // 2. 선택한 API와 규칙 기준으로 Raw Data를 조회한다.
    const response = await getRawDataList({
      externalApiId: Number(selectedExternalApiId.value),
      transformRuleId: selectedTransformRuleId.value
        ? Number(selectedTransformRuleId.value)
        : undefined,
      page: currentPage.value,
      size: pageSize,
    })

    // 3. 이전 요청의 응답은 무시한다.
    if (requestId !== rawDataRequestId) {
      return
    }

    // 4. 조회 결과와 페이징 정보를 반영한다.
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
  // 1. 페이지와 선택한 데이터를 초기화한다.
  currentPage.value = 1
  selectedRawDataIds.value = []

  // 2. 이전 가공 이력 펼침 상태를 초기화한다.
  clearTransformTaskHistory()

  // 3. 새 조회 전에 이전 목록을 초기화한다.
  rawDataList.value = []
  totalCount.value = 0

  // 4. 새 External API의 Raw Data를 조회한다.
  await fetchRawDataList()
}

// 가공 규칙 변경
const changeTransformRule = async () => {
  // 1. 선택한 데이터를 초기화한다.
  selectedRawDataIds.value = []

  // 2. 첫 페이지로 이동한다.
  currentPage.value = 1

  // 3. 가공 이력 펼침 상태를 초기화한다.
  clearTransformTaskHistory()

  // 4. 새 규칙의 현재 버전 기준으로 다시 조회한다.
  await fetchRawDataList()
}

// 개별 Raw Data 선택
const toggleRawDataSelection = (rawDataId) => {
  // 1. 현재 목록에서 선택 대상 정보를 찾는다.
  const rawData = rawDataList.value.find((item) => item.rawDataId === rawDataId)

  // 2. 등록 중이거나 가공 불가능한 데이터는 선택하지 않는다.
  if (isRegistering.value || !rawData || !isRawDataSelectable(rawData)) {
    return
  }

  // 3. 이미 선택한 데이터면 해제한다.
  if (selectedRawDataIds.value.includes(rawDataId)) {
    selectedRawDataIds.value = selectedRawDataIds.value.filter(
      (selectedId) => selectedId !== rawDataId,
    )
    return
  }

  // 4. 선택 가능한 Raw Data를 추가한다.
  selectedRawDataIds.value = [...selectedRawDataIds.value, rawDataId]
}

// 등록 대상 목록에서 선택한 Raw Data 제거
const removeSelectedRawData = (rawDataId) => {
  // 1. 가공 작업 등록 중에는 선택 목록을 변경하지 않는다.
  if (isRegistering.value) {
    return
  }

  // 2. 선택한 Raw Data 목록에서 해당 식별자를 제거한다.
  selectedRawDataIds.value = selectedRawDataIds.value.filter(
    (selectedId) => selectedId !== rawDataId,
  )
}

// 현재 페이지 전체 선택 및 해제
const toggleCurrentPageSelection = () => {
  // 1. 등록 중에는 선택을 변경하지 않는다.
  if (isRegistering.value) {
    return
  }

  // 2. 선택 가능한 데이터가 없다면 종료한다.
  if (currentPageRawDataIds.value.length === 0) {
    return
  }

  // 3. 모두 선택된 경우 현재 페이지의 선택을 해제한다.
  if (isCurrentPageSelected.value) {
    selectedRawDataIds.value = selectedRawDataIds.value.filter(
      (rawDataId) => !currentPageRawDataIds.value.includes(rawDataId),
    )
    return
  }

  // 4. 현재 페이지에서 선택 가능한 데이터만 추가한다.
  selectedRawDataIds.value = [
    ...new Set([...selectedRawDataIds.value, ...currentPageRawDataIds.value]),
  ]
}

// 페이지 변경
const changePage = async (page) => {
  // 1. 페이지 변경 가능 여부를 확인한다.
  if (
    page < 1 ||
    page > totalPages.value ||
    page === currentPage.value ||
    isRawDataLoading.value ||
    isRegistering.value
  ) {
    return
  }

  // 2. 이전 가공 이력 영역을 초기화한다.
  clearTransformTaskHistory()

  // 3. 페이지를 변경한다.
  currentPage.value = page

  // 4. 변경한 페이지의 목록을 조회한다.
  await fetchRawDataList()
}

// Raw Data 상세 이동
const goRawDataDetail = (rawDataId) => {
  router.push(`/raw-data/${rawDataId}`)
}

// 가공 이력 펼침 상태 초기화
const clearTransformTaskHistory = () => {
  // 1. 진행 중인 이전 조회 응답을 무효화한다.
  historyRequestId++

  // 2. 펼침 상태와 이력 데이터를 초기화한다.
  expandedRawDataId.value = null
  transformTaskHistory.value = []

  // 3. 로딩 및 오류 상태를 초기화한다.
  isHistoryLoading.value = false
  historyErrorMessage.value = ''
}

// Raw Data별 가공 작업 이력 펼침 및 조회
const toggleTransformTaskHistory = async (rawDataId) => {
  // 1. 이미 펼쳐진 행을 다시 클릭하면 닫는다.
  if (expandedRawDataId.value === rawDataId) {
    clearTransformTaskHistory()
    return
  }

  // 2. 새로운 조회 요청을 시작한다.
  const requestId = ++historyRequestId

  expandedRawDataId.value = rawDataId
  transformTaskHistory.value = []
  isHistoryLoading.value = true
  historyErrorMessage.value = ''

  try {
    // 3. 선택한 Raw Data의 전체 가공 이력을 조회한다.
    const response = await getTransformTaskHistory(rawDataId)

    // 4. 현재 요청이 아니라면 응답을 무시한다.
    if (requestId !== historyRequestId) {
      return
    }

    // 5. 조회된 이력을 화면에 반영한다.
    transformTaskHistory.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== historyRequestId) {
      return
    }

    console.error('가공 작업 이력 조회 실패:', error)

    historyErrorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 작업 이력을 불러오지 못했습니다.'
  } finally {
    if (requestId === historyRequestId) {
      isHistoryLoading.value = false
    }
  }
}

// 가공 결과 상세 화면으로 이동
const goTransformResultDetail = (transformResultId) => {
  router.push(`/transform-result/${transformResultId}`)
}

// 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

// 수동 가공 작업 등록
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

  if (isRegistering.value || isRawDataLoading.value) {
    return
  }

  // 2. 가공 작업 등록 여부를 확인한다.
  if (
    !confirm(
      `선택한 Raw Data ${selectedRawDataIds.value.length}건을 가공 작업으로 등록하시겠습니까?`,
    )
  ) {
    return
  }

  // 3. 가공 작업을 등록한다.
  isRegistering.value = true

  try {
    const response = await createManualTransformTasks({
      transformRuleId: Number(selectedTransformRuleId.value),
      rawDataIds: [...selectedRawDataIds.value],
    })

    // 4. 등록 결과를 확인한다.
    const transformTaskIds = response.data

    if (!Array.isArray(transformTaskIds)) {
      throw new Error('가공 작업 등록 응답 형식이 올바르지 않습니다.')
    }

    // 5. 선택 및 이력 펼침 상태를 초기화한다.
    selectedRawDataIds.value = []
    clearTransformTaskHistory()

    alert(`${transformTaskIds.length}건의 가공 작업이 대기 상태로 등록되었습니다.`)

    // 6. 최신 가공 가능 여부와 이력 건수를 다시 조회한다.
    await fetchRawDataList()
  } catch (error) {
    console.error('가공 작업 등록 실패:', error)

    const errorMessage =
      typeof error.response?.data === 'string'
        ? error.response.data
        : error.message || '가공 작업 등록에 실패했습니다.'

    alert(errorMessage)
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
  historyRequestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- ① 가공 작업 설정 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <h3 class="mb-4 text-sm font-semibold text-gray-900">① 가공 작업 설정</h3>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- External API 선택 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            External API
            <span class="text-red-500">*</span>
          </label>

          <select
            v-model="selectedExternalApiId"
            :disabled="isExternalApiLoading || isRegistering"
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
            :disabled="isTransformRuleLoading || isRegistering"
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
        External API를 선택하면 해당 API에서 수집한 Raw Data가 표시됩니다. 가공 규칙은 현재 버전을
        기준으로 적용됩니다.
      </p>
    </div>

    <!-- ② 가공 대상 선택 -->
    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <!-- 목록 상단 -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3"
      >
        <div>
          <h3 class="text-sm font-semibold text-gray-900">② 가공 대상 선택</h3>

          <p class="mt-1 text-xs text-gray-500">
            전체 {{ totalCount }}건 / 선택 {{ selectedRawDataIds.length }}건
          </p>
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

      <!-- 가공 대상 목록 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="isCurrentPageSelected"
                  :disabled="
                    currentPageRawDataIds.length === 0 || isRegistering || isRawDataLoading
                  "
                  aria-label="현재 페이지에서 가공 가능한 데이터 전체 선택"
                  @change="toggleCurrentPageSelection"
                />
              </th>

              <th class="px-4 py-3">Raw Data ID</th>
              <th class="px-4 py-3">API명</th>
              <th class="px-4 py-3">요청 순번</th>
              <th class="px-4 py-3">Content-Type</th>
              <th class="px-4 py-3">가공 이력</th>
              <th class="px-4 py-3">수집 일시</th>
              <th class="px-4 py-3">원본</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <template v-for="item in rawDataList" :key="item.rawDataId">
              <!-- Raw Data 행 -->
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="selectedRawDataIds.includes(item.rawDataId)"
                    :disabled="!isRawDataSelectable(item) || isRegistering"
                    :title="
                      !selectedTransformRuleId
                        ? '가공 규칙을 먼저 선택해 주세요.'
                        : item.transformBlocked === 1
                          ? '현재 규칙 버전에서 이미 등록되었거나 가공 완료된 데이터입니다.'
                          : '가공 작업 등록 가능'
                    "
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

                <!-- 전체 가공 작업 이력 -->
                <td class="px-4 py-3">
                  <button
                    type="button"
                    :disabled="!item.transformHistoryCount"
                    :aria-expanded="expandedRawDataId === item.rawDataId"
                    class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    @click="toggleTransformTaskHistory(item.rawDataId)"
                  >
                    {{ item.transformHistoryCount ?? 0 }}건
                    {{ expandedRawDataId === item.rawDataId ? '▲' : '▼' }}
                  </button>
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

              <!-- Raw Data별 가공 작업 이력 -->
              <tr v-if="expandedRawDataId === item.rawDataId">
                <td colspan="8" class="bg-gray-50 px-6 py-4">
                  <div class="rounded-lg border border-gray-200 bg-white p-4">
                    <h4 class="mb-3 text-sm font-semibold text-gray-900">
                      Raw Data #{{ item.rawDataId }} 가공 이력
                    </h4>

                    <!-- 이력 조회 로딩 -->
                    <p v-if="isHistoryLoading" class="text-sm text-gray-500">
                      가공 이력을 불러오는 중입니다.
                    </p>

                    <!-- 이력 조회 오류 -->
                    <p v-else-if="historyErrorMessage" class="text-sm text-red-600">
                      {{ historyErrorMessage }}
                    </p>

                    <!-- 이력 목록 -->
                    <div v-else class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead class="bg-gray-50 text-gray-600">
                          <tr>
                            <th class="px-3 py-2 text-left">작업 ID</th>
                            <th class="px-3 py-2 text-left">가공 규칙</th>
                            <th class="px-3 py-2 text-left">버전</th>
                            <th class="px-3 py-2 text-left">상태</th>
                            <th class="px-3 py-2 text-left">시도 횟수</th>
                            <th class="px-3 py-2 text-left">등록 일시</th>
                            <th class="px-3 py-2 text-left">결과</th>
                          </tr>
                        </thead>

                        <tbody class="divide-y divide-gray-100">
                          <tr
                            v-for="history in transformTaskHistory"
                            :key="history.transformTaskId"
                          >
                            <td class="px-3 py-2">
                              {{ history.transformTaskId }}
                            </td>

                            <td class="px-3 py-2">
                              {{ history.ruleName }}
                            </td>

                            <td class="px-3 py-2">v{{ history.versionNo }}</td>

                            <td class="px-3 py-2">
                              <span
                                :class="[
                                  'inline-flex rounded-md px-2 py-1 text-xs font-medium',
                                  getTransformStatus(history.status).className,
                                ]"
                              >
                                {{ getTransformStatus(history.status).label }}
                              </span>
                            </td>

                            <td class="px-3 py-2">
                              {{ history.attemptCount ?? 0 }}
                            </td>

                            <td class="whitespace-nowrap px-3 py-2">
                              {{ formatDateTime(history.createdAt) }}
                            </td>

                            <td class="px-3 py-2">
                              <button
                                v-if="history.status === 'SUCCESS' && history.transformResultId"
                                type="button"
                                class="text-blue-600 hover:underline"
                                @click="goTransformResultDetail(history.transformResultId)"
                              >
                                결과 보기
                              </button>

                              <span
                                v-else-if="history.status === 'FAILED'"
                                class="block max-w-xs break-words text-xs text-red-600"
                              >
                                {{ history.errorMessage || '실패 원인 없음' }}
                              </span>

                              <span v-else class="text-gray-400">-</span>
                            </td>
                          </tr>

                          <!-- 이력 없음 -->
                          <tr v-if="transformTaskHistory.length === 0">
                            <td colspan="7" class="px-3 py-6 text-center text-gray-500">
                              등록된 가공 작업 이력이 없습니다.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Raw Data 없음 -->
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
            :disabled="currentPage <= 1 || isRawDataLoading || isRegistering"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            @click="changePage(currentPage - 1)"
          >
            이전
          </button>

          <button
            type="button"
            :disabled="currentPage >= totalPages || isRawDataLoading || isRegistering"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            @click="changePage(currentPage + 1)"
          >
            다음
          </button>
        </div>
      </div>
    </div>

    <!-- ③ 가공 작업 등록 -->
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-gray-900">③ 가공 작업 등록</h3>

        <span class="text-sm text-gray-600"> 선택 {{ selectedRawDataIds.length }}건 </span>
      </div>

      <!-- 등록 대상 목록 -->
      <div class="overflow-hidden rounded-md border border-gray-200">
        <div class="max-h-[280px] overflow-auto">
          <table class="w-full min-w-[500px] text-left text-sm">
            <thead class="sticky top-0 z-10 bg-gray-50 text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left">Raw Data ID</th>
                <th class="px-4 py-3 text-left">가공 규칙</th>
                <th class="px-4 py-3 text-left">버전</th>
                <th class="px-4 py-3 text-center">제거</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr v-for="rawDataId in selectedRawDataIds" :key="rawDataId" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900">
                  {{ rawDataId }}
                </td>

                <td class="px-4 py-3 text-gray-700">
                  {{ selectedTransformRule?.ruleName || '-' }}
                </td>

                <td class="px-4 py-3 text-gray-600">
                  v{{ selectedTransformRule?.currentVersion ?? '-' }}
                </td>

                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    :disabled="isRegistering"
                    :aria-label="`Raw Data ${rawDataId} 선택 해제`"
                    class="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                    @click="removeSelectedRawData(rawDataId)"
                  >
                    ×
                  </button>
                </td>
              </tr>

              <!-- 선택한 데이터가 없는 경우 -->
              <tr v-if="selectedRawDataIds.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-sm text-gray-500">
                  등록할 Raw Data를 선택해 주세요.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 등록 버튼 -->
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-gray-500">한 번에 최대 100건까지 등록할 수 있습니다.</p>

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
          class="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          @click="registerTransformTasks"
        >
          {{ isRegistering ? '등록 중...' : `선택 ${selectedRawDataIds.length}건 가공 등록` }}
        </button>
      </div>

      <!-- 등록 안내 -->
      <p class="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        선택한 가공 규칙의 현재 버전으로 이미 등록되었거나 가공에 성공한 데이터는 다시 등록할 수
        없습니다. 실패한 데이터는 재가공할 수 있습니다.
      </p>
    </div>
  </div>
</template>
