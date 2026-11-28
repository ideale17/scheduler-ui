<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { getAnalysisModelList } from '@/api/analysisModelApi'
import { getAnalysisLoadList, createAnalysisLoadSources } from '@/api/analysisLoadApi'

const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()
const showTaskRegistration = computed(() => authStore.isAdmin || authStore.isGuest)

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500'

// 1. 적재 모델 정보
const analysisModelList = ref([])
const selectedModelId = ref('')
const selectedModel = ref(null)
const selectedVersion = ref(null)
const transformVersionNo = ref(null)

// 2. 적재 대상 조회
const searchForm = ref({
  startDate: '',
  endDate: '',
  loadStatus: 'ALL',
})

let appliedSearch = { ...searchForm.value }
const resultList = ref([])
const currentPage = ref(0)
const pageSize = 10
const totalCount = ref(0)
const resultScrollArea = ref(null)
const resultLoadTrigger = ref(null)

// 추가 조회 중에도 선택한 항목을 유지한다.
const selectedResults = ref([])
const maxSelectionCount = 100

// 3. 화면 상태
const isLoadingModels = ref(false)
const isLoadingResults = ref(false)
const isLoadingMore = ref(false)
const isRegistering = ref(false)
const errorMessage = ref('')
const loadMoreErrorMessage = ref('')

// 이전 조회 요청의 응답이 뒤늦게 반영되지 않도록 관리한다.
let resultRequestId = 0

const hasMoreResults = computed(() => currentPage.value * pageSize < totalCount.value)

const selectedResultIds = computed(() =>
  selectedResults.value.map((result) => result.transformResultId),
)

/**
 * 현재 적재 모델과 가공 결과의 규칙 버전이 일치하는지 확인한다.
 */
const isMatchingResult = (result) => {
  if (!selectedVersion.value || transformVersionNo.value === null) {
    return false
  }

  return (
    Number(result.transformRuleId) === Number(selectedVersion.value.transformRuleId) &&
    Number(result.versionNo) === Number(transformVersionNo.value)
  )
}

/**
 * 적재 모델과 매핑이 일치하고 적재 작업이 등록되지 않은
 * 가공 결과만 선택할 수 있다.
 */
const isSelectableResult = (result) => {
  return isMatchingResult(result) && !registeredRawDataIds.value.has(result.rawDataId)
}

const registeredRawDataIds = computed(
  () =>
    new Set(
      resultList.value
        .filter((result) => result.analysisLoadStatus != null)
        .map((result) => result.rawDataId),
    ),
)
const remainingSelectionCount = computed(() => maxSelectionCount - selectedResults.value.length)
const selectedRawDataIds = computed(
  () => new Set(selectedResults.value.map((result) => result.rawDataId)),
)
const selectableResults = computed(() => resultList.value.filter(isSelectableResult))

// 이미 고른 Raw Data는 유지하고 추가 후보에서도 같은 Raw Data는 한 건만 고른다.
const additionalSelectableResults = computed(() => {
  const rawDataIds = new Set(selectedRawDataIds.value)
  const additionalResults = []
  for (const result of selectableResults.value) {
    if (rawDataIds.has(result.rawDataId)) continue

    rawDataIds.add(result.rawDataId)
    additionalResults.push(result)
  }
  return additionalResults
})

const isBulkSelectionComplete = computed(
  () =>
    selectableResults.value.length > 0 &&
    (remainingSelectionCount.value === 0 || additionalSelectableResults.value.length === 0),
)

const canToggleResult = (result) =>
  !isRegistering.value &&
  isSelectableResult(result) &&
  (selectedResultIds.value.includes(result.transformResultId) ||
    (remainingSelectionCount.value > 0 && !selectedRawDataIds.value.has(result.rawDataId)))

/**
 * 적재 작업 상태를 화면에 표시한다.
 */
const getAnalysisLoadStatusLabel = (status) => {
  switch (status) {
    case 'PENDING':
      return '대기'
    case 'RUNNING':
      return '진행 중'
    case 'SUCCESS':
      return '완료'
    case 'FAILED':
      return '실패'
    default:
      return '미등록'
  }
}

/**
 * 적재 상태별 표시 스타일을 반환한다.
 */
const getAnalysisLoadStatusClass = (status) => {
  switch (status) {
    case 'RUNNING':
      return 'text-blue-600'
    case 'SUCCESS':
      return 'text-green-700'
    case 'FAILED':
      return 'text-red-600'
    default:
      return 'text-gray-500'
  }
}

