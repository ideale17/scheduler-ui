import http from './http'

// 검색조건을 기준으로 가공 규칙 목록 조회
export const getTransformRuleList = (searchParams = {}) => {
  return http.get('/transform-rule/list', {
    params: searchParams,
  })
}

export const getTransformRuleDetail = (transformRuleId) => {
  return http.get('/transform-rule/detail', {
    params: { transformRuleId },
  })
}

export const getTransformRuleVersionList = (transformRuleId) => {
  return http.get('/transform-rule/versions', {
    params: { transformRuleId },
  })
}

export const getTransformRuleVersionDetail = (transformRuleId, transformRuleVersionId) => {
  return http.get('/transform-rule/version/detail', {
    params: { transformRuleId, transformRuleVersionId },
  })
}

export const createTransformRule = (requestData) => {
  return http.post('/transform-rule/add', requestData)
}

export const previewTransformRule = (requestData) => {
  return http.post('/transform-rule/preview', requestData)
}
