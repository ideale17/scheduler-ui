import http from './http'

export const getSchedulerInfo = () => {
  return http.get('/scheduler/info')
}
