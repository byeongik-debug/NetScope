import {Ionicons} from '@expo/vector-icons';
import React from 'react';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';
import {colors, radius, spacing} from '../constants/theme';
import {AppText} from './Typography';

export function AppButton({label, onPress, icon, variant = 'primary', disabled, style}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const foreground = variant === 'primary' ? colors.background : variant === 'danger' ? colors.danger : colors.text;
  return <Pressable disabled={disabled} onPress={onPress} style={({pressed}) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}>
    {icon && <Ionicons name={icon} size={18} color={foreground} />}
    <AppText variant="label" style={{color: foreground}}>{label}</AppText>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: {height: 50, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg},
  primary: {backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: {width: 0, height: 6}},
  secondary: {backgroundColor: colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
  danger: {backgroundColor: '#27121A', borderWidth: StyleSheet.hairlineWidth, borderColor: '#542331'},
  ghost: {backgroundColor: 'transparent'},
  pressed: {opacity: 0.76, transform: [{scale: 0.985}]},
  disabled: {opacity: 0.45}
});
