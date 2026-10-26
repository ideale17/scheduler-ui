<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getExternalApiList } from '@/api/externalApi'
import { getTransformRuleList, getTransformRuleVersionList } from '@/api/transformRuleApi'
import { getAiAnalysisDataset } from '@/api/aiAnalysisApi'

// 1. 화면 상태
const externalApiList = ref([])
const transformRuleList = ref([])
const versionList = ref([])

const searchCondition = ref({
  externalApiId: '',
  transformRuleId: '',
  versionNo: '',
  startDate: '',
  endDate: '',
})

const dataset = ref(null)
const showFieldDetail = ref(false)

const isOptionsLoading = ref(false)
const isVersionLoading = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

let optionsRequestId = 0
let versionRequestId = 0
let datasetRequestId = 0

// 날짜를 YYYY-MM-DD 형식으로 변환한다.
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 기본 조회 기간을 최근 7일로 설정한다.
const setDefaultDates = () => {
  const today = new Date()
  const start = new Date(today)

  start.setDate(start.getDate() - 6)

  searchCondition.value.startDate = formatDate(start)
  searchCondition.value.endDate = formatDate(today)
}

// 선택한 규칙이 변경되면 버전 목록을 갱신한다.
const fetchVersionList = async (transformRuleId) => {
  const currentRequestId = ++versionRequestId

  versionList.value = []
  searchCondition.value.versionNo = ''

  if (!transformRuleId) {
    isVersionLoading.value = false
    return
  }

  isVersionLoading.value = true
  errorMessage.value = ''

  try {
    // 1. 선택한 규칙의 버전 목록을 조회한다.
    const response = await getTransformRuleVersionList(transformRuleId)

    if (currentRequestId !== versionRequestId) {
      return
    }

    versionList.value = Array.isArray(response.data) ? response.data : []

    // 2. 현재 버전을 기본 선택한다.
    const rule = transformRuleList.value.find(
      (item) => String(item.transformRuleId) === String(transformRuleId),
    )

    const currentVersion = versionList.value.find(
      (item) => Number(item.versionNo) === Number(rule?.currentVersion),
    )

    if (currentVersion) {
      searchCondition.value.versionNo = String(currentVersion.versionNo)
    }
  } catch (error) {
    if (currentRequestId !== versionRequestId) {
      return
    }

    console.error('가공 규칙 버전 조회 실패:', error)
    errorMessage.value = '가공 규칙 버전 목록을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === versionRequestId) {
      isVersionLoading.value = false
    }
  }
}

// External API와 가공 규칙 목록을 조회한다.
const fetchSearchOptions = async () => {
  const currentRequestId = ++optionsRequestId

  isOptionsLoading.value = true
  errorMessage.value = ''

  try {
    // 1. 기존 관리 API에서 선택 목록을 가져온다.
    const [apiResponse, ruleResponse] = await Promise.all([
      getExternalApiList(),
      getTransformRuleList(),
    ])

    if (currentRequestId !== optionsRequestId) {
      return
    }

    // 2. 검색조건 목록을 설정한다.
    externalApiList.value = Array.isArray(apiResponse.data) ? apiResponse.data : []
    transformRuleList.value = Array.isArray(ruleResponse.data) ? ruleResponse.data : []
  } catch (error) {
    if (currentRequestId !== optionsRequestId) {
      return
    }

    console.error('AI 분석 검색조건 조회 실패:', error)
    errorMessage.value = 'External API 또는 가공 규칙 목록을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === optionsRequestId) {
      isOptionsLoading.value = false
    }
  }
}

// 검색조건 변경 시 이전 조회 결과를 초기화한다.
const clearDataset = () => {
  datasetRequestId++
  isLoading.value = false
  dataset.value = null
  showFieldDetail.value = false
}

// 조회조건을 검증한다.
const validateSearchCondition = () => {
  const condition = searchCondition.value

  if (!condition.externalApiId) {
    return 'External API를 선택해주세요.'
  }

  if (!condition.transformRuleId) {
    return '가공 규칙을 선택해주세요.'
  }

  if (!condition.versionNo) {
    return '가공 규칙 버전을 선택해주세요.'
  }

  if (!condition.startDate || !condition.endDate) {
    return '분석 시작일과 종료일을 입력해주세요.'
  }

  if (condition.startDate > condition.endDate) {
    return '분석 시작일은 종료일보다 늦을 수 없습니다.'
  }

  const start = new Date(`${condition.startDate}T00:00:00`)
  const end = new Date(`${condition.endDate}T00:00:00`)
  const periodDays = Math.round((end - start) / 86400000) + 1

  if (!Number.isFinite(periodDays) || periodDays < 1 || periodDays > 31) {
    return '분석 기간은 최대 31일까지 지정할 수 있습니다.'
  }

  return ''
}

