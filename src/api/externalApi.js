import http from './http'

export const getExternalApiList = () => {
  return http.get('/externalApi/list')
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

// External API 페이징 설정 조회
export const getExternalApiPaging = (externalApiId) => {
  return http.get('/externalApi/paging', {
    params: {
      externalApiId,
    },
  })
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

export const updateExternalApi = (externalApiId, requestData) => {
  return http.put('/externalApi/update', requestData, {
    params: {
      externalApiId,
    },
  })
}

// External API 기본 정보 수정
export const updateExternalApiBasic = (externalApiId, basic) => {
  return http.put('/externalApi/basic', basic, {
    params: {
      externalApiId,
    },
  })
}

// External API 인증 정보 수정
export const updateExternalApiAuth = (externalApiId, auth) => {
  return http.put('/externalApi/auth', auth, {
    params: {
      externalApiId,
    },
  })
}

// External API 파라미터 수정
export const updateExternalApiParams = (externalApiId, params) => {
  return http.put('/externalApi/params', params, {
    params: {
      externalApiId,
    },
  })
}

// External API 페이징 설정 저장
export const saveExternalApiPaging = (externalApiId, paging) => {
  return http.put('/externalApi/paging', paging, {
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

// External API 페이징 설정 삭제
export const deleteExternalApiPaging = (externalApiId) => {
  return http.delete('/externalApi/paging', {
    params: {
      externalApiId,
    },
  })
}
