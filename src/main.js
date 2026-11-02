import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/authStore'
import { setUnauthorizedHandler } from '@/api/http'
import './styles/tailwind.css'

// Pinia 인스턴스를 생성한다.
const pinia = createPinia()

// 세션이 만료되어 API에서 401이 반환되면 로그인 화면으로 이동한다.
setUnauthorizedHandler(() => {
  const authStore = useAuthStore(pinia)
  authStore.clearUser()

  if (router.currentRoute.value.path !== '/login') {
    router.push({
      path: '/login',
      query: {
        redirect: router.currentRoute.value.fullPath,
      },
    })
  }
})

// Vue 애플리케이션에 Pinia와 Router를 등록한다.
createApp(App).use(pinia).use(router).mount('#app')