// 분석 데이터셋 구성 정보를 조회한다.
const fetchAnalysisDataset = async () => {
  if (isLoading.value || isVersionLoading.value || isOptionsLoading.value) {
    return
  }

  // 1. 조회조건을 검증한다.
  const validationMessage = validateSearchCondition()

  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  // 2. 조회 상태를 초기화한다.
  const currentRequestId = ++datasetRequestId
  const params = { ...searchCondition.value }

  dataset.value = null
  showFieldDetail.value = false
  errorMessage.value = ''
  isLoading.value = true

  try {
    // 3. 분석 데이터셋 구성 정보를 조회한다.
    const response = await getAiAnalysisDataset(params)

    if (currentRequestId !== datasetRequestId) {
      return
    }

    // 4. 데이터셋 정보를 화면에 설정한다.
    dataset.value = response.data
  } catch (error) {
    if (currentRequestId !== datasetRequestId) {
      return
    }

    console.error('AI 분석 데이터셋 조회 실패:', error)

    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : 'AI 분석 데이터셋을 불러오지 못했습니다.'
  } finally {
    if (currentRequestId === datasetRequestId) {
      isLoading.value = false
    }
  }
}

// 검색조건을 초기화한다.
const resetSearchCondition = () => {
  searchCondition.value = {
    externalApiId: '',
    transformRuleId: '',
    versionNo: '',
    startDate: '',
    endDate: '',
  }

  versionRequestId++
  versionList.value = []
  isVersionLoading.value = false
  errorMessage.value = ''

  setDefaultDates()
  clearDataset()
}

// 데이터셋에 레코드가 존재하는지 확인한다.
const hasRecords = computed(() => Number(dataset.value?.recordCount || 0) > 0)

// 분석 조건이 변경되면 기존 결과를 제거한다.
watch(
  [
    () => searchCondition.value.externalApiId,
    () => searchCondition.value.versionNo,
    () => searchCondition.value.startDate,
    () => searchCondition.value.endDate,
  ],
  clearDataset,
)

// 가공 규칙 변경 시 버전 목록을 다시 조회한다.
watch(
  () => searchCondition.value.transformRuleId,
  (transformRuleId) => {
    clearDataset()
    fetchVersionList(transformRuleId)
  },
)

onMounted(() => {
  setDefaultDates()
  fetchSearchOptions()
})

onUnmounted(() => {
  optionsRequestId++
  versionRequestId++
  datasetRequestId++
})
</script>

