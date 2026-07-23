export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export type DiagnosticResult = {
  id: string;
  createdAt: string;
  networkType: string;
  isConnected: boolean;
  latency: number;
  jitter: number;
  loss: number;
  dnsTime: number;
  score: number;
  level: QualityLevel;
  summary: string;
  samples: number[];
};
