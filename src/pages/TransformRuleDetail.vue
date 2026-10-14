<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getTransformRuleDetail,
  getTransformRuleVersionList,
  getTransformRuleVersionDetail,
} from '@/api/transformRuleApi'

const route = useRoute()
const router = useRouter()

const detail = ref(null)
const versions = ref([])
const selectedVersionId = ref(null)

const isLoading = ref(false)
const isVersionLoading = ref(false)
const errorMessage = ref('')
const versionError = ref('')

const getRuleId = () => {
  const id = Number(route.params.transformRuleId)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// 가공 규칙 상세 및 버전 목록 조회
const fetchTransformRuleDetail = async () => {
  const transformRuleId = getRuleId()

  if (!transformRuleId) {
    errorMessage.value = '가공 규칙 식별자가 올바르지 않습니다.'
    detail.value = null
    versions.value = []
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  versionError.value = ''

  try {
    // 1. 현재 규칙 정보와 버전 목록을 조회한다.
    const [detailResponse, versionsResponse] = await Promise.all([
      getTransformRuleDetail(transformRuleId),
      getTransformRuleVersionList(transformRuleId),
    ])

    // 2. 조회 결과를 화면에 설정한다.
    detail.value = detailResponse.data
    versions.value = Array.isArray(versionsResponse.data) ? versionsResponse.data : []
    selectedVersionId.value = detail.value?.version?.transformRuleVersionId ?? null
  } catch (error) {
    console.error('가공 규칙 상세 조회 실패:', error)
    detail.value = null
    versions.value = []
    errorMessage.value = '가공 규칙 상세 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 선택한 버전의 상세 정보 조회
const selectVersion = async (versionId) => {
  const transformRuleId = getRuleId()
  const id = Number(versionId)

  if (!transformRuleId || !Number.isSafeInteger(id) || id < 1 || isVersionLoading.value) {
    return
  }

  if (id === selectedVersionId.value) {
    return
  }

  isVersionLoading.value = true
  versionError.value = ''

  try {
    // 1. 선택한 버전의 설정 및 추출 필드를 조회한다.
    const response = await getTransformRuleVersionDetail(transformRuleId, id)

    // 2. 화면에 선택한 버전의 설정을 표시한다.
    detail.value = response.data
    selectedVersionId.value = id
  } catch (error) {
    console.error('가공 규칙 버전 상세 조회 실패:', error)
    versionError.value = '선택한 버전 정보를 불러오지 못했습니다.'
  } finally {
    isVersionLoading.value = false
  }
}

// 현재 버전으로 이동
const viewCurrentVersion = async () => {
  const current = versions.value.find(
    (version) => version.versionNo === detail.value?.rule?.currentVersion,
  )

  if (current) {
    await selectVersion(current.transformRuleVersionId)
  }
}

const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

const getEnabledClass = (enabled) => {
  return enabled === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}

watch(
  () => route.params.transformRuleId,
  () => {
    fetchTransformRuleDetail()
  },
)

onMounted(() => {
  fetchTransformRuleDetail()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="router.push('/transform-rule')"
      >
        목록
      </button>
    </div>

    <!-- 로딩 -->
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      가공 규칙 정보를 불러오는 중입니다.
    </div>

    <!-- 오류 -->
    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="detail">
      <!-- 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>
          <span
            class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            :class="getEnabledClass(detail.rule.enabled)"
          >
            {{ detail.rule.enabled === 'Y' ? '사용' : '미사용' }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <div class="text-xs font-medium text-gray-500">규칙명</div>
            <div class="mt-1 text-sm font-medium text-gray-900">
              {{ detail.rule.ruleName }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">현재 버전</div>
            <div class="mt-1 text-sm text-gray-700">v{{ detail.rule.currentVersion }}</div>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500">설명</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ detail.rule.description || '-' }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">등록 일시</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ formatDateTime(detail.rule.createdAt) }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">수정 일시</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ formatDateTime(detail.rule.updatedAt) }}
            </div>
          </div>
        </div>
      </section>

      <!-- 가공 설정 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-gray-900">
              가공 설정
              <span class="ml-2 text-sm font-normal text-gray-500">
                v{{ detail.version.versionNo }}
              </span>
            </h3>
            <p class="mt-1 text-sm text-gray-500">선택한 버전의 데이터 추출 설정을 확인합니다.</p>
          </div>

          <button
            v-if="detail.version.versionNo !== detail.rule.currentVersion"
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
            <div class="text-xs font-medium text-gray-500">데이터 형식</div>
            <div class="mt-1 text-sm font-medium text-gray-900">
              {{ detail.version.dataFormat }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">반복 경로</div>
            <div class="mt-1 break-all font-mono text-sm text-gray-700">
              {{ detail.version.repeatPath || '-' }}
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

      <!-- 추출 필드 -->
      <section class="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div class="border-b border-gray-200 px-5 py-4">
          <h3 class="text-base font-semibold text-gray-900">추출 필드</h3>
          <p class="mt-1 text-sm text-gray-500">
            선택한 버전의 추출 필드 {{ detail.fields?.length ?? 0 }}개
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">순서</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">원본 경로</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">출력 필드명</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">타입</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">필수</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">입력 형식</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr v-for="(field, index) in detail.fields" :key="field.transformFieldId ?? index">
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ field.sortOrder + 1 }}
                </td>
                <td class="px-4 py-3 font-mono text-gray-700">
                  {{ field.sourcePath }}
                </td>
                <td class="px-4 py-3 font-medium text-gray-900">
                  {{ field.targetName }}
                </td>
                <td class="px-4 py-3 text-center text-gray-700">
                  {{ field.dataType }}
                </td>
                <td class="px-4 py-3 text-center text-gray-700">
                  {{ field.requiredYn === 'Y' ? '필수' : '선택' }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ field.valueFormat || '-' }}
                </td>
              </tr>

              <tr v-if="!detail.fields?.length">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  추출 필드가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 버전 이력 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900">버전 이력</h3>
          <p class="mt-1 text-sm text-gray-500">
            버전을 선택하면 당시의 가공 설정과 추출 필드를 확인할 수 있습니다.
          </p>
        </div>

        <div
          v-if="versionError"
          class="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ versionError }}
        </div>

        <div class="overflow-x-auto rounded-md border border-gray-200">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">버전</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">형식</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">반복 경로</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">생성 일시</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">관리</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr v-for="version in versions" :key="version.transformRuleVersionId">
                <td class="px-4 py-3 text-center font-medium text-gray-900">
                  v{{ version.versionNo }}
                  <span
                    v-if="version.versionNo === detail.rule.currentVersion"
                    class="ml-1 text-xs font-normal text-green-700"
                  >
                    (현재)
                  </span>
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ version.dataFormat }}
                </td>
                <td class="px-4 py-3 font-mono text-gray-600">
                  {{ version.repeatPath || '-' }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ formatDateTime(version.createdAt) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    :disabled="
                      isVersionLoading || selectedVersionId === version.transformRuleVersionId
                    "
                    class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
                    @click="selectVersion(version.transformRuleVersionId)"
                  >
                    {{ selectedVersionId === version.transformRuleVersionId ? '선택됨' : '보기' }}
                  </button>
                </td>
              </tr>

              <tr v-if="versions.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
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
