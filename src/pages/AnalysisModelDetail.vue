<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import {
  getAnalysisModelDetail,
  getAnalysisModelVersionList,
  getAnalysisModelVersionDetail,
} from '@/api/analysisModelApi'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 분석 모델 상세 정보 및 버전 이력
const detail = ref(null)
const versions = ref([])
const selectedVersionId = ref(null)

// 화면 상태
const isLoading = ref(false)
const isVersionLoading = ref(false)
const errorMessage = ref('')
const versionError = ref('')

// 뒤늦게 도착한 요청 결과가 현재 화면을 덮어쓰지 않도록 한다.
let detailRequestId = 0
let versionRequestId = 0

/**
 * URL에 전달된 분석 모델 식별자를 검증한다.
 */
const getAnalysisModelId = () => {
  const id = Number(route.params.analysisModelId)

  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * 현재 버전의 분석 모델 상세 정보와 전체 버전 이력을 조회한다.
 */
const fetchAnalysisModelDetail = async () => {
  const analysisModelId = getAnalysisModelId()
  const requestId = ++detailRequestId

  // 기존 버전 상세 조회 요청을 무효화한다.
  ++versionRequestId

  detail.value = null
  versions.value = []
  selectedVersionId.value = null
  isVersionLoading.value = false
  errorMessage.value = ''
  versionError.value = ''

  if (!analysisModelId) {
    errorMessage.value = '데이터 적재 모델 식별자가 올바르지 않습니다.'
    return
  }

  isLoading.value = true

  try {
    // 1. 현재 모델 상세 정보와 버전 목록을 함께 조회한다.
    const [detailResponse, versionsResponse] = await Promise.all([
      getAnalysisModelDetail(analysisModelId),
      getAnalysisModelVersionList(analysisModelId),
    ])

    if (requestId !== detailRequestId) {
      return
    }

    // 2. 조회 응답 구조를 검증한다.
    const data = detailResponse.data

    if (!data?.model || !data?.version) {
      throw new Error('데이터 적재 모델 상세 응답이 올바르지 않습니다.')
    }

    // 3. 현재 버전 상세 정보와 전체 버전 목록을 설정한다.
    detail.value = {
      ...data,
      fields: Array.isArray(data.fields) ? data.fields : [],
    }

    versions.value = Array.isArray(versionsResponse.data) ? versionsResponse.data : []

    selectedVersionId.value = data.version.analysisModelVersionId
  } catch (error) {
    if (requestId !== detailRequestId) {
      return
    }

    console.error('데이터 적재 모델 상세 조회 실패:', error)

    detail.value = null
    versions.value = []
    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '데이터 적재 모델 상세 정보를 불러오지 못했습니다.'
  } finally {
    if (requestId === detailRequestId) {
      isLoading.value = false
    }
  }
}

/**
 * 선택한 과거 버전의 필드 매핑을 조회한다.
 */
const selectVersion = async (analysisModelVersionId) => {
  const analysisModelId = getAnalysisModelId()
  const versionId = Number(analysisModelVersionId)

  if (
    !analysisModelId ||
    !Number.isSafeInteger(versionId) ||
    versionId < 1 ||
    isVersionLoading.value ||
    versionId === selectedVersionId.value
  ) {
    return
  }

  const requestId = ++versionRequestId

  isVersionLoading.value = true
  versionError.value = ''

  try {
    // 1. 선택한 버전의 상세 정보를 조회한다.
    const response = await getAnalysisModelVersionDetail(analysisModelId, versionId)

    if (requestId !== versionRequestId || !response.data?.model || !response.data?.version) {
      return
    }

    // 2. 선택한 버전의 설정과 매핑 정보를 표시한다.
    detail.value = {
      ...response.data,
      fields: Array.isArray(response.data.fields) ? response.data.fields : [],
    }

    selectedVersionId.value = versionId
  } catch (error) {
    if (requestId !== versionRequestId) {
      return
    }

    console.error('데이터 적재 모델 버전 상세 조회 실패:', error)

    versionError.value = '선택한 버전 정보를 불러오지 못했습니다.'
  } finally {
    if (requestId === versionRequestId) {
      isVersionLoading.value = false
    }
  }
}

/**
 * 모델의 현재 버전으로 돌아간다.
 */
const viewCurrentVersion = async () => {
  const currentVersionNo = detail.value?.model?.currentVersion

  const current = versions.value.find((version) => version.versionNo === currentVersionNo)

  if (!current) {
    versionError.value = '현재 버전 정보를 찾을 수 없습니다.'
    return
  }

  await selectVersion(current.analysisModelVersionId)
}

/**
 * 사용 여부에 따라 화면 스타일을 지정한다.
 */
const getEnabledClass = (enabled) => {
  return enabled === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}

/**
 * 날짜 및 시간 문자열을 표시한다.
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

/**
 * 대상 테이블명을 스키마와 함께 표시한다.
 */
const getTargetTableLabel = (model) => {
  if (!model?.targetTable) {
    return '-'
  }

  return model.targetSchema ? `${model.targetSchema}.${model.targetTable}` : model.targetTable
}

/**
 * 원본 필드 목록을 한 줄로 표시한다.
 *
 * 현재 등록 화면은 1:1 매핑을 지원하지만
 * 과거 데이터의 SOURCE_FIELDS는 배열로 유지한다.
 */
const formatSourceFields = (sourceFields) => {
  if (!Array.isArray(sourceFields) || sourceFields.length === 0) {
    return '-'
  }

  return sourceFields.join(', ')
}

/**
 * 변환 방식의 한글 설명을 표시한다.
 */
const getConvertTypeLabel = (convertType) => {
  const labels = {
    DIRECT: '직접 매핑',
    NUMBER_NORMALIZE: '숫자 정리',
    DATE_PARSE: '날짜 변환',
    DATE_PARTS: '연·월·일 결합',
  }

  return labels[convertType] || convertType || '-'
}

/**
 * 목록 화면으로 이동한다.
 */
const goToList = () => {
  router.push('/analysis-model')
}

// 동일 컴포넌트에서 URL 파라미터가 바뀌는 경우 다시 조회한다.
watch(
  () => route.params.analysisModelId,
  () => {
    fetchAnalysisModelDetail()
  },
)

// 최초 화면 진입 시 데이터를 조회한다.
onMounted(() => {
  fetchAnalysisModelDetail()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex justify-end gap-2">
      <button
        v-if="authStore.isAdmin && detail"
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push(`/analysis-model/${getAnalysisModelId()}/edit`)"
      >
        수정
      </button>

      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="goToList"
      >
        목록
      </button>
    </div>

    <!-- 상세 조회 중 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      데이터 적재 모델 정보를 불러오는 중입니다.
    </div>

    <!-- 상세 조회 오류 -->
    <div
      v-else-if="errorMessage"
      role="alert"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="detail">
      <!-- 1. 모델 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>

          <span
            class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            :class="getEnabledClass(detail.model.enabled)"
          >
            {{ detail.model.enabled === 'Y' ? '사용' : '미사용' }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <div class="text-xs font-medium text-gray-500">모델명</div>

            <div class="mt-1 text-sm font-medium text-gray-900">
              {{ detail.model.modelName }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">현재 버전</div>

            <div class="mt-1 text-sm text-gray-700">v{{ detail.model.currentVersion }}</div>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500">설명</div>

            <div class="mt-1 whitespace-pre-wrap text-sm text-gray-700">
              {{ detail.model.description || '-' }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">대상 스키마</div>

            <div class="mt-1 font-mono text-sm text-gray-700">
              {{ detail.model.targetSchema }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">대상 업무 테이블</div>

            <div class="mt-1 break-all font-mono text-sm text-gray-700">
              {{ getTargetTableLabel(detail.model) }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">등록 일시</div>

            <div class="mt-1 text-sm text-gray-700">
              {{ formatDateTime(detail.model.createdAt) }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">수정 일시</div>

            <div class="mt-1 text-sm text-gray-700">
              {{ formatDateTime(detail.model.updatedAt) }}
            </div>
          </div>
        </div>
      </section>

      <!-- 2. 적재 모델 버전 설정 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-gray-900">
              적재 설정
              <span class="ml-2 text-sm font-normal text-gray-500">
                v{{ detail.version.versionNo }}
              </span>
            </h3>

            <p class="mt-1 text-sm text-gray-500">
              선택한 버전에 연결된 가공 규칙 버전과 적재 설정입니다.
            </p>
          </div>

          <button
            v-if="detail.version.versionNo !== detail.model.currentVersion"
            type="button"
            :disabled="isVersionLoading"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="viewCurrentVersion"
          >
            현재 버전 보기
          </button>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <div class="text-xs font-medium text-gray-500">분석 모델 버전</div>

            <div class="mt-1 text-sm font-medium text-gray-900">
              v{{ detail.version.versionNo }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">연결된 가공 규칙 버전 ID</div>

            <div class="mt-1 font-mono text-sm text-gray-700">
              {{ detail.version.transformRuleVersionId }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">버전 생성 일시</div>

            <div class="mt-1 text-sm text-gray-700">
              {{ formatDateTime(detail.version.createdAt) }}
            </div>
          </div>
        </div>
      </section>

      <!-- 3. 업무 컬럼 매핑 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900">업무 컬럼 매핑</h3>

          <p class="mt-1 text-sm text-gray-500">
            선택한 버전의 매핑 설정 {{ detail.fields.length }}개
          </p>
        </div>

        <div class="overflow-x-auto rounded-md border border-gray-200">
          <table class="w-full min-w-[850px] text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">순서</th>

                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  대상 DB 컬럼
                </th>

                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  가공 결과 필드
                </th>

                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">변환 방식</th>

                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">날짜 형식</th>

                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">필수 여부</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(field, index) in detail.fields"
                :key="field.analysisFieldId ?? index"
                class="hover:bg-gray-50"
              >
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ (field.sortOrder ?? index) + 1 }}
                </td>

                <td class="px-4 py-3 font-mono font-medium text-gray-900">
                  {{ field.targetColumn }}
                </td>

                <td class="px-4 py-3 font-mono text-gray-700">
                  {{ formatSourceFields(field.sourceFields) }}
                </td>

                <td class="px-4 py-3 text-center text-gray-700">
                  {{ getConvertTypeLabel(field.convertType) }}
                </td>

                <td class="px-4 py-3 text-center font-mono text-gray-600">
                  {{ field.convertFormat || '-' }}
                </td>

                <td class="px-4 py-3 text-center">
                  <span
                    :class="field.requiredYn === 'Y' ? 'font-medium text-red-600' : 'text-gray-600'"
                  >
                    {{ field.requiredYn === 'Y' ? '필수' : '선택' }}
                  </span>
                </td>
              </tr>

              <tr v-if="detail.fields.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  등록된 컬럼 매핑이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 4. 모델 버전 이력 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900">버전 이력</h3>

          <p class="mt-1 text-sm text-gray-500">
            과거 버전을 선택하면 당시의 컬럼 매핑을 확인할 수 있습니다.
          </p>
        </div>

        <div
          v-if="versionError"
          role="alert"
          class="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ versionError }}
        </div>

        <div class="overflow-x-auto rounded-md border border-gray-200">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">모델 버전</th>

                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                  가공 규칙 버전 ID
                </th>

                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">생성 일시</th>

                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">관리</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="version in versions"
                :key="version.analysisModelVersionId"
                class="hover:bg-gray-50"
              >
                <td class="px-4 py-3 text-center font-medium text-gray-900">
                  v{{ version.versionNo }}

                  <span
                    v-if="version.versionNo === detail.model.currentVersion"
                    class="ml-1 text-xs font-normal text-green-700"
                  >
                    (현재)
                  </span>
                </td>

                <td class="px-4 py-3 text-center font-mono text-gray-600">
                  {{ version.transformRuleVersionId }}
                </td>

                <td class="px-4 py-3 text-center text-gray-600">
                  {{ formatDateTime(version.createdAt) }}
                </td>

                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    :disabled="
                      isVersionLoading || selectedVersionId === version.analysisModelVersionId
                    "
                    class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
                    @click="selectVersion(version.analysisModelVersionId)"
                  >
                    {{ selectedVersionId === version.analysisModelVersionId ? '선택됨' : '보기' }}
                  </button>
                </td>
              </tr>

              <tr v-if="versions.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                  버전 이력이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
