<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { getAnalysisModelList } from '@/api/analysisModelApi'

const router = useRouter()
const authStore = useAuthStore()

const analysisModelList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// 검색조건
const searchForm = ref({
  modelName: '',
  enabled: '',
})

// 마지막으로 적용한 검색조건
const appliedSearch = ref({
  modelName: '',
  enabled: '',
})

// 최신 조회 요청만 화면에 반영한다.
let searchRequestId = 0

/**
 * 검색조건에 해당하는 데이터 적재 모델 목록을 조회한다.
 */
const fetchAnalysisModelList = async () => {
  // 1. 조회조건을 구성한다.
  const searchParams = {
    modelName: searchForm.value.modelName.trim(),
    enabled: searchForm.value.enabled,
  }

  appliedSearch.value = { ...searchParams }

  // 2. 조회 상태를 초기화한다.
  const requestId = ++searchRequestId
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 3. 백엔드 목록 조회 API를 호출한다.
    const response = await getAnalysisModelList(searchParams)

    // 4. 마지막 조회 요청의 결과만 반영한다.
    if (requestId !== searchRequestId) {
      return
    }

    analysisModelList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== searchRequestId) {
      return
    }

    console.error('데이터 적재 모델 목록 조회 실패:', error)

    analysisModelList.value = []

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '데이터 적재 모델 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === searchRequestId) {
      isLoading.value = false
    }
  }
}

/**
 * 검색조건을 초기화하고 전체 목록을 다시 조회한다.
 */
const resetSearch = () => {
  // 1. 검색조건을 초기화한다.
  searchForm.value = {
    modelName: '',
    enabled: '',
  }

  // 2. 초기화한 조건으로 다시 조회한다.
  fetchAnalysisModelList()
}

/**
 * 사용 여부를 한글로 표시한다.
 */
const getEnabledLabel = (enabled) => {
  return enabled === 'Y' ? '사용' : '미사용'
}

/**
 * 사용 여부에 따른 스타일을 반환한다.
 */
const getEnabledClass = (enabled) => {
  return enabled === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}

/**
 * 서버의 날짜·시간 데이터를 화면 형식으로 표시한다.
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

/**
 * 대상 스키마와 테이블명을 결합하여 표시한다.
 */
const getTargetTableLabel = (model) => {
  if (!model.targetTable) {
    return '-'
  }

  if (!model.targetSchema) {
    return model.targetTable
  }

  return `${model.targetSchema}.${model.targetTable}`
}

/**
 * 데이터 적재 모델 등록 화면으로 이동한다.
 */
const goToAdd = () => {
  router.push('/analysis-model/add')
}

/**
 * 데이터 적재 모델 상세 화면으로 이동한다.
 */
const viewDetail = (analysisModelId) => {
  router.push(`/analysis-model/${analysisModelId}`)
}

// 최초 화면 진입 시 전체 목록을 조회한다.
onMounted(() => {
  fetchAnalysisModelList()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 조회조건 -->
    <section class="rounded-lg border border-gray-200 bg-white p-4">
      <form @submit.prevent="fetchAnalysisModelList">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- 모델명 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 모델명 </label>

            <input
              v-model="searchForm.modelName"
              type="text"
              maxlength="100"
              placeholder="모델명 입력"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <!-- 사용 여부 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 사용 여부 </label>

            <select
              v-model="searchForm.enabled"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="">전체</option>
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </div>
        </div>

        <!-- 검색 버튼 -->
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            :disabled="isLoading"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="resetSearch"
          >
            초기화
          </button>

          <button
            type="submit"
            :disabled="isLoading"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isLoading ? '조회 중...' : '조회' }}
          </button>
        </div>
      </form>
    </section>

    <!-- 데이터 적재 모델 등록 -->
    <div v-if="authStore.isAdmin" class="flex justify-end">
      <button
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="goToAdd"
      >
        데이터 적재 모델 등록
      </button>
    </div>

    <!-- 조회 오류 -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 조회 중 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500"
    >
      데이터 적재 모델 목록을 불러오는 중입니다.
    </div>

    <!-- 데이터 적재 모델 목록 -->
    <div
      v-else-if="!errorMessage && analysisModelList.length > 0"
      class="overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">모델명</th>

            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">
              대상 업무 테이블
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">현재 버전</th>

            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">사용 여부</th>

            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">설명</th>

            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">수정 일시</th>

            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">관리</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="model in analysisModelList"
            :key="model.analysisModelId"
            class="transition-colors hover:bg-gray-50"
          >
            <!-- 모델명 -->
            <td class="px-4 py-3 text-center font-medium text-gray-900">
              {{ model.modelName }}
            </td>

            <!-- 대상 업무 테이블 -->
            <td class="px-4 py-3 text-center text-gray-700">
              <span class="break-all" :title="getTargetTableLabel(model)">
                {{ getTargetTableLabel(model) }}
              </span>
            </td>

            <!-- 현재 버전 -->
            <td class="px-4 py-3 text-center text-gray-700">v{{ model.currentVersion }}</td>

            <!-- 사용 여부 -->
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getEnabledClass(model.enabled)"
              >
                {{ getEnabledLabel(model.enabled) }}
              </span>
            </td>

            <!-- 모델 설명 -->
            <td class="max-w-xs px-4 py-3 text-gray-600">
              <div class="truncate" :title="model.description || ''">
                {{ model.description || '-' }}
              </div>
            </td>

            <!-- 수정 일시 -->
            <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
              {{ formatDateTime(model.updatedAt) }}
            </td>

            <!-- 관리 -->
            <td class="px-4 py-3 text-center">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                @click="viewDetail(model.analysisModelId)"
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
      v-else-if="!errorMessage"
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <template v-if="appliedSearch.modelName || appliedSearch.enabled">
        <p class="text-sm font-medium text-gray-700">
          조회조건에 해당하는 데이터 적재 모델이 없습니다.
        </p>

        <p class="mt-1 text-sm text-gray-500">
          검색조건을 변경하거나 초기화한 후 다시 조회해주세요.
        </p>
      </template>

      <template v-else>
        <p class="text-sm font-medium text-gray-700">등록된 데이터 적재 모델이 없습니다.</p>

        <p class="mt-1 text-sm text-gray-500">
          데이터 적재 모델을 등록하여 Transform 결과와 업무 테이블 컬럼을 연결할 수 있습니다.
        </p>
      </template>
    </div>
  </div>
</template>
