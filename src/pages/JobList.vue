<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import {
  deleteJob as deleteJobApi,
  getJobList,
  pauseJobs as pauseJobsApi,
  resumeJobs as resumeJobsApi,
  runJobs as runJobsApi,
} from '@/api/jobApi'

const router = useRouter()
const authStore = useAuthStore()
const jobList = ref([])
const selectedJobKeys = ref([])
const isRefreshing = ref(false)

const toastStore = useToastStore()

// 현재 실행 중인 일괄 작업을 관리한다.
// null: 대기, run: 즉시 실행, resume: 시작, pause: 중지
const processingAction = ref(null)

// 현재 삭제 요청 중인 Job의 식별자를 관리한다.
const deletingJobKey = ref(null)

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

const refreshJobList = async () => {
  if (isRefreshing.value || processingAction.value !== null) return

  if (isRefreshing.value) return

  isRefreshing.value = true

  try {
    await fetchJobList()
    selectedJobKeys.value = selectedJobKeys.value.filter((key) =>
      jobList.value.some((job) => getJobKey(job) === key),
    )
  } finally {
    isRefreshing.value = false
  }
}

const deleteJob = async (jobName, jobGroup) => {
  // 1. 다른 Job의 삭제 요청이 진행 중이면 중복 실행을 방지한다.
  if (deletingJobKey.value !== null || processingAction.value !== null) {
    return
  }

  // 2. 삭제할 Job의 식별자를 생성한다.
  const jobKey = getJobKey({ jobName, jobGroup })

  // 3. Job 삭제 여부를 확인한다.
  if (!confirm(`정말 ${jobGroup} 그룹의 ${jobName} Job을 삭제하시겠습니까?`)) {
    return
  }

  // 4. 삭제 요청 상태를 설정한다.
  deletingJobKey.value = jobKey

  try {
    // 5. Job 삭제 API를 호출한다.
    await deleteJobApi(jobName, jobGroup)

    // 6. 삭제된 Job의 체크박스 선택 상태를 제거한다.
    selectedJobKeys.value = selectedJobKeys.value.filter((key) => key !== jobKey)

    // 7. 삭제 성공 메시지를 표시한다.
    toastStore.success('Job 삭제 완료', `${jobName} Job이 삭제되었습니다.`)
  } catch (error) {
    console.error('Job 삭제 실패:', error)

    // 8. 삭제 실패 시 오류 메시지를 표시한다.
    toastStore.error('Job 삭제 실패', `${jobName} Job 삭제에 실패했습니다.`)
    return
  } finally {
    // 9. 삭제 요청 상태를 해제한다.
    deletingJobKey.value = null
  }

  // 10. 삭제 성공 후 최신 Job 목록을 조회한다.
  await fetchJobList()
}

/**
 * 선택한 Job에 대한 일괄 작업을 처리한다.
 *
 * @param {string} action 작업 종류
 */
