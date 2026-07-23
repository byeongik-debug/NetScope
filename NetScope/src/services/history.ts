import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiagnosticResult } from '../types/diagnostic';

const KEY = '@netscope/history/v1';

export async function getHistory(): Promise<DiagnosticResult[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DiagnosticResult[];
  } catch {
    return [];
  }
}

export async function saveResult(result: DiagnosticResult) {
  const history = await getHistory();
  await AsyncStorage.setItem(KEY, JSON.stringify([result, ...history].slice(0, 30)));
}

export async function clearHistory() {
  await AsyncStorage.removeItem(KEY);
}
