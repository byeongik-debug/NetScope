import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {RootStackParamList} from '../../navigation/types';
import {networkService} from '../../services/networkService';
import {FullDiagnosticResult} from '../../types';

export function FullDiagnosticScreen() {
  const {params} = useRoute<RouteProp<RootStackParamList, 'FullDiagnostic'>>();
  const [result, setResult] = useState<FullDiagnosticResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true); setError('');
    try {setResult(await networkService.runFullDiagnostic(params.deviceId));}
    catch (cause) {setError(`진단 실패: ${(cause as Error).message}`);}
    finally {setBusy(false);}
  };
  useEffect(() => {run();}, []);

  return <Screen>
    {busy && <Card style={styles.loading}><AppText variant="heading">네트워크 진단 중...</AppText><AppText variant="caption">Ping, 주요 포트, HTTP, DNS, 인터넷, 최대 12홉 경로를 확인합니다. 최대 15초 정도 걸릴 수 있습니다.</AppText></Card>}
    {!!error && <Card style={{borderColor: colors.danger}}><AppText style={{color: colors.danger}}>{error}</AppText></Card>}
    {result && <>
      <Card style={[styles.score, {borderColor: result.qualityScore >= 90 ? colors.success : result.qualityScore >= 70 ? colors.warning : colors.danger}]}>
        <View style={[styles.risk, {backgroundColor: result.riskLevel === '정상' ? '#0B261C' : result.riskLevel === '주의' ? '#2A2110' : '#31151D'}]}><AppText variant="label" style={{color: result.riskLevel === '정상' ? colors.success : result.riskLevel === '주의' ? colors.warning : colors.danger}}>{result.riskLevel}</AppText></View><AppText variant="caption">NETWORK QUALITY SCORE</AppText><AppText variant="title" style={{fontSize: 48}}>{result.qualityScore}<AppText variant="heading"> / 100</AppText></AppText><AppText variant="heading">{result.rootCause}</AppText><AppText>{result.assessment}</AppText>
      </Card>
      <View style={styles.grid}><Mini label="PING" value={result.reachable ? 'Online' : 'Offline'} good={result.reachable} /><Mini label="LATENCY" value={`${result.latency} ms`} good={result.latency < 100} /><Mini label="JITTER" value={`${result.jitter} ms`} good={result.jitter < 30} /><Mini label="PACKET LOSS" value={`${result.packetLoss}%`} good={result.packetLoss < 5} /><Mini label="INTERNET" value={result.internetReachable ? '정상' : '실패'} good={result.internetReachable} /><Mini label="DNS" value={result.dnsReachable ? `${result.dnsLatency} ms` : '실패'} good={result.dnsReachable} /></View>
      <Card style={styles.section}><AppText variant="heading">주요 TCP 서비스</AppText>{result.ports.map(item => <View key={item.port} style={styles.row}><AppText>{item.service} · {item.port}</AppText><AppText variant="label" style={{color: item.open ? colors.success : colors.textMuted}}>{item.open ? `OPEN · ${item.latency}ms` : 'CLOSED'}</AppText></View>)}</Card>
      <Card style={styles.section}><AppText variant="heading">HTTP 응답</AppText>{result.http.length ? result.http.map(item => <View key={item.url} style={styles.row}><AppText>{item.url}</AppText><AppText variant="label">{item.statusCode} · {item.latency}ms</AppText></View>) : <AppText variant="caption">HTTP/HTTPS 포트 응답 없음</AppText>}</Card>
      <Card style={styles.section}><AppText variant="heading">Traceroute</AppText>{result.tracerouteHops.length ? result.tracerouteHops.map((hop, index) => <AppText key={`${index}-${hop}`} variant="caption">{index + 1}. {hop}</AppText>) : <AppText variant="caption">경로 정보를 확인할 수 없습니다.</AppText>}</Card>
      <Card style={{gap: spacing.sm, borderColor: colors.primary}}><AppText variant="heading">추천 조치</AppText><AppText>{result.recommendedAction}</AppText></Card>
    </>}
    <Pressable disabled={busy} onPress={run} style={styles.button}><AppText variant="label" style={{color: colors.background}}>다시 종합 진단</AppText></Pressable>
  </Screen>;
}

function Mini({label, value, good}: {label: string; value: string; good: boolean}) {
  return <Card style={styles.mini}><AppText variant="caption">{label}</AppText><AppText variant="label" style={{color: good ? colors.success : colors.danger}}>{value}</AppText></Card>;
}
const styles = StyleSheet.create({loading: {gap: spacing.sm, borderColor: colors.primary}, score: {alignItems: 'center', gap: spacing.sm}, risk: {borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6}, grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}, mini: {minWidth: '30%', flexGrow: 1, gap: spacing.xs}, section: {gap: spacing.md}, row: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm}, button: {height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'}});
