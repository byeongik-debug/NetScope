import {request} from '../api/client';
import {ClientDiagnostic, WifiSurveyDetail, WifiSurveyPlacement, WifiSurveyPoint, WifiSurveyReport, WifiSurveySummary} from '../types';

export const wifiSurveyService = {
  list: () => request<WifiSurveySummary[]>('/api/v1/wifi-surveys'),
  create: (name: string) => request<WifiSurveyDetail>('/api/v1/wifi-surveys', {method: 'POST', body: JSON.stringify({name})}),
  detail: (id: number) => request<WifiSurveyDetail>(`/api/v1/wifi-surveys/${id}`),
  addPlacement: (surveyId: number, name: string) => request<WifiSurveyPlacement>(`/api/v1/wifi-surveys/${surveyId}/placements`, {method: 'POST', body: JSON.stringify({name})}),
  addPoint: (placementId: number, locationName: string, floor: string, diagnostic: ClientDiagnostic) => {
    if (!diagnostic.id) throw new Error('측정 결과가 서버에 저장되지 않았습니다. 서버 연결을 확인하세요.');
    return request<WifiSurveyPoint>(`/api/v1/wifi-survey-placements/${placementId}/points`, {method: 'POST', body: JSON.stringify({diagnosticId: diagnostic.id, locationName, floor})});
  },
  report: (surveyId: number) => request<WifiSurveyReport>(`/api/v1/wifi-surveys/${surveyId}/report`),
};
