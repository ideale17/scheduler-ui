import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser } from '@/api/authApi'

export const useAuthStore = defineStore('auth', () => {
  // 1. 서버에서 확인한 로그인 사용자 정보를 관리한다.
  const user = ref(null)

  // 2. 현재 사용자 정보 조회가 완료되었는지 관리한다.
  const isInitialized = ref(false)

  // 3. 사용자 정보가 존재하면 로그인 상태로 판단한다.
  const isAuthenticated = computed(() => !!user.value?.username)

  /**
   * 현재 로그인한 사용자 정보를 조회한다.
   * 실제 인증 여부는 서버 세션을 기준으로 확인한다.
   */
  const loadCurrentUser = async () => {
    try {
      const { data } = await getCurrentUser()

      user.value = data?.username ? data : null

      return user.value
    } catch (error) {
      user.value = null

      // 미인증 상태는 정상적인 인증 확인 결과로 처리한다.
      if (error.response?.status === 401) {
        return null
      }

      // 인증 오류가 아닌 서버 장애 등은 호출한 곳에서 처리한다.
      throw error
    } finally {
      isInitialized.value = true
    }
  }

  /**
   * 클라이언트에 저장된 로그인 사용자 정보를 초기화한다.
   * 서버 세션을 종료하는 로그아웃 API는 호출하지 않는다.
   */
  const clearUser = () => {
    user.value = null
    isInitialized.value = false
  }

  return {
    user,
    isInitialized,
    isAuthenticated,
    loadCurrentUser,
    clearUser,
  }
})
