import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../theme/tokens';

type Props = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  hint: string;
};

export function MetricCard({ icon, label, value, hint }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.icon}><Feather name={icon} size={17} color={colors.accent} /></View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '48.5%', backgroundColor: colors.card, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.line },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  label: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  value: { marginTop: 17, fontSize: 25, color: colors.ink, fontWeight: '700', letterSpacing: -0.6 },
  hint: { marginTop: 3, fontSize: 12, color: colors.faint },
});
