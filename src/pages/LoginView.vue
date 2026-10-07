<script setup>
import { onMounted, ref } from 'vue'
import { getSignupEnabled, loginUser } from '@/api/authApi'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const err = ref('')
const signupEnabled = ref(false)

const login = async () => {
  err.value = ''
  try {
    // 세션 발급
    await loginUser(username.value, password.value)

    // 돌아갈 곳 있으면 그리, 없으면 홈
    const redirect = route.query.redirect?.toString() || '/'
    router.replace(redirect)
  } catch {
    err.value = '로그인 실패'
  }
}

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
        <form class="space-y-4" @submit.prevent="login">
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
            class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {{ err }}
          </div>

          <button
            type="submit"
            class="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            로그인
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
