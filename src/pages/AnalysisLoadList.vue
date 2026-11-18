<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { getAnalysisModelList } from '@/api/analysisModelApi'
import { getAnalysisLoadList, createAnalysisLoadSources } from '@/api/analysisLoadApi'

const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()

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
})

const resultList = ref([])
const currentPage = ref(1)
const pageSize = 10
const totalCount = ref(0)

// 페이지를 이동해도 선택한 항목을 유지한다.
const selectedResults = ref([])

// 3. 화면 상태
const isLoadingModels = ref(false)
const isLoadingModel = ref(false)
const isLoadingResults = ref(false)
const isRegistering = ref(false)
const errorMessage = ref('')

// 이전 조회 요청의 응답이 뒤늦게 반영되지 않도록 관리한다.
let resultRequestId = 0

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))

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
  return isMatchingResult(result) && result.analysisLoadStatus == null
}

// 현재 페이지에서 선택 가능한 가공 결과
const selectableResults = computed(() => resultList.value.filter(isSelectableResult))

const isCurrentPageSelected = computed(() => {
  if (selectableResults.value.length === 0) {
    return false
  }

  return selectableResults.value.every((result) =>
    selectedResultIds.value.includes(result.transformResultId),
  )
})

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
 * 적재 모델을 변경한다.
 *
 * 기존에는 모델 상세, 가공 규칙 버전, 가공 결과를
 * 각각 조회했지만 이제 적재 대상 목록 API에서 함께 조회한다.
 */
const changeModel = async () => {
  // 1. 기존 조회 요청을 무효화한다.
  ++resultRequestId

  // 2. 이전 모델의 조회 및 선택 정보를 초기화한다.
  selectedModel.value = null
  selectedVersion.value = null
  transformVersionNo.value = null

  resultList.value = []
  selectedResults.value = []
  totalCount.value = 0
  currentPage.value = 1

  isLoadingResults.value = false
  errorMessage.value = ''

  // 3. 적재 모델이 선택되지 않았다면 조회하지 않는다.
  if (!selectedModelId.value) {
    isLoadingModel.value = false
    return
  }

  // 4. 선택한 적재 모델의 정보와 적재 대상 목록을 조회한다.
  isLoadingModel.value = true

  try {
    await fetchAnalysisLoads()
  } finally {
    isLoadingModel.value = false
  }
}

/**
 * 적재 모델 정보, 가공 결과 및 적재 상태를 한 번에 조회한다.
 */
