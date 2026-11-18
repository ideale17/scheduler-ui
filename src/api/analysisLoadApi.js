import http from './http'

// 적재 모델 정보와 적재 대상 목록 조회
export const getAnalysisLoadList = (searchParams) => {
  return http.get('/analysis-load/list', {
    params: searchParams,
  })
}

// 선택한 가공 결과를 데이터 적재 대기 작업으로 등록
export const createAnalysisLoadSources = (requestData) => {
  return http.post('/analysis-load/add', requestData)
}
