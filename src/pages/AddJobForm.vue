<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()

const jobData = ref({
  jobClassName: 'com.kji.scheduler.job.WeatherCollectJob',
  jobName: 'test',
  jobGroup: 'test',
  scheduleType: 'SIMPLE',
  scheduleExpr: '60',
  params: {
    baseDate: '20250807',
    baseTime: '1000',
    nx: '55',
    ny: '127',
  },
})

const addJob = async () => {
  try {
    const response = await axios.post('http://localhost:8080/jobs/addJob', jobData.value)
    alert('✅ Job 등록 성공')
    console.log(response.data)
    router.push('/') // 목록 화면으로 이동
  } catch (error) {
    console.error('❌ 등록 실패:', error)
    alert('❌ Job 등록 실패')
  }
}
</script>

<template>
  <div class="p-6 max-w-xl mx-auto">
    <!-- <h2 class="text-2xl font-bold mb-4">📝 Job 등록</h2> -->

    <form @submit.prevent="addJob" class="space-y-4">
      <div>
        <label class="block font-semibold">Job Class Name</label>
        <select v-model="jobData.jobClassName" class="input">
          <option value="com.kji.scheduler.job.WeatherCollectJob">WeatherCollectJob</option>
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
