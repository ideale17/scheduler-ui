import http from './http'

// 검색조건을 기준으로 AI 분석 대상 가공 결과 미리보기
export const getAiAnalysisPreview = (searchParams) => {
  return http.get('/ai-analysis/preview', {
    params: searchParams,
  })
}

// AI 분석 데이터셋 구성 정보 조회
export const getAiAnalysisDataset = (searchParams) => {
  return http.get('/ai-analysis/dataset', {
    params: searchParams,
  })
}
