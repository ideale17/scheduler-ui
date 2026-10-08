import http from './http'

export const getExternalApiList = () => {
  return http.get('/external-api/list')
}

export const getExternalApi = (externalApiId) => {
  return http.get('/external-api/detail', {
    params: {
      externalApiId,
    },
  })
}

export const getExternalApiParams = (externalApiId) => {
  return http.get('/external-api/params', {
    params: {
      externalApiId,
    },
  })
}

// External API 페이징 설정 조회
export const getExternalApiPaging = (externalApiId) => {
  return http.get('/external-api/paging', {
    params: {
      externalApiId,
    },
  })
}

export const executeExternalApi = (externalApiId) => {
  return http.post('/external-api/execute', null, {
    params: {
      externalApiId,
    },
  })
}

export const createExternalApi = (requestData) => {
  return http.post('/external-api/add', requestData)
}

// External API 기본 정보 수정
export const updateExternalApiBasic = (externalApiId, basic) => {
  return http.put('/external-api/basic', basic, {
    params: {
      externalApiId,
    },
  })
}

// External API 인증 정보 수정
export const updateExternalApiAuth = (externalApiId, auth) => {
  return http.put('/external-api/auth', auth, {
    params: {
      externalApiId,
    },
  })
}

// External API 파라미터 수정
export const updateExternalApiParams = (externalApiId, params) => {
  return http.put('/external-api/params', params, {
    params: {
      externalApiId,
    },
  })
}

// External API 페이징 설정 저장
export const saveExternalApiPaging = (externalApiId, paging) => {
  return http.put('/external-api/paging', paging, {
    params: {
      externalApiId,
    },
  })
}

export const deleteExternalApi = (externalApiId) => {
  return http.delete('/external-api/delete', {
    params: {
      externalApiId,
    },
  })
}

// External API 페이징 설정 삭제
export const deleteExternalApiPaging = (externalApiId) => {
  return http.delete('/external-api/paging', {
    params: {
      externalApiId,
    },
  })
}
