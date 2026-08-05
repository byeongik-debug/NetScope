import {Ionicons} from '@expo/vector-icons';
import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, TextInput, View} from 'react-native';
import {Card} from '../../components/Card';
import {PageHeader} from '../../components/PageHeader';
import {Screen} from '../../components/Screen';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';

export function SettingsScreen() {
  const {user, serverUrl, notifications, darkMode, updateSettings, logout} = useApp();
  const [url, setUrl] = useState(serverUrl);
  const [advanced, setAdvanced] = useState(false);
  return <Screen><PageHeader eyebrow="PREFERENCES" title="설정" subtitle="계정과 진단 환경을 관리합니다" />
    <Card style={styles.profile}><View style={styles.avatar}><AppText variant="title" style={{color: colors.primary}}>{user?.displayName?.charAt(0) ?? 'N'}</AppText></View><View style={{flex: 1, gap: 3}}><AppText variant="heading">{user?.displayName ?? '사용자'}</AppText><AppText variant="caption">{user?.email}</AppText></View><View style={styles.role}><AppText variant="caption" style={{color: colors.primary}}>{user?.role}</AppText></View></Card>
    <View style={styles.sectionLabel}><AppText variant="heading">진단 설정</AppText><AppText variant="caption">PREFERENCES</AppText></View>
    <Card style={styles.group}><Setting icon="notifications-outline" title="진단 결과 알림" subtitle="위험 상태와 연결 변화를 알려드려요"><Switch value={notifications} onValueChange={value => updateSettings({notifications: value})} trackColor={{true: colors.primary}} /></Setting><View style={styles.line} /><Setting icon="moon-outline" title="다크 모드" subtitle="어두운 화면으로 눈의 피로를 줄여요"><Switch value={darkMode} onValueChange={value => updateSettings({darkMode: value})} trackColor={{true: colors.primary}} /></Setting></Card>
    <View style={styles.sectionLabel}><AppText variant="heading">앱 정보</AppText><AppText variant="caption">ABOUT</AppText></View>
    <Card style={styles.group}><Setting icon="shield-checkmark-outline" title="개인정보" subtitle="진단 기록은 로그인한 계정에 저장됩니다"><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Setting><View style={styles.line} /><Setting icon="information-circle-outline" title="NetScope" subtitle="Version 0.1.0"><AppText variant="caption">Beta</AppText></Setting></Card>
    <Pressable onPress={() => setAdvanced(value => !value)} style={styles.advancedToggle}><AppText variant="label">개발자 설정</AppText><Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} /></Pressable>
    {advanced && <Card style={{gap: spacing.md}}><View><AppText variant="label">SERVER ADDRESS</AppText><AppText variant="caption">개발 중 사용하는 진단 서버 주소</AppText></View><TextInput value={url} onChangeText={setUrl} autoCapitalize="none" style={styles.input} /><Pressable style={styles.save} onPress={() => updateSettings({serverUrl: url})}><AppText variant="label" style={{color: colors.background}}>서버 주소 저장</AppText></Pressable></Card>}
    <Pressable style={styles.logout} onPress={logout}><Ionicons name="log-out-outline" size={18} color={colors.danger} /><AppText variant="label" style={{color: colors.danger}}>로그아웃</AppText></Pressable>
  </Screen>;
}
function Setting({icon, title, subtitle, children}: React.PropsWithChildren<{icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string}>) {return <View style={styles.setting}><View style={styles.settingIcon}><Ionicons name={icon} size={19} color={colors.primary} /></View><View style={{flex: 1, gap: 2}}><AppText variant="label">{title}</AppText><AppText variant="caption">{subtitle}</AppText></View>{children}</View>;}
const styles = StyleSheet.create({profile: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg}, avatar: {width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#29457C'}, role: {backgroundColor: colors.primaryMuted, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6}, sectionLabel: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm}, group: {gap: spacing.md}, setting: {minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md}, settingIcon: {width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center'}, line: {height: 1, backgroundColor: colors.border, marginLeft: 52}, advancedToggle: {height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm}, input: {height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, color: colors.text, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border}, save: {height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'}, logout: {height: 50, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#251319', borderWidth: 1, borderColor: '#51202C'}});
