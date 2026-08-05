import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';
import {Card} from '../../components/Card';
import {EventCard} from '../../components/EventCard';
import {MetricChart} from '../../components/MetricChart';
import {MetricCard} from '../../components/MetricCard';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {AppText} from '../../components/Typography';
import {colors, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';
import {networkService} from '../../services/networkService';
import {MetricSample} from '../../types';

export function DeviceDetailScreen() {
  const {params} = useRoute<RouteProp<RootStackParamList, 'DeviceDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {devices, events, diagnoseDevice, deleteDevice} = useApp(); const device = devices.find(d => d.id === params.deviceId);
  const [diagnosing, setDiagnosing] = React.useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = React.useState('');
  const [samples, setSamples] = React.useState<MetricSample[]>([]);
  const loadMetrics = React.useCallback(async () => {
    try { setSamples(await networkService.getMetrics(params.deviceId, 30)); } catch { setSamples([]); }
  }, [params.deviceId]);
  React.useEffect(() => { loadMetrics(); }, [loadMetrics]);
  if (!device) return <Screen><AppText>장비를 찾을 수 없습니다.</AppText></Screen>;
  return <Screen><View style={styles.header}><View><AppText variant="title">{device.hostname}</AppText><AppText style={styles.muted}>{device.type}</AppText></View><StatusBadge value={device.status} /></View>
    {device.monitorEnabled !== undefined && <View style={styles.actions}><Pressable style={styles.secondary} onPress={() => navigation.navigate('SnmpSettings', {deviceId: device.id})}><AppText variant="label" style={{color: device.snmpEnabled ? colors.success : colors.primary}}>SNMP{device.snmpEnabled ? ' ✓' : ''}</AppText></Pressable><Pressable style={styles.secondary} onPress={() => navigation.navigate('EditDevice', {deviceId: device.id})}><AppText variant="label">편집</AppText></Pressable><Pressable style={[styles.secondary, {borderColor: colors.danger}]} onPress={() => Alert.alert('장비 삭제', `${device.hostname}과 관련 이력을 삭제할까요?`, [{text: '취소', style: 'cancel'}, {text: '삭제', style: 'destructive', onPress: async () => {await deleteDevice(device.id); navigation.popToTop();}}])}><AppText variant="label" style={{color: colors.danger}}>삭제</AppText></Pressable></View>}
    <Card style={styles.identity}><View><AppText variant="caption">IP ADDRESS</AppText><AppText variant="heading">{device.ip}</AppText></View><View><AppText variant="caption">HOSTNAME</AppText><AppText variant="heading">{device.hostname}</AppText></View></Card>
    {device.snmpEnabled && <Card style={{gap: spacing.xs}}><AppText variant="caption">SNMP IDENTITY</AppText><AppText variant="heading">{device.snmpSysName ?? '수집 대기 중'}</AppText><AppText variant="caption" numberOfLines={2}>{device.snmpSysDescription}</AppText><AppText>Uptime {Math.round((device.snmpUptime ?? 0) / 3600)}h</AppText></Card>}
    {device.monitorEnabled && <><Pressable style={styles.diagnose} disabled={diagnosing} onPress={async () => {setDiagnosing(true); setDiagnosticMessage(''); try {const result = await diagnoseDevice(device.id); await loadMetrics(); setDiagnosticMessage(result.reachable ? `응답 정상 · ${result.latency}ms · Loss ${result.packetLoss}%` : '응답 없음 · 장비/경로/방화벽을 확인하세요.');} catch {setDiagnosticMessage('진단 요청 실패 · 백엔드 연결을 확인하세요.');} finally {setDiagnosing(false);}}}><AppText variant="label" style={{color: colors.background}}>{diagnosing ? 'Ping 진단 중...' : '지금 진단'}</AppText></Pressable>{!!diagnosticMessage && <AppText style={{color: diagnosticMessage.startsWith('응답 정상') ? colors.success : colors.danger}}>{diagnosticMessage}</AppText>}
      <Pressable style={styles.fullDiagnose} onPress={() => navigation.navigate('FullDiagnostic', {deviceId: device.id})}><AppText variant="label" style={{color: colors.primary}}>종합 네트워크 진단</AppText></Pressable>
      <AppText variant="heading">측정 이력</AppText><MetricChart title="Latency" unit="ms" color={colors.primary} samples={samples} field="latency" /><MetricChart title="Jitter" unit="ms" color={colors.purple} samples={samples} field="jitter" /><MetricChart title="Packet Loss" unit="%" color={colors.warning} samples={samples} field="packetLoss" ceiling={100} /></>}
    <View style={styles.metrics}><MetricCard label="CPU" value={device.cpu} unit="%" /><MetricCard label="Memory" value={device.memory} unit="%" accent={colors.purple} /><MetricCard label="Bandwidth" value={device.bandwidth} unit="Mbps" accent={colors.success} /><MetricCard label="Packet Loss" value={device.packetLoss} unit="%" accent={colors.warning} /><MetricCard label="Latency" value={device.latency} unit="ms" /></View>
    <AppText variant="heading">최근 이벤트</AppText>{events.filter(e => e.deviceId === device.id).map(e => <EventCard key={`${e.id}-${e.occurredAt}`} event={e} />)}
  </Screen>;
}
const styles = StyleSheet.create({header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, muted: {color: colors.textMuted}, actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm}, secondary: {borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm}, identity: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md}, diagnose: {height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'}, fullDiagnose: {height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center'}, metrics: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md}});
