<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getJob, updateJob } from '@/api/jobApi'

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const isSubmitting = ref(false)
const paramList = ref([])

const jobData = ref({
  jobClassName: '',
  jobName: '',
  jobGroup: '',
  scheduleType: '',
  scheduleExpr: '',
})

const loadJob = async () => {
  isLoading.value = true

  try {
    const response = await getJob(route.params.jobName, route.params.jobGroup)
    const job = response.data

    const scheduleType = job.triggerType === 'SIMPLE' ? 'SIMPLE' : 'CRON'

    jobData.value = {
      jobClassName: job.jobClassName || '',
      jobName: job.jobName || '',
      jobGroup: job.jobGroup || '',
      scheduleType,
      scheduleExpr:
        scheduleType === 'SIMPLE'
          ? String(Math.floor((job.repeatInterval || 0) / 1000))
          : job.cronExpression || '',
    }

    paramList.value = Object.entries(job.params || {}).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }))
  } catch (error) {
    console.error('Job 정보 조회 실패:', error)
    alert('Job 정보를 불러오지 못했습니다.')
    router.push('/jobList')
  } finally {
    isLoading.value = false
  }
}

const validateJob = () => {
  if (!jobData.value.scheduleType) {
    alert('스케줄 유형을 선택해주세요.')
    return false
  }

  if (!jobData.value.scheduleExpr.trim()) {
    alert('스케줄 표현식을 입력해주세요.')
    return false
  }

  if (jobData.value.scheduleType === 'SIMPLE') {
    const intervalSeconds = Number(jobData.value.scheduleExpr)

    if (!Number.isInteger(intervalSeconds) || intervalSeconds <= 0) {
      alert('SIMPLE 스케줄 값은 0보다 큰 정수(초)로 입력해주세요.')
      return false
    }
  }

  return true
}

const handleUpdateJob = async () => {
  // 1. 입력값을 검증한다.
  if (!validateJob()) {
    return
  }

  // 2. 수정 여부를 확인한다.
  if (
    !confirm(`${jobData.value.jobGroup} 그룹의 ${jobData.value.jobName} Job을 수정하시겠습니까?`)
  ) {
    return
  }

  try {
    // 3. Job 수정 API를 호출한다.
    const response = await updateJob({
      jobName: jobData.value.jobName,
      jobGroup: jobData.value.jobGroup,
      scheduleType: jobData.value.scheduleType,
      scheduleExpr: jobData.value.scheduleExpr.trim(),
      params: buildParams(),
    })

    // 4. 수정 성공 후 목록 화면으로 이동한다.
    alert('Job 수정 성공')
    console.log(response.data)

    router.push('/jobList')
  } catch (error) {
    console.error('Job 수정 실패:', error)
    alert('Job 수정에 실패했습니다.')
  }
}

const addParam = () => {
  paramList.value.push({
    key: '',
    value: '',
  })
}

const removeParam = (index) => {
  paramList.value.splice(index, 1)
}

const buildParams = () => {
  return paramList.value.reduce((params, param) => {
    params[param.key.trim()] = param.value
    return params
  }, {})
}

onMounted(() => {
  loadJob()
})
</script>

<template>
  <div class="p-6 max-w-xl mx-auto">
    <div v-if="isLoading" class="text-center text-gray-500">Job 정보를 불러오는 중입니다.</div>

    <form v-else @submit.prevent="handleUpdateJob" class="space-y-4">
      <div>
        <label class="block font-semibold">Job Class Name</label>
        <input v-model="jobData.jobClassName" class="input bg-gray-100" type="text" disabled />
      </div>

      <div>
        <label class="block font-semibold">Job Name</label>
        <input v-model="jobData.jobName" class="input bg-gray-100" type="text" disabled />
      </div>

      <div>
        <label class="block font-semibold">Job Group</label>
        <input v-model="jobData.jobGroup" class="input bg-gray-100" type="text" disabled />
      </div>

      <div>
        <label class="block font-semibold">Schedule Type</label>
        <select v-model="jobData.scheduleType" class="input">
          <option value="SIMPLE">SIMPLE</option>
          <option value="CRON">CRON</option>
        </select>
      </div>

      <div>
        <label class="block font-semibold">Schedule Expression</label>
        <input v-model="jobData.scheduleExpr" class="input" type="text" />

        <div
          v-if="jobData.scheduleType === 'CRON'"
          class="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <div class="mb-1 text-xs font-semibold text-gray-600">CRON 예제</div>

          <div class="space-y-1 text-sm text-gray-600">
            <div class="flex justify-between gap-4">
              <code class="text-gray-800">0 0/10 * * * ?</code>
              <span>10분마다 실행</span>
            </div>

            <div class="flex justify-between gap-4">
              <code class="text-gray-800">0 0 * * * ?</code>
              <span>매시 정각 실행</span>
            </div>

            <div class="flex justify-between gap-4">
              <code class="text-gray-800">0 0 9 * * ?</code>
              <span>매일 오전 9시 실행</span>
            </div>

            <div class="flex justify-between gap-4">
              <code class="text-gray-800">0 0 9 ? * MON-FRI</code>
              <span>평일 오전 9시 실행</span>
            </div>
          </div>
        </div>

        <div
          v-else-if="jobData.scheduleType === 'SIMPLE'"
          class="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <div class="mb-1 text-xs font-semibold text-gray-600">SIMPLE 예제</div>

          <div class="space-y-1 text-sm text-gray-600">
            <div class="flex justify-between gap-4">
              <code class="text-gray-800">10</code>
              <span>10초마다 실행</span>
            </div>

            <div class="flex justify-between gap-4">
              <code class="text-gray-800">60</code>
              <span>1분마다 실행</span>
            </div>

            <div class="flex justify-between gap-4">
              <code class="text-gray-800">300</code>
              <span>5분마다 실행</span>
            </div>

            <div class="flex justify-between gap-4">
              <code class="text-gray-800">3600</code>
              <span>1시간마다 실행</span>
            </div>
          </div>
        </div>
      </div>

      <fieldset class="border border-gray-300 p-4 rounded">
        <legend class="font-bold">파라미터 (params)</legend>

        <div
          v-for="(param, index) in paramList"
          :key="index"
          class="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mb-3"
        >
          <div>
            <label class="block font-semibold">Key</label>
            <input v-model="param.key" class="input" type="text" placeholder="예: baseDate" />
          </div>

          <div>
            <label class="block font-semibold">Value</label>
            <input v-model="param.value" class="input" type="text" placeholder="값" />
          </div>

          <button
            type="button"
            @click="removeParam(index)"
            class="border border-red-300 text-red-600 px-3 py-2 rounded hover:bg-red-50"
          >
            삭제
          </button>
        </div>

        <div v-if="paramList.length === 0" class="text-sm text-gray-500 mb-3">
          등록된 파라미터가 없습니다. 필요한 경우 파라미터를 추가해주세요.
        </div>

        <button
          type="button"
          @click="addParam"
          class="border border-gray-300 px-3 py-2 rounded hover:bg-gray-100"
        >
          + 파라미터 추가
        </button>
      </fieldset>

      <div class="flex justify-center gap-2">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {{ isSubmitting ? '수정 중...' : '수정하기' }}
        </button>

        <button
          type="button"
          :disabled="isSubmitting"
          @click="router.push('/')"
          class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.input {
  @apply w-full border border-gray-300 px-3 py-2 rounded mt-1;
}
</style>
