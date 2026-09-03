<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import http from '@/api/http'

const route = useRoute()
const router = useRouter()

const menus = [
  { to: '/', label: 'Jobs' },
  { to: '/add', label: 'add Job' },
  { to: '/JobHistory', label: 'Runs / History' },
  { to: '/settings', label: 'Settings' },
]
const isActive = (path) => route.path === path

// 🔹 meta.title 값을 가져오는 computed
const pageTitle = computed(() => route.meta.title || '')

// (선택) 사용자 표시용
const username = ref(null)
onMounted(async () => {
  try {
    const { data } = await http.get('http://localhost:8080/auth/me')
    username.value = data?.username ?? null
  } catch {
    username.value = null
  }
})

const logout = async () => {
  try {
    await http.post('http://localhost:8080/auth/logout')
  } finally {
    router.push('/login') // 세션 파기 후 로그인 화면으로
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 flex">
    <!-- 왼쪽 메뉴 -->
    <aside class="w-56 bg-white border-r min-h-screen">
      <div class="h-14 flex items-center px-4 font-semibold">🗓 Scheduler UI</div>
      <nav class="px-2 py-2 space-y-1">
        <RouterLink
          v-for="m in menus"
          :key="m.to"
          :to="m.to"
          :class="[
            'block px-3 py-2 rounded text-sm',
            isActive(m.to) ? 'bg-gray-900 text-white' : 'hover:bg-gray-100',
          ]"
        >
          {{ m.label }}
        </RouterLink>
      </nav>
    </aside>

    <!-- 메인 영역 -->
    <main class="flex-1 min-w-0 flex flex-col">
      <!-- 상단바 -->
      <header class="flex items-center justify-between p-4 border-b bg-white">
        <h2 class="text-xl font-semibold">{{ pageTitle }}</h2>

        <!-- 우측 사용자/로그아웃 -->
        <div class="flex items-center gap-3">
          <span v-if="username" class="text-sm text-gray-600">👤 {{ username }}</span>
          <button @click="logout" class="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300">
            로그아웃
          </button>
        </div>
      </header>

      <!-- 본문 영역 -->
      <section class="flex-1 min-w-0 p-4 bg-gray-50">
        <router-view />
      </section>
    </main>
  </div>
</template>
