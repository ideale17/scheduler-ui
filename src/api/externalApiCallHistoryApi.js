import http from './http'

export const getExternalApiCallHistory = (params) => {
  return http.get('/externalApi/callHistory', { params })
}

export const getExternalApiCallHistoryDetail = (executionId) => {
  return http.get('/externalApi/callHistory/detail', {
    params: { executionId },
  })
}
