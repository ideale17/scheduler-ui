<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createJob, getJobClasses } from '@/api/jobApi'

const router = useRouter()
const jobClasses = ref([])

// const jobData = ref({
//   jobClassName: 'com.kji.scheduler.job.WeatherCollectJob',
//   jobName: 'test',
//   jobGroup: 'test',
//   scheduleType: 'SIMPLE',
//   scheduleExpr: '60',
//   params: {
//     baseDate: '20250807',
//     baseTime: '1000',
//     nx: '55',
//     ny: '127',
//   },
// })

const jobData = ref({
  jobClassName: '',
  jobName: '',
  jobGroup: '',
  scheduleType: 'CRON',
  scheduleExpr: '',
  params: {},
})

const loadJobClasses = async () => {
  try {
    const response = await getJobClasses()

    jobClasses.value = response.data
  } catch (error) {
    console.error('Job 클래스 목록 조회 실패:', error)
    alert('Job 클래스 목록을 불러오지 못했습니다.')
  }
}

onMounted(() => {
  loadJobClasses()
})

const addJob = async () => {
  // 1. 입력값을 검증한다.
  if (!validateJob()) {
    return
  }

  try {
    // 2. Job 등록 API를 호출한다.
    const response = await createJob(jobData.value)

    // 3. 등록 성공 후 목록 화면으로 이동한다.
    alert('Job 등록 성공')
    console.log(response.data)

    router.push('/')
  } catch (error) {
    console.error('Job 등록 실패:', error)
    alert('Job 등록에 실패했습니다.')
  }
}

const validateJob = () => {
  if (!jobData.value.jobClassName.trim()) {
    alert('Job 클래스를 선택해주세요.')
    return false
  }

  if (!jobData.value.jobName.trim()) {
    alert('Job 이름을 입력해주세요.')
    return false
  }

  if (!jobData.value.jobGroup.trim()) {
    alert('Job 그룹을 입력해주세요.')
    return false
  }

  if (!jobData.value.scheduleType) {
    alert('스케줄 유형을 선택해주세요.')
    return false
  }

  if (!jobData.value.scheduleExpr.trim()) {
    alert('스케줄 표현식을 입력해주세요.')
    return false
  }

  return true
}
</script>

<template>
  <div class="p-6 max-w-xl mx-auto">
    <!-- <h2 class="text-2xl font-bold mb-4">📝 Job 등록</h2> -->

    <form @submit.prevent="addJob" class="space-y-4">
      <div>
        <label class="block font-semibold">Job Class Name</label>
        <select v-model="jobData.jobClassName">
          <option value="" disabled>Job 클래스를 선택해주세요.</option>

          <option v-for="jobClass in jobClasses" :key="jobClass" :value="jobClass">
            {{ jobClass }}
          </option>
        </select>
      </div>

      <div>
        <label class="block font-semibold">Job Name</label>
        <input v-model="jobData.jobName" class="input" type="text" />
      </div>

      <div>
        <label class="block font-semibold">Job Group</label>
        <input v-model="jobData.jobGroup" class="input" type="text" />
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
      </div>

      <fieldset class="border border-gray-300 p-4 rounded">
        <legend class="font-bold">파라미터 (params)</legend>

        <div>
          <label class="block font-semibold">Base Date</label>
          <input v-model="jobData.params.baseDate" class="input" type="text" />
        </div>

        <div>
          <label class="block font-semibold">Base Time</label>
          <input v-model="jobData.params.baseTime" class="input" type="text" />
        </div>

        <div>
          <label class="block font-semibold">nx</label>
          <input v-model="jobData.params.nx" class="input" type="text" />
        </div>

        <div>
          <label class="block font-semibold">ny</label>
          <input v-model="jobData.params.ny" class="input" type="text" />
        </div>
      </fieldset>

      <div class="flex justify-center gap-2">
        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          등록하기
        </button>
        <button
          type="button"
          @click="router.push('/')"
          class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
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
