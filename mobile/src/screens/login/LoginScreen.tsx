import {Ionicons} from '@expo/vector-icons';
import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {Screen} from '../../components/Screen';
import {AppButton} from '../../components/AppButton';
import {AppText} from '../../components/Typography';
import {colors, radius, spacing} from '../../constants/theme';
import {useApp} from '../../context/AppContext';

export function LoginScreen() {
  const {login, serverUrl, updateSettings} = useApp();
  const [email, setEmail] = useState('admin@netscope.local');
  const [password, setPassword] = useState('admin');
  const [apiUrl, setApiUrl] = useState(serverUrl);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const submit = async () => { try { setBusy(true); setError(''); updateSettings({serverUrl: apiUrl}); await login(email, password); } catch (e) { setError((e as Error).message); } finally {setBusy(false);} };
  return <Screen scroll={false}><KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.brand}><View style={styles.logo}><Ionicons name="pulse" size={29} color={colors.white} /></View><View><AppText variant="title">NetScope</AppText><AppText style={styles.subtitle}>Network diagnosis, made clear.</AppText></View></View>
    <View style={styles.form}>
      <View style={styles.formHeader}><AppText variant="heading">계정으로 시작하기</AppText><AppText variant="caption">진단 기록을 안전하게 불러옵니다.</AppText></View>
      <View><AppText variant="caption" style={styles.fieldLabel}>이메일</AppText><View style={styles.inputWrap}><Ionicons name="mail-outline" size={18} color={colors.textMuted} /><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor={colors.textMuted} /></View></View>
      <View><AppText variant="caption" style={styles.fieldLabel}>비밀번호</AppText><View style={styles.inputWrap}><Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} /><TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor={colors.textMuted} /></View></View>
      <Pressable onPress={() => setShowServer(value => !value)} style={styles.serverToggle}><View style={{flex: 1}}><AppText variant="label">연결 서버</AppText><AppText variant="caption" numberOfLines={1}>{apiUrl}</AppText></View><Ionicons name={showServer ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textMuted} /></Pressable>
      {showServer && <View style={styles.inputWrap}><Ionicons name="server-outline" size={18} color={colors.textMuted} /><TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" keyboardType="url" style={styles.input} placeholder="http://192.168.45.13:8000" placeholderTextColor={colors.textMuted} /></View>}
      {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><AppText variant="caption" style={{color: colors.danger, flex: 1}}>{error}</AppText></View>}
      <AppButton label={busy ? '연결 중...' : '로그인'} icon={busy ? undefined : 'arrow-forward'} disabled={busy} onPress={submit} style={{marginTop: spacing.sm}} />
    </View>
    <View style={styles.secure}><Ionicons name="shield-checkmark-outline" size={15} color={colors.textSubtle} /><AppText variant="caption">Secure connection · NetScope 0.1.0</AppText></View>
  </KeyboardAvoidingView></Screen>;
}
const styles = StyleSheet.create({root: {flex: 1, justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm}, brand: {flexDirection: 'row', alignItems: 'center', gap: spacing.md}, logo: {height: 56, width: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 20}, subtitle: {color: colors.textMuted}, form: {width: '100%', maxWidth: 420, gap: spacing.md, marginVertical: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border}, formHeader: {gap: 3, marginBottom: spacing.xs}, fieldLabel: {marginBottom: 6, marginLeft: 2}, inputWrap: {height: 52, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm}, input: {flex: 1, height: '100%', color: colors.text, fontSize: 15}, serverToggle: {minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border}, error: {flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: '#2B151B'}, secure: {flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center'}});
