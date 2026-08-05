export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  DeviceDetail: {deviceId: number};
  AddDevice: undefined;
  EditDevice: {deviceId: number};
  SnmpSettings: {deviceId: number};
  FullDiagnostic: {deviceId: number};
  MyNetworkDiagnostic: undefined;
  IncidentDetail: {incidentId: number};
  ClientDiagnosticDetail: {diagnosticId: number};
  WifiSurveyList: undefined;
  WifiSurveyDetail: {surveyId: number};
};
export type MainTabParamList = {Home: undefined; Diagnose: undefined; History: undefined; Insights: undefined; Settings: undefined};
