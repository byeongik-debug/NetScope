import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getAccessToken, getApiBaseUrl, setAccessToken, setApiBaseUrl} from '../api/client';
import {networkService} from '../services/networkService';
import {notificationService} from '../services/notificationService';
import {AppUser, DashboardSummary, Device, DeviceCreate, DeviceUpdate, DiagnosticResult, Incident, NetworkEvent, OperationsAnalytics} from '../types';

interface AppState {
  authenticated: boolean;
  user?: AppUser;
  connectionType: string;
  internetAvailable: boolean;
  loading: boolean;
  devices: Device[];
  events: NetworkEvent[];
  incidents: Incident[];
  summary?: DashboardSummary;
  analytics?: OperationsAnalytics;
  serverUrl: string;
  notifications: boolean;
  darkMode: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  refresh(): Promise<void>;
  addDevice(payload: DeviceCreate): Promise<Device>;
  updateDevice(id: number, payload: DeviceUpdate): Promise<Device>;
  deleteDevice(id: number): Promise<void>;
  diagnoseDevice(id: number): Promise<DiagnosticResult>;
  resolveIncident(id: number): Promise<void>;
  acknowledgeIncident(id: number, note?: string): Promise<void>;
  addIncidentNote(id: number, note: string): Promise<void>;
  updateIncidentWorkflow(id: number, status: Incident['status'], assignedToId?: number, note?: string): Promise<void>;
  updateSettings(values: {serverUrl?: string; notifications?: boolean; darkMode?: boolean}): void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({children}: React.PropsWithChildren) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AppUser>();
  const [connectionType, setConnectionType] = useState('UNKNOWN');
  const [internetAvailable, setInternetAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>();
  const [analytics, setAnalytics] = useState<OperationsAnalytics>();
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextSummary, nextDevices, nextEvents, nextIncidents, nextAnalytics] = await Promise.all([
      networkService.getSummary(), networkService.getDevices(), networkService.getEvents(), networkService.getIncidents(), networkService.getOperationsAnalytics()
    ]);
    setSummary(nextSummary); setDevices(nextDevices); setEvents(nextEvents); setIncidents(nextIncidents);
    setAnalytics(nextAnalytics);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    AsyncStorage.getItem('serverUrl').then(saved => {
      if (saved) {setServerUrl(saved); setApiBaseUrl(saved);}
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const applyNetworkState = (state: Network.NetworkState) => {
      setConnectionType(String(state.type).replace('NetworkStateType.', ''));
      setInternetAvailable(Boolean(state.isInternetReachable));
    };
    Network.getNetworkStateAsync().then(applyNetworkState).catch(() => undefined);
    const subscription = Network.addNetworkStateListener(applyNetworkState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const token = getAccessToken();
    if (!token) return;
    const url = serverUrl.replace(/^http/, 'ws');
    const socket = new WebSocket(`${url}/ws/events?token=${encodeURIComponent(token)}`);
    socket.onmessage = event => {
      const next = JSON.parse(event.data) as NetworkEvent;
      setEvents(current => [next, ...current].slice(0, 50));
      if (notifications && (next.severity === 'Critical' || next.severity === 'High')) {
        notificationService.notifyIncident(next).catch(() => undefined);
      }
    };
    return () => socket.close();
  }, [serverUrl, notifications, authenticated]);

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) throw new Error('이메일과 비밀번호를 입력하세요.');
    const result = await networkService.login(email.trim(), password);
    setAccessToken(result.accessToken);
    await AsyncStorage.setItem('accessToken', result.accessToken);
    setUser(result.user); setAuthenticated(true);
    await refresh();
  };
  const logout = () => {setAccessToken(null); AsyncStorage.removeItem('accessToken'); setUser(undefined); setAuthenticated(false);};
  const resolveIncident = async (id: number) => {
    try { await networkService.resolveIncident(id); } catch { /* offline demo */ }
    setIncidents(current => current.map(item => item.id === id ? {...item, status: 'Resolved', resolvedAt: new Date().toISOString()} : item));
  };
  const acknowledgeIncident = async (id: number, note?: string) => {
    const updated = await networkService.acknowledgeIncident(id, note);
    setIncidents(current => current.map(item => item.id === id ? updated : item));
  };
  const addIncidentNote = async (id: number, note: string) => { await networkService.addIncidentNote(id, note); };
  const updateIncidentWorkflow = async (id: number, status: Incident['status'], assignedToId?: number, note?: string) => {
    const updated = await networkService.updateIncidentWorkflow(id, {status, assignedToId, note});
    setIncidents(current => current.map(item => item.id === id ? updated : item));
    setAnalytics(await networkService.getOperationsAnalytics());
  };
  const addDevice = async (payload: DeviceCreate) => {
    const device = await networkService.addDevice(payload);
    setDevices(current => [...current, device]);
    await refresh();
    return device;
  };
  const diagnoseDevice = async (id: number) => {
    const result = await networkService.diagnoseDevice(id);
    await refresh();
    return result;
  };
  const updateDevice = async (id: number, payload: DeviceUpdate) => {
    const device = await networkService.updateDevice(id, payload);
    setDevices(current => current.map(item => item.id === id ? device : item));
    return device;
  };
  const deleteDevice = async (id: number) => {
    await networkService.deleteDevice(id);
    setDevices(current => current.filter(item => item.id !== id));
    setEvents(current => current.filter(item => item.deviceId !== id));
    setIncidents(current => current.filter(item => item.deviceId !== id));
  };
  const updateSettings = (values: {serverUrl?: string; notifications?: boolean; darkMode?: boolean}) => {
    if (values.serverUrl) { setServerUrl(values.serverUrl); setApiBaseUrl(values.serverUrl); AsyncStorage.setItem('serverUrl', values.serverUrl); }
    if (values.notifications !== undefined) setNotifications(values.notifications);
    if (values.darkMode !== undefined) setDarkMode(values.darkMode);
  };

  const value = useMemo(() => ({authenticated, user, connectionType, internetAvailable, loading, devices, events, incidents, summary, analytics, serverUrl, notifications, darkMode, login, logout, refresh, addDevice, updateDevice, deleteDevice, diagnoseDevice, resolveIncident, acknowledgeIncident, addIncidentNote, updateIncidentWorkflow, updateSettings}), [authenticated, user, connectionType, internetAvailable, loading, devices, events, incidents, summary, analytics, serverUrl, notifications, darkMode, refresh]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
};
