import * as Network from 'expo-network';
import {getAccessToken, getApiBaseUrl, request} from '../api/client';
import {ClientDiagnostic, DiagnosticSegment, DiagnosticSymptom} from '../types';

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
const deviation = (values: number[]) => {
  const mean = average(values);
  return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
};

const symptomActions: Record<DiagnosticSymptom, string> = {
  no_internet: '비행기 모드를 10초간 켰다가 끄고 Wi-Fi를 다시 연결하세요.',
  slow: '백그라운드 다운로드를 중지하고 공유기 가까이에서 다시 측정하세요.',
  video_call: '다른 기기의 사용량을 줄이고 5GHz Wi-Fi 또는 모바일 데이터를 비교하세요.',
  gaming: 'VPN을 끄고 공유기 가까이에서 5GHz Wi-Fi로 다시 측정하세요.',
  specific_site: '다른 사이트가 열리는지 확인한 뒤 해당 서비스 상태 또는 DNS 설정을 확인하세요.',
  wifi_disconnects: 'Wi-Fi 자동 연결을 다시 설정하고 공유기 전원과 설치 위치를 확인하세요.',
};

async function timedFetch(url: string, init?: RequestInit, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const started = performance.now();
  try {
    const response = await fetch(url, {...init, signal: controller.signal});
    return {ok: response.ok, latency: Math.round((performance.now() - started) * 10) / 10, response};
  } catch {
    return {ok: false, latency: 0, response: undefined};
  } finally {
    clearTimeout(timer);
  }
}

function buildAssessment(
  symptom: DiagnosticSymptom,
  latency: number,
  jitter: number,
  failureRate: number,
  downloadMbps: number,
  segments: DiagnosticSegment[],
) {
  let score = 100;
  score -= Math.min(45, Math.round(failureRate * 2));
  if (latency > 200) score -= 30; else if (latency > 100) score -= 20; else if (latency > 60) score -= 10;
  if (jitter > 60) score -= 25; else if (jitter > 30) score -= 15; else if (jitter > 15) score -= 7;
  if (downloadMbps < 1) score -= 25; else if (downloadMbps < 5) score -= 12;
  score = Math.max(0, score);

  const failed = segments.find(item => item.status === 'failed');
  const degraded = segments.find(item => item.status === 'degraded');
  let rootCause = '특이 장애 없음';
  let primaryAction = '현재 연결은 안정적입니다. 같은 위치와 시간대에서 주기적으로 비교해 보세요.';

  if (failed?.key === 'device') {
    score = Math.min(score, 20);
    rootCause = '아이폰 네트워크 연결 끊김';
    primaryAction = 'Wi-Fi 또는 모바일 데이터를 켜고 비행기 모드를 해제하세요.';
  } else if (failed?.key === 'internet') {
    score = Math.min(score, 35);
    rootCause = '인터넷 연결 끊김';
    primaryAction = '다른 앱도 연결되지 않는지 확인하고 공유기 또는 통신사 연결을 점검하세요.';
  } else if (failed?.key === 'dns') {
    score = Math.min(score, 60);
    rootCause = 'DNS 또는 외부 서비스 접근 이상';
    primaryAction = '다른 사이트 접속을 비교하고 VPN·Private Relay·DNS 설정을 확인하세요.';
  } else if (failed?.key === 'server') {
    score = Math.min(score, 65);
    rootCause = '진단 서버 응답 없음';
    primaryAction = 'NetScope 서버 주소와 실행 상태, 같은 Wi-Fi 연결 여부를 확인하세요.';
  } else if (failureRate >= 30) {
    rootCause = '인터넷 연결 불안정';
    primaryAction = 'Wi-Fi와 모바일 데이터를 전환해 어느 연결에서만 발생하는지 비교하세요.';
  } else if (failureRate >= 5) {
    rootCause = '요청 유실 발생';
    primaryAction = '공유기 가까이에서 재측정하고 네트워크 사용량을 확인하세요.';
  } else if (jitter >= 30) {
    rootCause = '높은 지터';
    primaryAction = '백그라운드 다운로드를 중지하고 Wi-Fi와 모바일 데이터를 비교하세요.';
  } else if (latency >= 100 || degraded?.key === 'server') {
    rootCause = '높은 지연';
    primaryAction = '다른 네트워크에서 재측정해 단말 연결과 서버 경로를 구분하세요.';
  } else if (downloadMbps < 5) {
    rootCause = '낮은 다운로드 속도';
    primaryAction = '공유기 가까이 이동하고 사용량이 적은 시간에 다시 측정하세요.';
  }

  const riskLevel = score >= 90 ? '정상' : score >= 70 ? '주의' : '위험';
  return {
    score,
    riskLevel,
    rootCause,
    recommendedAction: primaryAction,
    actionSteps: Array.from(new Set([primaryAction, symptomActions[symptom], '조치 후 다시 진단하여 점수 변화를 확인하세요.'])),
  };
}

