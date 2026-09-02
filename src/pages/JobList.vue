<script setup>
import { onMounted, ref } from 'vue'
import http from '@/api/http'
import { useRouter } from 'vue-router'

const router = useRouter()
const jobList = ref([])

const fetchJobList = async () => {
  try {
    const response = await http.get('/jobs/listJobs')
    console.log('📦 응답:', response.data)
    jobList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('❌ 목록 불러오기 실패:', error)
    jobList.value = []
  }
}

onMounted(() => {
  fetchJobList()
})

const deleteJob = async (jobName, jobGroup) => {
  if (!confirm(`정말 ${jobGroup} 그룹의 ${jobName} Job을 삭제하시겠습니까?`)) return

  try {
    await http.delete('/jobs/deleteJob', {
      params: {
        jobName,
        jobGroup,
      },
    })
    alert('🗑️ 삭제 성공')

    // ✅ 삭제 성공 후 최신 목록 다시 가져오기
    await fetchJobList()
  } catch (error) {
    console.error('❌ 삭제 실패:', error)
    alert('삭제 실패')
  }
}

const pauseJob = async (jobName, jobGroup) => {
  if (!confirm(`⏸️ ${jobGroup} 그룹의 ${jobName} Job을 중지하시겠습니까?`)) return

  try {
    await http.post('/jobs/pauseJob', null, {
      params: {
        jobName: jobName,
        jobGroup: jobGroup,
      },
    })
    alert('⏸️ Job 중지 성공')
    await fetchJobList()
  } catch (error) {
    console.error('❌ 중지 실패:', error)
    alert('중지 실패')
  }
}

const resumeJob = async (jobName, jobGroup) => {
  if (!confirm(`⏸️ ${jobGroup} 그룹의 ${jobName} Job을 재시작하시겠습니까?`)) return

  try {
    await http.post('/jobs/resumeJob', null, {
      params: {
        jobName: jobName,
        jobGroup: jobGroup,
      },
    })
    alert('⏸️ Job 재시작 성공')
    await fetchJobList()
  } catch (error) {
    console.error('❌ 재시작 실패:', error)
    alert('재시작 실패')
  }
}

const editJob = (jobName, jobGroup) => {
  router.push(`/edit/${encodeURIComponent(jobName)}/${encodeURIComponent(jobGroup)}`)
}
</script>

<template>
  <div class="p-4">
    <div class="flex justify-end items-center mb-4">
      <!-- <h2 class="text-2xl font-bold">📋 등록된 Job 목록</h2> -->
      <button @click="router.push('/add')" class="bg-blue-500 text-white px-3 py-1 rounded">
        ➕ 새 Job 등록
      </button>
    </div>

    <!-- ✅ v-if 조건은 jobList.length 로만 -->
    <table v-if="jobList.length > 0" class="w-full border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Job 이름</th>
          <th class="border px-2 py-1">그룹</th>
          <th class="border px-2 py-1">상태</th>
          <th class="border px-2 py-1">Cron</th>
          <th class="border px-2 py-1">관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="job in jobList" :key="job.jobName + job.jobGroup">
          <td class="border px-2 py-1">{{ job.jobName }}</td>
          <td class="border px-2 py-1">{{ job.jobGroup }}</td>
          <td class="border px-2 py-1">{{ job.triggerState || '-' }}</td>
          <td class="border px-2 py-1">{{ job.cronExpression || '-' }}</td>
          <td class="border px-2 py-1 text-center">
            <button
              @click="resumeJob(job.jobName, job.jobGroup)"
              class="bg-green-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm mr-1"
            >
              시작
            </button>
            <button
              @click="pauseJob(job.jobName, job.jobGroup)"
              class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm mr-1"
            >
              중지
            </button>
            <button
              @click="editJob(job.jobName, job.jobGroup)"
              class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-sm mr-1"
            >
              수정
            </button>
            <button
              @click="deleteJob(job.jobName, job.jobGroup)"
              class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
            >
              삭제
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ✅ 빈 배열일 때 메시지 -->
    <div v-else class="text-gray-500">📭 등록된 Job이 없습니다.</div>
  </div>
</template>
