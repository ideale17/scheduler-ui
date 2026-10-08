<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  deleteJob as deleteJobApi,
  getJobList,
  pauseJobs as pauseJobsApi,
  resumeJobs as resumeJobsApi,
  runJobs as runJobsApi,
} from '@/api/jobApi'

const router = useRouter()
const jobList = ref([])
const selectedJobKeys = ref([])

const getJobKey = (job) => {
  return `${job.jobGroup}:${job.jobName}`
}

const allSelected = computed({
  get() {
    return (
      jobList.value.length > 0 &&
      jobList.value.every((job) => selectedJobKeys.value.includes(getJobKey(job)))
    )
  },
  set(checked) {
    selectedJobKeys.value = checked ? jobList.value.map((job) => getJobKey(job)) : []
  },
})

const selectedJobs = computed(() => {
  return jobList.value
    .filter((job) => selectedJobKeys.value.includes(getJobKey(job)))
    .map((job) => ({
      jobName: job.jobName,
      jobGroup: job.jobGroup,
    }))
})

const fetchJobList = async () => {
  try {
    const response = await getJobList()
    jobList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('목록 불러오기 실패:', error)
    jobList.value = []
  }
}

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

const runSelectedJobs = async () => {
  // 1. 선택된 Job이 있는지 확인한다.
  if (selectedJobs.value.length === 0) {
    alert('즉시 실행할 Job을 하나 이상 선택해주세요.')
    return
  }

  // 2. 일괄 즉시 실행 여부를 확인한다.
  if (!confirm(`선택한 ${selectedJobs.value.length}개의 Job을 즉시 실행하시겠습니까?`)) {
    return
  }

  try {
    // 3. 선택한 Job의 일괄 즉시 실행 API를 호출한다.
    const response = await runJobsApi(selectedJobs.value)

    // 4. 실행 요청 결과를 사용자에게 안내한다.
    alert(
      `즉시 실행 요청 완료\n성공: ${response.data.successCount}건\n실패: ${response.data.failCount}건`,
    )

    // 5. 선택 상태를 초기화하고 최신 목록을 조회한다.
    selectedJobKeys.value = []
    await fetchJobList()
  } catch (error) {
    console.error('일괄 즉시 실행 실패:', error)
    alert('일괄 즉시 실행에 실패했습니다.')
  }
}

const pauseSelectedJobs = async () => {
  // 1. 선택된 Job이 있는지 확인한다.
  if (selectedJobs.value.length === 0) {
    alert('중지할 Job을 하나 이상 선택해주세요.')
    return
  }

  // 2. 일괄 중지 여부를 확인한다.
  if (!confirm(`선택한 ${selectedJobs.value.length}개의 Job을 중지하시겠습니까?`)) {
    return
  }

  try {
    // 3. 선택한 Job의 일괄 중지 API를 호출한다.
    const response = await pauseJobsApi(selectedJobs.value)

    // 4. 중지 결과를 사용자에게 안내한다.
    alert(
      `Job 중지 완료\n성공: ${response.data.successCount}건\n실패: ${response.data.failCount}건`,
    )

    // 5. 선택 상태를 초기화하고 최신 목록을 조회한다.
    selectedJobKeys.value = []
    await fetchJobList()
  } catch (error) {
    console.error('일괄 중지 실패:', error)
    alert('Job 일괄 중지에 실패했습니다.')
  }
}

