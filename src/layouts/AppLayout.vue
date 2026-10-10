<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { getCurrentUser, logoutUser } from '@/api/authApi'

const route = useRoute()
const router = useRouter()

const menuGroups = [
  {
    label: 'OVERVIEW',
    menus: [{ to: '/', label: '대시보드', match: 'dashboard' }],
  },
  {
    label: 'SCHEDULER',
    menus: [
      { to: '/jobList', label: 'Job 관리', match: 'job' },
      { to: '/JobHistory', label: 'Job 실행 이력', match: 'jobHistory' },
    ],
  },
  {
    label: 'API MANAGEMENT',
    menus: [
      { to: '/externalApi', label: 'API 관리', match: 'externalApi' },
      { to: '/externalApi/history', label: 'API 실행 이력', match: 'externalApiHistory' },
      { to: '/raw-data', label: 'Raw Data 관리', match: 'rawData' },
    ],
  },
  {
    label: 'SYSTEM',
    menus: [{ to: '/schedulerInfo', label: 'Scheduler 정보', match: 'schedulerInfo' }],
  },
]

const isActive = (menu) => {
  switch (menu.match) {
    case 'dashboard':
      return route.path === '/'

    case 'job':
      return route.path === '/jobList' || route.path === '/add' || route.path.startsWith('/edit/')

    case 'jobHistory':
      return route.path === '/JobHistory'

    case 'externalApi':
      return (
        route.path === '/externalApi' ||
        (route.path.startsWith('/externalApi/') && route.path !== '/externalApi/history')
      )

    case 'externalApiHistory':
      return route.path === '/externalApi/history'

    case 'rawData':
      return route.path === '/raw-data'

    case 'schedulerInfo':
      return route.path === '/schedulerInfo'

    default:
      return false
  }
}

const pageTitle = computed(() => route.meta.title || '')

const username = ref(null)

onMounted(async () => {
  try {
    const { data } = await getCurrentUser()

    username.value = data?.username ?? null
  } catch {
    username.value = null
  }
})

const logout = async () => {
  try {
    await logoutUser()
  } finally {
    router.push('/login')
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-50 text-gray-900">
    <!-- 왼쪽 메뉴 -->
    <aside class="min-h-screen w-60 shrink-0 border-r border-gray-200 bg-white">
      <!-- 서비스명 -->
      <RouterLink
        to="/"
        class="flex h-16 items-center border-b border-gray-100 px-5 hover:bg-gray-50"
      >
        <div>
          <div class="text-base font-semibold text-gray-900">Scheduler</div>
          <div class="mt-0.5 text-xs text-gray-500">Quartz Management</div>
        </div>
      </RouterLink>

      <!-- 메뉴 -->
      <nav class="px-3 py-4">
        <div
          v-for="(group, groupIndex) in menuGroups"
          :key="group.label"
          :class="groupIndex > 0 ? 'mt-6' : ''"
        >
          <div class="mb-2 flex items-center gap-2 px-3">
            <span class="text-xs font-semibold tracking-wider text-gray-400">
              {{ group.label }}
            </span>

            <div class="h-px flex-1 bg-gray-200"></div>
          </div>

          <div class="space-y-1">
            <RouterLink
              v-for="menu in group.menus"
              :key="menu.to"
              :to="menu.to"
              :class="[
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(menu)
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ]"
            >
              {{ menu.label }}
            </RouterLink>
          </div>
        </div>
      </nav>
    </aside>

    <!-- 메인 영역 -->
    <main class="flex min-w-0 flex-1 flex-col">
      <!-- 상단바 -->
      <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ pageTitle }}
        </h2>

        <div class="flex items-center gap-3">
          <div v-if="username" class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600"
            >
              {{ username.charAt(0).toUpperCase() }}
            </div>

            <span class="text-sm text-gray-600">
              {{ username }}
            </span>
          </div>

          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            @click="logout"
          >
            로그아웃
          </button>
        </div>
      </header>

      <!-- 본문 영역 -->
      <section class="min-w-0 flex-1 bg-gray-50 p-6">
        <RouterView />
      </section>
    </main>
  </div>
</template>
