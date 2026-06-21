import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings } from '../constants/defaults';
import { writeCardCountOverrides } from '../constants/studyCatalog';
import { storage } from '../storage/localStorage';
import type { Condition, CoreCheckKey, DailyTask, Plan, Settings, StudyRecord, TabKey } from '../types';
import { toDateKey } from '../utils/date';
import { adjustWeeklyGoal, applyIntensity, calculatePhase, createInitialPlan, getTodayMode, normalizePlan, syncPlanWithSettings } from '../utils/plan';
import { applyCoreCheck, buildRecordFromTasks, createTask, generateTodayTasks } from '../utils/tasks';

export function useStudyApp() {
  const [settings, setSettings] = useState<Settings | null>(() => normalizeSettings(storage.loadSettings()));
  const [plan, setPlan] = useState<Plan | null>(() => normalizePlan(storage.loadPlan(), normalizeSettings(storage.loadSettings()) ?? DEFAULT_SETTINGS));
  const [records, setRecords] = useState<StudyRecord[]>(() => storage.loadRecords());
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [today, setToday] = useState(() => toDateKey());
  const [catalogSyncTick, setCatalogSyncTick] = useState(0);

  const initialized = Boolean(settings && plan);

  useEffect(() => {
    if (!settings || !plan) return;
    setTodayTasks(generateTodayTasks(plan, settings, records, today));
  }, [settings, plan, records, today, catalogSyncTick]);

  useEffect(() => {
    let cancelled = false;

    async function syncCardCounts() {
      try {
        const response = await fetch('http://127.0.0.1:3217/api/pages');
        if (!response.ok) return;
        const data = await response.json() as { groups?: Array<{ pages?: Array<{ id: string; cardCount?: number }> }> };
        const counts: Record<string, number> = {};
        data.groups?.forEach((group) => {
          group.pages?.forEach((page) => {
            if (page.id) counts[page.id] = Number(page.cardCount ?? 0);
          });
        });
        if (Object.keys(counts).length === 0 || cancelled) return;
        writeCardCountOverrides(counts);
        setCatalogSyncTick((value) => value + 1);
      } catch {
        // PDF server may be closed; keep bundled card counts.
      }
    }

    syncCardCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let midnightTimer = 0;
    const syncToday = () => setToday(toDateKey());
    const scheduleMidnightSync = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0);
      midnightTimer = window.setTimeout(() => {
        syncToday();
        scheduleMidnightSync();
      }, nextMidnight.getTime() - now.getTime());
    };

    syncToday();
    scheduleMidnightSync();
    return () => window.clearTimeout(midnightTimer);
  }, []);

  const todayMode = useMemo(() => (plan ? getTodayMode(plan, records, today) : '평일 암기 모드'), [plan, records, today]);
  const todayRecord = useMemo(() => records.find((record) => record.date === today), [records, today]);

  function completeOnboarding(nextSettings: Settings) {
    const normalized = normalizeSettings({ ...DEFAULT_SETTINGS, ...nextSettings }) ?? DEFAULT_SETTINGS;
    const nextPlan = createInitialPlan(normalized);
    setSettings(normalized);
    setPlan(nextPlan);
    storage.saveSettings(normalized);
    storage.savePlan(nextPlan);
    storage.saveRecords([]);
    setRecords([]);
  }

  function updateSettings(nextSettings: Settings) {
    const normalizedSettings = normalizeSettings(nextSettings) ?? DEFAULT_SETTINGS;
    setSettings(normalizedSettings);
    storage.saveSettings(normalizedSettings);
    if (plan) {
      const synced = syncPlanWithSettings(plan, normalizedSettings);
      setPlan(synced);
      storage.savePlan(synced);
    }
  }

  function savePlan(nextPlan: Plan) {
    const synced = { ...nextPlan, currentPhase: calculatePhase(nextPlan), updatedAt: new Date().toISOString() };
    setPlan(synced);
    storage.savePlan(synced);
  }

  function lowerWeekGoal() {
    if (!plan || !settings) return;
    savePlan(adjustWeeklyGoal(plan, -1, settings));
  }

  function keepWeekGoal() {
    if (!plan) return;
    savePlan({ ...plan, intensityMode: 'normal' });
  }

  function raiseNextWeekGoal() {
    if (!plan || !settings) return;
    savePlan(adjustWeeklyGoal(plan, 1, settings));
  }

  function setHardMode() {
    if (!plan || !settings) return;
    savePlan(applyIntensity(plan, 'hard', settings));
  }

  function setEaseMode() {
    if (!plan || !settings) return;
    savePlan(applyIntensity(plan, 'ease', settings));
  }

  function regeneratePlan() {
    if (!settings) return;
    const next = createInitialPlan(settings);
    setPlan(next);
    storage.savePlan(next);
  }

  function updateTodayTask(taskId: string, patch: Partial<DailyTask>) {
    setTodayTasks((tasks) =>
      tasks.map((task) => {
        if (task.id !== taskId) return task;
        const next = { ...task, ...patch, updatedAt: new Date().toISOString() };
        if (patch.actualCount !== undefined && next.targetCount > 0 && next.actualCount >= next.targetCount) {
          next.isCompleted = true;
        }
        return next;
      }),
    );
  }

  function addTodayTask() {
    setTodayTasks((tasks) => [...tasks, createTask(today)]);
  }

  function deleteTodayTask(taskId: string) {
    setTodayTasks((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  function persistTodayRecord(tasks: DailyTask[], condition: Condition, studyMinutes: number, memo: string) {
    if (!plan) return;
    const record = buildRecordFromTasks(today, plan, todayMode, tasks, condition, studyMinutes, memo);
    setRecords((prevRecords) => {
      const existing = prevRecords.find((item) => item.date === today);
      const merged = existing ? { ...record, id: existing.id, createdAt: existing.createdAt } : record;
      const nextRecords = [merged, ...prevRecords.filter((item) => item.date !== today)].sort((a, b) => b.date.localeCompare(a.date));
      storage.saveRecords(nextRecords);
      return nextRecords;
    });
  }

  function updateCoreCheck(key: CoreCheckKey, checked: boolean, condition: Condition, studyMinutes: number, memo: string) {
    setTodayTasks((tasks) => {
      const nextTasks = applyCoreCheck(tasks, key, checked);
      persistTodayRecord(nextTasks, condition, studyMinutes, memo);
      return nextTasks;
    });
  }

  function saveTodayRecord(condition: Condition, studyMinutes: number, memo: string) {
    persistTodayRecord(todayTasks, condition, studyMinutes, memo);
  }

  function updateRecord(record: StudyRecord) {
    const nextRecords = records.map((item) => (item.id === record.id ? { ...record, updatedAt: new Date().toISOString() } : item));
    setRecords(nextRecords);
    storage.saveRecords(nextRecords);
  }

  function deleteRecord(recordId: string) {
    const nextRecords = records.filter((record) => record.id !== recordId);
    setRecords(nextRecords);
    storage.saveRecords(nextRecords);
  }

  function exportData() {
    if (!settings || !plan) return '';
    return storage.exportSnapshot(settings, plan, records);
  }

  function importData(raw: string) {
    const snapshot = storage.importSnapshot(raw);
    const normalizedSettings = normalizeSettings(snapshot.settings) ?? DEFAULT_SETTINGS;
    const normalizedPlan = normalizePlan(snapshot.plan, normalizedSettings);
    setSettings(normalizedSettings);
    setPlan(normalizedPlan);
    setRecords(snapshot.records);
    storage.saveSettings(normalizedSettings);
    if (normalizedPlan) storage.savePlan(normalizedPlan);
    storage.saveRecords(snapshot.records);
  }

  function resetAll() {
    storage.clearAll();
    setSettings(null);
    setPlan(null);
    setRecords([]);
    setTodayTasks([]);
    setActiveTab('today');
  }

  return {
    initialized,
    settings,
    plan,
    records,
    activeTab,
    today,
    todayMode,
    todayRecord,
    todayTasks,
    completeOnboarding,
    updateSettings,
    savePlan,
    lowerWeekGoal,
    keepWeekGoal,
    raiseNextWeekGoal,
    setHardMode,
    setEaseMode,
    regeneratePlan,
    setActiveTab,
    updateTodayTask,
    updateCoreCheck,
    addTodayTask,
    deleteTodayTask,
    saveTodayRecord,
    updateRecord,
    deleteRecord,
    exportData,
    importData,
    resetAll,
  };
}
