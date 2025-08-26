import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/tailwind.css' // Tailwind CSS import 추가
import axios from 'axios' // 1) axios 전역 설정

// (A) 백엔드 포트로 직접 호출할 때
axios.defaults.baseURL = 'http://localhost:8080'

// (B) Vite 프록시(/api -> 8080) 쓰면 위 줄 대신 ↓
// axios.defaults.baseURL = ''   // 또는 '/api'만 경로 앞에 붙여 호출

axios.defaults.withCredentials = true // JSESSIONID 쿠키 전송

// 2) CSRF: 쿠키('XSRF-TOKEN') 값을 헤더('X-XSRF-TOKEN')로 복사
axios.interceptors.request.use((config) => {
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  if (m) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(m[1])
  }

  // const method = (config.method || '').toLowerCase()
  // if (m && ['post', 'put', 'patch', 'delete'].includes(method)) {
  //   config.headers['X-XSRF-TOKEN'] = decodeURIComponent(m[1])
  // }

  return config
})

// 3) (선택) 인증 만료 등 401 오면 로그인으로 보내기
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const cur = router.currentRoute.value
      router.replace({ path: '/login', query: { redirect: cur.fullPath } })
    }
    return Promise.reject(err)
  },
)

createApp(App).use(router).mount('#app')
