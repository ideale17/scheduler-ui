<script setup>
import { onMounted, ref } from 'vue'
import http from '@/api/http'

const historyList = ref([])
const selectedHistoryId = ref(null)

const fetchJobHistoryList = async () => {
  try {
    const response = await http.get('/jobs/historyJobs')
    historyList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('❌ 목록 불러오기 실패:', error)
    historyList.value = []
  }
}

onMounted(() => {
  fetchJobHistoryList()
})

const formatRunMillis = (runMillis) => {
  const millis = Number(runMillis)

  if (!Number.isFinite(millis)) {
    return '-'
  }

  if (millis < 1000) {
    return `${millis}ms`
  }

  const seconds = millis / 1000
  return Number.isInteger(seconds) ? `${seconds}초` : `${seconds.toFixed(2)}초`
}

const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

const toggleHistoryDetail = (logId) => {
  selectedHistoryId.value = selectedHistoryId.value === logId ? null : logId
}
</script>

<template>
  <div class="p-4">
    <div class="flex justify-end items-center mb-4">
      <!-- <h2 class="text-2xl font-bold">📋 등록된 Job 목록</h2> -->
    </div>

    <div v-if="historyList.length > 0" class="overflow-x-auto">
      <table class="w-full border border-gray-300 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-2 py-1">Job명</th>
            <th class="border px-2 py-1">Job 그룹</th>
            <th class="border px-2 py-1">Trigger명</th>
            <th class="border px-2 py-1">예정 실행시간</th>
            <th class="border px-2 py-1">실제 실행시간</th>
            <th class="border px-2 py-1">실행 시간</th>
            <th class="border px-2 py-1">상태</th>
            <th class="border px-2 py-1">상세</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="h in historyList" :key="h.logId">
            <tr>
              <td class="border px-2 py-1">{{ h.jobName }}</td>
              <td class="border px-2 py-1">{{ h.jobGroup }}</td>
              <td class="border px-2 py-1">{{ h.triggerName }}</td>
              <td class="border px-2 py-1">{{ formatDateTime(h.scheduledFireTime) }}</td>
              <td class="border px-2 py-1">{{ formatDateTime(h.actualFireTime) }}</td>
              <td class="border px-2 py-1">{{ formatRunMillis(h.runMillis) }}</td>

              <td class="border px-2 py-1 text-center">
                <span
                  v-if="h.status === 'SUCCESS'"
                  class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                >
                  성공
                </span>

                <span
                  v-else-if="h.status === 'FAILED'"
                  class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                >
                  실패
                </span>

                <span
                  v-else
                  class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  {{ h.status }}
                </span>
              </td>

              <td class="border px-2 py-1 text-center">
                <button
                  type="button"
                  class="rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  @click="toggleHistoryDetail(h.logId)"
                >
                  {{ selectedHistoryId === h.logId ? '닫기' : '상세' }}
                </button>
              </td>
            </tr>

            <tr v-if="selectedHistoryId === h.logId">
              <td colspan="8" class="border bg-gray-50 p-4">
                <div class="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 class="mb-4 text-sm font-semibold text-gray-800">실행 상세 정보</h3>

                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div class="rounded border border-gray-200 bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">Log ID</div>
                      <div class="text-sm text-gray-800">
                        {{ h.logId ?? '-' }}
                      </div>
                    </div>

                    <div class="rounded border border-gray-200 bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">Fire Instance ID</div>
                      <div class="break-all text-sm text-gray-800">
                        {{ h.fireInstanceId ?? '-' }}
                      </div>
                    </div>

                    <div class="rounded border border-gray-200 bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">Trigger 그룹</div>
                      <div class="text-sm text-gray-800">
                        {{ h.triggerGroup ?? '-' }}
                      </div>
                    </div>

                    <div class="rounded border border-gray-200 bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">종료시간</div>
                      <div class="text-sm text-gray-800">
                        {{ formatDateTime(h.finishedAt) }}
                      </div>
                    </div>

                    <div class="rounded border border-gray-200 bg-gray-50 p-3">
                      <div class="mb-1 text-xs text-gray-500">생성시간</div>
                      <div class="text-sm text-gray-800">
                        {{ formatDateTime(h.createdAt) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="h.status === 'FAILED'" class="mt-4 border-t border-gray-200 pt-4">
                    <div class="mb-2 text-sm font-medium text-red-700">예외 메시지</div>

                    <div
                      class="whitespace-pre-wrap break-all rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {{ h.exceptionMessage || '예외 메시지가 없습니다.' }}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-else class="text-gray-500">📭 실행 이력이 없습니다.</div>
  </div>
</template>
