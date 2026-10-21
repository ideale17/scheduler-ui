import http from './http'

export const getTransformResultList = (params) => {
  return http.get('/transform-result/list', { params })
}
