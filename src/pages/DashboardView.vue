<script setup>
import { onMounted, ref } from 'vue'
import { getDashboardInfo } from '@/api/dashboardApi'

const dashboard = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const fetchDashboardInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getDashboardInfo()

    dashboard.value = response.data ?? null
  } catch (error) {
    console.error('Dashboard 정보 조회 실패:', error)
    dashboard.value = null
    errorMessage.value = 'Dashboard 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  return value.replace('T', ' ').substring(0, 19)
}

onMounted(() => {
  fetchDashboardInfo()
})
</script>

<template>
  <div class="space-y-4">
    <div class="bg-white border rounded p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold">운영 Dashboard</h3>
          <p class="mt-1 text-sm text-gray-500">
            현재 Job 상태와 오늘 실행 현황, 최근 실패 Job을 확인합니다.
          </p>
        </div>

        <button
          type="button"
          class="px-3 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
          :disabled="isLoading"
          @click="fetchDashboardInfo"
        >
          {{ isLoading ? '조회 중...' : '새로고침' }}
        </button>
      </div>
    </div>

    <div v-if="isLoading && !dashboard" class="bg-white border rounded p-5 text-sm text-gray-500">
      Dashboard 정보를 불러오는 중입니다.
    </div>

    <div
      v-else-if="errorMessage"
      class="bg-red-50 border border-red-200 rounded p-5 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="dashboard">
      <!-- Job 상태 -->
      <section>
        <h4 class="font-semibold mb-3">Job 상태</h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white border rounded p-5">
            <p class="text-sm text-gray-500">전체 Job</p>
            <p class="mt-2 text-3xl font-semibold">
              {{ dashboard.totalJobCount }}
            </p>
          </div>

          <div class="bg-white border rounded p-5">
            <p class="text-sm text-gray-500">정상</p>
            <p class="mt-2 text-3xl font-semibold text-green-700">
              {{ dashboard.normalJobCount }}
            </p>
          </div>

          <div class="bg-white border rounded p-5">
            <p class="text-sm text-gray-500">중지</p>
            <p class="mt-2 text-3xl font-semibold text-yellow-700">
              {{ dashboard.pausedJobCount }}
            </p>
          </div>
        </div>
      </section>

      <!-- 오늘 실행 현황 -->
      <section>
        <h4 class="font-semibold mb-3">오늘 실행 현황</h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white border rounded p-5">
            <p class="text-sm text-gray-500">오늘 실행</p>
            <p class="mt-2 text-3xl font-semibold">
              {{ dashboard.todayExecutionCount }}
            </p>
          </div>

          <div class="bg-white border rounded p-5">
            <p class="text-sm text-gray-500">성공</p>
            <p class="mt-2 text-3xl font-semibold text-green-700">
              {{ dashboard.todaySuccessCount }}
            </p>
          </div>

          <div class="bg-white border rounded p-5">
            <p class="text-sm text-gray-500">실패</p>
            <p class="mt-2 text-3xl font-semibold text-red-700">
              {{ dashboard.todayFailedCount }}
            </p>
          </div>
        </div>
      </section>

      <!-- 최근 실패 Job -->
      <section class="bg-white border rounded p-5">
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-semibold">최근 실패 Job</h4>

          <RouterLink to="/JobHistory" class="text-sm text-gray-600 hover:text-gray-900 underline">
            실행 이력 보기
          </RouterLink>
        </div>

        <div
          v-if="!dashboard.recentFailedJobs?.length"
          class="py-6 text-center text-sm text-gray-500"
        >
          최근 실패 Job이 없습니다.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium">Job명</th>
                <th class="px-3 py-2 text-left font-medium">Job 그룹</th>
                <th class="px-3 py-2 text-left font-medium">실행시간</th>
                <th class="px-3 py-2 text-left font-medium">예외 메시지</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="job in dashboard.recentFailedJobs"
                :key="`${job.jobGroup}-${job.jobName}-${job.actualFireTime}`"
                class="border-b last:border-b-0"
              >
                <td class="px-3 py-3">{{ job.jobName || '-' }}</td>
                <td class="px-3 py-3">{{ job.jobGroup || '-' }}</td>
                <td class="px-3 py-3 whitespace-nowrap">
                  {{ formatDateTime(job.actualFireTime) }}
                </td>
                <td class="px-3 py-3 text-red-700 max-w-xl">
                  <p class="truncate" :title="job.exceptionMessage || ''">
                    {{ job.exceptionMessage || '-' }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
