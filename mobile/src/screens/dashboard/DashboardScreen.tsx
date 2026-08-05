import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Card} from '../../components/Card';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {clientDiagnosticService} from '../../services/clientDiagnosticService';
import {ClientDiagnostic} from '../../types';
import {formatDateTime} from '../../utils/formatters';

export function DashboardScreen() {
  const {user, connectionType, internetAvailable} = useApp();
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<ClientDiagnostic[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => { try { setHistory(await clientDiagnosticService.history()); } catch { setHistory([]); } };
  useFocusEffect(useCallback(() => { load(); }, []));

  const latest = history.at(-1);
  const today = history.filter(item => item.measuredAt && new Date(item.measuredAt).toDateString() === new Date().toDateString());
  const averageScore = today.length ? Math.round(today.reduce((sum, item) => sum + item.qualityScore, 0) / today.length) : latest?.qualityScore;
  const connectionLabel = connectionType.includes('CELLULAR') ? '모바일 데이터' : connectionType.includes('WIFI') ? 'Wi-Fi' : connectionType;
  const riskColor = latest?.riskLevel === '정상' ? colors.success : latest?.riskLevel === '주의' ? colors.warning : latest ? colors.danger : colors.primary;

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {setRefreshing(true); await load(); setRefreshing(false);}} tintColor={colors.primary} />}>
    <View style={styles.header}>
      <View style={styles.headerCopy}><AppText variant="caption" style={styles.date}>{new Intl.DateTimeFormat('ko-KR', {month: 'long', day: 'numeric', weekday: 'short'}).format(new Date())}</AppText><AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{user?.displayName ?? '사용자'}님의 네트워크</AppText></View>
      <View style={styles.avatar}><AppText variant="label" style={{color: colors.primarySoft}}>{user?.displayName?.charAt(0) ?? 'N'}</AppText></View>
    </View>

    <Card style={styles.networkCard}>
      <View style={styles.networkTop}>
        <View style={styles.connection}><Ionicons name={connectionType.includes('CELLULAR') ? 'cellular' : 'wifi'} size={18} color={internetAvailable ? colors.success : colors.danger} /><View><AppText variant="label">{connectionLabel}</AppText><AppText variant="caption">{internetAvailable ? '인터넷 연결됨' : '인터넷 연결 확인 필요'}</AppText></View></View>
        <View style={[styles.liveBadge, {backgroundColor: internetAvailable ? '#122C25' : '#32171D'}]}><View style={[styles.liveDot, {backgroundColor: internetAvailable ? colors.success : colors.danger}]} /><AppText variant="caption" style={{color: internetAvailable ? colors.success : colors.danger}}>{internetAvailable ? 'ONLINE' : 'OFFLINE'}</AppText></View>
      </View>

      <View style={styles.scoreArea}>
        <View style={[styles.scoreRingOuter, {borderColor: `${riskColor}35`}]}><View style={[styles.scoreRing, {borderColor: riskColor}]}>{latest ? <><AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1} style={styles.scoreValue}>{latest.qualityScore}</AppText><AppText variant="caption" numberOfLines={1} maxFontSizeMultiplier={1} style={styles.scoreLabel}>NETWORK SCORE</AppText></> : <Ionicons name="pulse-outline" size={36} color={colors.primary} />}</View></View>
        <View style={styles.scoreCopy}><AppText variant="caption">현재 상태</AppText><AppText variant="heading">{latest ? latest.rootCause : '아직 진단하지 않았어요'}</AppText><AppText style={styles.description}>{latest ? latest.recommendedAction : '약 15초 동안 연결 품질과 문제 구간을 확인합니다.'}</AppText></View>
      </View>

      <Pressable onPress={() => navigation.navigate('Diagnose')} style={({pressed}) => [styles.primaryAction, pressed && styles.pressed]}><Ionicons name="pulse" size={18} color={colors.white} /><AppText variant="label">네트워크 진단 시작</AppText><Ionicons name="arrow-forward" size={17} color={colors.white} /></Pressable>
    </Card>

    <Section title="최근 품질" detail={today.length ? `오늘 ${today.length}회 측정` : '최근 측정 기준'} />
    <View style={styles.metrics}>
      <Metric label="평균 점수" value={averageScore ? `${averageScore}` : '—'} unit="점" icon="speedometer-outline" color={colors.primary} />
      <Metric label="응답 시간" value={latest ? `${latest.latency}` : '—'} unit="ms" icon="timer-outline" color={colors.success} />
      <Metric label="지터" value={latest ? `${latest.jitter}` : '—'} unit="ms" icon="pulse-outline" color={colors.purple} />
      <Metric label="다운로드" value={latest ? `${latest.downloadMbps}` : '—'} unit="Mbps" icon="arrow-down-outline" color={colors.warning} />
    </View>

    <Section title="도구" detail="빠른 실행" />
    <View style={styles.tools}>
      <Tool icon="map-outline" title="공간 측정" subtitle="최적 배치 찾기" onPress={() => navigation.navigate('WifiSurveyList')} />
      <Tool icon="time-outline" title="진단 기록" subtitle={`${history.length}개의 결과`} onPress={() => navigation.navigate('History')} />
      <Tool icon="analytics-outline" title="품질 분석" subtitle="변화와 패턴" onPress={() => navigation.navigate('Insights')} />
    </View>

    <Section title="최근 진단" detail={latest ? formatDateTime(latest.measuredAt!) : '기록 없음'} />
    {latest ? <Pressable onPress={() => navigation.navigate('History')}><Card style={styles.latest}>
      <View style={[styles.latestStatus, {backgroundColor: `${riskColor}18`}]}><Ionicons name={latest.riskLevel === '정상' ? 'checkmark' : 'alert'} size={18} color={riskColor} /></View>
      <View style={{flex: 1, gap: 3}}><View style={styles.latestTitle}><AppText variant="label">{latest.rootCause}</AppText><AppText variant="label" style={{color: riskColor}}>{latest.riskLevel}</AppText></View><AppText variant="caption">{connectionLabel} · 지연 {latest.latency}ms · 실패율 {latest.failureRate}%</AppText></View>
      <Ionicons name="chevron-forward" size={17} color={colors.textSubtle} />
    </Card></Pressable> : <Card style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="analytics-outline" size={25} color={colors.primary} /></View><View style={{flex: 1}}><AppText variant="label">진단 기록이 없습니다</AppText><AppText variant="caption">첫 진단을 실행해 기준 데이터를 만들어 보세요.</AppText></View></Card>}
  </ScrollView></SafeAreaView>;
}

