import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React from 'react';
import {Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';
import {formatDateTime} from '../../utils/formatters';
import {networkService} from '../../services/networkService';
import {AppUser, IncidentAction} from '../../types';

export function IncidentDetailScreen() {
  const {params} = useRoute<RouteProp<RootStackParamList, 'IncidentDetail'>>(); const navigation = useNavigation();
  const {incidents, addIncidentNote, updateIncidentWorkflow, user} = useApp(); const incident = incidents.find(i => i.id === params.incidentId);
  const [note, setNote] = React.useState('');
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [actions, setActions] = React.useState<IncidentAction[]>([]);
  const [assignee, setAssignee] = React.useState<number | undefined>(incident?.assignedToId);
  const reloadActions = React.useCallback(async () => {try {setActions(await networkService.getIncidentActions(params.incidentId));} catch {setActions([]);}}, [params.incidentId]);
  React.useEffect(() => {networkService.getUsers().then(setUsers).catch(() => setUsers(user ? [user] : [])); reloadActions();}, [reloadActions]);
  if (!incident) return <Screen><AppText>장애를 찾을 수 없습니다.</AppText></Screen>;
  const rows = [['문제', incident.problem], ['발생시간', formatDateTime(incident.occurredAt)], ['심각도', incident.severity], ['원인 예상', incident.probableCause], ['추천 조치', incident.recommendedAction]];
  return <Screen><Card style={styles.alert}><View style={styles.heading}><View><AppText variant="caption">{incident.deviceName}</AppText><AppText variant="title">{incident.problem}</AppText></View><StatusBadge value={incident.status === 'Resolved' ? 'Resolved' : incident.severity} /></View></Card>
    <Card>{rows.map(([label, value]) => <View key={label} style={styles.row}><AppText variant="caption" style={styles.label}>{label}</AppText><AppText style={{flex: 1}}>{value}</AppText></View>)}</Card>
    <Card style={{gap: spacing.md}}><AppText variant="heading">담당자</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: spacing.sm}}>{users.map(item => <Pressable key={item.id} onPress={() => setAssignee(item.id)} style={[styles.person, assignee === item.id && styles.personActive]}><View style={styles.avatar}><AppText variant="label">{item.displayName.charAt(0)}</AppText></View><View><AppText variant="label">{item.displayName}</AppText><AppText variant="caption">{item.role}</AppText></View></Pressable>)}</ScrollView></Card>
    <Card style={{gap: spacing.md}}><AppText variant="heading">처리 상태</AppText><View style={styles.workflow}>{(['Open', 'Acknowledged', 'In Progress', 'Resolved'] as const).map(status => <Pressable key={status} onPress={async () => {await updateIncidentWorkflow(incident.id, status, assignee, note.trim() || undefined); setNote(''); await reloadActions();}} style={[styles.stage, incident.status === status && styles.stageActive]}><View style={[styles.stageDot, incident.status === status && {backgroundColor: colors.primary}]} /><AppText variant="caption" style={incident.status === status ? {color: colors.primary} : undefined}>{status}</AppText></Pressable>)}</View><TextInput value={note} onChangeText={setNote} multiline placeholder="확인 내용이나 조치 메모를 입력하세요." placeholderTextColor={colors.textMuted} style={styles.note} /><Pressable style={styles.secondary} onPress={async () => {if (note.trim()) {await addIncidentNote(incident.id, note.trim()); setNote(''); await reloadActions();}}}><AppText variant="label">메모 저장</AppText></Pressable></Card>
    <Card style={{gap: spacing.md}}><AppText variant="heading">처리 Timeline</AppText>{actions.length === 0 ? <AppText variant="caption">아직 처리 기록이 없습니다.</AppText> : actions.map((action, index) => <View key={action.id} style={styles.timeline}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < actions.length - 1 && <View style={styles.rail} />}</View><View style={{flex: 1, gap: 3, paddingBottom: spacing.md}}><View style={styles.timelineHead}><AppText variant="label">{action.action}</AppText><AppText variant="caption">{formatDateTime(action.createdAt)}</AppText></View><AppText variant="caption">{action.userName}</AppText>{action.note && <AppText>{action.note}</AppText>}</View></View>)}</Card>
  </Screen>;
}
const styles = StyleSheet.create({alert: {borderColor: colors.danger, backgroundColor: '#26141B'}, heading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, row: {flexDirection: 'row', borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: spacing.md, gap: spacing.md}, label: {width: 72}, person: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, paddingRight: spacing.md}, personActive: {borderColor: colors.primary, backgroundColor: colors.primaryMuted}, avatar: {width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center'}, workflow: {gap: spacing.sm}, stage: {height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md}, stageActive: {borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryMuted}, stageDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted}, note: {minHeight: 90, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, color: colors.text, padding: spacing.md, textAlignVertical: 'top'}, secondary: {height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'}, timeline: {flexDirection: 'row', gap: spacing.md}, timelineRail: {width: 16, alignItems: 'center'}, timelineDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary}, rail: {width: 1, flex: 1, backgroundColor: colors.border, marginTop: 4}, timelineHead: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm}});
