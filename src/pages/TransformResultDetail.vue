<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { getTransformResultDetail } from '@/api/transformResultApi'

// 화면 상태
const route = useRoute()
const router = useRouter()

const transformResult = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const activeTab = ref('tree')
const selectedJsonPath = ref('')

// 가공 결과 JSON 파싱
const parsedJson = computed(() => {
  const resultData = transformResult.value?.resultData

  if (resultData == null || resultData === '') {
    return { valid: false, value: null }
  }

  try {
    return {
      valid: true,
      value: typeof resultData === 'string' ? JSON.parse(resultData) : resultData,
    }
  } catch {
    return { valid: false, value: null }
  }
})

// 가공 결과 건수 계산
const resultCount = computed(() => {
  if (!parsedJson.value.valid) {
    return 0
  }

  return Array.isArray(parsedJson.value.value) ? parsedJson.value.value.length : 1
})

// 가공 결과 표시
const formattedResult = computed(() => {
  const resultData = transformResult.value?.resultData

  if (!parsedJson.value.valid) {
    return resultData == null ? '' : String(resultData)
  }

  return JSON.stringify(parsedJson.value.value, null, 2)
})

// 가공 결과 상세 조회
const fetchTransformResultDetail = async () => {
  const transformResultId = Number(route.params.transformResultId)

  if (!Number.isSafeInteger(transformResultId) || transformResultId < 1) {
    transformResult.value = null
    errorMessage.value = '가공 결과 식별자가 올바르지 않습니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getTransformResultDetail(transformResultId)

    transformResult.value = response.data
    selectedJsonPath.value = ''
    activeTab.value = parsedJson.value.valid ? 'tree' : 'raw'
  } catch (error) {
    console.error('가공 결과 상세 조회 실패:', error)

    transformResult.value = null
    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 결과 상세 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 가공 결과 복사
const copyResult = async () => {
  if (transformResult.value?.resultData == null) {
    return
  }

  try {
    await navigator.clipboard.writeText(formattedResult.value)
    alert('가공 결과를 복사했습니다.')
  } catch (error) {
    console.error('가공 결과 복사 실패:', error)
    alert('가공 결과를 복사하지 못했습니다.')
  }
}

// 목록 이동
const goBack = () => {
  router.push({
    path: '/transform-result',
    query: route.query,
  })
}

// 관련 데이터 이동
const goRawDataDetail = () => {
  router.push(`/raw-data/${transformResult.value.rawDataId}`)
}

const goExternalApiDetail = () => {
  router.push(`/externalApi/${transformResult.value.externalApiId}`)
}

const goTransformRuleDetail = () => {
  router.push(`/transform-rule/${transformResult.value.transformRuleId}`)
}

// 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

// 최초 상세 조회
onMounted(() => {
  fetchTransformResultDetail()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex items-center justify-end">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="goBack"
      >
        목록
      </button>
    </div>

    <!-- 로딩 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      가공 결과 상세 정보를 불러오는 중입니다.
    </div>

    <!-- 조회 오류 -->
    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="transformResult">
      <!-- 기본 정보 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h3 class="mb-4 text-sm font-semibold text-gray-900">기본 정보</h3>

        <dl class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <dt class="text-gray-500">가공 결과 ID</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ transformResult.transformResultId }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">가공 작업 ID</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ transformResult.transformTaskId }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">External API</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ transformResult.apiName || `API #${transformResult.externalApiId}` }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">Raw Data ID</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ transformResult.rawDataId }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">가공 규칙</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ transformResult.ruleName }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">적용 규칙 버전</dt>
            <dd class="mt-1 text-gray-700">
              v{{ transformResult.versionNo }} ({{ transformResult.dataFormat }})
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">가공 일시</dt>
            <dd class="mt-1 text-gray-700">
              {{ formatDateTime(transformResult.createdAt) }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- 가공 결과 데이터 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900">가공 결과 데이터</h3>

            <span
              v-if="parsedJson.valid"
              class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
            >
              {{ resultCount }}건
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              :disabled="!parsedJson.valid"
              class="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              :class="
                activeTab === 'tree'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              "
              @click="activeTab = 'tree'"
            >
              트리 보기
            </button>

            <button
              type="button"
              class="rounded-md border px-3 py-1.5 text-sm"
              :class="
                activeTab === 'raw'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              "
              @click="activeTab = 'raw'"
            >
              원본 보기
            </button>

            <button
              type="button"
              :disabled="transformResult.resultData == null"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              @click="copyResult"
            >
              복사
            </button>
          </div>
        </div>

        <!-- JSON 트리 -->
        <div v-if="activeTab === 'tree' && parsedJson.valid" class="space-y-3">
          <div class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
            <div class="mb-1 text-xs font-medium text-gray-500">선택한 JSON 경로</div>
            <div class="break-all font-mono text-sm text-gray-800">
              {{ selectedJsonPath || 'JSON 노드를 선택해 주세요.' }}
            </div>
          </div>

          <div class="max-h-[650px] overflow-auto rounded-md border border-gray-200 bg-white p-4">
            <VueJsonPretty
              v-model:selected-value="selectedJsonPath"
              :data="parsedJson.value"
              :deep="2"
              :show-length="true"
              :show-icon="true"
              selectable-type="single"
              :select-on-click-node="true"
              :editable="false"
            />
          </div>
        </div>

        <!-- 원본 JSON 보기 -->
        <pre
          v-else-if="activeTab === 'raw'"
          class="max-h-[650px] overflow-auto rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-5 text-gray-800"
        ><code>{{ formattedResult }}</code></pre>

        <div v-else class="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          JSON 형식으로 파싱할 수 없는 데이터입니다. 원본 보기에서 확인해 주세요.
        </div>
      </div>

      <!-- 관련 데이터 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h3 class="mb-4 text-sm font-semibold text-gray-900">관련 데이터</h3>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="goRawDataDetail"
          >
            Raw Data 상세
          </button>

          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="goExternalApiDetail"
          >
            External API 상세
          </button>

          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="goTransformRuleDetail"
          >
            가공 규칙 상세
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
