import http from './http'

export const getDashboardInfo = () => {
  return http.get('/dashboard/info')
}
