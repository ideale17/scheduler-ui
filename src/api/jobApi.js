import http from './http'

export const createJob = (jobData) => {
  return http.post('/jobs/addJob', jobData)
}

export const getJobClasses = () => {
  return http.get('/jobs/jobClasses')
}
