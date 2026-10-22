import http from './http'

export const createManualTransformTasks = (requestData) => {
  return http.post('/transform-task/add', requestData)
}

export const getTransformTaskHistory = (rawDataId) => {
  return http.get('/transform-task/history', {
    params: { rawDataId },
  })
}
