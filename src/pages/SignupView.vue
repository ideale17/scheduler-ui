<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signupUser } from '@/api/authApi'

const router = useRouter()

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const err = ref('')

const signup = async () => {
  err.value = ''

  // 1. 회원가입 입력값을 검증한다.
  if (password.value !== passwordConfirm.value) {
    err.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  // 2. 회원가입 여부를 확인한다.
  const confirmed = confirm('회원가입하시겠습니까?')
  if (!confirmed) {
    return
  }

  try {
    // 3. 회원가입 API를 호출한다.
    await signupUser(username.value, password.value, passwordConfirm.value)

    // 4. 회원가입 성공 후 로그인 화면으로 이동한다.
    alert('회원가입이 완료되었습니다.')
    router.push('/login')
  } catch (error) {
    err.value = error.response?.data?.message || '회원가입에 실패했습니다.'
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-semibold text-gray-900">Scheduler</h1>

        <p class="mt-2 text-sm text-gray-500">Quartz Scheduler Management</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form class="space-y-4" @submit.prevent="signup">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">회원가입</h2>

            <p class="mt-1 text-sm text-gray-500">Scheduler를 사용할 계정을 생성합니다.</p>
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
              autocomplete="new-password"
              placeholder="비밀번호를 입력해주세요."
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label for="passwordConfirm" class="mb-1 block text-sm font-medium text-gray-700">
              비밀번호 확인
            </label>

            <input
              id="passwordConfirm"
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              placeholder="비밀번호를 다시 입력해주세요."
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />

            <p
              v-if="passwordConfirm"
              class="mt-1 text-xs"
              :class="password === passwordConfirm ? 'text-green-600' : 'text-red-600'"
            >
              {{
                password === passwordConfirm
                  ? '비밀번호가 일치합니다.'
                  : '비밀번호가 일치하지 않습니다.'
              }}
            </p>
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
            회원가입
          </button>

          <button
            type="button"
            class="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="router.push('/login')"
          >
            로그인으로 돌아가기
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
