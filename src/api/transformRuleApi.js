import http from './http'

export const getTransformRuleList = () => {
  return http.get('/transform-rule/list')
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
