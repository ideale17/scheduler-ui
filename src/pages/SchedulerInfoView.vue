<script setup>
import { onMounted, ref } from 'vue'
import { getSchedulerInfo } from '@/api/schedulerApi'

const schedulerInfo = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const fetchSchedulerInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // Settings 화면에 표시할 Quartz Scheduler 운영 정보를 조회한다.
    const response = await getSchedulerInfo()

    schedulerInfo.value = response.data ?? null
  } catch (error) {
    console.error('Scheduler 정보 조회 실패:', error)
    schedulerInfo.value = null
    errorMessage.value = 'Scheduler 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'RUNNING':
      return '실행 중'
    case 'STANDBY':
      return '대기 중'
    case 'SHUTDOWN':
      return '종료됨'
    case 'NOT_STARTED':
      return '시작 전'
    default:
      return status || '-'
  }
}

const getStatusClass = (status) => {
  switch (status) {
    case 'RUNNING':
      return 'bg-green-100 text-green-700'
    case 'STANDBY':
      return 'bg-yellow-100 text-yellow-700'
    case 'SHUTDOWN':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const formatBoolean = (value) => (value ? '예' : '아니오')

onMounted(() => {
  fetchSchedulerInfo()
})
</script>

<template>
  <div class="space-y-4">
    <div class="bg-white border rounded p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold">Quartz Scheduler 정보</h3>
          <p class="mt-1 text-sm text-gray-500">
            현재 애플리케이션에서 실행 중인 Quartz Scheduler의 운영 정보를 확인합니다.
          </p>
        </div>

        <button
          type="button"
          class="px-3 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
          :disabled="isLoading"
          @click="fetchSchedulerInfo"
        >
          {{ isLoading ? '조회 중...' : '새로고침' }}
        </button>
      </div>
    </div>

    <div
      v-if="isLoading && !schedulerInfo"
      class="bg-white border rounded p-5 text-sm text-gray-500"
    >
      Scheduler 정보를 불러오는 중입니다.
    </div>

    <div
      v-else-if="errorMessage"
      class="bg-red-50 border border-red-200 rounded p-5 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="schedulerInfo">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section class="bg-white border rounded p-5">
          <h4 class="font-semibold mb-4">Scheduler</h4>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">상태</dt>
              <dd>
                <span
                  class="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                  :class="getStatusClass(schedulerInfo.schedulerStatus)"
                >
                  {{ getStatusLabel(schedulerInfo.schedulerStatus) }}
                </span>
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">Scheduler 이름</dt>
              <dd class="text-right break-all">{{ schedulerInfo.schedulerName || '-' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">Instance ID</dt>
              <dd class="text-right break-all">{{ schedulerInfo.schedulerInstanceId || '-' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">Quartz 버전</dt>
              <dd>{{ schedulerInfo.quartzVersion || '-' }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-white border rounded p-5">
          <h4 class="font-semibold mb-4">Thread Pool</h4>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">구현 클래스</dt>
              <dd class="text-right break-all">{{ schedulerInfo.threadPoolClassName || '-' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">Thread 수</dt>
              <dd>{{ schedulerInfo.threadPoolSize }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-white border rounded p-5 md:col-span-2">
          <h4 class="font-semibold mb-4">JobStore</h4>

          <dl class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <dt class="text-gray-500 mb-1">구현 클래스</dt>
              <dd class="break-all">{{ schedulerInfo.jobStoreClassName || '-' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">DB 영속성 지원</dt>
              <dd>{{ formatBoolean(schedulerInfo.jobStoreSupportsPersistence) }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">클러스터 구성</dt>
              <dd>{{ formatBoolean(schedulerInfo.jobStoreClustered) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>
  </div>
</template>
