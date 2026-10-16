import http from './http'

export const createManualTransformTasks = (requestData) => {
  return http.post('/transform-task/add', requestData)
}