/**
 * 서버의 날짜와 시간을 화면 형식으로 표시한다.
 */
const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  return String(value).replace('T', ' ').substring(0, 19)
}

/**
 * 사용 가능한 적재 모델 목록을 조회한다.
 */
const fetchAnalysisModels = async () => {
  isLoadingModels.value = true
  errorMessage.value = ''

  try {
    // 1. 사용 중인 적재 모델 목록을 조회한다.
    const response = await getAnalysisModelList({ enabled: 'Y' })

    analysisModelList.value = Array.isArray(response.data) ? response.data : []

    // 2. URL에서 전달된 적재 모델 ID가 있다면 기본 선택한다.
    const routeModelId = Number(route.query.analysisModelId)

    if (
      Number.isSafeInteger(routeModelId) &&
      routeModelId > 0 &&
      analysisModelList.value.some((model) => Number(model.analysisModelId) === routeModelId)
    ) {
      selectedModelId.value = String(routeModelId)
      await changeModel()
    }
  } catch (error) {
    console.error('적재 모델 목록 조회 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '데이터 적재 모델 목록을 불러오지 못했습니다.'
  } finally {
    isLoadingModels.value = false
  }
}

/**
 * 적재 모델을 변경하고 모델 정보와 첫 페이지를 조회한다.
 */
const changeModel = async () => {
  selectedModel.value = null
  selectedVersion.value = null
  transformVersionNo.value = null
  appliedSearch = { ...searchForm.value }

  await fetchAnalysisLoads()
}

/**
 * 적재 모델 정보, 가공 결과 및 적재 상태를 조회한다.
 */
const fetchAnalysisLoads = async (page = 1) => {
  const append = page > 1
  const requestId = ++resultRequestId
  const analysisModelId = Number(selectedModelId.value)

  // 1. 첫 조회에서는 기존 목록과 선택을 초기화한다.
  if (!append) {
    resultList.value = []
    selectedResults.value = []
    totalCount.value = 0
    currentPage.value = 0
    errorMessage.value = ''
    resultScrollArea.value?.scrollTo(0, 0)
  }

  loadMoreErrorMessage.value = ''
  isLoadingResults.value = !append && Boolean(analysisModelId)
  isLoadingMore.value = append

  if (!analysisModelId) return

  try {
    // 2. 다음 페이지에도 최초 조회에 적용한 날짜와 적재 상태를 사용한다.
    const { data } = await getAnalysisLoadList({
      analysisModelId,
      startDate: appliedSearch.startDate || undefined,
      endDate: appliedSearch.endDate || undefined,
      loadStatus: appliedSearch.loadStatus,
      page,
      size: pageSize,
    })

    if (requestId !== resultRequestId || analysisModelId !== Number(selectedModelId.value)) {
      return
    }

    if (!data?.model || !data?.version || data.transformVersionNo == null) {
      throw new Error('데이터 적재 대상 조회 응답이 올바르지 않습니다.')
    }

    // 3. 모델 버전이 바뀌면 서로 다른 버전의 행을 섞지 않고 첫 페이지부터 조회한다.
    if (
      append &&
      (Number(selectedVersion.value.analysisModelVersionId) !==
        Number(data.version.analysisModelVersionId) ||
        Number(transformVersionNo.value) !== Number(data.transformVersionNo))
    ) {
      await fetchAnalysisLoads()
      return
    }

    selectedModel.value = data.model
    selectedVersion.value = data.version
    transformVersionNo.value = data.transformVersionNo

    // 4. 기존 행 순서를 유지하며 결과 ID별 최신 응답을 반영한다.
    const resultsById = new Map(
      resultList.value.map((result) => [result.transformResultId, result]),
    )
    const content = Array.isArray(data.content) ? data.content : []
    for (const result of content) {
      resultsById.set(result.transformResultId, result)
    }

    resultList.value = [...resultsById.values()]
    totalCount.value = Number(data.totalCount || 0)
    currentPage.value = page

    // 5. 현재 조회에서 이미 등록된 것으로 확인한 Raw Data는 선택에서 제외한다.
    selectedResults.value = selectedResultIds.value
      .map((id) => resultsById.get(id))
      .filter(isSelectableResult)
  } catch (error) {
    if (requestId !== resultRequestId) return

    console.error('데이터 적재 대상 조회 실패:', error)

    const message =
      typeof error.response?.data === 'string'
        ? error.response.data
        : error.message || '데이터 적재 대상 목록을 불러오지 못했습니다.'

    if (append) {
      loadMoreErrorMessage.value = message
    } else {
      selectedModel.value = null
      selectedVersion.value = null
      transformVersionNo.value = null
      errorMessage.value = message
    }
  } finally {
    if (requestId === resultRequestId) {
      isLoadingResults.value = false
      isLoadingMore.value = false
    }
  }
}

/**
 * 적재 대상 검색
 */
const searchResults = () => {
  // 1. 적재 모델 선택 여부를 확인한다.
  if (!selectedModelId.value) {
    errorMessage.value = '데이터 적재 모델을 선택해주세요.'
    return
  }

  // 2. 조회 기간을 검증한다.
  if (
    searchForm.value.startDate &&
    searchForm.value.endDate &&
    searchForm.value.startDate > searchForm.value.endDate
  ) {
    errorMessage.value = '시작일은 종료일보다 늦을 수 없습니다.'
    return
  }

  // 3. 검색 조건을 확정하고 첫 페이지부터 조회한다.
  appliedSearch = { ...searchForm.value }
  return fetchAnalysisLoads()
}

/**
 * 검색조건을 초기화한다.
 */
const resetSearch = () => {
  // 1. 검색조건을 초기화한다.
  searchForm.value = {
    startDate: '',
    endDate: '',
    loadStatus: 'ALL',
  }

  // 2. 기본 조건으로 첫 페이지부터 조회한다.
  appliedSearch = { ...searchForm.value }
  return fetchAnalysisLoads()
}

const loadMoreResults = async () => {
  if (
    !hasMoreResults.value ||
    isLoadingResults.value ||
    isLoadingMore.value ||
    isRegistering.value
  ) {
    return
  }

  await fetchAnalysisLoads(currentPage.value + 1)
}

// 표 안의 마지막 행 아래에 도달하면 다음 페이지를 불러온다.
watch(
  [resultScrollArea, resultLoadTrigger, isRegistering],
  ([scrollArea, trigger, registering], _previousElements, onCleanup) => {
    if (!scrollArea || !trigger || registering || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          resultLoadTrigger.value === trigger &&
          !loadMoreErrorMessage.value
        ) {
          void loadMoreResults()
        }
      },
      { root: scrollArea },
    )

    observer.observe(trigger)
    onCleanup(() => observer.disconnect())
  },
  { flush: 'post' },
)

