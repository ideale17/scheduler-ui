import http from './http'

export const getExternalApiList = () => {
  return http.get('/externalApi/list')
}

export const executeExternalApi = (externalApiId) => {
  return http.post('/externalApi/execute', null, {
    params: {
      externalApiId,
    },
  })
}