function Section({title, detail}: {title: string; detail: string}) {
  return <View style={styles.section}><AppText variant="heading">{title}</AppText><AppText variant="caption">{detail}</AppText></View>;
}
function Metric({label, value, unit, icon, color}: {label: string; value: string; unit: string; icon: keyof typeof Ionicons.glyphMap; color: string}) {
  return <Card style={styles.metric}><View style={styles.metricTop}><Ionicons name={icon} size={17} color={color} /><AppText variant="caption">{label}</AppText></View><View style={styles.valueLine}><AppText variant="heading" style={styles.metricValue}>{value}</AppText><AppText variant="caption">{unit}</AppText></View></Card>;
}
function Tool({icon, title, subtitle, onPress}: {icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void}) {
  return <Pressable onPress={onPress} style={({pressed}) => [styles.tool, pressed && styles.pressed]}><View style={styles.toolIcon}><Ionicons name={icon} size={20} color={colors.primarySoft} /></View><AppText variant="label">{title}</AppText><AppText variant="caption">{subtitle}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  root: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 112, gap: spacing.md},
  header: {minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerCopy: {flex: 1, minWidth: 0, paddingRight: spacing.md},
  date: {color: colors.primarySoft, marginBottom: 3},
  avatar: {width: 42, height: 42, borderRadius: 15, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: '#29457C', alignItems: 'center', justifyContent: 'center'},
  networkCard: {padding: spacing.lg, gap: spacing.lg, backgroundColor: '#0E151F', borderColor: colors.borderStrong},
  networkTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  connection: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  liveBadge: {flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6},
  liveDot: {width: 6, height: 6, borderRadius: 3},
  scoreArea: {flexDirection: 'row', gap: spacing.md, alignItems: 'center'},
  scoreRingOuter: {width: 118, height: 118, borderRadius: 59, borderWidth: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  scoreRing: {width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center'},
  scoreValue: {width: 78, fontSize: 32, lineHeight: 36, textAlign: 'center'},
  scoreLabel: {fontSize: 9, lineHeight: 12, letterSpacing: 0.35, textAlign: 'center'},
  scoreCopy: {flex: 1, minWidth: 0, gap: spacing.xs},
  description: {color: colors.textMuted, fontSize: 13, lineHeight: 19},
  primaryAction: {height: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm},
  pressed: {opacity: 0.68, transform: [{scale: 0.985}]},
  section: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm},
  metrics: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm},
  metric: {width: '48.7%', minHeight: 94, justifyContent: 'space-between', padding: 14},
  metricTop: {flexDirection: 'row', gap: spacing.sm, alignItems: 'center'},
  valueLine: {flexDirection: 'row', alignItems: 'baseline', gap: 5},
  metricValue: {fontSize: 21},
  tools: {flexDirection: 'row', gap: spacing.sm},
  tool: {flex: 1, minHeight: 108, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: 3},
  toolIcon: {width: 38, height: 38, marginBottom: 5, borderRadius: 13, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'},
  latest: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  latestStatus: {width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  latestTitle: {flexDirection: 'row', justifyContent: 'space-between'},
  empty: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  emptyIcon: {width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'},
});