<template>
  <div class="space-y-4">
    <!-- 분석 대상 선택 -->
    <section class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5">
        <h3 class="text-base font-semibold text-gray-900">분석 대상 선택</h3>
        <p class="mt-1 text-sm text-gray-500">가공된 데이터와 분석 기간을 선택합니다.</p>
      </div>

      <form @submit.prevent="fetchAnalysisDataset">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <!-- External API -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> External API </label>
            <select
              v-model="searchCondition.externalApiId"
              :disabled="isOptionsLoading"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:opacity-50"
            >
              <option value="">API 선택</option>
              <option
                v-for="api in externalApiList"
                :key="api.externalApiId"
                :value="String(api.externalApiId)"
              >
                {{ api.apiName }}
              </option>
            </select>
          </div>

          <!-- 가공 규칙 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 가공 규칙 </label>
            <select
              v-model="searchCondition.transformRuleId"
              :disabled="isOptionsLoading"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:opacity-50"
            >
              <option value="">가공 규칙 선택</option>
              <option
                v-for="rule in transformRuleList"
                :key="rule.transformRuleId"
                :value="String(rule.transformRuleId)"
              >
                {{ rule.ruleName }}
              </option>
            </select>
          </div>

          <!-- 가공 규칙 버전 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 규칙 버전 </label>
            <select
              v-model="searchCondition.versionNo"
              :disabled="!searchCondition.transformRuleId || isVersionLoading"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:opacity-50"
            >
              <option value="">
                {{ isVersionLoading ? '버전 조회 중...' : '버전 선택' }}
              </option>
              <option
                v-for="version in versionList"
                :key="version.transformRuleVersionId"
                :value="String(version.versionNo)"
              >
                v{{ version.versionNo }} ({{ version.dataFormat }})
              </option>
            </select>
          </div>

          <!-- 분석 시작일 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 분석 시작일 </label>
            <input
              v-model="searchCondition.startDate"
              type="date"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <!-- 분석 종료일 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 분석 종료일 </label>
            <input
              v-model="searchCondition.endDate"
              type="date"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          가공 결과 생성일 기준이며, 최대 31일까지 조회할 수 있습니다.
        </p>

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
            type="submit"
            :disabled="isLoading || isOptionsLoading || isVersionLoading"
            class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {{ isLoading ? '조회 중...' : '분석 대상 조회' }}
          </button>
        </div>
      </form>
    </section>

    <!-- 조회 오류 -->
    <div
      v-if="errorMessage"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 조회 중 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500"
    >
      분석 데이터를 확인하는 중입니다.
    </div>

    <!-- 분석 데이터 요약 -->
    <section v-else-if="dataset" class="rounded-lg border border-gray-200 bg-white p-5">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-gray-900">분석 데이터 요약</h3>
          <p class="mt-1 text-sm text-gray-500">분석에 사용할 데이터의 규모와 품질을 확인합니다.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <!-- 전체 가공 결과 -->
        <div class="rounded-md bg-gray-50 p-4">
          <p class="text-xs font-medium text-gray-500">전체 가공 결과</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900">
            {{ dataset.totalSourceCount ?? 0 }}건
          </p>
        </div>

        <!-- 실제 처리한 가공 결과 -->
        <div class="rounded-md bg-gray-50 p-4">
          <p class="text-xs font-medium text-gray-500">처리한 가공 결과</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900">{{ dataset.sourceCount ?? 0 }}건</p>
        </div>

        <!-- 처리한 JSON 레코드 -->
        <div class="rounded-md bg-gray-50 p-4">
          <p class="text-xs font-medium text-gray-500">처리한 JSON 레코드</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900">{{ dataset.recordCount ?? 0 }}건</p>
        </div>

        <!-- 중복 후보 -->
        <div class="rounded-md bg-gray-50 p-4">
          <p class="text-xs font-medium text-gray-500">처리 범위 중복 후보</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900">
            {{ dataset.duplicateCandidateCount ?? 0 }}건
          </p>
        </div>
      </div>

      <!-- 조회 제한 안내 -->
      <div
        v-if="dataset.hasMore"
        class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
      >
        전체 가공 결과 {{ dataset.totalSourceCount }}건 중 {{ dataset.sourceCount }}건만
        처리했습니다. JSON 레코드 수, 중복 후보 및 필드별 통계는 처리한 데이터 기준입니다. 전체
        데이터에 대한 분석 결과로 사용할 수 없습니다.
      </div>

      <!-- 데이터 없음 -->
      <div
        v-if="!hasRecords"
        class="mt-4 rounded-md border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500"
      >
        분석 대상 레코드가 없습니다. 조회조건을 변경해주세요.
      </div>

      <!-- 데이터 품질 상세 -->
      <div v-if="dataset.fields?.length" class="mt-5 border-t border-gray-200 pt-4">
        <button
          type="button"
          class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          :aria-expanded="showFieldDetail"
          @click="showFieldDetail = !showFieldDetail"
        >
          <span>{{ showFieldDetail ? '▼' : '▶' }}</span>
          데이터 품질 상세보기
          <span class="text-xs font-normal text-gray-500">
            ({{ dataset.fields.length }}개 필드)
          </span>
        </button>

        <div v-if="showFieldDetail" class="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">필드명</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                  데이터 타입
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">존재</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">NULL</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">누락</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="field in dataset.fields" :key="field.fieldName">
                <td class="px-4 py-3 font-mono text-gray-800">
                  {{ field.fieldName }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ field.dataType }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ field.presentCount }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ field.nullCount }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ field.missingCount }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          중복 후보는 JSON 내용이 동일한 레코드 기준입니다. 실제 동일 거래나 이벤트라고 확정한 것은
          아닙니다.
        </p>
      </div>
    </section>

    <!-- 최초 화면 -->
    <section
      v-else-if="!errorMessage"
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <p class="text-sm font-medium text-gray-700">분석할 데이터를 선택해주세요.</p>
      <p class="mt-1 text-sm text-gray-500">
        External API, 가공 규칙, 기간을 선택한 후 분석 대상 조회를 실행합니다.
      </p>
    </section>
  </div>
</template>