export const clientDiagnosticService = {
  async run(
    symptom: DiagnosticSymptom,
    onProgress?: (stage: string, progress: number) => void,
    comparison?: {id: string; role: 'first' | 'second'},
  ): Promise<ClientDiagnostic> {
    const token = getAccessToken();
    if (!token) throw new Error('로그인이 필요합니다.');
    const headers = {Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store'};

    onProgress?.('아이폰 연결 상태 확인', 0.05);
    const initialNetwork = await Network.getNetworkStateAsync();
    const segments: DiagnosticSegment[] = [{
      key: 'device',
      label: '아이폰 연결',
      status: initialNetwork.isConnected ? 'healthy' : 'failed',
      detail: initialNetwork.isConnected ? `${String(initialNetwork.type).replace('NetworkStateType.', '')} 연결됨` : '네트워크에 연결되지 않음',
    }, {
      key: 'internet',
      label: '인터넷',
      status: initialNetwork.isInternetReachable === false ? 'failed' : initialNetwork.isInternetReachable == null ? 'degraded' : 'healthy',
      detail: initialNetwork.isInternetReachable === false ? '인터넷 도달 불가' : initialNetwork.isInternetReachable == null ? '도달성 확인 제한' : '인터넷 연결 확인',
    }];

    onProgress?.('외부 서비스와 이름 해석 확인', 0.1);
    const external = await timedFetch(`https://www.google.com/generate_204?t=${Date.now()}`, {cache: 'no-store'}, 5000);
    segments.push({
      key: 'dns',
      label: 'DNS · 외부 서비스',
      status: external.ok ? (external.latency > 1000 ? 'degraded' : 'healthy') : 'failed',
      latency: external.latency || undefined,
      detail: external.ok ? `이름 기반 HTTPS 응답 ${external.latency}ms` : '이름 기반 외부 HTTPS 요청 실패',
    });

    onProgress?.('측정 준비', 0.15);
    const availabilityProbe = await timedFetch(`${getApiBaseUrl()}/api/v1/client-diagnostics/pulse?warmup=${Date.now()}`, {headers}, 3000);
    const serverAvailable = availabilityProbe.ok;
    if (serverAvailable) {
      await timedFetch(`${getApiBaseUrl()}/api/v1/client-diagnostics/pulse?warmup=${Date.now()}-2`, {headers}, 3000);
    }

    const timings: number[] = [];
    let failures = serverAvailable ? 0 : 13;
    if (serverAvailable) {
      for (let index = 0; index < 12; index += 1) {
        onProgress?.(`서버 지연 측정 ${index + 1}/12`, 0.2 + index / 12 * 0.4);
        const probe = await timedFetch(`${getApiBaseUrl()}/api/v1/client-diagnostics/pulse?t=${Date.now()}-${index}`, {headers}, 4000);
        if (probe.ok && probe.response) {
          await probe.response.json();
          timings.push(probe.latency);
        } else {
          failures += 1;
        }
      }
    }

    onProgress?.('지터와 P95 계산', 0.65);
    const sorted = [...timings].sort((a, b) => a - b);
    const percentileIndex = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    onProgress?.('다운로드 속도 측정', 0.72);
    const downloadStarted = performance.now();
    let bytes = 0;
    if (serverAvailable) {
      const download = await timedFetch(`${getApiBaseUrl()}/api/v1/client-diagnostics/download?size_kb=512&t=${Date.now()}`, {headers}, 8000);
      if (download.ok && download.response) {
        bytes = (await download.response.arrayBuffer()).byteLength;
      } else {
        failures += 1;
      }
    }

    const downloadSeconds = Math.max((performance.now() - downloadStarted) / 1000, 0.001);
    const latency = Math.round(average(timings) * 10) / 10;
    const jitter = Math.round(deviation(timings) * 10) / 10;
    const failureRate = Math.round((failures / 13) * 1000) / 10;
    const downloadMbps = Math.round((bytes * 8 / downloadSeconds / 1_000_000) * 10) / 10;
    const serverStatus = failures >= 12 ? 'failed' : latency >= 200 || failureRate >= 10 ? 'degraded' : 'healthy';
    segments.push({
      key: 'server',
      label: 'NetScope 서버',
      status: serverStatus,
      latency: timings.length ? latency : undefined,
      detail: serverStatus === 'failed' ? '진단 서버 응답 없음' : `평균 ${latency}ms · 실패율 ${failureRate}%`,
    });

    onProgress?.('원인과 조치 분석', 0.9);
    const network = await Network.getNetworkStateAsync();
    const assessment = buildAssessment(symptom, latency, jitter, failureRate, downloadMbps, segments);
    const result: ClientDiagnostic = {
      connectionType: String(network.type).replace('NetworkStateType.', ''),
      latency,
      minLatency: Math.round((sorted[0] ?? 0) * 10) / 10,
      maxLatency: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
      p95Latency: Math.round((sorted[percentileIndex] ?? 0) * 10) / 10,
      jitter,
      failureRate,
      downloadMbps,
      qualityScore: assessment.score,
      riskLevel: assessment.riskLevel as ClientDiagnostic['riskLevel'],
      rootCause: assessment.rootCause,
      recommendedAction: assessment.recommendedAction,
      symptom,
      segments,
      actionSteps: assessment.actionSteps,
      completedActions: [],
      comparisonId: comparison?.id,
      comparisonRole: comparison?.role,
    };
    onProgress?.('완료', 1);
    try {
      return await request<ClientDiagnostic>('/api/v1/client-diagnostics', {method: 'POST', body: JSON.stringify(result)});
    } catch {
      return result;
    }
  },
  history: () => request<ClientDiagnostic[]>('/api/v1/client-diagnostics?limit=30'),
  detail: (id: number) => request<ClientDiagnostic>(`/api/v1/client-diagnostics/${id}`),
  updateSession: (id: number, changes: Pick<ClientDiagnostic, 'completedActions' | 'comparisonVerdict'>) =>
    request<ClientDiagnostic>(`/api/v1/client-diagnostics/${id}`, {method: 'PATCH', body: JSON.stringify(changes)}),
};
