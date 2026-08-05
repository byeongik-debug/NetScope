import {Ionicons} from '@expo/vector-icons';
import React, {useEffect, useState} from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {clientDiagnosticService} from '../../services/clientDiagnosticService';
import {ClientDiagnostic, DiagnosticSegmentStatus, DiagnosticSymptom} from '../../types';

const symptoms: Array<{key: DiagnosticSymptom; icon: keyof typeof Ionicons.glyphMap; label: string}> = [
  {key: 'no_internet', icon: 'cloud-offline-outline', label: '인터넷이 안 돼요'},
  {key: 'slow', icon: 'speedometer-outline', label: '인터넷이 느려요'},
  {key: 'video_call', icon: 'videocam-outline', label: '영상통화가 끊겨요'},
  {key: 'gaming', icon: 'game-controller-outline', label: '게임이 끊겨요'},
  {key: 'specific_site', icon: 'globe-outline', label: '특정 사이트만 안 돼요'},
  {key: 'wifi_disconnects', icon: 'wifi-outline', label: 'Wi-Fi가 자주 끊겨요'},
];

const statusMeta: Record<DiagnosticSegmentStatus, {color: string; icon: keyof typeof Ionicons.glyphMap; label: string}> = {
  healthy: {color: colors.success, icon: 'checkmark-circle', label: '정상'},
  degraded: {color: colors.warning, icon: 'alert-circle', label: '주의'},
  failed: {color: colors.danger, icon: 'close-circle', label: '실패'},
};

