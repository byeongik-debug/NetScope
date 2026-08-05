export type DeviceType = 'Router' | 'Switch' | 'Firewall' | 'Server' | 'Access Point';
export type DeviceStatus = 'Online' | 'Offline' | 'Warning';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Device {
  id: number;
  hostname: string;
  ip: string;
  type: DeviceType;
  status: DeviceStatus;
  cpu: number;
  memory: number;
  bandwidth: number;
  packetLoss: number;
  latency: number;
  monitorEnabled?: boolean;
  snmpEnabled?: boolean;
  snmpSysName?: string;
  snmpSysDescription?: string;
  snmpUptime?: number;
  lastSeen: string;
}

export interface DeviceCreate {
  hostname: string;
  ip: string;
  type: DeviceType;
}

export interface DiagnosticResult {
  deviceId: number;
  reachable: boolean;
  latency: number;
  packetLoss: number;
  jitter: number;
  checkedAt: string;
}

export interface MetricSample {
  id: number;
  deviceId: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  reachable: boolean;
  cpu: number;
  memory: number;
  bandwidth: number;
  measuredAt: string;
}

export interface SnmpConfig {
  enabled: boolean;
  community: string;
  port: number;
}

export interface SnmpTestResult {
  success: boolean;
  message: string;
  sysName?: string;
  sysDescription?: string;
  uptime: number;
  cpu: number;
  bandwidth: number;
}

export interface FullDiagnosticResult {
  deviceId: number;
  checkedAt: string;
  reachable: boolean;
  latency: number;
  packetLoss: number;
  jitter: number;
  ports: Array<{port: number; service: string; open: boolean; latency: number}>;
  http: Array<{url: string; reachable: boolean; statusCode?: number; latency: number}>;
  dnsReachable: boolean;
  dnsLatency: number;
  internetReachable: boolean;
  tracerouteHops: string[];
  qualityScore: number;
  riskLevel: '정상' | '주의' | '위험';
  rootCause: string;
  assessment: string;
  recommendedAction: string;
}

export interface AppUser {
  id: number;
  organizationId: number;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface AuthResult {
  accessToken: string;
  tokenType: string;
  user: AppUser;
}

export interface DeviceUpdate {
  hostname?: string;
  type?: DeviceType;
  monitorEnabled?: boolean;
}

export interface NetworkEvent {
  id: number;
  deviceId: number;
  deviceName: string;
  message: string;
  severity: Severity;
  occurredAt: string;
}

export interface Incident {
  id: number;
  deviceId: number;
  deviceName: string;
  problem: string;
  occurredAt: string;
  severity: Severity;
  probableCause: string;
  recommendedAction: string;
  status: 'Open' | 'Acknowledged' | 'In Progress' | 'Resolved';
  assignedToId?: number;
  acknowledgedAt?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface IncidentAction {
  id: number;
  incidentId: number;
  userId: number;
  userName: string;
  action: string;
  note?: string;
  createdAt: string;
}

export interface OperationsAnalytics {
  incidents24h: number;
  openIncidents: number;
  resolved24h: number;
  meanTimeToResolve: number;
  availability: number;
  unstableDevice?: string;
  topCause?: string;
}

export interface ClientDiagnostic {
  id?: number;
  connectionType: string;
  latency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  jitter: number;
  failureRate: number;
  downloadMbps: number;
  qualityScore: number;
  riskLevel: '정상' | '주의' | '위험';
  rootCause: string;
  recommendedAction: string;
  measuredAt?: string;
  symptom?: DiagnosticSymptom;
  segments?: DiagnosticSegment[];
  actionSteps?: string[];
  completedActions?: number[];
  comparisonId?: string;
  comparisonRole?: 'first' | 'second';
  comparisonVerdict?: string;
}

export type DiagnosticSymptom =
  | 'no_internet'
  | 'slow'
  | 'video_call'
  | 'gaming'
  | 'specific_site'
  | 'wifi_disconnects';

export type DiagnosticSegmentStatus = 'healthy' | 'degraded' | 'failed';

export interface DiagnosticSegment {
  key: 'device' | 'internet' | 'dns' | 'server';
  label: string;
  status: DiagnosticSegmentStatus;
  latency?: number;
  detail: string;
}

export interface WifiSurveySummary {
  id: number;
  name: string;
  createdAt: string;
  placementCount: number;
  measurementCount: number;
}

export interface WifiSurveyPoint {
  id: number;
  locationName: string;
  floor: string;
  measuredAt: string;
  diagnostic: ClientDiagnostic;
}

export interface WifiSurveyPlacement {
  id: number;
  name: string;
  createdAt: string;
  points: WifiSurveyPoint[];
}

export interface WifiSurveyDetail {
  id: number;
  name: string;
  createdAt: string;
  placements: WifiSurveyPlacement[];
}

export interface WifiSurveyRanking {
  placementId: number;
  name: string;
  measurementCount: number;
  averageScore: number;
  minimumScore: number;
  scoreDeviation: number;
  averageP95: number;
  averageFailureRate: number;
  placementScore: number;
}

export interface WifiSurveyReport {
  surveyId: number;
  recommendedPlacementId?: number;
  summary: string;
  comparison?: {
    baselineName: string;
    recommendedName: string;
    averageScoreDelta: number;
    minimumScoreDelta: number;
    p95ReductionPercent: number;
    deviationReductionPercent: number;
    confidence: '높음' | '보통' | '낮음';
    commonLocationCount: number;
    baselineLocationCount: number;
    afterLocationCount: number;
  };
  locationComparisons: Array<{
    floor: string;
    locationName: string;
    beforeSampleCount: number;
    afterSampleCount: number;
    beforeScore: number;
    afterScore: number;
    scoreDelta: number;
    beforeP95: number;
    afterP95: number;
    p95Delta: number;
    beforeJitter: number;
    afterJitter: number;
    beforeFailureRate: number;
    afterFailureRate: number;
  }>;
  rankings: WifiSurveyRanking[];
}

export interface DashboardSummary {
  networkStatus: 'Healthy' | 'Degraded' | 'Critical';
  healthyDevices: number;
  faultyDevices: number;
  averageCpu: number;
  averageMemory: number;
  averagePacketLoss: number;
  averageLatency: number;
}
