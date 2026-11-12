import * as SecureStore from 'expo-secure-store';

export type FeelingId =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'afraid'
  | 'tired'
  | 'confused'
  | 'in_pain'
  | 'need_help'
  | 'speak_feeling';

export interface FeelingHistoryEntry {
  id: string;
  feelingId: FeelingId;
  timestamp: string; // ISO string
}

const HISTORY_KEY = 'lifebuddy_feelings_history_v1';
export const FEELINGS_HISTORY_LIMIT = 50;

const VALID_FEELINGS: FeelingId[] = [
  'happy',
  'sad',
  'angry',
  'afraid',
  'tired',
  'confused',
  'in_pain',
  'need_help',
  'speak_feeling',
];

function isValidFeelingId(value: unknown): value is FeelingId {
  return typeof value === 'string' && (VALID_FEELINGS as string[]).includes(value);
}

function sanitizeEntry(value: unknown): FeelingHistoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!isValidFeelingId(v.feelingId)) return null;
  if (typeof v.timestamp !== 'string' || Number.isNaN(Date.parse(v.timestamp))) return null;
  const id = typeof v.id === 'string' && v.id ? v.id : `${v.feelingId}_${v.timestamp}`;
  return { id, feelingId: v.feelingId, timestamp: v.timestamp };
}

function normalizeHistory(entries: FeelingHistoryEntry[]): FeelingHistoryEntry[] {
  return [...entries]
    .filter((e) => isValidFeelingId(e.feelingId) && !Number.isNaN(Date.parse(e.timestamp)))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, FEELINGS_HISTORY_LIMIT);
}

export async function loadFeelingsHistory(): Promise<FeelingHistoryEntry[]> {
  const raw = await SecureStore.getItemAsync(HISTORY_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  const sanitized = parsed.map(sanitizeEntry).filter((e): e is FeelingHistoryEntry => e !== null);
  return normalizeHistory(sanitized);
}

export async function saveFeelingsHistory(entries: FeelingHistoryEntry[]): Promise<void> {
  const normalized = normalizeHistory(entries);
  await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(normalized));
}

export async function addFeelingEntry(feelingId: FeelingId): Promise<FeelingHistoryEntry[]> {
  const now = new Date().toISOString();
  const entry: FeelingHistoryEntry = {
    id: `${feelingId}_${now}_${Math.random().toString(36).slice(2, 8)}`,
    feelingId,
    timestamp: now,
  };
  const existing = await loadFeelingsHistory().catch(() => []);
  const next = normalizeHistory([entry, ...existing]);
  await saveFeelingsHistory(next);
  return next;
}

export async function clearFeelingsHistory(): Promise<void> {
  await SecureStore.deleteItemAsync(HISTORY_KEY);
}
