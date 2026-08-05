import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors, radius, spacing} from '../constants/theme';
import {Card} from './Card';
import {AppText} from './Typography';

export function MetricCard({label, value, unit, accent = colors.primary, icon = 'pulse-outline'}: {label: string; value: string | number; unit?: string; accent?: string; icon?: keyof typeof Ionicons.glyphMap}) {
  return <Card style={styles.card}><View style={[styles.icon, {backgroundColor: `${accent}18`}]}><Ionicons name={icon} size={18} color={accent} /></View><AppText variant="caption">{label}</AppText><AppText variant="heading" style={styles.value}>{value}<AppText variant="label" style={{color: colors.textMuted}}> {unit}</AppText></AppText></Card>;
}
const styles = StyleSheet.create({card: {width: '48%', gap: spacing.sm, minHeight: 134}, icon: {width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'}, value: {fontSize: 25, marginTop: 'auto'}});
