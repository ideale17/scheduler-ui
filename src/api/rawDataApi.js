import http from './http'

export const getRawDataList = (params) => {
  return http.get('/raw-data/list', { params })
}

export const getRawDataDetail = (rawDataId) => {
  return http.get('/raw-data/detail', {
    params: { rawDataId },
  })
}
