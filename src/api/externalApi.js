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

export const createExternalApi = (requestData) => {
  return http.post('/externalApi/add', requestData)
}
