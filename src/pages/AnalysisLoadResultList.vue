<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getAnalysisModelList } from '@/api/analysisModelApi'
import { getAnalysisLoadResults } from '@/api/analysisLoadApi'

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500'

// 1. 적재 모델 정보
const analysisModelList = ref([])
const selectedModelId = ref('')

const selectedModel = computed(() =>
  analysisModelList.value.find((model) => String(model.analysisModelId) === selectedModelId.value),
)

const targetTable = computed(() => {
  if (!selectedModel.value) {
    return '-'
  }

  return `${selectedModel.value.targetSchema}.${selectedModel.value.targetTable}`
})

// 2. 적재 데이터 및 페이징 정보
const columns = ref([])
const resultList = ref([])

const currentPage = ref(1)
const pageSize = 50
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))

const startRow = computed(() => {
  if (resultList.value.length === 0) {
    return 0
  }

  return (currentPage.value - 1) * pageSize + 1
})

const endRow = computed(() => {
  if (resultList.value.length === 0) {
    return 0
  }

  return startRow.value + resultList.value.length - 1
})

// 3. 화면 상태
const isLoadingModels = ref(false)
const isLoadingResults = ref(false)
const errorMessage = ref('')

// 이전 조회 요청의 응답이 뒤늦게 반영되지 않도록 관리한다.
let resultRequestId = 0
let modelRequestId = 0

/**
 * 데이터 적재 모델 목록을 조회한다.
 */
const fetchAnalysisModels = async () => {
  const requestId = ++modelRequestId

  isLoadingModels.value = true
  errorMessage.value = ''

  try {
    // 1. 사용 중지된 모델도 기존 적재 데이터를 조회할 수 있도록 한다.
    const response = await getAnalysisModelList()

    if (requestId !== modelRequestId) {
      return
    }

    analysisModelList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== modelRequestId) {
      return
    }

    console.error('적재 모델 목록 조회 실패:', error)

    analysisModelList.value = []

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '데이터 적재 모델 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === modelRequestId) {
      isLoadingModels.value = false
    }
  }
}

/**
 * 선택한 적재 모델의 실제 저장 데이터를 조회한다.
 */
const fetchAnalysisLoadResults = async () => {
  if (!selectedModelId.value) {
    return
  }

  // 1. 조회 요청 식별자와 대상 모델을 확정한다.
  const requestId = ++resultRequestId
  const analysisModelId = selectedModelId.value

  isLoadingResults.value = true
  errorMessage.value = ''

  try {
    // 2. 적재 데이터 조회 API를 호출한다.
    const response = await getAnalysisLoadResults({
      analysisModelId,
      page: currentPage.value,
      size: pageSize,
    })

    // 3. 이전 요청의 결과는 화면에 반영하지 않는다.
    if (requestId !== resultRequestId || analysisModelId !== selectedModelId.value) {
      return
    }

    const data = response.data

    // 4. 백엔드 응답을 검증한다.
    if (!data?.model || !Array.isArray(data.columns) || !Array.isArray(data.content)) {
      throw new Error('적재 데이터 조회 응답이 올바르지 않습니다.')
    }

    // 5. 대상 테이블의 컬럼과 실제 적재 데이터를 설정한다.
    columns.value = data.columns
    resultList.value = data.content
    totalCount.value = Number(data.totalCount || 0)
  } catch (error) {
    if (requestId !== resultRequestId) {
      return
    }

    console.error('적재 데이터 조회 실패:', error)

    columns.value = []
    resultList.value = []
    totalCount.value = 0

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '적재 데이터를 불러오지 못했습니다.'
  } finally {
    if (requestId === resultRequestId) {
      isLoadingResults.value = false
    }
  }
}

/**
 * 조회 대상 적재 모델을 변경한다.
 */
const changeModel = async () => {
  // 1. 이전 조회 요청을 무효화한다.
  ++resultRequestId

  // 2. 기존 조회 정보를 초기화한다.
  columns.value = []
  resultList.value = []
  totalCount.value = 0
  currentPage.value = 1

  isLoadingResults.value = false
  errorMessage.value = ''

  // 3. 선택한 적재 모델의 실제 저장 데이터를 조회한다.
  if (selectedModelId.value) {
    await fetchAnalysisLoadResults()
  }
}

/**
 * 페이지를 변경한다.
 */
