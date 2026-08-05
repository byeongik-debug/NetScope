import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';
import {networkService} from '../../services/networkService';

export function SnmpSettingsScreen() {
  const {params} = useRoute<RouteProp<RootStackParamList, 'SnmpSettings'>>();
  const navigation = useNavigation();
  const {devices, refresh} = useApp();
  const device = devices.find(item => item.id === params.deviceId);
  const [enabled, setEnabled] = useState(device?.snmpEnabled ?? true);
  const [community, setCommunity] = useState('');
  const [port, setPort] = useState('161');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const payload = () => ({enabled, community: community.trim(), port: Number(port) || 161});
  if (!device) return <Screen><AppText>장비를 찾을 수 없습니다.</AppText></Screen>;

  const test = async () => {
    if (!community.trim()) {setMessage('Community String을 입력하세요.'); return;}
    setBusy(true); setMessage('SNMP 연결 확인 중...');
    try {
      const result = await networkService.testSnmp(device.id, payload());
      setMessage(result.success ? `${result.message}\n${result.sysName ?? ''}\nCPU ${result.cpu}% · Uptime ${Math.round(result.uptime / 3600)}h` : result.message);
    } catch (cause) {setMessage(`요청 실패: ${(cause as Error).message}`);}
    finally {setBusy(false);}
  };
  const save = async () => {
    if (!community.trim()) {setMessage('Community String을 입력하세요.'); return;}
    setBusy(true);
    try {await networkService.configureSnmp(device.id, payload()); await refresh(); navigation.goBack();}
    catch (cause) {setMessage(`저장 실패: ${(cause as Error).message}`);}
    finally {setBusy(false);}
  };

  return <Screen>
    <Card style={styles.warning}><AppText variant="heading">SNMP v2c</AppText><AppText style={{color: colors.textMuted}}>공유기 관리 화면에서 SNMP를 먼저 활성화하세요. Community String은 암호화되어 서버 DB에 저장되고 앱으로 다시 반환되지 않습니다.</AppText></Card>
    <View style={styles.row}><View><AppText variant="heading">SNMP 수집</AppText><AppText variant="caption">UDP 161 · 30초 주기</AppText></View><Switch value={enabled} onValueChange={setEnabled} trackColor={{true: colors.primary}} /></View>
    <View style={styles.field}><AppText variant="label">COMMUNITY STRING</AppText><TextInput value={community} onChangeText={setCommunity} secureTextEntry autoCapitalize="none" placeholder="공유기에서 설정한 값" placeholderTextColor={colors.textMuted} style={styles.input} /></View>
    <View style={styles.field}><AppText variant="label">PORT</AppText><TextInput value={port} onChangeText={setPort} keyboardType="number-pad" style={styles.input} /></View>
    {!!message && <Card><AppText style={{color: message.includes('정상') ? colors.success : colors.warning}}>{message}</AppText></Card>}
    <Pressable disabled={busy} onPress={test} style={styles.secondary}><AppText variant="label">{busy ? '확인 중...' : '연결 테스트'}</AppText></Pressable>
    <Pressable disabled={busy} onPress={save} style={styles.button}><AppText variant="label" style={{color: colors.background}}>저장하고 수집 시작</AppText></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({warning: {gap: spacing.sm, borderColor: colors.warning}, row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md}, field: {gap: spacing.sm}, input: {height: 50, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md}, secondary: {height: 50, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'}, button: {height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'}});
