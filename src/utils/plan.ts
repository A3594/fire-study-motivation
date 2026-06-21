import { DEFAULT_SETTINGS } from '../constants/defaults';
import type { IntensityMode, Plan, Settings, StudyPhase, StudyRecord, TodayMode } from '../types';
import { getDday, isWeekend, nowIso, toDateKey } from './date';
import { createId } from './id';

export function calculatePhase(settings: Pick<Settings, 'firstExamDate' | 'secondExamDate'>, today = toDateKey()): StudyPhase {
  const firstDday = getDday(settings.firstExamDate, today);
  const secondDday = getDday(settings.secondExamDate, today);

  if (firstDday >= 240) return '재시작 단계';
  if (firstDday >= 150) return '1회독 구축 단계';
  if (firstDday >= 60) return '1차 안정화 단계';
  if (firstDday >= 0) return '1차 빡공 단계';
  if (secondDday >= 45) return '2차 전환 단계';
  return '2차 빡공 단계';
}

export function createInitialPlan(settings: Settings): Plan {
  const now = nowIso();
  const objectiveGoal = settings.defaultObjectiveNewCardGoal ?? settings.defaultNewCardGoal;
  const subjectiveGoal = settings.defaultSubjectiveNewCardGoal ?? 2;
  return {
    id: createId('plan'),
    firstExamDate: settings.firstExamDate,
    secondExamDate: settings.secondExamDate,
    startDate: toDateKey(),
    currentPhase: calculatePhase(settings),
    currentNewCardGoal: objectiveGoal,
    currentObjectiveNewCardGoal: objectiveGoal,
    currentSubjectiveNewCardGoal: subjectiveGoal,
    weekdayAvailableMinutes: settings.weekdayAvailableMinutes,
    weekendAvailableMinutes: settings.weekendAvailableMinutes,
    weeklyGoals: buildWeeklyGoals(calculatePhase(settings), objectiveGoal, subjectiveGoal),
    monthlyGoals: buildMonthlyGoals(calculatePhase(settings)),
    intensityMode: 'normal',
    createdAt: now,
    updatedAt: now,
  };
}

export function syncPlanWithSettings(plan: Plan, settings: Settings): Plan {
  const phase = calculatePhase(settings);
  const normalized = normalizePlan(plan, settings) ?? plan;
  return {
    ...normalized,
    firstExamDate: settings.firstExamDate,
    secondExamDate: settings.secondExamDate,
    currentPhase: phase,
    weekdayAvailableMinutes: settings.weekdayAvailableMinutes,
    weekendAvailableMinutes: settings.weekendAvailableMinutes,
    updatedAt: nowIso(),
  };
}

export function buildWeeklyGoals(phase: StudyPhase, objectiveGoal: number, subjectiveGoal: number): string[] {
  if (phase === '재시작 단계') {
    return ['ANKI 복습을 끊지 않기', '보기 전 백지회상 3분 붙이기', `1차 신규카드 ${objectiveGoal}장`, `2차 신규카드 ${subjectiveGoal}개`];
  }
  if (phase === '1회독 구축 단계') {
    return [`1차 객관식 ${objectiveGoal}장씩 문서별 완주`, '1일/3일/7일 간격 회상 유지', '부족한 ANKI 카드 제작', `2차 주관식 ${subjectiveGoal}개씩 유지`];
  }
  if (phase === '1차 안정화 단계') {
    return ['1차 과락 위험 과목 확인', 'ANKI 오답 복습 우선', '2차 목차 감각 유지'];
  }
  if (phase === '1차 빡공 단계') {
    return ['복습과 오답을 최우선', '신규학습은 필요할 때만', '객관식 실전 속도 점검'];
  }
  if (phase === '2차 전환 단계') {
    return ['주관식 키워드와 목차 전환', '화재안전기준 반복', '답안 틀 만들기'];
  }
  return ['답안 작성 훈련', '시간관리', '출력해서 보는 복습 강화'];
}

export function buildMonthlyGoals(phase: StudyPhase): string[] {
  if (phase === '재시작 단계') return ['복습 습관 복구', 'Logseq/PDF와 ANKI 문서 범위 맞추기', '백지회상과 ANKI due 카드 우선', '1차와 2차를 작게 같이 시작'];
  if (phase === '1회독 구축 단계') return ['1차 Logseq 문서 1회독 큰 틀 완성', '빠진 ANKI 카드 보강', '1일/3일/7일 회상 루틴 만들기', '2차 목차/키워드 유지'];
  if (phase === '1차 안정화 단계') return ['객관식 안정권 진입', '취약 과목 반복', '2차 목차 감각 유지'];
  if (phase === '1차 빡공 단계') return ['1차 합격 안정권', '복습 밀림 방지', '문제풀이 회전수 확보'];
  if (phase === '2차 전환 단계') return ['주관식 중심 전환', '법령·기준 키워드 정리', '답안 구조 고정'];
  return ['2차 답안 출력 훈련', '시간 배분', '암기 누락 압축'];
}

