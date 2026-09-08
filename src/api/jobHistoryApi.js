import http from './http'

export const getJobHistory = (params) => {
  return http.get('/jobs/historyJobs', { params })
}
