<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getJob, updateJob } from '@/api/jobApi'
import { getExternalApiList } from '@/api/externalApi'

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const isSubmitting = ref(false)
const paramList = ref([])
const externalApiList = ref([])
const selectedExternalApiId = ref('')

const jobData = ref({
  jobClassName: '',
  jobName: '',
  jobGroup: '',
  scheduleType: '',
  scheduleExpr: '',
  misfirePolicy: 'SMART_POLICY',
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
      misfirePolicy: job.misfirePolicy || 'SMART_POLICY',
    }

    if (isExternalApiCallJob(job.jobClassName)) {
      await loadExternalApiList()

      selectedExternalApiId.value = job.params?.externalApiId
        ? Number(job.params.externalApiId)
        : ''

      paramList.value = []
    } else {
      paramList.value = Object.entries(job.params || {}).map(([key, value]) => ({
        key,
        value: String(value ?? ''),
      }))
    }
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

  if (isExternalApiCallJob(jobData.value.jobClassName) && !selectedExternalApiId.value) {
    alert('External API를 선택해주세요.')
    return false
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

  // 3. Job 유형에 따라 실행 파라미터를 구성한다.
  const params = isExternalApiCallJob(jobData.value.jobClassName)
    ? { externalApiId: selectedExternalApiId.value }
    : buildParams()

  try {
    // 4. Job 수정 API를 호출한다.
    await updateJob({
      jobName: jobData.value.jobName,
      jobGroup: jobData.value.jobGroup,
      scheduleType: jobData.value.scheduleType,
      scheduleExpr: jobData.value.scheduleExpr.trim(),
      misfirePolicy: jobData.value.misfirePolicy,
      params,
    })

    // 5. 수정 성공 후 목록 화면으로 이동한다.
    alert('Job 수정 성공')

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

const changeScheduleType = () => {
  jobData.value.misfirePolicy = 'SMART_POLICY'
}

const isExternalApiCallJob = (jobClassName) => {
  return jobClassName === 'com.kji.scheduler.job.ExternalApiCallJob'
}

const getJobClassSimpleName = (jobClassName) => {
  return jobClassName?.split('.').pop() || ''
}

const loadExternalApiList = async () => {
  try {
    const response = await getExternalApiList()

    externalApiList.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('External API 목록 조회 실패:', error)
    externalApiList.value = []
    alert('External API 목록을 불러오지 못했습니다.')
  }
}

onMounted(() => {
  loadJob()
})
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      Job 정보를 불러오는 중입니다.
    </div>

    <form v-else class="space-y-4" @submit.prevent="handleUpdateJob">
      <!-- Job 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-gray-900">Job 기본 정보</h3>
          <p class="mt-1 text-sm text-gray-500">Job 식별 정보는 수정할 수 없습니다.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-gray-700"> Job 클래스 </label>

            <input
              :value="getJobClassSimpleName(jobData.jobClassName)"
              type="text"
              disabled
              class="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> Job 이름 </label>

            <input
              v-model="jobData.jobName"
              type="text"
              disabled
              class="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> Job 그룹 </label>

            <input
              v-model="jobData.jobGroup"
              type="text"
              disabled
              class="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500"
            />
          </div>
        </div>
      </section>

      <!-- 스케줄 설정 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-gray-900">스케줄 설정</h3>
          <p class="mt-1 text-sm text-gray-500">Job 실행 주기와 Misfire 처리 방식을 수정합니다.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> 스케줄 유형 </label>

            <select
              v-model="jobData.scheduleType"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              @change="changeScheduleType"
            >
              <option value="SIMPLE">SIMPLE</option>
              <option value="CRON">CRON</option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"> Misfire Policy </label>

            <select
              v-model="jobData.misfirePolicy"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <template v-if="jobData.scheduleType === 'CRON'">
                <option value="SMART_POLICY">기본 정책</option>
                <option value="FIRE_AND_PROCEED">놓친 실행이 있으면 즉시 1회 실행</option>
                <option value="DO_NOTHING">놓친 실행은 건너뛰기</option>
              </template>

              <template v-else>
                <option value="SMART_POLICY">기본 정책</option>
                <option value="FIRE_NOW">즉시 실행</option>
                <option value="NOW_WITH_EXISTING_COUNT">즉시 실행 - 기존 반복 횟수 기준</option>
                <option value="NOW_WITH_REMAINING_COUNT">즉시 실행 - 남은 반복 횟수 기준</option>
                <option value="NEXT_WITH_EXISTING_COUNT">다음 실행 - 기존 반복 횟수 기준</option>
                <option value="NEXT_WITH_REMAINING_COUNT">다음 실행 - 남은 반복 횟수 기준</option>
              </template>
            </select>

            <p class="mt-1 text-xs text-gray-500">
              예정된 실행 시간을 놓쳤을 때 Quartz가 처리하는 방식입니다.
            </p>
          </div>

          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-gray-700"> 스케줄 표현식 </label>

            <input
              v-model="jobData.scheduleExpr"
              type="text"
              :placeholder="
                jobData.scheduleType === 'CRON'
                  ? '예: 0 0/10 * * * ?'
                  : '반복 간격을 초 단위로 입력'
              "
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />

            <div
              v-if="jobData.scheduleType === 'CRON'"
              class="mt-3 rounded-md border border-gray-200 bg-gray-50 p-4"
            >
              <div class="mb-2 text-xs font-semibold text-gray-600">CRON 예제</div>

              <div class="space-y-2 text-sm text-gray-600">
                <div class="flex flex-wrap justify-between gap-2">
                  <code class="text-gray-800">0 0/10 * * * ?</code>
                  <span>10분마다 실행</span>
                </div>

                <div class="flex flex-wrap justify-between gap-2">
                  <code class="text-gray-800">0 0 * * * ?</code>
                  <span>매시 정각 실행</span>
                </div>

                <div class="flex flex-wrap justify-between gap-2">
                  <code class="text-gray-800">0 0 9 * * ?</code>
                  <span>매일 오전 9시 실행</span>
                </div>

                <div class="flex flex-wrap justify-between gap-2">
                  <code class="text-gray-800">0 0 9 ? * MON-FRI</code>
                  <span>평일 오전 9시 실행</span>
                </div>
              </div>
            </div>

            <div v-else class="mt-3 rounded-md border border-gray-200 bg-gray-50 p-4">
              <div class="mb-2 text-xs font-semibold text-gray-600">SIMPLE 예제</div>

              <div class="space-y-2 text-sm text-gray-600">
                <div class="flex justify-between gap-2">
                  <code class="text-gray-800">10</code>
                  <span>10초마다 실행</span>
                </div>

                <div class="flex justify-between gap-2">
                  <code class="text-gray-800">60</code>
                  <span>1분마다 실행</span>
                </div>

                <div class="flex justify-between gap-2">
                  <code class="text-gray-800">300</code>
                  <span>5분마다 실행</span>
                </div>

                <div class="flex justify-between gap-2">
                  <code class="text-gray-800">3600</code>
                  <span>1시간마다 실행</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- External API -->
      <section
        v-if="isExternalApiCallJob(jobData.jobClassName)"
        class="rounded-lg border border-gray-200 bg-white p-5"
      >
        <div class="mb-5">
          <h3 class="text-base font-semibold text-gray-900">API 연계</h3>
          <p class="mt-1 text-sm text-gray-500">해당 Job에서 호출할 API를 선택합니다.</p>
        </div>

        <select
          v-model="selectedExternalApiId"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="" disabled>호출할 API를 선택해주세요.</option>

          <option
            v-for="externalApi in externalApiList"
            :key="externalApi.externalApiId"
            :value="externalApi.externalApiId"
          >
            {{ externalApi.apiName }}
          </option>
        </select>
      </section>

      <!-- 일반 Job 파라미터 -->
      <section v-else class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-gray-900">실행 파라미터</h3>
            <p class="mt-1 text-sm text-gray-500">
              Job 실행 시 전달할 Key / Value 파라미터를 수정합니다.
            </p>
          </div>

          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="addParam"
          >
            파라미터 추가
          </button>
        </div>

        <div
          v-if="paramList.length === 0"
          class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500"
        >
          등록된 파라미터가 없습니다.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(param, index) in paramList"
            :key="index"
            class="rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700"> Key </label>

                <input
                  v-model="param.key"
                  type="text"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700"> Value </label>

                <input
                  v-model="param.value"
                  type="text"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                @click="removeParam(index)"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 하단 버튼 -->
      <div class="flex justify-end gap-2">
        <button
          type="button"
          :disabled="isSubmitting"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="router.push('/jobList')"
        >
          취소
        </button>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isSubmitting ? '수정 중...' : '수정' }}
        </button>
      </div>
    </form>
  </div>
</template>