const changePage = (page) => {
  // 1. 페이지 변경 가능 여부를 확인한다.
  if (page < 1 || page > totalPages.value || page === currentPage.value || isLoadingResults.value) {
    return
  }

  // 2. 변경된 페이지의 적재 데이터를 조회한다.
  currentPage.value = page

  fetchAnalysisLoadResults()
}

/**
 * DB에 저장된 값을 화면에 표시한다.
 */
const formatValue = (value) => {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

// 초기 적재 모델 목록 조회
onMounted(() => {
  fetchAnalysisModels()
})

// 화면 종료 후 이전 요청 결과 반영 방지
onUnmounted(() => {
  ++resultRequestId
  ++modelRequestId
})
</script>

<template>
  <div class="space-y-4">
    <!-- 적재 모델 선택 -->
    <section class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
        <div>
          <label for="analysisModelId" class="mb-1 block text-sm font-medium text-gray-700">
            적재 모델
          </label>

          <select
            id="analysisModelId"
            v-model="selectedModelId"
            :class="inputClass"
            :disabled="isLoadingModels"
            @change="changeModel"
          >
            <option value="">
              {{ isLoadingModels ? '적재 모델 조회 중...' : '적재 모델 선택' }}
            </option>

            <option
              v-for="model in analysisModelList"
              :key="model.analysisModelId"
              :value="String(model.analysisModelId)"
            >
              {{ model.modelName }}
              {{ model.enabled === 'N' ? '(사용 중지)' : '' }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"> 대상 테이블 </label>

          <div class="break-all rounded-md bg-gray-100 px-3 py-2 font-mono text-sm text-gray-700">
            {{ targetTable }}
          </div>
        </div>
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

    <!-- 저장된 데이터 -->
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div class="flex items-center justify-between border-b border-gray-200 p-4">
        <h3 class="text-sm font-semibold text-gray-900">저장된 데이터</h3>

        <span class="text-xs text-gray-500"> 전체 {{ totalCount.toLocaleString() }}건 </span>
      </div>

      <!-- 모델 미선택 -->
      <div v-if="!selectedModelId" class="p-10 text-center text-sm text-gray-500">
        적재 모델을 선택하면 실제 저장된 데이터가 표시됩니다.
      </div>

      <!-- 조회 중 -->
      <div v-else-if="isLoadingResults" class="p-10 text-center text-sm text-gray-500">
        적재 데이터를 불러오는 중입니다.
      </div>

      <!-- 조회 실패 -->
      <div v-else-if="errorMessage" class="p-10 text-center text-sm text-gray-500">
        적재 데이터를 조회하지 못했습니다.
      </div>

      <!-- 적재 데이터 목록 -->
      <div v-else class="p-4">
        <div
          v-if="columns.length > 0"
          class="overflow-x-auto rounded-lg border border-gray-200 bg-white"
        >
          <table class="w-full text-sm">
            <!-- 대상 테이블 컬럼 -->
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.columnName"
                  class="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-gray-500"
                >
                  {{ column.columnName }}
                </th>
              </tr>
            </thead>

            <!-- 실제 적재 데이터 -->
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(result, index) in resultList"
                :key="index"
                class="transition-colors hover:bg-gray-50"
              >
                <td
                  v-for="column in columns"
                  :key="column.columnName"
                  class="whitespace-nowrap px-4 py-3 text-center text-gray-700"
                >
                  {{ formatValue(result[column.columnName]) }}
                </td>
              </tr>

              <!-- 조회된 데이터가 없는 경우 -->
              <tr v-if="resultList.length === 0">
                <td :colspan="columns.length" class="px-4 py-10 text-center text-gray-500">
                  저장된 데이터가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="p-10 text-center text-sm text-gray-500">
          조회된 컬럼 정보가 없습니다.
        </div>
      </div>

      <!-- 페이지 이동 -->
      <div
        v-if="totalCount > 0 && !errorMessage"
        class="flex items-center justify-between border-t border-gray-200 p-4 text-sm"
      >
        <span class="text-gray-500">
          {{ startRow.toLocaleString() }}-{{ endRow.toLocaleString() }}행 /
          {{ totalCount.toLocaleString() }}건
        </span>

        <div class="flex items-center gap-3">
          <button
            type="button"
            :disabled="currentPage <= 1 || isLoadingResults"
            class="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            @click="changePage(currentPage - 1)"
          >
            이전
          </button>

          <span>{{ currentPage }} / {{ totalPages }}</span>

          <button
            type="button"
            :disabled="currentPage >= totalPages || isLoadingResults"
            class="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            @click="changePage(currentPage + 1)"
          >
            다음
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
