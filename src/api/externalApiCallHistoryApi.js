import http from './http'

export const getExternalApiCallHistory = (params) => {
  return http.get('/external-api/call-history', { params })
}

export const getExternalApiCallHistoryDetail = (executionId) => {
  return http.get('/external-api/call-history/detail', {
    params: { executionId },
  })
}

// HTTP 호출 시도 한 건의 요청 및 응답 상세 정보를 조회한다.
export const getExternalApiCallAttemptDetail = (apiCallLogId) => {
  return http.get('/external-api/call-history/attempt-detail', {
    params: { apiCallLogId },
  })
}