/**
 * 가공 결과를 선택하거나 선택 해제한다.
 */
const toggleResultSelection = (result) => {
  // 1. 등록 대상 선택을 표시하는 역할과 항목의 선택 가능 여부를 확인한다.
  if (!showTaskRegistration.value || !canToggleResult(result)) {
    return
  }

  const resultId = result.transformResultId

  // 2. 이미 선택한 결과면 선택을 해제한다.
  if (selectedResultIds.value.includes(resultId)) {
    selectedResults.value = selectedResults.value.filter(
      (item) => item.transformResultId !== resultId,
    )
    return
  }

  // 3. 선택한 가공 결과를 추가한다.
  selectedResults.value = [...selectedResults.value, result]
  errorMessage.value = ''
}

/**
 * 불러온 목록의 적재 가능 항목을 한도까지 선택하거나 선택을 해제한다.
 */
const toggleLoadedResultsSelection = () => {
  if (!showTaskRegistration.value || isRegistering.value || selectableResults.value.length === 0) {
    return
  }

  // 1. 일괄 선택이 완료된 상태에서는 선택을 해제한다.
  if (isBulkSelectionComplete.value) {
    selectedResults.value = []
    return
  }

  // 2. 기존 선택은 유지하고 표 순서대로 남은 자리만큼 채운다.
  selectedResults.value = [
    ...selectedResults.value,
    ...additionalSelectableResults.value.slice(0, remainingSelectionCount.value),
  ]
  errorMessage.value = ''
}

/**
 * 등록 대상 목록에서 개별 가공 결과를 제거한다.
 */
const removeSelectedResult = (resultId) => {
  // 1. 적재 작업 등록 중에는 선택을 변경하지 않는다.
  if (isRegistering.value) {
    return
  }

  // 2. 선택한 가공 결과를 제거한다.
  selectedResults.value = selectedResults.value.filter(
    (result) => result.transformResultId !== resultId,
  )
}

/**
 * 데이터 적재 작업 등록 전 입력값을 검증한다.
 */
