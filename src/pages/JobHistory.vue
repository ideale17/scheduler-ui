<script setup>
import { onMounted, ref } from 'vue'
import http from '@/api/http'

const historyList = ref([])

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
</script>

<template>
  <div class="p-4">
    <div class="flex justify-end items-center mb-4">
      <!-- <h2 class="text-2xl font-bold">📋 등록된 Job 목록</h2> -->
    </div>

    <table v-if="historyList.length > 0" class="w-full border border-gray-300 text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">LOG_ID</th>
          <th class="border px-2 py-1">FIRE_INSTANCE_ID</th>
          <th class="border px-2 py-1">JOB_NAME</th>
          <th class="border px-2 py-1">JOB_GROUP</th>
          <th class="border px-2 py-1">TRIGGER_NAME</th>
          <th class="border px-2 py-1">TRIGGER_GROUP</th>
          <th class="border px-2 py-1">SCHEDULED_FIRE_TIME</th>
          <th class="border px-2 py-1">ACTUAL_FIRE_TIME</th>
          <th class="border px-2 py-1">FINISHED_AT</th>
          <th class="border px-2 py-1">RUN_MILLIS</th>
          <th class="border px-2 py-1">STATUS</th>
          <th class="border px-2 py-1">EXCEPTION_MESSAGE</th>
          <th class="border px-2 py-1">CREATED_AT</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in historyList" :key="h.logId">
          <td class="border px-2 py-1">{{ h.logId }}</td>
          <td class="border px-2 py-1">{{ h.fireInstanceId }}</td>
          <td class="border px-2 py-1">{{ h.jobName }}</td>
          <td class="border px-2 py-1">{{ h.jobGroup }}</td>
          <td class="border px-2 py-1">{{ h.triggerName }}</td>
          <td class="border px-2 py-1">{{ h.triggerGroup }}</td>
          <td class="border px-2 py-1">{{ h.scheduledFireTime }}</td>
          <td class="border px-2 py-1">{{ h.actualFireTime }}</td>
          <td class="border px-2 py-1">{{ h.finishedAt }}</td>
          <td class="border px-2 py-1 text-right">{{ h.runMillis }}</td>
          <td class="border px-2 py-1">
            <span :class="h.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'">
              {{ h.status }}
            </span>
          </td>
          <td class="border px-2 py-1 truncate max-w-[200px]" :title="h.exceptionMessage">
            {{ h.exceptionMessage || '-' }}
          </td>
          <td class="border px-2 py-1">{{ h.createdAt }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else class="text-gray-500">📭 실행 이력이 없습니다.</div>
  </div>
</template>
