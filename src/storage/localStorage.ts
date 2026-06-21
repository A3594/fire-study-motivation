import type { AppStateSnapshot, Plan, Settings, StudyRecord } from '../types';

const PREFIX = 'fire-study-motivation';
const SETTINGS_KEY = `${PREFIX}:settings`;
const PLAN_KEY = `${PREFIX}:plan`;
const RECORDS_KEY = `${PREFIX}:records`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  loadSettings: () => readJson<Settings | null>(SETTINGS_KEY, null),
  saveSettings: (settings: Settings) => writeJson(SETTINGS_KEY, settings),
  loadPlan: () => readJson<Plan | null>(PLAN_KEY, null),
  savePlan: (plan: Plan) => writeJson(PLAN_KEY, plan),
  loadRecords: () => readJson<StudyRecord[]>(RECORDS_KEY, []),
  saveRecords: (records: StudyRecord[]) => writeJson(RECORDS_KEY, records),
  exportSnapshot(settings: Settings, plan: Plan, records: StudyRecord[]): string {
    const snapshot: AppStateSnapshot = { settings, plan, records };
    return JSON.stringify(snapshot, null, 2);
  },
  importSnapshot(raw: string): AppStateSnapshot {
    const parsed = JSON.parse(raw) as AppStateSnapshot;
    if (!parsed.settings || !parsed.plan || !Array.isArray(parsed.records)) {
      throw new Error('데이터 형식이 올바르지 않습니다.');
    }
    return parsed;
  },
  clearAll() {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(RECORDS_KEY);
  },
};
