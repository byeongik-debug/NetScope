import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Card} from '../../components/Card';
import {PageHeader} from '../../components/PageHeader';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {clientDiagnosticService} from '../../services/clientDiagnosticService';
import {RootStackParamList} from '../../navigation/types';
import {ClientDiagnostic} from '../../types';
import {formatDateTime} from '../../utils/formatters';

export function ClientHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<ClientDiagnostic[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'WIFI' | 'CELLULAR'>('ALL');
  useFocusEffect(useCallback(() => {clientDiagnosticService.history().then(setItems).catch(() => setItems([]));}, []));
  const visible = [...items].reverse().filter(item => filter === 'ALL' || item.connectionType.includes(filter));
  const average = items.length ? Math.round(items.reduce((sum, item) => sum + item.qualityScore, 0) / items.length) : 0;
  const issues = items.filter(item => item.riskLevel !== '정상').length;
  return <Screen><PageHeader eyebrow="DIAGNOSIS ARCHIVE" title="진단 기록" subtitle="측정 결과와 실행한 조치를 다시 확인하세요" />
    <Card style={styles.overview}><View><AppText variant="caption">전체 진단</AppText><AppText variant="title">{items.length}</AppText></View><View style={styles.overviewLine} /><View><AppText variant="caption">평균 점수</AppText><AppText variant="title">{average || '—'}</AppText></View><View style={styles.overviewLine} /><View><AppText variant="caption">점검 필요</AppText><AppText variant="title" style={{color: issues ? colors.warning : colors.text}}>{issues}</AppText></View></Card>
    <View style={styles.filters}>{(['ALL', 'WIFI', 'CELLULAR'] as const).map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><AppText variant="label" style={filter === item ? {color: colors.primary} : undefined}>{item === 'ALL' ? '전체' : item === 'WIFI' ? 'Wi-Fi' : '모바일'}</AppText></Pressable>)}</View>
    {visible.length === 0 ? <View style={styles.empty}><Ionicons name="time-outline" size={42} color={colors.primary} /><AppText variant="heading">측정 기록이 없어요</AppText><AppText variant="caption">진단을 실행하면 시간대별 결과가 저장됩니다.</AppText></View> : visible.map(item => {
      const color = item.riskLevel === '정상' ? colors.success : item.riskLevel === '주의' ? colors.warning : colors.danger;
      return <Pressable key={item.id ?? item.measuredAt} disabled={!item.id} onPress={() => item.id && navigation.navigate('ClientDiagnosticDetail', {diagnosticId: item.id})} style={({pressed}) => pressed && {opacity: 0.65}}><Card style={styles.item}><View style={[styles.score, {backgroundColor: `${color}16`}]}><AppText variant="heading" style={{color}}>{item.qualityScore}</AppText></View><View style={{flex: 1, gap: 5}}><View style={styles.itemHead}><AppText variant="label" numberOfLines={1} style={{flex: 1}}>{item.rootCause}</AppText><View style={[styles.risk, {backgroundColor: `${color}16`}]}><AppText variant="caption" style={{color}}>{item.riskLevel}</AppText></View></View><AppText variant="caption">{formatDateTime(item.measuredAt!)} · {item.connectionType.includes('WIFI') ? 'Wi-Fi' : item.connectionType.includes('CELLULAR') ? '모바일' : item.connectionType}</AppText><View style={styles.inlineMetrics}><AppText variant="caption">지연 {item.latency}ms</AppText><View style={styles.dot} /><AppText variant="caption">지터 {item.jitter}ms</AppText><View style={styles.dot} /><AppText variant="caption">{item.downloadMbps}Mbps</AppText></View></View><Ionicons name="chevron-forward" size={17} color={colors.textSubtle} /></Card></Pressable>;
    })}
  </Screen>;
}
const styles = StyleSheet.create({overview: {minHeight: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around'}, overviewLine: {height: 42, width: 1, backgroundColor: colors.border}, filters: {flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs}, filter: {paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border}, filterActive: {backgroundColor: colors.primaryMuted, borderColor: colors.primary}, empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: 70}, item: {minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, score: {width: 48, height: 48, borderRadius: 16, flexShrink: 0, alignItems: 'center', justifyContent: 'center'}, itemHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, risk: {paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, flexShrink: 0}, inlineMetrics: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5}, dot: {width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textSubtle}});
