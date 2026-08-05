import {request} from '../api/client';
import {AppUser, AuthResult, DashboardSummary, Device, DeviceCreate, DeviceUpdate, DiagnosticResult, FullDiagnosticResult, Incident, IncidentAction, MetricSample, NetworkEvent, OperationsAnalytics, SnmpConfig, SnmpTestResult} from '../types';

async function fallback<T>(operation: () => Promise<T>, local: T): Promise<T> {
  try { return await operation(); } catch { return local; }
}

const emptySummary: DashboardSummary = {
  networkStatus: 'Healthy',
  healthyDevices: 0,
  faultyDevices: 0,
  averageCpu: 0,
  averageMemory: 0,
  averagePacketLoss: 0,
  averageLatency: 0
};

export const networkService = {
  login: (email: string, password: string) => request<AuthResult>('/api/v1/auth/login', {method: 'POST', body: JSON.stringify({email, password})}),
  getSummary: () => fallback(() => request<DashboardSummary>('/api/v1/dashboard'), emptySummary),
  getDevices: () => fallback(() => request<Device[]>('/api/v1/devices'), []),
  getDevice: (id: number) => request<Device>(`/api/v1/devices/${id}`),
  addDevice: (payload: DeviceCreate) => request<Device>('/api/v1/devices', {method: 'POST', body: JSON.stringify(payload)}),
  updateDevice: (id: number, payload: DeviceUpdate) => request<Device>(`/api/v1/devices/${id}`, {method: 'PATCH', body: JSON.stringify(payload)}),
  deleteDevice: (id: number) => request<void>(`/api/v1/devices/${id}`, {method: 'DELETE'}),
  diagnoseDevice: (id: number) => request<DiagnosticResult>(`/api/v1/devices/${id}/diagnose`, {method: 'POST'}),
  getMetrics: (id: number, limit = 30) => request<MetricSample[]>(`/api/v1/devices/${id}/metrics?limit=${limit}`),
  configureSnmp: (id: number, payload: SnmpConfig) => request<Device>(`/api/v1/devices/${id}/snmp`, {method: 'PUT', body: JSON.stringify(payload)}),
  testSnmp: (id: number, payload: SnmpConfig) => request<SnmpTestResult>(`/api/v1/devices/${id}/snmp/test`, {method: 'POST', body: JSON.stringify(payload)}),
  runFullDiagnostic: (id: number) => request<FullDiagnosticResult>(`/api/v1/devices/${id}/diagnostics/full`, {method: 'POST'}),
  getEvents: () => fallback(() => request<NetworkEvent[]>('/api/v1/events'), []),
  getIncidents: () => fallback(() => request<Incident[]>('/api/v1/incidents'), []),
  getUsers: () => request<AppUser[]>('/api/v1/auth/users'),
  getIncidentActions: (id: number) => request<IncidentAction[]>(`/api/v1/incidents/${id}/actions`),
  updateIncidentWorkflow: (id: number, payload: {status: Incident['status']; assignedToId?: number; note?: string}) => request<Incident>(`/api/v1/incidents/${id}/workflow`, {method: 'PATCH', body: JSON.stringify(payload)}),
  getOperationsAnalytics: () => fallback(() => request<OperationsAnalytics>('/api/v1/analytics/operations'), {incidents24h: 0, openIncidents: 0, resolved24h: 0, meanTimeToResolve: 0, availability: 100}),
  resolveIncident: (id: number) => request<Incident>(`/api/v1/incidents/${id}/resolve`, {method: 'POST'})
  ,acknowledgeIncident: (id: number, note?: string) => request<Incident>(`/api/v1/incidents/${id}/acknowledge`, {method: 'POST', body: JSON.stringify({note})})
  ,addIncidentNote: (id: number, note: string) => request(`/api/v1/incidents/${id}/notes`, {method: 'POST', body: JSON.stringify({note})})
};
