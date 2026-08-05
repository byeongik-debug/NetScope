import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors, radius, spacing} from '../constants/theme';
import {MetricSample} from '../types';
import {Card} from './Card';
import {AppText} from './Typography';

export function MetricChart({title, unit, color, samples, field, ceiling}: {
  title: string;
  unit: string;
  color: string;
  samples: MetricSample[];
  field: 'latency' | 'packetLoss' | 'jitter';
  ceiling?: number;
}) {
  const values = samples.map(sample => sample[field]);
  const maximum = Math.max(ceiling ?? 0, ...values, 1);
  const current = values.at(-1) ?? 0;
  return <Card style={styles.card}>
    <View style={styles.header}><AppText variant="label">{title}</AppText><AppText variant="heading" style={{color}}>{current} {unit}</AppText></View>
    {samples.length === 0 ? <View style={styles.empty}><AppText variant="caption">진단을 실행하면 이력이 표시됩니다.</AppText></View> :
      <View style={styles.chart}>{samples.slice(-20).map(sample => {
        const height = Math.max(3, (sample[field] / maximum) * 90);
        return <View key={sample.id} style={[styles.bar, {height, backgroundColor: sample.reachable ? color : colors.danger}]} />;
      })}</View>}
    <View style={styles.axis}><AppText variant="caption">이전</AppText><AppText variant="caption">최근 {Math.min(samples.length, 20)}회</AppText></View>
  </Card>;
}

const styles = StyleSheet.create({card: {gap: spacing.sm}, header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, chart: {height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border}, bar: {flex: 1, minWidth: 3, maxWidth: 16, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm}, empty: {height: 100, alignItems: 'center', justifyContent: 'center'}, axis: {flexDirection: 'row', justifyContent: 'space-between'}});
