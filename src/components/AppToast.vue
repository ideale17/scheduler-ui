<script setup>
import { computed } from 'vue'
import { useToastStore } from '@/stores/toastStore'

const toastStore = useToastStore()

const iconClass = computed(() => {
  const classes = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  }

  return classes[toastStore.toast?.type] || classes.success
})

const iconSymbol = computed(() => {
  const symbols = {
    success: '✓',
    warning: '!',
    error: '×',
  }

  return symbols[toastStore.toast?.type] || symbols.success
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="toastStore.toast"
      class="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
    >
      <div
        role="alert"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg"
      >
        <!-- 알림 종류별 아이콘 -->
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          :class="iconClass"
          aria-hidden="true"
        >
          {{ iconSymbol }}
        </span>

        <!-- 알림 메시지 -->
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-gray-900">
            {{ toastStore.toast.title }}
          </p>

          <p v-if="toastStore.toast.message" class="mt-1 break-words text-sm text-gray-600">
            {{ toastStore.toast.message }}
          </p>
        </div>

        <!-- 알림 닫기 -->
        <button
          type="button"
          aria-label="알림 닫기"
          class="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          @click="toastStore.hide()"
        >
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>