const fetchAnalysisLoads = async () => {
  if (!selectedModelId.value) {
    return
  }

  // 1. 조회 요청 식별자와 조회 대상 모델을 확정한다.
  const requestId = ++resultRequestId
  const analysisModelId = Number(selectedModelId.value)

  isLoadingResults.value = true
  errorMessage.value = ''

  try {
    // 2. 적재 대상 목록 API를 호출한다.
    const response = await getAnalysisLoadList({
      analysisModelId,
      startDate: searchForm.value.startDate || undefined,
      endDate: searchForm.value.endDate || undefined,
      page: currentPage.value,
      size: pageSize,
    })

    // 3. 이전 요청의 결과는 반영하지 않는다.
    if (requestId !== resultRequestId || analysisModelId !== Number(selectedModelId.value)) {
      return
    }

    const data = response.data

    // 4. 백엔드 응답을 검증한다.
    if (!data?.model || !data?.version || data.transformVersionNo == null) {
      throw new Error('데이터 적재 대상 조회 응답이 올바르지 않습니다.')
    }

    // 5. 적재 모델 버전이 변경되었다면 이전 선택을 초기화한다.
    if (
      selectedVersion.value &&
      Number(selectedVersion.value.analysisModelVersionId) !==
        Number(data.version.analysisModelVersionId)
    ) {
      selectedResults.value = []
    }

    // 6. 적재 모델 및 가공 규칙 버전 정보를 설정한다.
    selectedModel.value = data.model
    selectedVersion.value = data.version
    transformVersionNo.value = data.transformVersionNo

    // 7. 적재 대상 목록과 페이징 정보를 설정한다.
    resultList.value = Array.isArray(data.content) ? data.content : []
    totalCount.value = Number(data.totalCount || 0)

    // 8. 현재 페이지에서 이미 등록된 Raw Data는 선택 목록에서도 제외한다.
    const registeredRawDataIds = new Set(
      resultList.value
        .filter((result) => result.analysisLoadStatus != null)
        .map((result) => result.rawDataId),
    )

    selectedResults.value = selectedResults.value.filter(
      (result) => !registeredRawDataIds.has(result.rawDataId),
    )
  } catch (error) {
    if (requestId !== resultRequestId) {
      return
    }

    console.error('데이터 적재 대상 조회 실패:', error)

    selectedModel.value = null
    selectedVersion.value = null
    transformVersionNo.value = null

    resultList.value = []
    totalCount.value = 0
    selectedResults.value = []

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : error.message || '데이터 적재 대상 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === resultRequestId) {
      isLoadingResults.value = false
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

  // 3. 페이지와 기존 선택 정보를 초기화한다.
  currentPage.value = 1
  selectedResults.value = []

  // 4. 적재 대상 목록을 다시 조회한다.
  fetchAnalysisLoads()
}

/**
 * 검색조건을 초기화한다.
 */
const resetSearch = () => {
  // 1. 검색조건을 초기화한다.
  searchForm.value = {
    startDate: '',
    endDate: '',
  }

  // 2. 첫 페이지로 이동하고 선택 정보를 초기화한다.
  currentPage.value = 1
  selectedResults.value = []

  // 3. 적재 대상 목록을 다시 조회한다.
  if (selectedModelId.value) {
    fetchAnalysisLoads()
  }
}

/**
 * 페이지를 변경한다.
 */
const changePage = (page) => {
  // 1. 페이지 변경 가능 여부를 확인한다.
  if (
    page < 1 ||
    page > totalPages.value ||
    page === currentPage.value ||
    isLoadingResults.value ||
    isRegistering.value
  ) {
    return
  }

  // 2. 페이지를 변경한다.
  currentPage.value = page

  // 3. 선택한 모델의 적재 대상 목록을 다시 조회한다.
  fetchAnalysisLoads()
}

/**
 * 가공 결과를 선택하거나 선택 해제한다.
 */
const toggleResultSelection = (result) => {
  // 1. 관리자 권한과 선택 가능 여부를 확인한다.
  if (!authStore.isAdmin || isRegistering.value || !isSelectableResult(result)) {
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

  // 3. 등록 가능한 최대 건수를 확인한다.
  if (selectedResults.value.length >= 100) {
    errorMessage.value = '적재 작업은 한 번에 최대 100건까지 등록할 수 있습니다.'
    return
  }

  // 4. 선택한 가공 결과를 추가한다.
  selectedResults.value = [...selectedResults.value, result]
  errorMessage.value = ''
}

/**
 * 현재 페이지 전체 선택 및 해제
 */
const toggleCurrentPageSelection = () => {
  // 1. 관리자 권한 및 등록 상태를 확인한다.
  if (!authStore.isAdmin || isRegistering.value) {
    return
  }

  const currentIds = selectableResults.value.map((result) => result.transformResultId)

  // 2. 현재 페이지의 선택 가능한 결과가 모두 선택됐다면 해제한다.
  if (isCurrentPageSelected.value) {
    selectedResults.value = selectedResults.value.filter(
      (result) => !currentIds.includes(result.transformResultId),
    )
    return
  }

  // 3. 아직 선택되지 않은 결과만 추가한다.
  const existingIds = new Set(selectedResultIds.value)

  const additionalResults = selectableResults.value.filter(
    (result) => !existingIds.has(result.transformResultId),
  )

  // 4. 최대 등록 건수를 검증한다.
  if (selectedResults.value.length + additionalResults.length > 100) {
    errorMessage.value = '적재 작업은 한 번에 최대 100건까지 등록할 수 있습니다.'
    return
  }

  // 5. 선택 결과를 추가한다.
  selectedResults.value = [...selectedResults.value, ...additionalResults]
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
  if (selectedResults.value.length > 100) {
    errorMessage.value = '한 번에 최대 100건까지 등록할 수 있습니다.'
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
  if (!authStore.isAdmin || isRegistering.value || isLoadingModel.value || isLoadingResults.value) {
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

    // 7. 선택 정보를 초기화한다.
    selectedResults.value = []

    // 8. 최신 적재 작업 상태를 다시 조회한다.
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

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 가공 시작일 </label>

          <input v-model="searchForm.startDate" type="date" :class="inputClass" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 가공 종료일 </label>

          <input v-model="searchForm.endDate" type="date" :class="inputClass" />
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
            <template v-if="authStore.isAdmin"> / 선택 {{ selectedResults.length }}건 </template>
          </p>
        </div>
      </div>

      <!-- 모델 미선택 -->
      <div v-if="!selectedModelId" class="p-10 text-center text-sm text-gray-500">
        적재 모델을 선택하면 가공 결과 목록이 표시됩니다.
      </div>

      <!-- 조회 중 -->
      <div
        v-else-if="isLoadingModel || isLoadingResults"
        class="p-10 text-center text-sm text-gray-500"
      >
        가공 결과를 불러오는 중입니다.
      </div>

      <!-- 적재 대상 목록 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[950px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50">
            <tr>
              <!-- 현재 페이지 전체 선택 -->
              <th v-if="authStore.isAdmin" class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="isCurrentPageSelected"
                  :disabled="selectableResults.length === 0 || isRegistering"
                  aria-label="현재 페이지 적재 가능 항목 전체 선택"
                  @change="toggleCurrentPageSelection"
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
              <td v-if="authStore.isAdmin" class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="selectedResultIds.includes(result.transformResultId)"
                  :disabled="!isSelectableResult(result) || isRegistering"
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

            <!-- 조회된 데이터가 없는 경우 -->
            <tr v-if="resultList.length === 0">
              <td :colspan="authStore.isAdmin ? 9 : 8" class="px-4 py-10 text-center text-gray-500">
                조회된 가공 결과가 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 페이지 이동 -->
      <div
        v-if="totalCount > 0"
        class="flex items-center justify-between border-t border-gray-200 p-4 text-sm"
      >
        <span class="text-gray-500"> 전체 {{ totalCount }}건 </span>

        <div class="flex items-center gap-3">
          <button
            type="button"
            :disabled="currentPage <= 1 || isLoadingResults || isRegistering"
            class="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            @click="changePage(currentPage - 1)"
          >
            이전
          </button>

          <span>{{ currentPage }} / {{ totalPages }}</span>

          <button
            type="button"
            :disabled="currentPage >= totalPages || isLoadingResults || isRegistering"
            class="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            @click="changePage(currentPage + 1)"
          >
            다음
          </button>
        </div>
      </div>
    </section>

    <!-- ④ 적재 작업 등록 -->
    <section v-if="authStore.isAdmin" class="rounded-lg border border-gray-200 bg-white p-4">
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
          :disabled="isRegistering"
          class="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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
