import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@commute_companion_cancellations';
const MAX_CANCELLATIONS = 3;
const WINDOW_DAYS = 7;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

interface CancellationData {
  count: number;
  timestamps: number[];
}

async function getCancellationData(): Promise<CancellationData> {
  try {
    const dataStr = await AsyncStorage.getItem(STORAGE_KEY);
    if (!dataStr) return { count: 0, timestamps: [] };
    return JSON.parse(dataStr);
  } catch {
    return { count: 0, timestamps: [] };
  }
}

async function setCancellationData(data: CancellationData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save cancellation data', e);
  }
}

export async function recordCancellation(): Promise<void> {
  const data = await getCancellationData();
  const now = Date.now();
  data.timestamps.push(now);
  data.count += 1;
  await setCancellationData(data);
  await resetOldCancellations(); // cleanup
}

export async function resetOldCancellations(): Promise<void> {
  const data = await getCancellationData();
  const now = Date.now();
  
  // Keep only timestamps within the window
  const validTimestamps = data.timestamps.filter(ts => (now - ts) <= WINDOW_MS);
  
  if (validTimestamps.length !== data.timestamps.length) {
    data.timestamps = validTimestamps;
    data.count = validTimestamps.length;
    await setCancellationData(data);
  }
}

export async function getCancellationWarning(): Promise<string | null> {
  await resetOldCancellations();
  const data = await getCancellationData();
  
  if (data.count >= MAX_CANCELLATIONS) {
    return `Warning: You have cancelled ${data.count} rides in the past ${WINDOW_DAYS} days. Frequent cancellations may lead to account restrictions.`;
  }
  return null;
}