export function MyNetworkDiagnosticScreen() {
  const [symptom, setSymptom] = useState<DiagnosticSymptom>();
  const [result, setResult] = useState<ClientDiagnostic>();
  const [beforeResult, setBeforeResult] = useState<ClientDiagnostic>();
  const [history, setHistory] = useState<ClientDiagnostic[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [comparisonFirst, setComparisonFirst] = useState<ClientDiagnostic>();
  const [comparisonPhase, setComparisonPhase] = useState<'idle' | 'switch' | 'done'>('idle');
  const [comparisonId, setComparisonId] = useState<string>();

  const loadHistory = async () => {
    try { setHistory(await clientDiagnosticService.history()); } catch { setHistory([]); }
  };
  useEffect(() => { loadHistory(); }, []);

  const measure = async (comparison?: {id: string; role: 'first' | 'second'}) => {
    if (!symptom) {
      setError('먼저 현재 겪고 있는 증상을 선택해 주세요.');
      return undefined;
    }
    setBusy(true);
    setError('');
    setCompletedSteps([]);
    setProgress('연결 상태 확인');
    setProgressValue(0);
    try {
      const next = await clientDiagnosticService.run(symptom, (stage, value) => {
        setProgress(stage);
        setProgressValue(value);
      }, comparison);
      setResult(next);
      await loadHistory();
      return next;
    } catch (cause) {
      setError(`진단 실패: ${(cause as Error).message}`);
      return undefined;
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const run = async () => {
    setComparisonFirst(undefined);
    setComparisonId(undefined);
    setComparisonPhase('idle');
    setBeforeResult(result ?? history.at(-1));
    await measure();
  };

  const startComparison = async () => {
    if (!symptom) {
      setError('먼저 비교할 증상을 선택해 주세요.');
      return;
    }
    setComparisonFirst(undefined);
    setComparisonPhase('idle');
    setBeforeResult(undefined);
    const nextComparisonId = `compare-${Date.now()}`;
    setComparisonId(nextComparisonId);
    const first = await measure({id: nextComparisonId, role: 'first'});
    if (first) {
      setComparisonFirst(first);
      setComparisonPhase('switch');
    }
  };

  const finishComparison = async () => {
    if (!comparisonId) return;
    const second = await measure({id: comparisonId, role: 'second'});
    if (!second || !comparisonFirst) return;
    const verdict = compareConnections(comparisonFirst, second);
    if (second.id) {
      try {
        const updated = await clientDiagnosticService.updateSession(second.id, {comparisonVerdict: `${verdict.title} ${verdict.description} ${verdict.action}`});
        setResult({...second, comparisonVerdict: updated.comparisonVerdict});
      } catch {}
    }
    setComparisonPhase('done');
  };

  const toggleAction = async (index: number) => {
    const next = completedSteps.includes(index) ? completedSteps.filter(value => value !== index) : [...completedSteps, index];
    setCompletedSteps(next);
    if (result?.id) {
      try { await clientDiagnosticService.updateSession(result.id, {completedActions: next}); } catch {}
    }
  };

  const share = async () => {
    if (!result) return;
    const segmentLines = result.segments?.map(item => `${item.label}: ${statusMeta[item.status].label} (${item.detail})`).join('\n') ?? '';
    await Share.share({message: `NetScope 네트워크 진단\n상태: ${result.riskLevel} · ${result.qualityScore}/100\n연결: ${result.connectionType}\n${segmentLines}\nLatency: ${result.latency}ms (P95 ${result.p95Latency}ms)\nJitter: ${result.jitter}ms\n실패율: ${result.failureRate}%\n다운로드: ${result.downloadMbps}Mbps\n원인: ${result.rootCause}\n조치: ${result.recommendedAction}`});
  };

  const riskColor = result?.riskLevel === '정상' ? colors.success : result?.riskLevel === '주의' ? colors.warning : colors.danger;
  const scoreDiff = result && beforeResult ? result.qualityScore - beforeResult.qualityScore : undefined;
  const comparison = comparisonFirst && result && comparisonPhase === 'done'
    ? compareConnections(comparisonFirst, result)
    : undefined;

  return <Screen>
    <View style={styles.titleBlock}>
      <View style={styles.eyebrow}><View style={styles.brandMark}><Ionicons name="pulse" size={14} color={colors.primarySoft} /></View><AppText variant="caption" style={{color: colors.primarySoft}}>GUIDED DIAGNOSIS</AppText></View>
      <AppText variant="title">네트워크 진단</AppText>
      <AppText style={styles.muted}>현재 겪는 문제를 선택하면 필요한 항목만 순서대로 확인합니다.</AppText>
    </View>

    <View style={styles.symptomGrid}>
      {symptoms.map(item => {
        const selected = symptom === item.key;
        return <Pressable key={item.key} disabled={busy} onPress={() => {setSymptom(item.key); setError('');}} style={[styles.symptom, selected && styles.symptomSelected]}>
          <View style={[styles.symptomIcon, selected && styles.symptomIconSelected]}><Ionicons name={item.icon} size={21} color={selected ? colors.background : colors.textMuted} /></View>
          <AppText variant="label" numberOfLines={2} style={selected && {color: colors.primarySoft}}>{item.label}</AppText>
          {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.selectedCheck} />}
        </Pressable>;
      })}
    </View>

    {busy && <Card style={styles.running}>
      <View style={styles.scanner}><Ionicons name="pulse" size={30} color={colors.primary} /></View>
      <AppText variant="heading">네트워크 경로를 확인하고 있어요</AppText>
      <AppText variant="caption">{progress}</AppText>
      <View style={styles.progressTrack}><View style={[styles.progressFill, {width: `${Math.round(progressValue * 100)}%`}]} /></View>
      <AppText variant="caption">{Math.round(progressValue * 100)}%</AppText>
    </Card>}

    {!!error && <Card style={styles.error}><Ionicons name="alert-circle-outline" size={20} color={colors.danger} /><AppText style={{color: colors.danger, flex: 1}}>{error}</AppText></Card>}

    {comparisonPhase === 'switch' && comparisonFirst && !busy && <Card style={styles.switchCard}>
      <View style={styles.switchIcon}><Ionicons name="swap-horizontal" size={28} color={colors.primary} /></View>
      <View style={{gap: spacing.xs}}>
        <AppText variant="heading">1차 측정 완료 · {networkLabel(comparisonFirst.connectionType)}</AppText>
        <AppText style={styles.muted}>제어 센터에서 {isWifi(comparisonFirst.connectionType) ? 'Wi-Fi를 끄고 모바일 데이터로' : 'Wi-Fi를 켜고 해당 네트워크로'} 전환한 뒤 앱으로 돌아오세요.</AppText>
      </View>
      <View style={styles.firstSummary}><Detail label="점수" value={`${comparisonFirst.qualityScore}`} /><Detail label="지연" value={`${comparisonFirst.latency}ms`} /><Detail label="지터" value={`${comparisonFirst.jitter}ms`} /><Detail label="속도" value={`${comparisonFirst.downloadMbps}M`} /></View>
      <Pressable onPress={finishComparison} style={styles.button}><Ionicons name="cellular-outline" size={19} color={colors.background} /><AppText variant="label" style={{color: colors.background}}>전환 완료 · 2차 측정</AppText></Pressable>
      <Pressable onPress={() => {setComparisonPhase('idle'); setComparisonFirst(undefined);}} style={styles.cancel}><AppText variant="label" style={{color: colors.textMuted}}>비교 취소</AppText></Pressable>
    </Card>}

    {result && !busy && comparisonPhase !== 'switch' && <>
      {comparison && <Card style={[styles.comparisonCard, {borderColor: comparison.color}]}>
        <View style={styles.comparisonTitle}><View style={[styles.comparisonIcon, {backgroundColor: `${comparison.color}18`}]}><Ionicons name={comparison.icon} size={23} color={comparison.color} /></View><View style={{flex: 1, gap: 2}}><AppText variant="heading">{comparison.title}</AppText><AppText variant="caption">{comparison.description}</AppText></View></View>
        <View style={styles.connectionColumns}>
          <ConnectionResult label={`1차 · ${networkLabel(comparisonFirst!.connectionType)}`} item={comparisonFirst!} winner={comparison.winner === 'first'} />
          <View style={styles.vs}><AppText variant="label" style={{color: colors.textMuted}}>VS</AppText></View>
          <ConnectionResult label={`2차 · ${networkLabel(result.connectionType)}`} item={result} winner={comparison.winner === 'second'} />
        </View>
        <AppText style={styles.muted}>{comparison.action}</AppText>
      </Card>}
      <Card style={[styles.score, {borderColor: riskColor}]}>
        <View style={styles.scoreTop}><View style={[styles.risk, {backgroundColor: `${riskColor}18`}]}><AppText variant="label" style={{color: riskColor}}>{result.riskLevel}</AppText></View><AppText variant="caption">{result.connectionType}</AppText></View>
        <View style={styles.scoreLine}><AppText variant="title" style={styles.scoreNumber}>{result.qualityScore}</AppText><AppText variant="heading" style={styles.outOf}>/ 100</AppText></View>
        <AppText variant="heading">{result.rootCause}</AppText>
        <AppText style={styles.muted}>{result.recommendedAction}</AppText>
        {scoreDiff !== undefined && <View style={styles.compare}><Ionicons name={scoreDiff >= 0 ? 'trending-up' : 'trending-down'} size={18} color={scoreDiff >= 0 ? colors.success : colors.warning} /><AppText variant="caption">조치 전보다 {Math.abs(scoreDiff)}점 {scoreDiff >= 0 ? '개선됐어요' : '낮아졌어요'}</AppText></View>}
      </Card>

      <View style={styles.sectionHead}><AppText variant="heading">문제 구간</AppText><AppText variant="caption">아이폰에서 서버까지</AppText></View>
      <Card style={styles.pathCard}>
        {result.segments?.map((segment, index) => {
          const meta = statusMeta[segment.status];
          return <View key={segment.key}>
            <View style={styles.segment}>
              <View style={[styles.segmentIcon, {backgroundColor: `${meta.color}18`}]}><Ionicons name={meta.icon} size={21} color={meta.color} /></View>
              <View style={{flex: 1, gap: 2}}><AppText variant="label">{segment.label}</AppText><AppText variant="caption">{segment.detail}</AppText></View>
              <AppText variant="label" style={{color: meta.color}}>{meta.label}</AppText>
            </View>
            {index < (result.segments?.length ?? 0) - 1 && <View style={styles.connector} />}
          </View>;
        })}
      </Card>

      <View style={styles.grid}>
        <Metric icon="timer-outline" label="평균 지연" value={`${result.latency} ms`} good={result.latency < 100} />
        <Metric icon="pulse-outline" label="지터" value={`${result.jitter} ms`} good={result.jitter < 30} />
        <Metric icon="close-circle-outline" label="실패율" value={`${result.failureRate}%`} good={result.failureRate < 5} />
        <Metric icon="download-outline" label="다운로드" value={`${result.downloadMbps} Mbps`} good={result.downloadMbps >= 5} />
      </View>

      <Card style={styles.detailCard}>
        <View style={styles.sectionHead}><AppText variant="heading">지연 상세</AppText><AppText variant="caption">12회 반복 측정</AppText></View>
        <View style={styles.latencyRow}><Detail label="최소" value={`${result.minLatency}ms`} /><Detail label="평균" value={`${result.latency}ms`} /><Detail label="P95" value={`${result.p95Latency}ms`} /><Detail label="최대" value={`${result.maxLatency}ms`} /></View>
      </Card>

      <View style={styles.sectionHead}><AppText variant="heading">추천 조치</AppText><AppText variant="caption">{completedSteps.length}/{result.actionSteps?.length ?? 0} 완료</AppText></View>
      <Card style={styles.actionCard}>
        {result.actionSteps?.map((step, index) => {
          const done = completedSteps.includes(index);
          return <Pressable key={step} onPress={() => toggleAction(index)} style={styles.action}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={done ? colors.success : colors.textMuted} />
            <AppText style={[{flex: 1}, done && styles.done]}>{step}</AppText>
          </Pressable>;
        })}
        {!!completedSteps.length && <Pressable onPress={run} style={styles.retest}><Ionicons name="refresh" size={18} color={colors.background} /><AppText variant="label" style={{color: colors.background}}>조치 후 다시 진단</AppText></Pressable>}
      </Card>

      <View style={styles.utilityRow}>
        <Pressable onPress={share} style={styles.utility}><Ionicons name="share-outline" size={18} color={colors.primary} /><AppText variant="label" style={{color: colors.primary}}>리포트 공유</AppText></Pressable>
        <Pressable onPress={() => {setResult(undefined); setSymptom(undefined); setCompletedSteps([]); setComparisonFirst(undefined); setComparisonId(undefined); setComparisonPhase('idle');}} style={styles.utility}><Ionicons name="add-outline" size={20} color={colors.text} /><AppText variant="label">새 진단</AppText></Pressable>
      </View>
    </>}

    {!busy && comparisonPhase !== 'switch' && <>
      <Pressable onPress={run} style={[styles.button, !symptom && styles.buttonDisabled]}>
        <Ionicons name={result ? 'refresh' : 'scan-outline'} size={19} color={colors.background} />
        <AppText variant="label" style={{color: colors.background}}>{result ? '같은 증상 다시 진단' : '선택한 증상 진단하기'}</AppText>
      </Pressable>
      <Pressable onPress={startComparison} style={[styles.compareButton, !symptom && styles.buttonDisabled]}>
        <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
        <View><AppText variant="label" style={{color: colors.primary}}>Wi-Fi · 모바일 비교 진단</AppText><AppText variant="caption">두 연결을 직접 측정해 문제 구간을 구분해요</AppText></View>
      </Pressable>
    </>}
  </Screen>;
}

function Metric({icon, label, value, good}: {icon: keyof typeof Ionicons.glyphMap; label: string; value: string; good: boolean}) {
  return <Card style={styles.metric}><View style={styles.metricHead}><Ionicons name={icon} size={18} color={good ? colors.success : colors.warning} /><AppText variant="caption">{label}</AppText></View><AppText variant="heading">{value}</AppText></Card>;
}
function Detail({label, value}: {label: string; value: string}) {
  return <View style={styles.detail}><AppText variant="caption">{label}</AppText><AppText variant="label">{value}</AppText></View>;
}

function ConnectionResult({label, item, winner}: {label: string; item: ClientDiagnostic; winner: boolean}) {
  return <View style={[styles.connectionResult, winner && styles.connectionWinner]}>
    <AppText variant="label" style={winner && {color: colors.success}}>{label}</AppText>
    <AppText variant="title" style={styles.connectionScore}>{item.qualityScore}</AppText>
    <AppText variant="caption">{item.latency}ms · {item.downloadMbps}M</AppText>
    {winner && <View style={styles.winnerBadge}><Ionicons name="checkmark" size={12} color={colors.background} /><AppText variant="caption" style={{color: colors.background}}>더 안정적</AppText></View>}
  </View>;
}

const isWifi = (type: string) => type.toUpperCase().includes('WIFI');
const networkLabel = (type: string) => isWifi(type) ? 'Wi-Fi' : type.toUpperCase().includes('CELLULAR') ? '모바일 데이터' : type;

function compareConnections(first: ClientDiagnostic, second: ClientDiagnostic) {
  const sameType = isWifi(first.connectionType) === isWifi(second.connectionType);
  const scoreDifference = second.qualityScore - first.qualityScore;
  const winner = Math.abs(scoreDifference) < 5 ? 'tie' as const : scoreDifference > 0 ? 'second' as const : 'first' as const;
  if (sameType) return {
    color: colors.warning,
    icon: 'alert-circle-outline' as const,
    title: '네트워크 전환이 확인되지 않았어요',
    description: `두 측정 모두 ${networkLabel(second.connectionType)}에서 실행됐습니다.`,
    action: 'Wi-Fi와 모바일 데이터가 동시에 켜져 있다면 Wi-Fi를 완전히 끈 뒤 다시 비교하세요.',
    winner: 'tie' as const,
  };
  if (winner === 'tie') return {
    color: colors.success,
    icon: 'git-compare-outline' as const,
    title: '두 연결의 품질이 비슷해요',
    description: `점수 차이는 ${Math.abs(scoreDifference)}점입니다.`,
    action: '문제가 계속된다면 연결 방식보다 특정 서비스나 시간대 혼잡을 확인하세요.',
    winner,
  };
  const better = winner === 'first' ? first : second;
  const worse = winner === 'first' ? second : first;
  const wifiIsWorse = isWifi(worse.connectionType);
  return {
    color: colors.primary,
    icon: wifiIsWorse ? 'wifi-outline' as const : 'cellular-outline' as const,
    title: wifiIsWorse ? 'Wi-Fi 환경 문제 가능성이 높아요' : '모바일 네트워크 품질이 더 낮아요',
    description: `${networkLabel(better.connectionType)}가 ${Math.abs(scoreDifference)}점 더 안정적입니다.`,
    action: wifiIsWorse
      ? '공유기 가까이 이동하고 5GHz Wi-Fi 사용, 공유기 재부팅 또는 채널 혼잡 점검을 권장합니다.'
      : 'Wi-Fi를 우선 사용하고 장소 이동 또는 통신사 장애 여부 확인을 권장합니다.',
    winner,
  };
}

const styles = StyleSheet.create({
  titleBlock: {gap: spacing.xs, paddingVertical: spacing.md},
  eyebrow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs},
  brandMark: {width: 26, height: 26, borderRadius: 9, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'},
  muted: {color: colors.textMuted},
  symptomGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm},
  symptom: {width: '48.7%', minHeight: 112, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between', gap: spacing.sm},
  symptomSelected: {borderColor: colors.primary, backgroundColor: colors.primaryMuted},
  selectedCheck: {position: 'absolute', right: 12, top: 12},
  symptomIcon: {width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center'},
  symptomIconSelected: {backgroundColor: colors.primary},
  running: {alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl},
  scanner: {width: 66, height: 66, borderRadius: 33, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'},
  progressTrack: {width: '100%', height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden'},
  progressFill: {height: 8, borderRadius: radius.pill, backgroundColor: colors.primary},
  error: {borderColor: colors.danger, flexDirection: 'row', gap: spacing.sm, alignItems: 'center'},
  switchCard: {gap: spacing.md, borderColor: colors.primary, padding: spacing.lg},
  switchIcon: {width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'},
  firstSummary: {flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised},
  cancel: {height: 40, alignItems: 'center', justifyContent: 'center'},
  comparisonCard: {gap: spacing.lg, padding: spacing.lg},
  comparisonTitle: {flexDirection: 'row', gap: spacing.md, alignItems: 'center'},
  comparisonIcon: {width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  connectionColumns: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  connectionResult: {flex: 1, alignItems: 'center', gap: 4, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: 'transparent'},
  connectionWinner: {borderColor: colors.success},
  connectionScore: {fontSize: 34, lineHeight: 40},
  winnerBadge: {marginTop: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.success, flexDirection: 'row', gap: 3, alignItems: 'center'},
  vs: {width: 24, alignItems: 'center'},
  score: {gap: spacing.sm, padding: spacing.lg},
  scoreTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  risk: {borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6},
  scoreLine: {flexDirection: 'row', alignItems: 'baseline'},
  scoreNumber: {fontSize: 52, lineHeight: 60},
  outOf: {color: colors.textMuted},
  compare: {marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceRaised},
  sectionHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  pathCard: {paddingVertical: spacing.lg},
  segment: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  segmentIcon: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
  connector: {width: 2, height: 18, marginLeft: 20, backgroundColor: colors.border},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md},
  metric: {width: '48%', minHeight: 96, justifyContent: 'space-between'},
  metricHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  detailCard: {gap: spacing.lg},
  latencyRow: {flexDirection: 'row', justifyContent: 'space-between'},
  detail: {alignItems: 'center', gap: 3},
  actionCard: {gap: spacing.sm},
  action: {flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.sm},
  done: {color: colors.textMuted, textDecorationLine: 'line-through'},
  retest: {height: 48, marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.success, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center'},
  utilityRow: {flexDirection: 'row', gap: spacing.sm},
  utility: {flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center'},
  button: {height: 56, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center'},
  compareButton: {minHeight: 62, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center'},
  buttonDisabled: {opacity: 0.45},
});
