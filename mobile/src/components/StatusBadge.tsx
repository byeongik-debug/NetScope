import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors, radius, spacing} from '../constants/theme';
import {DeviceStatus, Severity} from '../types';
import {AppText} from './Typography';

export function StatusBadge({value}: {value: DeviceStatus | Severity | 'Resolved' | 'Open'}) {
  const color = value === 'Online' || value === 'Resolved' ? colors.success : value === 'Warning' || value === 'Medium' || value === 'Low' ? colors.warning : colors.danger;
  return <View style={[styles.badge, {borderColor: color}]}><View style={[styles.dot, {backgroundColor: color}]} /><AppText variant="caption" style={{color}}>{value}</AppText></View>;
}
const styles = StyleSheet.create({badge: {alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceRaised}, dot: {height: 6, width: 6, borderRadius: 3}});
