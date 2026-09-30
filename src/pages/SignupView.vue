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

  // 1. 회원가입 여부를 확인한다.
  const confirmed = confirm('회원가입하시겠습니까?')
  if (!confirmed) {
    return
  }

  try {
    // 2. 회원가입 API를 호출한다.
    await signupUser(username.value, password.value, passwordConfirm.value)

    // 3. 회원가입 성공 후 로그인 화면으로 이동한다.
    alert('회원가입이 완료되었습니다.')
    router.push('/login')
  } catch (error) {
    err.value = error.response?.data?.message || '회원가입에 실패했습니다.'
  }
}
</script>

<template>
  <div class="p-6 max-w-sm mx-auto">
    <form class="space-y-3" @submit.prevent="signup">
      <h2 class="text-xl font-bold">회원가입</h2>

      <input v-model="username" placeholder="아이디" class="border p-2 w-full" />

      <input v-model="password" type="password" placeholder="비밀번호" class="border p-2 w-full" />

      <input
        v-model="passwordConfirm"
        type="password"
        placeholder="비밀번호 확인"
        class="border p-2 w-full"
      />

      <p
        v-if="passwordConfirm"
        :class="['text-sm', password === passwordConfirm ? 'text-green-500' : 'text-red-500']"
      >
        {{
          password === passwordConfirm ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'
        }}
      </p>

      <button type="submit" class="border p-2 w-full">회원가입</button>

      <button type="button" class="border p-2 w-full" @click="router.push('/login')">
        로그인으로 돌아가기
      </button>

      <p v-if="err" class="text-red-500 text-sm">
        {{ err }}
      </p>
    </form>
  </div>
</template>
