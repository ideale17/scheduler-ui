import http from './http'

export const getJobList = () => {
  return http.get('/jobs/list')
}

export const getJob = (jobName, jobGroup) => {
  return http.get('/jobs/detail', {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const getJobClasses = () => {
  return http.get('/jobs/job-classes')
}

export const createJob = (jobData) => {
  return http.post('/jobs/add', jobData)
}

export const updateJob = (jobData) => {
  return http.put('/jobs/update', jobData)
}

export const deleteJob = (jobName, jobGroup) => {
  return http.delete('/jobs/delete', {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const runJob = (jobName, jobGroup) => {
  return http.post('/jobs/run', null, {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const runJobs = (jobs) => {
  return http.post('/jobs/run-batch', {
    jobs,
  })
}

export const pauseJob = (jobName, jobGroup) => {
  return http.post('/jobs/pause', null, {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const resumeJob = (jobName, jobGroup) => {
  return http.post('/jobs/resume', null, {
    params: {
      jobName,
      jobGroup,
    },
  })
}

export const pauseJobs = (jobs) => {
  return http.post('/jobs/pause-batch', {
    jobs,
  })
}

export const resumeJobs = (jobs) => {
  return http.post('/jobs/resume-batch', {
    jobs,
  })
}