const resumeSelectedJobs = async () => {
  // 1. 선택된 Job이 있는지 확인한다.
  if (selectedJobs.value.length === 0) {
    alert('시작할 Job을 하나 이상 선택해주세요.')
    return
  }

  // 2. 일괄 시작 여부를 확인한다.
  if (!confirm(`선택한 ${selectedJobs.value.length}개의 Job을 시작하시겠습니까?`)) {
    return
  }

  try {
    // 3. 선택한 Job의 일괄 시작 API를 호출한다.
    const response = await resumeJobsApi(selectedJobs.value)

    // 4. 시작 결과를 사용자에게 안내한다.
    alert(
      `Job 시작 완료\n성공: ${response.data.successCount}건\n실패: ${response.data.failCount}건`,
    )

    // 5. 선택 상태를 초기화하고 최신 목록을 조회한다.
    selectedJobKeys.value = []
    await fetchJobList()
  } catch (error) {
    console.error('일괄 시작 실패:', error)
    alert('Job 일괄 시작에 실패했습니다.')
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

onMounted(() => {
  fetchJobList()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 상단 작업 영역 -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="text-sm text-gray-500">등록된 Job을 조회하고 실행, 시작, 중지할 수 있습니다.</div>

      <button
        type="button"
        class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push('/add')"
      >
        Job 등록
      </button>
    </div>

    <!-- 선택 작업 -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
    >
      <div class="text-sm text-gray-500">
        선택된 Job
        <span class="font-semibold text-gray-900">
          {{ selectedJobKeys.length }}
        </span>
        개
      </div>

      <div class="flex items-center gap-2">
        <div class="group relative">
          <button
            type="button"
            :disabled="selectedJobKeys.length === 0"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="runSelectedJobs"
          >
            즉시 실행
          </button>

          <div
            class="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-md bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block"
          >
            선택한 Job을 1회 실행하고 기존 스케줄은 유지합니다.
          </div>
        </div>
        <div class="group relative">
          <button
            type="button"
            :disabled="selectedJobKeys.length === 0"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="resumeSelectedJobs"
          >
            시작
          </button>

          <div
            class="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-md bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block"
          >
            중지된 Job의 스케줄 실행을 다시 활성화합니다.
          </div>
        </div>

        <div class="group relative">
          <button
            type="button"
            :disabled="selectedJobKeys.length === 0"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="pauseSelectedJobs"
          >
            중지
          </button>
          <div
            class="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-md bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block"
          >
            선택한 Job의 스케줄 실행을 중지합니다.
          </div>
        </div>
      </div>
    </div>

    <!-- Job 목록 -->
    <div
      v-if="jobList.length > 0"
      class="overflow-x-auto rounded-lg border border-gray-200 bg-white"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="w-12 px-4 py-3 text-center">
              <input
                v-model="allSelected"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300"
              />
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              Job 이름
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              그룹
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              상태
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              스케줄
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              최근 실행시간
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              다음 실행시간
            </th>

            <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
              관리
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="job in jobList"
            :key="job.jobName + job.jobGroup"
            class="transition-colors hover:bg-gray-50"
          >
            <td class="px-4 py-3 text-center">
              <input
                v-model="selectedJobKeys"
                type="checkbox"
                :value="getJobKey(job)"
                class="h-4 w-4 rounded border-gray-300"
              />
            </td>

            <td class="px-4 py-3 text-center font-medium text-gray-900">
              {{ job.jobName }}
            </td>

            <td class="px-4 py-3 text-center text-gray-600">
              {{ job.jobGroup }}
            </td>

            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getJobStatusClass(job.schedulerTriggerState)"
              >
                {{ getJobStatusLabel(job.schedulerTriggerState) }}
              </span>
            </td>

            <td class="px-4 py-3">
              <template v-if="job.triggerType === 'CRON'">
                <div class="text-xs font-semibold text-blue-700">CRON</div>
                <div class="mt-1 whitespace-nowrap text-sm text-gray-700">
                  {{ job.cronExpression || '-' }}
                </div>
              </template>

              <template v-else-if="job.triggerType === 'SIMPLE'">
                <div class="text-xs font-semibold text-green-700">SIMPLE</div>

                <div class="mt-1 text-sm text-gray-700">
                  {{ formatRepeatInterval(job.repeatInterval) }}
                </div>

                <div
                  v-if="getSimpleRepeatLabel(job.repeatCount)"
                  class="mt-0.5 text-xs text-gray-500"
                >
                  {{ getSimpleRepeatLabel(job.repeatCount) }}
                </div>
              </template>

              <span v-else class="text-gray-400">-</span>
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
              {{ formatFireTime(job.prevFireTime) }}
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center text-gray-600">
              {{ formatFireTime(job.nextFireTime) }}
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="viewJobHistory(job.jobName, job.jobGroup)"
                >
                  이력
                </button>

                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="editJob(job.jobName, job.jobGroup)"
                >
                  수정
                </button>

                <button
                  type="button"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  @click="deleteJob(job.jobName, job.jobGroup)"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 빈 상태 -->
    <div
      v-else
      class="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center"
    >
      <p class="text-sm font-medium text-gray-700">등록된 Job이 없습니다.</p>

      <p class="mt-1 text-sm text-gray-500">
        새 Job을 등록하면 이곳에서 스케줄과 실행 상태를 관리할 수 있습니다.
      </p>

      <button
        type="button"
        class="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push('/add')"
      >
        새 Job 등록
      </button>
    </div>
  </div>
</template>
