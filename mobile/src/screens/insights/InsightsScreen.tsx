import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Card} from '../../components/Card';
import {PageHeader} from '../../components/PageHeader';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {clientDiagnosticService} from '../../services/clientDiagnosticService';
import {ClientDiagnostic} from '../../types';

const avg = (items: ClientDiagnostic[], field: 'qualityScore' | 'latency' | 'jitter' | 'downloadMbps') => items.length ? Math.round(items.reduce((sum, item) => sum + item[field], 0) / items.length * 10) / 10 : 0;

export function InsightsScreen() {
  const [items, setItems] = useState<ClientDiagnostic[]>([]);
  useFocusEffect(useCallback(() => {clientDiagnosticService.history().then(setItems).catch(() => setItems([]));}, []));
  const wifi = items.filter(item => item.connectionType.includes('WIFI'));
  const cellular = items.filter(item => item.connectionType.includes('CELLULAR'));
  const insight = useMemo(() => {
    if (items.length < 2) return '측정을 2회 이상 실행하면 네트워크 패턴을 분석해드려요.';
    const best = [...items].sort((a, b) => b.qualityScore - a.qualityScore)[0];
    const worst = [...items].sort((a, b) => a.qualityScore - b.qualityScore)[0];
    return `최고 점수는 ${best.qualityScore}점, 최저 점수는 ${worst.qualityScore}점이에요. ${avg(items, 'jitter') > 30 ? 'Jitter가 높아 실시간 통신 품질을 확인해보세요.' : '전체적으로 연결 변동이 크지 않습니다.'}`;
  }, [items]);
  const max = Math.max(...items.map(item => item.qualityScore), 100);
  return <Screen><PageHeader eyebrow="NETWORK INTELLIGENCE" title="품질 분석" subtitle="누적된 진단에서 연결 패턴을 찾습니다" />
    <Card style={styles.insight}><View style={styles.spark}><Ionicons name="analytics" size={22} color={colors.primarySoft} /></View><View style={{flex: 1, gap: spacing.xs}}><AppText variant="label" style={{color: colors.primarySoft}}>분석 요약</AppText><AppText style={{color: colors.textMuted}}>{insight}</AppText></View></Card>
    <AppText variant="heading">전체 평균</AppText><View style={styles.grid}><Value label="품질 점수" value={`${avg(items, 'qualityScore')}`} icon="speedometer-outline" /><Value label="Latency" value={`${avg(items, 'latency')}ms`} icon="timer-outline" /><Value label="Jitter" value={`${avg(items, 'jitter')}ms`} icon="pulse-outline" /><Value label="Download" value={`${avg(items, 'downloadMbps')}M`} icon="download-outline" /></View>
    <AppText variant="heading">연결 방식 비교</AppText><Card style={{gap: spacing.md}}><Compare label="Wi-Fi" count={wifi.length} score={avg(wifi, 'qualityScore')} color={colors.primary} /><Compare label="모바일 데이터" count={cellular.length} score={avg(cellular, 'qualityScore')} color={colors.purple} /></Card>
    <AppText variant="heading">품질 점수 추이</AppText><Card style={{gap: spacing.sm}}><View style={styles.chart}>{items.slice(-20).map(item => <View key={item.id ?? item.measuredAt} style={[styles.bar, {height: Math.max(4, item.qualityScore / max * 100), backgroundColor: item.riskLevel === '정상' ? colors.success : item.riskLevel === '주의' ? colors.warning : colors.danger}]} />)}</View><View style={styles.axis}><AppText variant="caption">이전</AppText><AppText variant="caption">최근 {Math.min(items.length, 20)}회</AppText></View></Card>
  </Screen>;
}
function Value({label, value, icon}: {label: string; value: string; icon: keyof typeof Ionicons.glyphMap}) {return <Card style={styles.value}><View style={styles.valueIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View><AppText variant="heading">{value}</AppText><AppText variant="caption">{label}</AppText></Card>;}
function Compare({label, count, score, color}: {label: string; count: number; score: number; color: string}) {return <View style={styles.compare}><View style={{width: 94}}><AppText variant="label">{label}</AppText><AppText variant="caption">{count}회 측정</AppText></View><View style={styles.track}><View style={[styles.fill, {width: `${score}%`, backgroundColor: color}]} /></View><AppText variant="label">{score || '-'}</AppText></View>;}
const styles = StyleSheet.create({insight: {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderColor: colors.borderStrong, padding: spacing.lg}, spark: {width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm}, value: {width: '48.7%', minHeight: 106, gap: spacing.sm}, valueIcon: {width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, compare: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, track: {flex: 1, height: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden'}, fill: {height: 7, borderRadius: radius.pill}, chart: {height: 108, flexDirection: 'row', alignItems: 'flex-end', gap: 3, borderBottomWidth: 1, borderBottomColor: colors.border}, bar: {flex: 1, maxWidth: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4}, axis: {flexDirection: 'row', justifyContent: 'space-between'}});
