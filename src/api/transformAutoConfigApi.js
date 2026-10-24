import http from './http'

// External API에 연결된 자동 가공 규칙 목록 조회
export const getTransformAutoConfigList = (externalApiId) => {
  return http.get('/transform-auto-config/list', {
    params: {
      externalApiId,
    },
  })
}

// External API 자동 가공 규칙 연결 설정 저장
export const updateTransformAutoConfigs = (externalApiId, configs) => {
  return http.put(
    '/transform-auto-config/update',
    { configs },
    {
      params: {
        externalApiId,
      },
    },
  )
}
