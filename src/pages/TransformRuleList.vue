<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getTransformRuleList } from '@/api/transformRuleApi'

const router = useRouter()

const transformRuleList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// 검색조건
const searchForm = ref({
  ruleName: '',
  enabled: '',
})

// 마지막으로 조회한 검색조건
const appliedSearch = ref({
  ruleName: '',
  enabled: '',
})

let searchRequestId = 0

// 가공 규칙 목록 조회
const fetchTransformRuleList = async () => {
  // 1. 조회조건을 구성한다.
  const searchParams = {
    ruleName: searchForm.value.ruleName.trim(),
    enabled: searchForm.value.enabled,
  }

  appliedSearch.value = { ...searchParams }

  // 2. 조회 상태를 초기화한다.
  const requestId = ++searchRequestId
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 3. 백엔드에 검색조건을 전달한다.
    const response = await getTransformRuleList(searchParams)

    // 4. 마지막 조회 요청의 결과만 반영한다.
    if (requestId !== searchRequestId) {
      return
    }

    transformRuleList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (requestId !== searchRequestId) {
      return
    }

    console.error('가공 규칙 목록 조회 실패:', error)

    transformRuleList.value = []
    errorMessage.value =
      typeof error.response?.data === 'string'
        ? error.response.data
        : '가공 규칙 목록을 불러오지 못했습니다.'
  } finally {
    if (requestId === searchRequestId) {
      isLoading.value = false
    }
  }
}

// 검색조건 초기화
const resetSearch = () => {
  // 1. 검색조건을 초기화한다.
  searchForm.value = {
    ruleName: '',
    enabled: '',
  }

  // 2. 전체 목록을 다시 조회한다.
  fetchTransformRuleList()
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
    <!-- 조회조건 -->
    <section class="rounded-lg border border-gray-200 bg-white p-4">
      <form @submit.prevent="fetchTransformRuleList">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- 규칙명 -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 규칙명 </label>

            <input
              v-model="searchForm.ruleName"
              type="text"
              maxlength="100"
              placeholder="규칙명 입력"
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

        <!-- 조회 버튼 -->
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

    <!-- 가공 규칙 등록 -->
    <div class="flex justify-end">
      <button
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="goToAdd"
      >
        가공 규칙 등록
      </button>
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
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500"
    >
      가공 규칙 목록을 불러오는 중입니다.
    </div>

    <!-- 가공 규칙 목록 -->
    <div
      v-else-if="!errorMessage && transformRuleList.length > 0"
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
    <div
      v-else-if="!errorMessage"
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <template v-if="appliedSearch.ruleName || appliedSearch.enabled">
        <p class="text-sm font-medium text-gray-700">조회조건에 해당하는 가공 규칙이 없습니다.</p>
        <p class="mt-1 text-sm text-gray-500">
          검색조건을 변경하거나 초기화한 후 다시 조회해주세요.
        </p>
      </template>

      <template v-else>
        <p class="text-sm font-medium text-gray-700">등록된 가공 규칙이 없습니다.</p>
        <p class="mt-1 text-sm text-gray-500">
          가공 규칙을 등록하여 JSON/XML 데이터의 추출 필드를 설정할 수 있습니다.
        </p>
      </template>
    </div>
  </div>
</template>
