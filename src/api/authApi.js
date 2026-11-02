import http from './http'

export const loginUser = (username, password) => {
  return http.post('/auth/login', {
    username,
    password,
  })
}

export const logoutUser = () => {
  return http.post('/auth/logout')
}

export const getCurrentUser = () => {
  return http.get('/auth/me', {
    // 인증 확인 요청의 401은 호출한 Router에서 처리한다.
    skipUnauthorizedRedirect: true,
  })
}

export const signupUser = (username, password, passwordConfirm) => {
  return http.post('/auth/signup', {
    username,
    password,
    passwordConfirm,
  })
}

export const getSignupEnabled = () => {
  return http.get('/auth/signup-enabled')
}
