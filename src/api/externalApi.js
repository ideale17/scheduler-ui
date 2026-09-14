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

export const getExternalApi = (externalApiId) => {
  return http.get('/externalApi/detail', {
    params: {
      externalApiId,
    },
  })
}

export const getExternalApiParams = (externalApiId) => {
  return http.get('/externalApi/params', {
    params: {
      externalApiId,
    },
  })
}

export const updateExternalApi = (externalApiId, requestData) => {
  return http.put('/externalApi/update', requestData, {
    params: {
      externalApiId,
    },
  })
}

export const deleteExternalApi = (externalApiId) => {
  return http.delete('/externalApi/delete', {
    params: {
      externalApiId,
    },
  })
}
