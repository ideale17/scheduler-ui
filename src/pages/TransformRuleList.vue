<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getTransformRuleList } from '@/api/transformRuleApi'

const router = useRouter()

const transformRuleList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// 가공 규칙 목록 조회
const fetchTransformRuleList = async () => {
  // 1. 중복 조회를 방지한다.
  if (isLoading.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 2. 등록된 가공 규칙 목록을 조회한다.
    const response = await getTransformRuleList()

    transformRuleList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('가공 규칙 목록 조회 실패:', error)

    transformRuleList.value = []
    errorMessage.value = '가공 규칙 목록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 사용 여부 표시
const getEnabledLabel = (enabled) => {
  return enabled === 'Y' ? '사용' : '미사용'
}

// 사용 여부 스타일
const getEnabledClass = (enabled) => {
  return enabled === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}

// 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

// 등록 화면 이동
const goToAdd = () => {
  router.push('/transform-rule/add')
}

// 가공 규칙 상세 화면 이동
const viewDetail = (transformRuleId) => {
  router.push(`/transform-rule/${transformRuleId}`)
}

onMounted(() => {
  fetchTransformRuleList()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="text-sm text-gray-500">JSON/XML 데이터의 추출 및 변환 규칙을 관리합니다.</div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="isLoading"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="fetchTransformRuleList"
        >
          새로고침
        </button>

        <button
          type="button"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          @click="goToAdd"
        >
          가공 규칙 등록
        </button>
      </div>
    </div>

    <!-- 조회 오류 -->
    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 로딩 -->
    <div
      v-else-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      가공 규칙 목록을 불러오는 중입니다.
    </div>

    <!-- 가공 규칙 목록 -->
    <div
      v-else-if="transformRuleList.length > 0"
      class="overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">규칙명</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">현재 버전</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">사용 여부</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">설명</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">수정 일시</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">관리</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="rule in transformRuleList"
            :key="rule.transformRuleId"
            class="transition-colors hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-center font-medium text-gray-900">
              {{ rule.ruleName }}
            </td>

            <td class="px-4 py-3 text-center text-gray-700">v{{ rule.currentVersion }}</td>

            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getEnabledClass(rule.enabled)"
              >
                {{ getEnabledLabel(rule.enabled) }}
              </span>
            </td>

            <td class="max-w-xs px-4 py-3 text-gray-600">
              <div class="truncate" :title="rule.description || ''">
                {{ rule.description || '-' }}
              </div>
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
              {{ formatDateTime(rule.updatedAt) }}
            </td>

            <td class="px-4 py-3 text-center">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                @click="viewDetail(rule.transformRuleId)"
              >
                상세
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 데이터 없음 -->
    <div v-else class="rounded-lg border border-gray-200 bg-white p-10 text-center">
      <p class="text-sm font-medium text-gray-700">등록된 가공 규칙이 없습니다.</p>
      <p class="mt-2 text-xs text-gray-500">
        가공 규칙을 등록하여 JSON/XML 데이터의 추출 필드를 설정할 수 있습니다.
      </p>
    </div>
  </div>
</template>
