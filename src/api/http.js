import axios from 'axios'

let unauthorizedHandler = null

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

// 세션 인증과 함께 사용하는 CSRF 토큰을 공통 헤더로 전달한다.
http.interceptors.request.use((config) => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)

  if (match) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(match[1])
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler()
    }

    return Promise.reject(error)
  },
)

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler
}

export default http
