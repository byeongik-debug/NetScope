import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';
import {formatDateTime} from '../../utils/formatters';

export function HistoryScreen() {
  const {incidents} = useApp(); const [query, setQuery] = useState(''); const [openOnly, setOpenOnly] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const filtered = useMemo(() => incidents.filter(i => (!openOnly || i.status === 'Open') && `${i.deviceName} ${i.problem} ${i.severity}`.toLowerCase().includes(query.toLowerCase())), [incidents, query, openOnly]);
  return <Screen><View><AppText variant="title">Incident History</AppText><AppText style={{color: colors.textMuted}}>검색 · 상태 필터 · 날짜순 조회</AppText></View>
    <TextInput value={query} onChangeText={setQuery} placeholder="장비, 문제, 심각도 검색" placeholderTextColor={colors.textMuted} style={styles.search} />
    <Pressable onPress={() => setOpenOnly(v => !v)} style={[styles.filter, openOnly && styles.active]}><AppText variant="label">미해결만 보기 {openOnly ? '✓' : ''}</AppText></Pressable>
    {filtered.sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)).map(item => <Pressable key={item.id} onPress={() => navigation.navigate('IncidentDetail', {incidentId: item.id})}><Card style={styles.card}><View style={{flex: 1, gap: spacing.xs}}><AppText variant="heading">{item.problem}</AppText><AppText>{item.deviceName}</AppText><AppText variant="caption">{formatDateTime(item.occurredAt)}</AppText></View><StatusBadge value={item.status === 'Resolved' ? 'Resolved' : item.severity} /></Card></Pressable>)}
  </Screen>;
}
const styles = StyleSheet.create({search: {height: 48, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md}, filter: {alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm}, active: {borderColor: colors.primary, backgroundColor: colors.primaryMuted}, card: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm}});

