import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', () => {
  const toast = ref(null)
  let timeoutId = null

  /**
   * 현재 알림을 닫는다.
   */
  const hide = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    toast.value = null
  }

  /**
   * 공통 알림을 표시한다.
   *
   * @param {string} type 알림 종류
   * @param {string} title 알림 제목
   * @param {string} message 상세 메시지
   * @param {number} duration 표시 시간(ms)
   */
  const show = (type, title, message = '', duration = 3000) => {
    // 기존 알림과 타이머를 초기화한다.
    hide()

    toast.value = {
      type,
      title,
      message,
    }

    // 표시 시간이 0이면 사용자가 직접 닫을 때까지 유지한다.
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        hide()
      }, duration)
    }
  }

  const success = (title, message = '') => {
    show('success', title, message, 3000)
  }

  const warning = (title, message = '') => {
    show('warning', title, message, 6000)
  }

  const error = (title, message = '') => {
    show('error', title, message, 0)
  }

  return {
    toast,
    show,
    hide,
    success,
    warning,
    error,
  }
})