export function getTodayMode(plan: Plan, records: StudyRecord[], today = toDateKey()): TodayMode {
  const yesterday = records.find((record) => record.date === shiftDate(today, -1));
  if (plan.intensityMode === 'hard') return '빡공 모드';
  if (yesterday && !yesterday.reviewCompleted) return '복습 복구 모드';
  if (isWeekend(today)) return '주말 제작 모드';
  return '평일 암기 모드';
}

export function applyIntensity(plan: Plan, mode: IntensityMode, settings: Settings = DEFAULT_SETTINGS): Plan {
  const normalized = normalizePlan(plan, settings) ?? plan;
  const nextObjectiveGoal =
    mode === 'hard'
      ? Math.min(settings.stableMaxObjectiveNewCardGoal, normalized.currentObjectiveNewCardGoal + 2)
      : mode === 'ease'
        ? Math.max(settings.minNewCardGoal, normalized.currentObjectiveNewCardGoal - 2)
        : normalized.currentObjectiveNewCardGoal;
  const nextSubjectiveGoal =
    mode === 'hard'
      ? Math.min(settings.stableMaxSubjectiveNewCardGoal, normalized.currentSubjectiveNewCardGoal + 1)
      : mode === 'ease'
        ? Math.max(settings.minNewCardGoal, normalized.currentSubjectiveNewCardGoal - 1)
        : normalized.currentSubjectiveNewCardGoal;

  return {
    ...normalized,
    intensityMode: mode,
    currentNewCardGoal: nextObjectiveGoal,
    currentObjectiveNewCardGoal: nextObjectiveGoal,
    currentSubjectiveNewCardGoal: nextSubjectiveGoal,
    weeklyGoals: buildWeeklyGoals(normalized.currentPhase, nextObjectiveGoal, nextSubjectiveGoal),
    monthlyGoals: buildMonthlyGoals(normalized.currentPhase),
    updatedAt: nowIso(),
  };
}

export function adjustWeeklyGoal(plan: Plan, delta: number, settings: Settings): Plan {
  const normalized = normalizePlan(plan, settings) ?? plan;
  const objectiveMax =
    normalized.currentObjectiveNewCardGoal >= settings.initialMaxObjectiveNewCardGoal ? settings.stableMaxObjectiveNewCardGoal : settings.initialMaxObjectiveNewCardGoal;
  const subjectiveMax =
    normalized.currentSubjectiveNewCardGoal >= settings.initialMaxSubjectiveNewCardGoal ? settings.stableMaxSubjectiveNewCardGoal : settings.initialMaxSubjectiveNewCardGoal;
  const nextObjective = Math.max(settings.minNewCardGoal, Math.min(objectiveMax, normalized.currentObjectiveNewCardGoal + delta));
  const nextSubjective = Math.max(settings.minNewCardGoal, Math.min(subjectiveMax, normalized.currentSubjectiveNewCardGoal + Math.sign(delta)));
  return {
    ...normalized,
    currentNewCardGoal: nextObjective,
    currentObjectiveNewCardGoal: nextObjective,
    currentSubjectiveNewCardGoal: nextSubjective,
    weeklyGoals: buildWeeklyGoals(normalized.currentPhase, nextObjective, nextSubjective),
    updatedAt: nowIso(),
  };
}

export function normalizePlan(plan: Plan | null, settings: Settings = DEFAULT_SETTINGS): Plan | null {
  if (!plan) return null;
  const legacy = plan as Plan & { currentObjectiveNewCardGoal?: number; currentSubjectiveNewCardGoal?: number; currentNewCardGoal?: number };
  const objectiveGoal = legacy.currentObjectiveNewCardGoal ?? legacy.currentNewCardGoal ?? settings.defaultObjectiveNewCardGoal ?? settings.defaultNewCardGoal;
  const subjectiveGoal = legacy.currentSubjectiveNewCardGoal ?? settings.defaultSubjectiveNewCardGoal ?? 2;
  return {
    ...plan,
    currentNewCardGoal: objectiveGoal,
    currentObjectiveNewCardGoal: objectiveGoal,
    currentSubjectiveNewCardGoal: subjectiveGoal,
    weeklyGoals: plan.weeklyGoals?.length ? plan.weeklyGoals : buildWeeklyGoals(plan.currentPhase, objectiveGoal, subjectiveGoal),
  };
}

function shiftDate(dateKey: string, days: number): string {
  const date = new Date(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}
