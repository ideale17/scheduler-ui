<script setup>
import { ref } from 'vue'
import http from '@/api/http'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const err = ref('')

const login = async () => {
  err.value = ''
  try {
    // 세션 발급
    await http.post('/auth/login', {
      username: username.value,
      password: password.value,
    })
    // 돌아갈 곳 있으면 그리, 없으면 홈
    const redirect = route.query.redirect?.toString() || '/'
    router.replace(redirect)
  } catch {
    err.value = '로그인 실패'
  }
}
</script>

<template>
  <div class="p-6 max-w-sm mx-auto space-y-3">
    <h2 class="text-xl font-bold">로그인</h2>
    <input v-model="username" placeholder="아이디" class="border p-2 w-full" />
    <input v-model="password" type="password" placeholder="비밀번호" class="border p-2 w-full" />
    <button @click="login" class="border p-2 w-full">로그인</button>
    <p v-if="err" class="text-red-500 text-sm">{{ err }}</p>
  </div>
</template>
