import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors, spacing} from '../constants/theme';
import {NetworkEvent} from '../types';
import {formatDateTime} from '../utils/formatters';
import {Card} from './Card';
import {StatusBadge} from './StatusBadge';
import {AppText} from './Typography';

export function EventCard({event, onPress}: {event: NetworkEvent; onPress?: () => void}) {
  const urgent = event.severity === 'Critical' || event.severity === 'High';
  return <Pressable onPress={onPress} style={({pressed}) => pressed && {opacity: 0.72}}><Card style={[styles.card, urgent && styles.alert]}><View style={[styles.icon, {backgroundColor: urgent ? '#31151D' : colors.primaryMuted}]}><Ionicons name={urgent ? 'warning' : 'pulse'} size={19} color={urgent ? colors.danger : colors.primary} /></View><View style={styles.copy}><AppText variant="label">{event.deviceName}</AppText><AppText>{event.message}</AppText><AppText variant="caption">{formatDateTime(event.occurredAt)}</AppText></View><StatusBadge value={event.severity} /></Card></Pressable>;
}
const styles = StyleSheet.create({card: {padding: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.md}, alert: {borderColor: '#542331', backgroundColor: '#171117'}, icon: {width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}, copy: {flex: 1, gap: 2}});
