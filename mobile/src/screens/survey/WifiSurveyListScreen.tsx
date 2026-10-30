import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Alert, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {PageHeader} from '../../components/PageHeader';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {RootStackParamList} from '../../navigation/types';
import {wifiSurveyService} from '../../services/wifiSurveyService';
import {WifiSurveySummary} from '../../types';
import {formatDateTime} from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'WifiSurveyList'>;

export function WifiSurveyListScreen({navigation}: Props) {
  const [items, setItems] = useState<WifiSurveySummary[]>([]);
  const [name, setName] = useState('우리집 Wi-Fi 최적화');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(() => wifiSurveyService.list().then(setItems).catch(cause => setError((cause as Error).message)), []);
  useFocusEffect(useCallback(() => {load();}, [load]));
  const create = async () => {
    if (!name.trim()) return;
    try {setCreating(true); setError(''); const item = await wifiSurveyService.create(name.trim()); navigation.navigate('WifiSurveyDetail', {surveyId: item.id});}
    catch (cause) {setError((cause as Error).message);} finally {setCreating(false);}
  };
  const remove = (item: WifiSurveySummary) => Alert.alert(
    '측정 프로젝트 삭제',
    `‘${item.name}’의 공간 측정 결과를 모두 삭제할까요?\n네트워크 진단 이력은 유지됩니다.`,
    [
      {text: '취소', style: 'cancel'},
      {text: '삭제', style: 'destructive', onPress: async () => {
        try {setError(''); await wifiSurveyService.remove(item.id); await load();}
        catch (cause) {setError((cause as Error).message);}
      }},
    ],
  );
  return <Screen><PageHeader eyebrow="WI-FI SITE SURVEY" title="공간 품질 측정" subtitle="방마다 반복 측정해 공유기 배치 전후를 비교합니다" />
    <Card style={styles.guide}><View style={styles.guideIcon}><Ionicons name="home-outline" size={24} color={colors.primarySoft} /></View><View style={{flex: 1, gap: 3}}><AppText variant="label">측정 조건을 일정하게 유지하세요</AppText><AppText variant="caption">노트북은 고정하고 아이폰만 각 장소로 이동하세요. 같은 장소를 3회 이상 측정하면 결과 신뢰도가 높아집니다.</AppText></View></Card>
    <View style={styles.create}><TextInput value={name} onChangeText={setName} maxLength={120} style={styles.input} placeholder="프로젝트 이름" placeholderTextColor={colors.textMuted} /><Pressable disabled={creating} onPress={create} style={styles.createButton}><Ionicons name="add" size={20} color={colors.white} /><AppText variant="label">{creating ? '생성 중' : '새 측정'}</AppText></Pressable></View>
    {!!error && <Card style={styles.error}><Ionicons name="alert-circle-outline" size={19} color={colors.danger} /><AppText variant="caption" style={{color: colors.danger, flex: 1}}>{error}</AppText></Card>}
    <View style={styles.section}><AppText variant="heading">측정 프로젝트</AppText><AppText variant="caption">{items.length}개</AppText></View>
    {!items.length ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="map-outline" size={30} color={colors.primary} /></View><AppText variant="heading">첫 공간 측정을 시작하세요</AppText><AppText variant="caption" style={{textAlign: 'center'}}>공유기 위치를 바꾸기 전과 후에 같은 방을 측정하면 가장 균일한 배치를 찾을 수 있습니다.</AppText></View> : items.map(item => <Card key={item.id} style={styles.item}><Pressable onPress={() => navigation.navigate('WifiSurveyDetail', {surveyId: item.id})} style={({pressed}) => [styles.itemMain, pressed && {opacity: 0.65}]}><View style={styles.itemIcon}><Ionicons name="map-outline" size={21} color={colors.primarySoft} /></View><View style={{flex: 1, gap: 3}}><AppText variant="label">{item.name}</AppText><AppText variant="caption">{formatDateTime(item.createdAt)} · 배치안 {item.placementCount}개</AppText><AppText variant="caption">누적 측정 {item.measurementCount}회</AppText></View><Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${item.name} 삭제`} hitSlop={8} onPress={() => remove(item)} style={({pressed}) => [styles.deleteButton, pressed && {opacity: 0.55}]}><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable></Card>)}
  </Screen>;
}

const styles = StyleSheet.create({guide: {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderColor: colors.borderStrong}, guideIcon: {width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, create: {gap: spacing.sm}, input: {height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, color: colors.text, paddingHorizontal: spacing.md}, createButton: {height: 50, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm}, error: {flexDirection: 'row', gap: spacing.sm, borderColor: colors.danger}, section: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm}, empty: {alignItems: 'center', gap: spacing.sm, paddingVertical: 54, paddingHorizontal: spacing.xl}, emptyIcon: {width: 62, height: 62, borderRadius: 21, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, item: {flexDirection: 'row', alignItems: 'center', padding: 0, overflow: 'hidden'}, itemMain: {flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md}, itemIcon: {width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, deleteButton: {width: 52, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border, backgroundColor: colors.surfaceRaised}});
