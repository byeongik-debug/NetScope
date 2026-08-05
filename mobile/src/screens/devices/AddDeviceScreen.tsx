import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';
import {DeviceType} from '../../types';

const TYPES: DeviceType[] = ['Router', 'Switch', 'Firewall', 'Server', 'Access Point'];

export function AddDeviceScreen() {
  const {addDevice} = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hostname, setHostname] = useState('');
  const [ip, setIp] = useState('');
  const [type, setType] = useState<DeviceType>('Server');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!hostname.trim() || !ip.trim()) { setError('Hostname과 IP를 입력하세요.'); return; }
    setBusy(true); setError('');
    try {
      const device = await addDevice({hostname: hostname.trim(), ip: ip.trim(), type});
      navigation.replace('DeviceDetail', {deviceId: device.id});
    } catch (cause) {
      setError(`등록 실패: ${(cause as Error).message}. 서버 주소와 IP를 확인하세요.`);
    } finally { setBusy(false); }
  };

  return <Screen>
    <Card style={styles.info}><AppText variant="heading">실제 네트워크 장비 등록</AppText><AppText style={{color: colors.textMuted}}>NetScope 서버에서 이 IP로 Ping을 실행합니다. 본인이 관리하거나 진단 권한이 있는 장비만 등록하세요.</AppText></Card>
    <View style={styles.field}><AppText variant="label">HOSTNAME</AppText><TextInput value={hostname} onChangeText={setHostname} placeholder="예: Office-Router" placeholderTextColor={colors.textMuted} style={styles.input} /></View>
    <View style={styles.field}><AppText variant="label">IP ADDRESS</AppText><TextInput value={ip} onChangeText={setIp} placeholder="예: 192.168.45.1" keyboardType="numbers-and-punctuation" autoCapitalize="none" placeholderTextColor={colors.textMuted} style={styles.input} /></View>
    <View style={styles.field}><AppText variant="label">DEVICE TYPE</AppText><View style={styles.types}>{TYPES.map(item => <Pressable key={item} onPress={() => setType(item)} style={[styles.type, type === item && styles.selected]}><AppText variant="caption" style={type === item ? {color: colors.primary} : undefined}>{item}</AppText></Pressable>)}</View></View>
    {!!error && <AppText style={{color: colors.danger}}>{error}</AppText>}
    <Pressable disabled={busy} onPress={submit} style={[styles.button, busy && {opacity: 0.5}]}><AppText variant="label" style={{color: colors.background}}>{busy ? '등록 중...' : '등록하고 모니터링 시작'}</AppText></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({info: {gap: spacing.sm, borderColor: colors.primary}, field: {gap: spacing.sm}, input: {height: 50, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md}, types: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}, type: {borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm}, selected: {borderColor: colors.primary, backgroundColor: colors.primaryMuted}, button: {height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md}});
