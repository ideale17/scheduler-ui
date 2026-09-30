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
  <div class="p-6 max-w-sm mx-auto">
    <form class="space-y-3" @submit.prevent="login">
      <h2 class="text-xl font-bold">로그인</h2>

      <input v-model="username" placeholder="아이디" class="border p-2 w-full" />

      <input v-model="password" type="password" placeholder="비밀번호" class="border p-2 w-full" />

      <button type="submit" class="border p-2 w-full">로그인</button>

      <button
        v-if="signupEnabled"
        type="button"
        class="border p-2 w-full"
        @click="router.push('/signup')"
      >
        회원가입
      </button>

      <p v-if="err" class="text-red-500 text-sm">
        {{ err }}
      </p>
    </form>
  </div>
</template>
