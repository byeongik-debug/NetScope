import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function ScoreRing({ score }: { score: number }) {
  const size = 174;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#34443F" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#70D1AE" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset} rotation="-90" origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.label}>NETWORK SCORE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  score: { color: colors.white, fontSize: 52, lineHeight: 58, fontWeight: '700', letterSpacing: -2 },
  label: { color: '#99AAA4', fontSize: 10, fontWeight: '700', letterSpacing: 1.15 },
});