const validateForm = () => {
  errorMessage.value = ''

  // 1. 적재 모델을 선택했는지 확인한다.
  if (!selectedModelId.value || !selectedVersion.value) {
    errorMessage.value = '데이터 적재 모델을 선택해주세요.'
    return false
  }

  // 2. 등록할 가공 결과를 선택했는지 확인한다.
  if (selectedResults.value.length === 0) {
    errorMessage.value = '적재할 가공 결과를 선택해주세요.'
    return false
  }

  // 3. 최대 등록 건수를 검증한다.
  if (selectedResults.value.length > maxSelectionCount) {
    errorMessage.value = `한 번에 최대 ${maxSelectionCount}건까지 등록할 수 있습니다.`
    return false
  }

  // 4. 매핑 여부와 적재 등록 상태를 검증한다.
  if (selectedResults.value.some((result) => !isSelectableResult(result))) {
    errorMessage.value =
      '이미 등록되었거나 적재 모델과 매핑되지 않은 가공 결과가 포함되어 있습니다.'
    return false
  }

  // 5. 동일 Raw Data의 중복 선택 여부를 확인한다.
  const rawDataIds = selectedResults.value.map((result) => result.rawDataId)

  if (new Set(rawDataIds).size !== rawDataIds.length) {
    errorMessage.value = '동일한 Raw Data의 가공 결과를 중복 선택할 수 없습니다.'
    return false
  }

  return true
}

/**
 * 데이터 적재 작업을 등록한다.
 */
