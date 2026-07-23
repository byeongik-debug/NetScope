import * as Network from 'expo-network';
import { DiagnosticResult, QualityLevel } from '../types/diagnostic';

const TARGET =
  process.env.EXPO_PUBLIC_DIAGNOSTIC_URL ??
  'https://www.cloudflare.com/cdn-cgi/trace';

const timeoutFetch = async (url: string, timeoutMs = 3500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const started = performance.now();
    await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return Math.round(performance.now() - started);
  } finally {
    clearTimeout(timer);
  }
};

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const qualityLevel = (score: number): QualityLevel => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 55) return 'fair';
  return 'poor';
};

const explain = (latency: number, jitter: number, loss: number) => {
  if (loss >= 20) return '요청 손실이 높아 연결 안정성을 확인해야 합니다.';
  if (jitter >= 35) return '응답 편차가 커 실시간 통화가 끊길 수 있습니다.';
  if (latency >= 180) return '서버 응답이 느립니다. 네트워크 경로를 확인하세요.';
  if (latency >= 90) return '일반 사용은 가능하지만 실시간 작업은 지연될 수 있습니다.';
  return '현재 연결은 안정적이며 실시간 작업에 적합합니다.';
};

export async function runDiagnostic(): Promise<DiagnosticResult> {
  const state = await Network.getNetworkStateAsync();
  const samples: number[] = [];
  let failures = 0;

  const dnsStarted = performance.now();
  try {
    await timeoutFetch(TARGET, 4000);
  } catch {
    failures += 1;
  }
  const dnsTime = Math.round(performance.now() - dnsStarted);

  for (let index = 0; index < 8; index += 1) {
    try {
      samples.push(await timeoutFetch(TARGET));
    } catch {
      failures += 1;
    }
  }

  const latency = Math.round(average(samples));
  const differences = samples.slice(1).map((value, index) =>
    Math.abs(value - (samples[index] ?? value)),
  );
  const jitter = Math.round(average(differences));
  const loss = Math.round((failures / 9) * 100);

  const latencyPenalty = Math.min(42, latency * 0.16);
  const jitterPenalty = Math.min(28, jitter * 0.55);
  const lossPenalty = Math.min(45, loss * 1.7);
  const score = Math.max(0, Math.round(100 - latencyPenalty - jitterPenalty - lossPenalty));

  return {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    networkType: state.type === Network.NetworkStateType.WIFI ? 'Wi-Fi' :
      state.type === Network.NetworkStateType.CELLULAR ? '셀룰러' : '기타 네트워크',
    isConnected: Boolean(state.isConnected && state.isInternetReachable !== false),
    latency,
    jitter,
    loss,
    dnsTime,
    score,
    level: qualityLevel(score),
    summary: explain(latency, jitter, loss),
    samples,
  };
}
