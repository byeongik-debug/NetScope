import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, TextInput, View} from 'react-native';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';
import {DeviceType} from '../../types';

const TYPES: DeviceType[] = ['Router', 'Switch', 'Firewall', 'Server', 'Access Point'];

export function EditDeviceScreen() {
  const {params} = useRoute<RouteProp<RootStackParamList, 'EditDevice'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {devices, updateDevice} = useApp();
  const device = devices.find(item => item.id === params.deviceId);
  const [hostname, setHostname] = useState(device?.hostname ?? '');
  const [type, setType] = useState<DeviceType>(device?.type ?? 'Server');
  const [enabled, setEnabled] = useState(device?.monitorEnabled ?? false);
  const [error, setError] = useState('');
  if (!device) return <Screen><AppText>장비를 찾을 수 없습니다.</AppText></Screen>;

  return <Screen>
    <View style={styles.field}><AppText variant="label">HOSTNAME</AppText><TextInput value={hostname} onChangeText={setHostname} style={styles.input} /></View>
    <View style={styles.field}><AppText variant="label">IP ADDRESS</AppText><View style={styles.readonly}><AppText>{device.ip}</AppText><AppText variant="caption">IP 변경은 재등록이 필요합니다.</AppText></View></View>
    <View style={styles.field}><AppText variant="label">DEVICE TYPE</AppText><View style={styles.types}>{TYPES.map(item => <Pressable key={item} onPress={() => setType(item)} style={[styles.type, type === item && styles.selected]}><AppText variant="caption" style={type === item ? {color: colors.primary} : undefined}>{item}</AppText></Pressable>)}</View></View>
    <View style={styles.switch}><View><AppText variant="heading">자동 모니터링</AppText><AppText variant="caption">30초마다 Ping 진단</AppText></View><Switch value={enabled} onValueChange={setEnabled} trackColor={{true: colors.primary}} /></View>
    {!!error && <AppText style={{color: colors.danger}}>{error}</AppText>}
    <Pressable style={styles.button} onPress={async () => {try {await updateDevice(device.id, {hostname: hostname.trim(), type, monitorEnabled: enabled}); navigation.goBack();} catch (cause) {setError((cause as Error).message);}}}><AppText variant="label" style={{color: colors.background}}>변경사항 저장</AppText></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({field: {gap: spacing.sm}, input: {height: 50, backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md}, readonly: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs}, types: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}, type: {borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm}, selected: {borderColor: colors.primary, backgroundColor: colors.primaryMuted}, switch: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md}, button: {height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'}});
