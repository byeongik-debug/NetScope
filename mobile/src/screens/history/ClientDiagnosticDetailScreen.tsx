import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Share, Pressable, StyleSheet, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {RootStackParamList} from '../../navigation/types';
import {clientDiagnosticService} from '../../services/clientDiagnosticService';
import {ClientDiagnostic, DiagnosticSegmentStatus} from '../../types';
import {formatDateTime} from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientDiagnosticDetail'>;

const symptomLabels: Record<string, string> = {
  no_internet: '인터넷 연결 안 됨',
  slow: '인터넷 속도 저하',
  video_call: '영상통화 끊김',
  gaming: '게임 끊김',
  specific_site: '특정 사이트 접속 불가',
  wifi_disconnects: 'Wi-Fi 반복 끊김',
};
const statusMeta: Record<DiagnosticSegmentStatus, {label: string; color: string; icon: keyof typeof Ionicons.glyphMap}> = {
  healthy: {label: '정상', color: colors.success, icon: 'checkmark-circle'},
  degraded: {label: '주의', color: colors.warning, icon: 'alert-circle'},
  failed: {label: '실패', color: colors.danger, icon: 'close-circle'},
};

export function ClientDiagnosticDetailScreen({route}: Props) {
  const [item, setItem] = useState<ClientDiagnostic>();
  const [error, setError] = useState('');
  useEffect(() => {
    clientDiagnosticService.detail(route.params.diagnosticId).then(setItem).catch(cause => setError((cause as Error).message));
  }, [route.params.diagnosticId]);

  if (!item) return <Screen><View style={styles.loading}><Ionicons name={error ? 'alert-circle-outline' : 'sync-outline'} size={36} color={error ? colors.danger : colors.primary} /><AppText>{error || '진단 기록을 불러오고 있어요.'}</AppText></View></Screen>;
  const riskColor = item.riskLevel === '정상' ? colors.success : item.riskLevel === '주의' ? colors.warning : colors.danger;
  const share = () => Share.share({message: `NetScope 진단 기록\n${formatDateTime(item.measuredAt!)}\n${item.riskLevel} · ${item.qualityScore}/100\n원인: ${item.rootCause}\n조치: ${item.recommendedAction}`});

  return <Screen>
    <View style={styles.header}><View><AppText variant="caption">DIAGNOSIS #{item.id}</AppText><AppText variant="title">진단 상세</AppText></View><Pressable onPress={share} style={styles.share}><Ionicons name="share-outline" size={20} color={colors.primary} /></Pressable></View>
    <Card style={[styles.scoreCard, {borderColor: riskColor}]}>
      <View style={styles.scoreTop}><View style={[styles.risk, {backgroundColor: `${riskColor}18`}]}><AppText variant="label" style={{color: riskColor}}>{item.riskLevel}</AppText></View><AppText variant="caption">{formatDateTime(item.measuredAt!)}</AppText></View>
      <View style={styles.scoreLine}><AppText variant="title" style={styles.score}>{item.qualityScore}</AppText><AppText variant="heading" style={{color: colors.textMuted}}>/ 100</AppText></View>
      <AppText variant="heading">{item.rootCause}</AppText>
      <AppText style={{color: colors.textMuted}}>{item.recommendedAction}</AppText>
    </Card>

    <Card style={styles.context}>
      <Info icon="help-circle-outline" label="선택한 증상" value={item.symptom ? symptomLabels[item.symptom] : '이전 버전 기록'} />
      <Info icon="wifi-outline" label="연결 방식" value={item.connectionType} />
      {item.comparisonRole && <Info icon="git-compare-outline" label="비교 측정" value={`${item.comparisonRole === 'first' ? '1차' : '2차'} · ${item.comparisonId}`} />}
    </Card>

    {!!item.comparisonVerdict && <Card style={styles.verdict}><Ionicons name="analytics-outline" size={22} color={colors.primary} /><View style={{flex: 1, gap: 3}}><AppText variant="label">비교 진단 판정</AppText><AppText variant="caption">{item.comparisonVerdict}</AppText></View></Card>}

    {!!item.segments?.length && <><AppText variant="heading">문제 구간</AppText><Card style={styles.segments}>{item.segments.map(segment => {
      const meta = statusMeta[segment.status];
      return <View key={segment.key} style={styles.segment}><Ionicons name={meta.icon} size={22} color={meta.color} /><View style={{flex: 1}}><AppText variant="label">{segment.label}</AppText><AppText variant="caption">{segment.detail}</AppText></View><AppText variant="label" style={{color: meta.color}}>{meta.label}</AppText></View>;
    })}</Card></>}

    <View style={styles.metrics}>
      <Metric label="평균 지연" value={`${item.latency}ms`} />
      <Metric label="P95" value={`${item.p95Latency}ms`} />
      <Metric label="지터" value={`${item.jitter}ms`} />
      <Metric label="다운로드" value={`${item.downloadMbps}M`} />
    </View>

    {!!item.actionSteps?.length && <><View style={styles.sectionHead}><AppText variant="heading">추천 조치 기록</AppText><AppText variant="caption">{item.completedActions?.length ?? 0}/{item.actionSteps.length} 완료</AppText></View><Card style={styles.actions}>{item.actionSteps.map((step, index) => {
      const done = item.completedActions?.includes(index);
      return <View key={step} style={styles.action}><Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.success : colors.textMuted} /><AppText style={[{flex: 1}, done && styles.done]}>{step}</AppText></View>;
    })}</Card></>}
  </Screen>;
}

function Info({icon, label, value}: {icon: keyof typeof Ionicons.glyphMap; label: string; value: string}) {
  return <View style={styles.info}><Ionicons name={icon} size={19} color={colors.primary} /><View style={{flex: 1}}><AppText variant="caption">{label}</AppText><AppText variant="label">{value}</AppText></View></View>;
}
function Metric({label, value}: {label: string; value: string}) {
  return <Card style={styles.metric}><AppText variant="caption">{label}</AppText><AppText variant="heading">{value}</AppText></Card>;
}

const styles = StyleSheet.create({
  loading: {alignItems: 'center', gap: spacing.md, paddingVertical: 100},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  share: {width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'},
  scoreCard: {gap: spacing.sm, padding: spacing.lg},
  scoreTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  risk: {borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5},
  scoreLine: {flexDirection: 'row', alignItems: 'baseline'},
  score: {fontSize: 48, lineHeight: 56},
  context: {gap: spacing.md},
  info: {flexDirection: 'row', gap: spacing.md, alignItems: 'center'},
  verdict: {borderColor: colors.primary, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start'},
  segments: {gap: spacing.lg},
  segment: {flexDirection: 'row', gap: spacing.md, alignItems: 'center'},
  metrics: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md},
  metric: {width: '48%', gap: spacing.sm},
  sectionHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  actions: {gap: spacing.sm},
  action: {flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xs},
  done: {color: colors.textMuted, textDecorationLine: 'line-through'},
});
