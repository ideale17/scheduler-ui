import http from './http'

export const getJobHistory = (params) => {
  return http.get('/jobs/history', { params })
}
