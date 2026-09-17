import http from './http'

export const getExternalApiCallHistory = (params) => {
  return http.get('/externalApi/callHistory', { params })
}
