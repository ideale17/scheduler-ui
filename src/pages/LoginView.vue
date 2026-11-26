<script setup>
import { onMounted, ref } from 'vue'
import { getGuestLoginEnabled, getSignupEnabled } from '@/api/authApi'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()
const username = ref('')
const password = ref('')
const err = ref('')
const signupEnabled = ref(false)
const guestLoginEnabled = ref(false)
const loginMode = ref(null)

const login = async (mode) => {
  // 로그인 요청이 진행 중이면 중복 요청을 방지한다.
  if (loginMode.value || (mode === 'guest' && !guestLoginEnabled.value)) {
    return
  }

  err.value = ''
  loginMode.value = mode

  try {
    if (mode === 'guest') {
      await authStore.loginAsGuest()
      await router.replace('/')

      // 서버가 세션을 확인하지 못하면 라우터가 로그인 화면으로 돌려보낸다.
      if (router.currentRoute.value.path === '/login') {
        err.value = '게스트 로그인 세션을 확인하지 못했습니다. 다시 시도해 주세요.'
      } else if (authStore.isGuest) {
        toastStore.info('게스트는 조회만 할 수 있습니다.')
      }
    } else {
      await authStore.login(username.value, password.value)
      await router.replace(route.query.redirect?.toString() || '/')
    }
  } catch (error) {
    if (mode === 'guest') {
      if (error.response?.status === 404) {
        guestLoginEnabled.value = false
        err.value = '현재 게스트 로그인을 사용할 수 없습니다.'
      } else {
        err.value = '게스트 로그인에 실패했습니다. 다시 시도해 주세요.'
      }
    } else {
      err.value = '로그인 실패'
    }
  } finally {
    loginMode.value = null
  }
}

onMounted(async () => {
  try {
    const { data } = await getGuestLoginEnabled()
    guestLoginEnabled.value = data?.guestLoginEnabled === true
  } catch {
    guestLoginEnabled.value = false
  }
})

onMounted(async () => {
  try {
    // 1. 회원가입 활성화 여부를 조회한다.
    const response = await getSignupEnabled()
    signupEnabled.value = response.data.signupEnabled
  } catch {
    signupEnabled.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-semibold text-gray-900">Scheduler</h1>

        <p class="mt-2 text-sm text-gray-500">Quartz Scheduler Management</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form class="space-y-4" @submit.prevent="login('account')">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">로그인</h2>

            <p class="mt-1 text-sm text-gray-500">계정 정보를 입력해주세요.</p>
          </div>

          <div>
            <label for="username" class="mb-1 block text-sm font-medium text-gray-700">
              아이디
            </label>

            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="아이디를 입력해주세요."
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-gray-700">
              비밀번호
            </label>

            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="비밀번호를 입력해주세요."
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div
            v-if="err"
            role="alert"
            class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {{ err }}
          </div>

          <button
            type="submit"
            :disabled="loginMode !== null"
            :aria-busy="loginMode === 'account'"
            class="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="inline-flex items-center gap-2">
              <!-- 로그인 요청 중 로딩 표시 -->
              <span
                v-if="loginMode === 'account'"
                class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-white"
                aria-hidden="true"
              ></span>

              {{ loginMode === 'account' ? '로그인 중...' : '로그인' }}
            </span>
          </button>

          <button
            v-if="guestLoginEnabled"
            type="button"
            :disabled="loginMode !== null"
            :aria-busy="loginMode === 'guest'"
            class="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="login('guest')"
          >
            {{ loginMode === 'guest' ? '게스트 로그인 중...' : '게스트 로그인' }}
          </button>

          <button
            v-if="signupEnabled"
            type="button"
            class="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="router.push('/signup')"
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