const registerAnalysisLoads = async () => {
  // 1. 관리자 권한과 중복 요청 여부를 확인한다.
  if (!authStore.isAdmin || isRegistering.value || isLoadingResults.value || isLoadingMore.value) {
    return
  }

  // 2. 필수 입력값을 검증한다.
  if (!validateForm()) {
    return
  }

  // 3. 등록 여부를 확인한다.
  if (
    !confirm(`선택한 가공 결과 ${selectedResults.value.length}건을 적재 작업으로 등록하시겠습니까?`)
  ) {
    return
  }

  isRegistering.value = true

  try {
    // 4. 선택한 적재 모델과 가공 결과를 전송한다.
    const response = await createAnalysisLoadSources({
      analysisModelId: Number(selectedModelId.value),
      transformResultIds: [...selectedResultIds.value],
    })

    // 5. 등록된 작업 건수를 확인한다.
    const registeredCount = Number(response.data)

    if (!Number.isInteger(registeredCount) || registeredCount !== selectedResults.value.length) {
      throw new Error('데이터 적재 작업 등록 응답이 올바르지 않습니다.')
    }

    // 6. 성공 메시지를 표시한다.
    toastStore.success(
      '데이터 적재 작업 등록 완료',
      `${registeredCount}건의 적재 작업이 대기 상태로 등록되었습니다.`,
    )

    // 7. 선택을 초기화하고 첫 페이지부터 최신 적재 상태를 조회한다.
    await fetchAnalysisLoads()
  } catch (error) {
    console.error('데이터 적재 작업 등록 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : error.message || '데이터 적재 작업 등록에 실패했습니다.'

    toastStore.error('데이터 적재 작업 등록 실패', errorMessage.value)
  } finally {
    isRegistering.value = false
  }
}

// 화면 초기화
onMounted(fetchAnalysisModels)

// 화면 종료 후 이전 요청의 조회 결과가 반영되지 않도록 한다.
onUnmounted(() => {
  resultRequestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- ① 적재 모델 선택 -->
    <section class="rounded-lg border border-gray-200 bg-white p-4">
      <h3 class="mb-4 text-sm font-semibold text-gray-900">① 데이터 적재 모델 선택</h3>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            적재 모델 <span class="text-red-500">*</span>
          </label>

          <select
            v-model="selectedModelId"
            :class="inputClass"
            :disabled="isLoadingModels || isRegistering"
            @change="changeModel"
          >
            <option value="">적재 모델 선택</option>

            <option
              v-for="model in analysisModelList"
              :key="model.analysisModelId"
              :value="String(model.analysisModelId)"
            >
              {{ model.modelName }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 적재 대상 테이블 </label>

          <input
            :value="
              selectedModel ? `${selectedModel.targetSchema}.${selectedModel.targetTable}` : ''
            "
            :class="inputClass"
            readonly
            placeholder="모델 선택 시 표시"
          />
        </div>
      </div>

      <div
        v-if="selectedVersion"
        class="mt-4 flex flex-wrap gap-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700"
      >
        <span>모델 버전: v{{ selectedVersion.versionNo }}</span>
        <span>가공 규칙 ID: {{ selectedVersion.transformRuleId }}</span>
        <span>가공 규칙 버전: v{{ transformVersionNo }}</span>
      </div>
    </section>

    <!-- ② 적재 대상 검색 -->
    <section class="rounded-lg border border-gray-200 bg-white p-4">
      <h3 class="mb-4 text-sm font-semibold text-gray-900">② 가공 결과 조회</h3>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 가공 시작일 </label>

          <input v-model="searchForm.startDate" type="date" :class="inputClass" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 가공 종료일 </label>

          <input v-model="searchForm.endDate" type="date" :class="inputClass" />
        </div>

        <div>
          <label for="analysis-load-status" class="mb-1 block text-sm font-medium text-gray-700">
            적재 상태
          </label>
          <select id="analysis-load-status" v-model="searchForm.loadStatus" :class="inputClass">
            <option value="ALL">전체</option>
            <option value="UNREGISTERED">미등록</option>
          </select>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          :disabled="isLoadingResults || isRegistering"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          @click="resetSearch"
        >
          초기화
        </button>

        <button
          type="button"
          :disabled="isLoadingResults || isRegistering"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
          @click="searchResults"
        >
          {{ isLoadingResults ? '조회 중...' : '조회' }}
        </button>
      </div>
    </section>

    <!-- 오류 메시지 -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- ③ 적재 대상 목록 -->
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div class="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">③ 적재 대상 선택</h3>

          <p class="mt-1 text-xs text-gray-500">
            전체 {{ totalCount }}건
            <template v-if="showTaskRegistration"> · {{ selectedResults.length }}건 선택 </template>
          </p>
          <p v-if="showTaskRegistration" role="status" class="text-xs text-gray-600">
            <template v-if="remainingSelectionCount === 0">
              한 번에 최대 {{ maxSelectionCount }}건까지 등록할 수 있습니다.
            </template>
          </p>
        </div>
      </div>

      <!-- 적재 대상 목록 -->
      <div
        ref="resultScrollArea"
        class="m-4 max-h-[min(60vh,36rem)] overflow-auto rounded-md border border-gray-200"
      >
        <table
          class="w-full text-sm"
          :class="
            resultList.length
              ? 'min-w-[950px]'
              : 'table-fixed [overflow-wrap:anywhere] max-sm:[&_th]:px-1'
          "
        >
          <thead class="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr>
              <!-- 불러온 항목 일괄 선택 -->
              <th
                v-if="showTaskRegistration"
                class="px-4 py-3 text-center"
                :class="{ 'w-12': !resultList.length }"
              >
                <input
                  type="checkbox"
                  :checked="isBulkSelectionComplete"
                  :indeterminate="selectedResults.length > 0 && !isBulkSelectionComplete"
                  :disabled="selectableResults.length === 0 || isRegistering"
                  :aria-label="
                    isBulkSelectionComplete
                      ? '불러온 항목의 선택 해제'
                      : `불러온 적재 가능 항목을 최대 ${maxSelectionCount}건까지 선택`
                  "
                  @change="toggleLoadedResultsSelection"
                />
              </th>

              <th class="px-4 py-3 text-center">결과 ID</th>
              <th class="px-4 py-3 text-center">External API</th>
              <th class="px-4 py-3 text-center">가공 규칙</th>
              <th class="px-4 py-3 text-center">버전</th>
              <th class="px-4 py-3 text-center">Raw Data ID</th>
              <th class="px-4 py-3 text-center">가공일시</th>
              <th class="px-4 py-3 text-center">매핑 여부</th>
              <th class="px-4 py-3 text-center">적재 상태</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="result in resultList"
              :key="result.transformResultId"
              class="hover:bg-gray-50"
            >
              <!-- 가공 결과 선택 -->
              <td v-if="showTaskRegistration" class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="selectedResultIds.includes(result.transformResultId)"
                  :disabled="!canToggleResult(result)"
                  :aria-label="`가공 결과 ${result.transformResultId} 선택`"
                  @change="toggleResultSelection(result)"
                />
              </td>

              <!-- 가공 결과 ID -->
              <td class="px-4 py-3 text-center">
                {{ result.transformResultId }}
              </td>

              <!-- External API -->
              <td class="px-4 py-3 text-center">
                {{ result.apiName }}
              </td>

              <!-- 가공 규칙 -->
              <td class="px-4 py-3 text-center">
                {{ result.ruleName }}
              </td>

              <!-- 가공 규칙 버전 -->
              <td class="px-4 py-3 text-center">v{{ result.versionNo }}</td>

              <!-- Raw Data ID -->
              <td class="px-4 py-3 text-center">
                {{ result.rawDataId }}
              </td>

              <!-- 가공일시 -->
              <td class="px-4 py-3 text-center">
                {{ formatDateTime(result.createdAt) }}
              </td>

              <!-- 매핑 여부 -->
              <td class="px-4 py-3 text-center">
                <span :class="isMatchingResult(result) ? 'text-green-700' : 'text-gray-400'">
                  {{ isMatchingResult(result) ? '일치' : '버전 불일치' }}
                </span>
              </td>

              <!-- 적재 상태 -->
              <td class="px-4 py-3 text-center">
                <span :class="getAnalysisLoadStatusClass(result.analysisLoadStatus)">
                  {{ getAnalysisLoadStatusLabel(result.analysisLoadStatus) }}
                </span>
              </td>
            </tr>

            <!-- 목록 안내 -->
            <tr v-if="!resultList.length && (!selectedModelId || isLoadingResults || currentPage > 0)">
              <td :colspan="showTaskRegistration ? 9 : 8" class="px-4 py-8 text-center text-gray-500">
                <template v-if="!selectedModelId">
                  적재 모델을 선택하면 가공 결과 목록이 표시됩니다.
                </template>
                <span v-else-if="isLoadingResults" role="status">
                  가공 결과를 불러오는 중입니다.
                </span>
                <template v-else>조회된 가공 결과가 없습니다.</template>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="hasMoreResults"
          :key="currentPage"
          ref="resultLoadTrigger"
          class="h-px"
          aria-hidden="true"
        ></div>
      </div>

      <!-- 추가 조회 -->
      <div v-if="hasMoreResults" class="border-t border-gray-200 px-4 py-3 text-center">
        <p v-if="loadMoreErrorMessage" role="status" class="mb-2 text-sm text-red-600">
          {{ loadMoreErrorMessage }}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <p class="text-xs text-gray-500">
            {{ totalCount }}건 중 {{ resultList.length }}건 불러옴
          </p>
          <button
            type="button"
            :disabled="isLoadingMore || isRegistering"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            @click="loadMoreResults"
          >
            {{
              isLoadingMore ? '불러오는 중...' : loadMoreErrorMessage ? '다시 시도' : '더 불러오기'
            }}
          </button>
        </div>
      </div>
    </section>

    <!-- ④ 적재 작업 등록 -->
    <section v-if="showTaskRegistration" class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900">④ 데이터 적재 작업 등록</h3>

        <span class="text-sm text-gray-600"> 선택 {{ selectedResults.length }}건 </span>
      </div>

      <!-- 등록 대상 확인 -->
      <div class="max-h-[280px] overflow-auto rounded-md border border-gray-200">
        <table class="w-full min-w-[500px] text-sm">
          <thead class="sticky top-0 bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left">가공 결과 ID</th>
              <th class="px-4 py-3 text-left">Raw Data ID</th>
              <th class="px-4 py-3 text-left">가공 규칙</th>
              <th class="px-4 py-3 text-center">관리</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr v-for="result in selectedResults" :key="result.transformResultId">
              <td class="px-4 py-3">
                {{ result.transformResultId }}
              </td>

              <td class="px-4 py-3">
                {{ result.rawDataId }}
              </td>

              <td class="px-4 py-3">
                {{ result.ruleName }}
              </td>

              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="text-sm text-red-600 hover:text-red-700"
                  :disabled="isRegistering"
                  @click="removeSelectedResult(result.transformResultId)"
                >
                  제외
                </button>
              </td>
            </tr>

            <!-- 선택한 결과가 없는 경우 -->
            <tr v-if="selectedResults.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                등록할 가공 결과를 선택해주세요.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 적재 작업 등록 -->
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          :disabled="!authStore.isAdmin || isRegistering || isLoadingResults || isLoadingMore"
          class="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          @click="registerAnalysisLoads"
        >
          {{ isRegistering ? '등록 중...' : `선택 ${selectedResults.length}건 적재 등록` }}
        </button>
      </div>

      <!-- 등록 안내 -->
      <p class="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        선택한 적재 모델과 가공 규칙 버전이 일치하고 아직 적재 작업이 등록되지 않은 결과만 선택할 수
        있습니다. 등록 시 적재 대기(PENDING) 작업이 생성되며 실제 데이터 적재는 Worker에서
        처리합니다.
      </p>
    </section>
  </div>
</template>
