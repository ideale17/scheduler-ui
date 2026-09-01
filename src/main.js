import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from '@/api/http'
import './styles/tailwind.css'

// 세션이 만료되어 API에서 401이 반환되면 로그인 화면으로 이동한다.
setUnauthorizedHandler(() => {
  if (router.currentRoute.value.path !== '/login') {
    router.push({
      path: '/login',
      query: {
        redirect: router.currentRoute.value.fullPath,
      },
    })
  }
})

createApp(App).use(router).mount('#app')
