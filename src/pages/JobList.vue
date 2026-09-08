<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  deleteJob as deleteJobApi,
  getJobList,
  pauseJob as pauseJobApi,
  resumeJob as resumeJobApi,
  runJob as runJobApi,
} from '@/api/jobApi'

const router = useRouter()
const jobList = ref([])

const fetchJobList = async () => {
  try {
    const response = await getJobList()
    jobList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('목록 불러오기 실패:', error)
    jobList.value = []
  }
}

onMounted(() => {
  fetchJobList()
})

const deleteJob = async (jobName, jobGroup) => {
  if (!confirm(`정말 ${jobGroup} 그룹의 ${jobName} Job을 삭제하시겠습니까?`)) return

  try {
    await deleteJobApi(jobName, jobGroup)

    alert('삭제 성공')

    // 삭제 성공 후 최신 목록 다시 가져오기
    await fetchJobList()
  } catch (error) {
    console.error('삭제 실패:', error)
    alert('삭제 실패')
  }
}

const runJob = async (jobName, jobGroup) => {
  if (!confirm(`${jobGroup} 그룹의 ${jobName} Job을 즉시 실행하시겠습니까?`)) return

  try {
    await runJobApi(jobName, jobGroup)

    alert('Job 즉시 실행 요청 성공')
    await fetchJobList()
  } catch (error) {
    console.error('❌ 즉시 실행 실패:', error)
    alert('즉시 실행 실패')
  }
}

const pauseJob = async (jobName, jobGroup) => {
  if (!confirm(`⏸️ ${jobGroup} 그룹의 ${jobName} Job을 중지하시겠습니까?`)) return

  try {
    await pauseJobApi(jobName, jobGroup)

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
    await resumeJobApi(jobName, jobGroup)

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

const viewJobHistory = (jobName, jobGroup) => {
  router.push({
    path: '/JobHistory',
    query: {
      jobName: jobName,
      jobGroup: jobGroup,
    },
  })
}

const getJobStatusLabel = (triggerState) => {
  const statusLabels = {
    NORMAL: '정상',
    PAUSED: '중지',
    BLOCKED: '실행 중',
    COMPLETE: '완료',
    ERROR: '오류',
    NONE: '미등록',
  }

  return statusLabels[triggerState] || triggerState || '-'
}

const getJobStatusClass = (triggerState) => {
  const statusClasses = {
    NORMAL: 'bg-green-100 text-green-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    BLOCKED: 'bg-blue-100 text-blue-700',
    COMPLETE: 'bg-gray-100 text-gray-700',
    ERROR: 'bg-red-100 text-red-700',
    NONE: 'bg-gray-100 text-gray-500',
  }

  return statusClasses[triggerState] || 'bg-gray-100 text-gray-700'
}

const formatRepeatInterval = (repeatInterval) => {
  if (repeatInterval == null) {
    return '-'
  }

  if (repeatInterval % 60000 === 0) {
    return `${repeatInterval / 60000}분 간격`
  }

  if (repeatInterval % 1000 === 0) {
    return `${repeatInterval / 1000}초 간격`
  }

  return `${repeatInterval}ms 간격`
}

const getSimpleRepeatLabel = (repeatCount) => {
  if (repeatCount == null) {
    return ''
  }

  if (repeatCount === -1) {
    return '무한 반복'
  }

  return `${repeatCount + 1}회 실행`
}

const formatFireTime = (fireTime) => {
  if (!fireTime) {
    return '-'
  }

  const milliseconds = Number(fireTime)

  if (!Number.isFinite(milliseconds)) {
    return '-'
  }

  const date = new Date(milliseconds)
  const pad = (value) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
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
          <th class="border px-2 py-1">스케줄</th>
          <th class="border px-2 py-1">최근 실행시간</th>
          <th class="border px-2 py-1">다음 실행시간</th>
          <th class="border px-2 py-1">관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="job in jobList" :key="job.jobName + job.jobGroup">
          <td class="border px-2 py-1">{{ job.jobName }}</td>
          <td class="border px-2 py-1">{{ job.jobGroup }}</td>
          <td class="border px-2 py-1 text-center">
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              :class="getJobStatusClass(job.schedulerTriggerState)"
            >
              {{ getJobStatusLabel(job.schedulerTriggerState) }}
            </span>
          </td>
          <td class="border px-2 py-1">
            <template v-if="job.triggerType === 'CRON'">
              <div class="text-xs font-medium text-blue-700">CRON</div>
              <div class="mt-0.5 text-sm">{{ job.cronExpression || '-' }}</div>
            </template>

            <template v-else-if="job.triggerType === 'SIMPLE'">
              <div class="text-xs font-medium text-green-700">SIMPLE</div>
              <div class="mt-0.5 text-sm">
                {{ formatRepeatInterval(job.repeatInterval) }}
              </div>

              <div v-if="getSimpleRepeatLabel(job.repeatCount)" class="text-xs text-gray-500">
                {{ getSimpleRepeatLabel(job.repeatCount) }}
              </div>
            </template>

            <span v-else class="text-gray-500">-</span>
          </td>
          <td class="border px-2 py-1 text-center text-sm whitespace-nowrap">
            {{ formatFireTime(job.prevFireTime) }}
          </td>
          <td class="border px-2 py-1 text-center text-sm whitespace-nowrap">
            {{ formatFireTime(job.nextFireTime) }}
          </td>
          <td class="border px-2 py-1 text-center">
            <button
              @click="runJob(job.jobName, job.jobGroup)"
              class="bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 text-sm mr-1"
            >
              즉시 실행
            </button>
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
              @click="viewJobHistory(job.jobName, job.jobGroup)"
              class="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-sm mr-1"
            >
              이력
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
