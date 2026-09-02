import http from './http'

export const createJob = (jobData) => {
  return http.post('/jobs/addJob', jobData)
}

export const getJobClasses = () => {
  return http.get('/jobs/jobClasses')
}

export const getJob = (jobName, jobGroup) => {
  return http.get('/jobs/getJob', {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const updateJob = (jobData) => {
  return http.put('/jobs/updateJob', jobData)
}
