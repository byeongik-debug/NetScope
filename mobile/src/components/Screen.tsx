import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, spacing} from '../constants/theme';

export function Screen({children, scroll = true}: React.PropsWithChildren<{scroll?: boolean}>) {
  const content = scroll
    ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    : <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={styles.safe} edges={['top']}>{content}</SafeAreaView>;
}
const styles = StyleSheet.create({safe: {flex: 1, backgroundColor: colors.background}, content: {paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 112, gap: spacing.md, flexGrow: 1}});
