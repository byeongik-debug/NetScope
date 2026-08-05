import {Ionicons} from '@expo/vector-icons';
import {DarkTheme, NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {colors} from '../constants/theme';
import {useApp} from '../context/AppContext';
import {MyNetworkDiagnosticScreen} from '../screens/diagnostics/MyNetworkDiagnosticScreen';
import {DashboardScreen} from '../screens/dashboard/DashboardScreen';
import {ClientHistoryScreen} from '../screens/history/ClientHistoryScreen';
import {ClientDiagnosticDetailScreen} from '../screens/history/ClientDiagnosticDetailScreen';
import {InsightsScreen} from '../screens/insights/InsightsScreen';
import {LoginScreen} from '../screens/login/LoginScreen';
import {SettingsScreen} from '../screens/settings/SettingsScreen';
import {WifiSurveyListScreen} from '../screens/survey/WifiSurveyListScreen';
import {WifiSurveyDetailScreen} from '../screens/survey/WifiSurveyDetailScreen';
import {MainTabParamList, RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const tabs: Array<{name: keyof MainTabParamList; label: string; component: React.ComponentType<any>; icon: keyof typeof Ionicons.glyphMap}> = [
    {name: 'Home', label: '홈', component: DashboardScreen, icon: 'home-outline'},
    {name: 'Diagnose', label: '진단', component: MyNetworkDiagnosticScreen, icon: 'pulse-outline'},
    {name: 'History', label: '기록', component: ClientHistoryScreen, icon: 'time-outline'},
    {name: 'Insights', label: '분석', component: InsightsScreen, icon: 'bar-chart-outline'},
    {name: 'Settings', label: '설정', component: SettingsScreen, icon: 'settings-outline'}
  ];
  return <Tab.Navigator screenOptions={{headerShown: false, tabBarStyle: {position: 'absolute', left: 12, right: 12, bottom: 8, backgroundColor: '#111821FA', borderTopColor: colors.border, borderWidth: 1, borderColor: colors.border, height: 70, paddingTop: 8, paddingBottom: 8, borderRadius: 22, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: {width: 0, height: 10}}, tabBarItemStyle: {borderRadius: 16}, tabBarLabelStyle: {fontSize: 10, fontWeight: '600'}, tabBarActiveTintColor: colors.primarySoft, tabBarInactiveTintColor: colors.textSubtle}}>
    {tabs.map(tab => <Tab.Screen key={tab.name} name={tab.name} component={tab.component} options={{tabBarLabel: tab.label, tabBarIcon: ({color, focused}) => <Ionicons name={focused ? tab.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : tab.icon} color={color} size={21} />}} />)}
  </Tab.Navigator>;
}

export function RootNavigator() {
  const {authenticated} = useApp();
  return <NavigationContainer theme={{...DarkTheme, colors: {...DarkTheme.colors, background: colors.background, card: colors.surface, border: colors.border, primary: colors.primary, text: colors.text}}}>
    <Stack.Navigator screenOptions={{headerStyle: {backgroundColor: colors.background}, headerShadowVisible: false, headerTintColor: colors.text, headerTitleStyle: {fontWeight: '700'}, contentStyle: {backgroundColor: colors.background}, animation: 'slide_from_right'}}>
      {!authenticated ? <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} /> : <>
        <Stack.Screen name="Main" component={MainTabs} options={{headerShown: false}} />
        <Stack.Screen name="ClientDiagnosticDetail" component={ClientDiagnosticDetailScreen} options={{title: '진단 기록'}} />
        <Stack.Screen name="WifiSurveyList" component={WifiSurveyListScreen} options={{title: '공간 품질 측정'}} />
        <Stack.Screen name="WifiSurveyDetail" component={WifiSurveyDetailScreen} options={{title: 'Site Survey'}} />
      </>}
    </Stack.Navigator>
  </NavigationContainer>;
}
