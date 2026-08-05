import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {PageHeader} from '../../components/PageHeader';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';
import {RootStackParamList} from '../../navigation/types';

export function DevicesScreen() {
  const {devices} = useApp(); const [query, setQuery] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const filtered = useMemo(() => devices.filter(d => `${d.hostname} ${d.ip} ${d.type}`.toLowerCase().includes(query.toLowerCase())), [devices, query]);
  return <Screen><PageHeader eyebrow="INVENTORY" title="Devices" subtitle={`${devices.length} managed nodes`} actionIcon="add" onAction={() => navigation.navigate('AddDevice')} />
    <TextInput value={query} onChangeText={setQuery} placeholder="Hostname, IP, 종류 검색" placeholderTextColor={colors.textMuted} style={styles.search} />
    {filtered.map(device => <Pressable key={device.id} onPress={() => navigation.navigate('DeviceDetail', {deviceId: device.id})} style={({pressed}) => pressed && {opacity: 0.7}}><Card style={styles.card}><View style={styles.deviceIcon}><AppText variant="heading" style={{color: colors.primary}}>{device.type.charAt(0)}</AppText></View><View style={{flex: 1, gap: spacing.xs}}><View style={styles.name}><AppText variant="heading">{device.hostname}</AppText>{device.monitorEnabled && <View style={styles.live}><AppText variant="caption" style={{color: colors.primary, fontSize: 9}}>LIVE</AppText></View>}</View><AppText variant="caption">{device.type}  ·  {device.ip}</AppText></View><StatusBadge value={device.status} /></Card></Pressable>)}
  </Screen>;
}
const styles = StyleSheet.create({search: {height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, color: colors.text, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: spacing.md}, card: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 14}, deviceIcon: {width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, name: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, live: {backgroundColor: colors.primaryMuted, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3}});
