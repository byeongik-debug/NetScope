import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MetricCard } from './src/components/MetricCard';
import { ScoreRing } from './src/components/ScoreRing';
import { runDiagnostic } from './src/services/diagnostics';
import { clearHistory, getHistory, saveResult } from './src/services/history';
import { colors, radius } from './src/theme/tokens';
import { DiagnosticResult } from './src/types/diagnostic';

type Tab = 'diagnose' | 'history' | 'guide';

const initial: DiagnosticResult = {
  id: 'preview', createdAt: new Date().toISOString(), networkType: 'Wi-Fi',
  isConnected: true, latency: 24, jitter: 4, loss: 0, dnsTime: 18,
  score: 96, level: 'excellent',
  summary: '진단을 시작하면 현재 연결 상태를 분석합니다.', samples: [],
};

export default function App() {
  const [tab, setTab] = useState<Tab>('diagnose');
  const [result, setResult] = useState(initial);
  const [history, setHistory] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const refresh = () => getHistory().then(setHistory);
  useEffect(() => { refresh(); }, []);

  const diagnose = async () => {
    if (running) return;
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const next = await runDiagnostic();
      setResult(next);
      await saveResult(next);
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('진단할 수 없습니다', '인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>NETSCOPE</Text>
          <Text style={styles.headerTitle}>{tab === 'diagnose' ? '네트워크 진단' : tab === 'history' ? '진단 기록' : '품질 가이드'}</Text>
        </View>
        <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>ONLINE</Text></View>
      </View>

      {tab === 'diagnose' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.connection}>
              <Feather name="wifi" size={16} color="#A7B7B1" />
              <Text style={styles.connectionText}>{result.networkType}</Text>
            </View>
            <ScoreRing score={result.score} />
            <Text style={styles.grade}>{result.score >= 90 ? '매우 안정적' : result.score >= 75 ? '안정적' : result.score >= 55 ? '주의 필요' : '연결 불안정'}</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>실시간 지표</Text>
            <Text style={styles.updated}>{result.id === 'preview' ? '진단 전 미리보기' : '방금 측정'}</Text>
          </View>
          <View style={styles.grid}>
            <MetricCard icon="clock" label="응답 지연" value={`${result.latency} ms`} hint={result.latency < 80 ? '권장 범위' : '높은 지연'} />
            <MetricCard icon="activity" label="지터" value={`${result.jitter} ms`} hint={result.jitter < 20 ? '안정적인 편차' : '편차 주의'} />
            <MetricCard icon="radio" label="요청 손실" value={`${result.loss}%`} hint={result.loss === 0 ? '손실 없음' : '재전송 가능'} />
            <MetricCard icon="globe" label="첫 응답" value={`${result.dnsTime} ms`} hint="DNS·TLS 포함" />
          </View>

          <Pressable style={({ pressed }) => [styles.button, pressed && { opacity: 0.88 }]} onPress={diagnose}>
            {running ? <ActivityIndicator color={colors.white} /> : <Feather name="crosshair" size={19} color={colors.white} />}
            <Text style={styles.buttonText}>{running ? '연결 분석 중…' : '새 진단 시작'}</Text>
          </Pressable>
          <Text style={styles.disclaimer}>약 10초 동안 여러 차례 안전한 연결 요청을 보내 품질을 계산합니다.</Text>
        </ScrollView>
      )}

      {tab === 'history' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.historyHead}>
            <Text style={styles.historyCopy}>최근 30회의 네트워크 상태를 비교할 수 있습니다.</Text>
            {history.length > 0 && <Pressable onPress={() => Alert.alert('기록 삭제', '모든 진단 기록을 삭제할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: async () => { await clearHistory(); refresh(); } },
            ])}><Text style={styles.clear}>전체 삭제</Text></Pressable>}
          </View>
          {history.length === 0 ? (
            <View style={styles.empty}><Feather name="bar-chart-2" size={30} color={colors.faint} /><Text style={styles.emptyTitle}>아직 기록이 없습니다</Text><Text style={styles.emptyText}>진단을 실행하면 결과가 이곳에 저장됩니다.</Text></View>
          ) : history.map(item => (
            <View style={styles.historyCard} key={item.id}>
              <View style={[styles.miniScore, { backgroundColor: item.score >= 75 ? colors.accentSoft : '#F8EAE4' }]}>
                <Text style={[styles.miniScoreText, { color: item.score >= 75 ? colors.accent : colors.danger }]}>{item.score}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{item.networkType} · {item.latency} ms</Text>
                <Text style={styles.historyMeta}>{new Date(item.createdAt).toLocaleString('ko-KR')}  ·  지터 {item.jitter} ms  ·  손실 {item.loss}%</Text>
              </View>
              <Feather name="chevron-right" size={19} color={colors.faint} />
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'guide' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.guideIntro}><Text style={styles.guideEyebrow}>HOW TO READ</Text><Text style={styles.guideTitle}>숫자보다 중요한 건{"\n"}연결의 일관성입니다.</Text><Text style={styles.guideCopy}>지연시간과 함께 지터와 손실률을 확인하면 화상회의, 게임, 클라우드 작업의 실제 체감 품질을 더 정확히 판단할 수 있습니다.</Text></View>
          {[
            ['응답 지연', '80 ms 이하', '요청을 보낸 뒤 응답이 돌아오는 시간입니다. 낮을수록 빠릅니다.'],
            ['지터', '20 ms 이하', '응답시간의 흔들림입니다. 통화나 스트리밍 안정성에 영향을 줍니다.'],
            ['요청 손실', '1% 이하', '제시간에 응답하지 못한 요청의 비율입니다. 0%에 가까울수록 좋습니다.'],
          ].map(([name, target, copy], index) => (
            <View style={styles.guideRow} key={name}><Text style={styles.guideNumber}>0{index + 1}</Text><View style={{ flex: 1 }}><View style={styles.guideRowTop}><Text style={styles.guideName}>{name}</Text><Text style={styles.guideTarget}>{target}</Text></View><Text style={styles.guideRowCopy}>{copy}</Text></View></View>
          ))}
        </ScrollView>
      )}

      <View style={styles.tabBar}>
        {([
          ['diagnose', 'activity', '진단'],
          ['history', 'clock', '기록'],
          ['guide', 'book-open', '가이드'],
        ] as const).map(([key, icon, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}>
            <Feather name={icon} size={21} color={tab === key ? colors.accent : colors.faint} />
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { height: 88, paddingHorizontal: 22, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 10, color: colors.accent, fontWeight: '800', letterSpacing: 1.8 },
  headerTitle: { marginTop: 3, fontSize: 22, color: colors.ink, fontWeight: '700', letterSpacing: -0.7 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.good },
  liveText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  hero: { backgroundColor: colors.darkCard, borderRadius: radius.lg, alignItems: 'center', padding: 18, paddingBottom: 23 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#253631', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 7 },
  connectionText: { color: '#C4D0CC', fontSize: 11, fontWeight: '600' },
  grade: { color: colors.white, fontSize: 18, fontWeight: '700', marginTop: 6 },
  summary: { color: '#A7B4B0', textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 7, paddingHorizontal: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  updated: { color: colors.faint, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  button: { height: 56, marginTop: 18, backgroundColor: colors.accent, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  disclaimer: { color: colors.faint, fontSize: 11, lineHeight: 17, textAlign: 'center', margin: 11 },
  tabBar: { height: 76, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.line, flexDirection: 'row', paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabText: { fontSize: 10, color: colors.faint, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  historyHead: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, marginBottom: 20 },
  historyCopy: { color: colors.muted, fontSize: 13, flex: 1 },
  clear: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  empty: { marginTop: 70, alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 36, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { marginTop: 13, fontSize: 16, color: colors.ink, fontWeight: '700' },
  emptyText: { marginTop: 7, fontSize: 12, color: colors.faint },
  historyCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center' },
  miniScore: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  miniScoreText: { fontSize: 19, fontWeight: '800' },
  historyTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  historyMeta: { marginTop: 5, color: colors.faint, fontSize: 10.5 },
  guideIntro: { backgroundColor: colors.darkCard, borderRadius: radius.lg, padding: 24, marginBottom: 14 },
  guideEyebrow: { color: '#70D1AE', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  guideTitle: { color: colors.white, marginTop: 12, fontSize: 25, lineHeight: 33, fontWeight: '700', letterSpacing: -0.8 },
  guideCopy: { color: '#A7B4B0', marginTop: 14, fontSize: 13, lineHeight: 21 },
  guideRow: { flexDirection: 'row', gap: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 18, marginBottom: 10 },
  guideNumber: { color: colors.accent, fontSize: 11, fontWeight: '800', marginTop: 3 },
  guideRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  guideName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  guideTarget: { color: colors.accent, fontSize: 11, fontWeight: '700', backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  guideRowCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
});
