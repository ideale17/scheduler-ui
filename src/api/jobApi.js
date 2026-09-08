import http from './http'

export const getJobList = () => {
  return http.get('/jobs/listJobs')
}

export const getJob = (jobName, jobGroup) => {
  return http.get('/jobs/getJob', {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const getJobClasses = () => {
  return http.get('/jobs/jobClasses')
}

export const createJob = (jobData) => {
  return http.post('/jobs/addJob', jobData)
}

export const updateJob = (jobData) => {
  return http.put('/jobs/updateJob', jobData)
}

export const deleteJob = (jobName, jobGroup) => {
  return http.delete('/jobs/deleteJob', {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const runJob = (jobName, jobGroup) => {
  return http.post('/jobs/runJob', null, {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const pauseJob = (jobName, jobGroup) => {
  return http.post('/jobs/pauseJob', null, {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const resumeJob = (jobName, jobGroup) => {
  return http.post('/jobs/resumeJob', null, {
    params: {
      jobName,
      jobGroup,
    },
  })
}
