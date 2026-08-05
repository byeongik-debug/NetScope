import React from 'react';
import {StyleSheet, Text, TextProps} from 'react-native';
import {colors} from '../constants/theme';

export function AppText({variant = 'body', style, maxFontSizeMultiplier = 1.2, ...props}: TextProps & {variant?: 'title' | 'heading' | 'body' | 'label' | 'caption'}) {
  return <Text {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.base, styles[variant], style]} />;
}
const styles = StyleSheet.create({
  base: {color: colors.text, fontSize: 15, lineHeight: 22},
  title: {fontSize: 27, lineHeight: 35, fontWeight: '700', letterSpacing: -0.55},
  heading: {fontSize: 17, lineHeight: 24, fontWeight: '700', letterSpacing: -0.15},
  body: {fontSize: 15, lineHeight: 22},
  label: {fontSize: 13, lineHeight: 19, fontWeight: '600'},
  caption: {fontSize: 12, lineHeight: 18, color: colors.textMuted, letterSpacing: 0.03}
});
