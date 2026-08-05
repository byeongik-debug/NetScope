import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';
import {colors, radius, spacing} from '../constants/theme';

export function Card({style, ...props}: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}
const styles = StyleSheet.create({card: {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: {width: 0, height: 5}, elevation: 2}});
