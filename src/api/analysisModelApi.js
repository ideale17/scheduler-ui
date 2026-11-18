import http from './http'

// 검색조건을 기준으로 데이터 적재 모델 목록 조회
export const getAnalysisModelList = (searchParams = {}) => {
  return http.get('/analysis-model/list', {
    params: searchParams,
  })
}

// 데이터 적재 모델 현재 버전 상세 조회
export const getAnalysisModelDetail = (analysisModelId) => {
  return http.get('/analysis-model/detail', {
    params: { analysisModelId },
  })
}

// 데이터 적재 모델 전체 버전 이력 조회
export const getAnalysisModelVersionList = (analysisModelId) => {
  return http.get('/analysis-model/versions', {
    params: { analysisModelId },
  })
}

// 선택한 데이터 적재 모델 버전의 상세 조회
export const getAnalysisModelVersionDetail = (analysisModelId, analysisModelVersionId) => {
  return http.get('/analysis-model/version/detail', {
    params: { analysisModelId, analysisModelVersionId },
  })
}

// 대상 업무 테이블의 실제 컬럼 정보 조회
export const getAnalysisTargetColumns = (targetSchema, targetTable) => {
  return http.get('/analysis-model/target-columns', {
    params: { targetSchema, targetTable },
  })
}

// 데이터 적재 모델 등록
export const createAnalysisModel = (requestData) => {
  return http.post('/analysis-model/add', requestData)
}

// 데이터 적재 모델 수정
export const updateAnalysisModel = (analysisModelId, requestData) => {
  return http.put('/analysis-model/update', requestData, {
    params: { analysisModelId },
  })
}
