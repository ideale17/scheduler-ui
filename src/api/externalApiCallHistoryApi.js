import http from './http'

export const getExternalApiCallHistory = (params) => {
  return http.get('/external-api/call-history', { params })
}

export const getExternalApiCallHistoryDetail = (executionId) => {
  return http.get('/external-api/call-history/detail', {
    params: { executionId },
  })
}
