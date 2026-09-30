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
  return http.get('/auth/me')
}

export const signupUser = (username, password, passwordConfirm) => {
  return http.post('/auth/signup', {
    username,
    password,
    passwordConfirm,
  })
}
