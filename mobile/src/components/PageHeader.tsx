import {Ionicons} from '@expo/vector-icons';
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {colors, radius, spacing} from '../constants/theme';
import {AppText} from './Typography';

export function PageHeader({eyebrow, title, subtitle, actionIcon, onAction}: {
  eyebrow?: string; title: string; subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap; onAction?: () => void;
}) {
  return <View style={styles.root}><View style={styles.copy}>{eyebrow && <AppText variant="caption" numberOfLines={1} style={styles.eyebrow}>{eyebrow}</AppText>}<AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>{title}</AppText>{subtitle && <AppText numberOfLines={2} style={styles.subtitle}>{subtitle}</AppText>}</View>{actionIcon && onAction && <Pressable onPress={onAction} style={styles.action}><Ionicons name={actionIcon} size={21} color={colors.text} /></Pressable>}</View>;
}
const styles = StyleSheet.create({root: {minHeight: 88, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md}, copy: {flex: 1, minWidth: 0, gap: 3}, eyebrow: {color: colors.primarySoft, fontWeight: '700', letterSpacing: 1.2, fontSize: 11}, subtitle: {color: colors.textMuted}, action: {width: 42, height: 42, flexShrink: 0, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border}});
