import http from './http'

export const getTransformResultList = (params) => {
  return http.get('/transform-result/list', { params })
}

export const getTransformResultDetail = (transformResultId) => {
  return http.get('/transform-result/detail', {
    params: { transformResultId },
  })
}