const processSelectedJobs = async (action) => {
  // 1. 다른 일괄 작업이 진행 중이면 중복 요청을 방지한다.
  if (processingAction.value !== null || deletingJobKey.value !== null) {
    return
  }

  // 2. 작업 종류별 API와 메시지를 정의한다.
  const actions = {
    run: {
      label: '즉시 실행',
      api: runJobsApi,
      completedTitle: 'Job 실행 요청 완료',
      failedTitle: 'Job 실행 요청 실패',
    },
    resume: {
      label: '시작',
      api: resumeJobsApi,
      completedTitle: 'Job 시작 완료',
      failedTitle: 'Job 시작 요청 실패',
    },
    pause: {
      label: '중지',
      api: pauseJobsApi,
      completedTitle: 'Job 중지 완료',
      failedTitle: 'Job 중지 요청 실패',
    },
  }

  const config = actions[action]

  if (!config) {
    return
  }

  // 3. 선택된 Job 목록을 확인한다.
  const jobs = selectedJobs.value

  if (jobs.length === 0) {
    toastStore.warning('Job을 선택해주세요.', `${config.label}할 Job이 없습니다.`)
    return
  }

  // 4. 일괄 작업 실행 여부를 확인한다.
  if (!confirm(`선택한 ${jobs.length}개의 Job을 ${config.label}하시겠습니까?`)) {
    return
  }

  // 5. API 요청 시작 전에 로딩 상태를 설정한다.
  processingAction.value = action

  try {
    // 6. 선택된 Job 목록으로 일괄 API를 호출한다.
    const response = await config.api(jobs)

    const successCount = response.data.successCount
    const failCount = response.data.failCount
    const message = `성공 ${successCount}건 · 실패 ${failCount}건`

    // 7. 처리 결과에 따라 공통 알림을 표시한다.
    if (failCount > 0) {
      toastStore.warning(`일부 Job ${config.label} 실패`, message)
    } else {
      toastStore.success(config.completedTitle, message)
    }

    // 8. 선택 상태를 초기화하고 최신 Job 목록을 조회한다.
    selectedJobKeys.value = []
    await fetchJobList()
  } catch (error) {
    console.error(`Job 일괄 ${config.label} 실패:`, error)

    toastStore.error(config.failedTitle, '서버 요청에 실패했습니다. 다시 시도해주세요.')
  } finally {
    // 9. 성공과 실패 모두 로딩 상태를 해제한다.
    processingAction.value = null
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
      <div class="text-sm text-gray-500">등록된 Job의 스케줄과 실행 상태를 조회합니다.</div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="isRefreshing || processingAction !== null"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="refreshJobList"
        >
          {{ isRefreshing ? '조회 중...' : '재조회' }}
        </button>

        <button
          v-if="authStore.isAdmin"
          type="button"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          @click="router.push('/add')"
        >
          Job 등록
        </button>
      </div>
    </div>

    <!-- 선택 작업 -->
    <div
      v-if="authStore.isAdmin"
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
            :disabled="
              selectedJobKeys.length === 0 || processingAction !== null || deletingJobKey !== null
            "
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="processSelectedJobs('run')"
          >
            <span class="inline-flex items-center gap-2">
              <span
                v-if="processingAction === 'run'"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"
                aria-hidden="true"
              ></span>
              {{ processingAction === 'run' ? '실행 요청 중...' : '즉시 실행' }}
            </span>
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
            :disabled="
              selectedJobKeys.length === 0 || processingAction !== null || deletingJobKey !== null
            "
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="processSelectedJobs('resume')"
          >
            <span class="inline-flex items-center gap-2">
              <span
                v-if="processingAction === 'resume'"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"
                aria-hidden="true"
              ></span>
              {{ processingAction === 'resume' ? '시작 처리 중...' : '시작' }}
            </span>
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
            :disabled="
              selectedJobKeys.length === 0 || processingAction !== null || deletingJobKey !== null
            "
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="processSelectedJobs('pause')"
          >
            <span class="inline-flex items-center gap-2">
              <span
                v-if="processingAction === 'pause'"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"
                aria-hidden="true"
              ></span>
              {{ processingAction === 'pause' ? '중지 처리 중...' : '중지' }}
            </span>
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
            <th v-if="authStore.isAdmin" class="w-12 px-4 py-3 text-center">
              <input
                v-model="allSelected"
                type="checkbox"
                :disabled="processingAction !== null"
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
            <td v-if="authStore.isAdmin" class="px-4 py-3 text-center">
              <input
                v-model="selectedJobKeys"
                type="checkbox"
                :value="getJobKey(job)"
                :disabled="processingAction !== null"
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
                  v-if="authStore.isAdmin"
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  @click="editJob(job.jobName, job.jobGroup)"
                >
                  수정
                </button>

                <button
                  v-if="authStore.isAdmin"
                  type="button"
                  :disabled="deletingJobKey !== null"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="deleteJob(job.jobName, job.jobGroup)"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <!-- 해당 Job 삭제 요청 중에만 스피너 표시 -->
                    <span
                      v-if="deletingJobKey === getJobKey(job)"
                      class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-600"
                      aria-hidden="true"
                    ></span>

                    {{ deletingJobKey === getJobKey(job) ? '삭제 중...' : '삭제' }}
                  </span>
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
        v-if="authStore.isAdmin"
        type="button"
        class="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        @click="router.push('/add')"
      >
        새 Job 등록
      </button>
    </div>
  </div>
</template>
