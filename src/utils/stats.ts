import type { DailyCoreChecks, Plan, Settings, StudyRecord } from '../types';
import { addDays, toDateKey } from './date';
import { getAdaptiveDailyGoals } from './mastery';
import { getCoreChecks } from './tasks';

export interface StudyStats {
  streakDays: number;
  last7AverageRate: number;
  last7ReviewRate: number;
  last7ObjectiveAnkiRate: number;
  last7ObjectivePageRate: number;
  last7SubjectiveAnkiRate: number;
  last7SubjectivePageRate: number;
  last7PageRate: number;
  last7BedtimeRate: number;
  last7CoreRate: number;
  weeklyObjectiveCount: number;
  weeklySubjectiveCount: number;
  weeklyCreationCount: number;
  recommendedNewCardGoal: number;
  recommendedObjectiveNewCardGoal: number;
  recommendedSubjectiveNewCardGoal: number;
  adjustmentReason: string;
  motivationMessage: string;
  weakSubject: string;
  staleSubject: string;
}

export function calculateStats(records: StudyRecord[], plan: Plan, settings: Settings, today = toDateKey()): StudyStats {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const last7 = sorted.filter((record) => record.date >= addDays(today, -6) && record.date <= today);
  const thisWeek = records.filter((record) => record.date >= addDays(today, -6) && record.date <= today);
  const coreChecks = last7.map(getRecordCoreChecks);
  const objectiveAnkiCount = coreChecks.filter((checks) => checks.objectiveAnki).length;
  const objectivePageCount = coreChecks.filter((checks) => checks.objectivePage).length;
  const subjectiveAnkiCount = coreChecks.filter((checks) => checks.subjectiveAnki).length;
  const subjectivePageCount = coreChecks.filter((checks) => checks.subjectivePage).length;
  const reviewCount = coreChecks.filter((checks) => checks.objectiveAnki || checks.subjectiveAnki).length;
  const pageCount = coreChecks.filter((checks) => checks.objectivePage || checks.subjectivePage).length;
  const bedtimeCount = coreChecks.filter((checks) => checks.bedtimeAnki).length;
  const corePointTotal = coreChecks.reduce(
    (sum, checks) =>
      sum +
      Number(checks.objectiveAnki) +
      Number(checks.objectivePage) +
      Number(checks.subjectiveAnki) +
      Number(checks.subjectivePage) +
      Number(checks.bedtimeAnki),
    0,
  );
  const last7AverageRate = average(last7.map((record) => record.achievementRate));
  const lowRateStreak = sorted.slice(0, 2).every((record) => record.achievementRate < 50);
  const memoStress = sorted.slice(0, 7).some((record) => /부담|힘듦|무리/.test(record.memo));
  const successfulDays = last7.filter((record) => record.judgmentLevel === 'success').length;

  let recommendedObjectiveNewCardGoal = plan.currentObjectiveNewCardGoal ?? plan.currentNewCardGoal;
  let recommendedSubjectiveNewCardGoal = plan.currentSubjectiveNewCardGoal ?? settings.defaultSubjectiveNewCardGoal;
  const adaptiveGoals = getAdaptiveDailyGoals(plan, settings, records, today);
  let adjustmentReason = '목표를 유지합니다.';

  const latestChecks = sorted[0] ? getRecordCoreChecks(sorted[0]) : undefined;
  if (latestChecks && !latestChecks.objectiveAnki && !latestChecks.subjectiveAnki) {
    recommendedObjectiveNewCardGoal = Math.max(settings.minNewCardGoal, recommendedObjectiveNewCardGoal - 2);
    recommendedSubjectiveNewCardGoal = Math.max(settings.minNewCardGoal, recommendedSubjectiveNewCardGoal - 1);
    adjustmentReason = '1차와 2차 ANKI가 모두 비어 있어 목표를 낮추고 복구를 우선합니다.';
  } else if (lowRateStreak || memoStress) {
    recommendedObjectiveNewCardGoal = Math.max(settings.minNewCardGoal, recommendedObjectiveNewCardGoal - 1);
    recommendedSubjectiveNewCardGoal = Math.max(settings.minNewCardGoal, recommendedSubjectiveNewCardGoal - 1);
    adjustmentReason = '최근 부담 신호가 있어 1차와 2차 목표를 낮춥니다.';
  } else if (objectiveAnkiCount >= 5 && objectivePageCount >= 5 && last7AverageRate >= 80 && successfulDays >= 5) {
    recommendedObjectiveNewCardGoal = Math.min(settings.stableMaxObjectiveNewCardGoal, recommendedObjectiveNewCardGoal + 1);
    adjustmentReason = '1차 카드와 페이지 확인이 안정되어 1차 신규카드 +1장을 제안합니다.';
    if (subjectiveAnkiCount >= 5 && subjectivePageCount >= 5 && bedtimeCount >= 4) {
      recommendedSubjectiveNewCardGoal = Math.min(settings.stableMaxSubjectiveNewCardGoal, recommendedSubjectiveNewCardGoal + 1);
      adjustmentReason = '1차와 2차 흐름이 모두 안정되어 다음 주 1차 +1장, 2차 +1개를 제안합니다.';
    }
  }

  if (!adaptiveGoals.isWarmup) {
    if (adaptiveGoals.objectiveGoal > recommendedObjectiveNewCardGoal) {
      recommendedObjectiveNewCardGoal = adaptiveGoals.objectiveGoal;
      adjustmentReason = adaptiveGoals.reason;
    }
    if (adaptiveGoals.subjectiveGoal > recommendedSubjectiveNewCardGoal) {
      recommendedSubjectiveNewCardGoal = adaptiveGoals.subjectiveGoal;
      adjustmentReason = adaptiveGoals.reason;
    }
  }

  return {
    streakDays: calculateStreak(records, today),
    last7AverageRate,
    last7ReviewRate: rate(reviewCount, last7.length),
    last7ObjectiveAnkiRate: rate(objectiveAnkiCount, last7.length),
    last7ObjectivePageRate: rate(objectivePageCount, last7.length),
    last7SubjectiveAnkiRate: rate(subjectiveAnkiCount, last7.length),
    last7SubjectivePageRate: rate(subjectivePageCount, last7.length),
    last7PageRate: rate(pageCount, last7.length),
    last7BedtimeRate: rate(bedtimeCount, last7.length),
    last7CoreRate: rate(corePointTotal, last7.length * 5),
    weeklyObjectiveCount: sumTaskCount(thisWeek, 'objective'),
    weeklySubjectiveCount: sumTaskCount(thisWeek, 'subjective'),
    weeklyCreationCount: sumTaskCount(thisWeek, 'creation'),
    recommendedNewCardGoal: recommendedObjectiveNewCardGoal,
    recommendedObjectiveNewCardGoal,
    recommendedSubjectiveNewCardGoal,
    adjustmentReason,
    motivationMessage: buildMotivationMessage(
      last7.length,
      objectiveAnkiCount,
      objectivePageCount,
      subjectiveAnkiCount,
      subjectivePageCount,
      bedtimeCount,
      corePointTotal,
      last7AverageRate,
    ),
    weakSubject: findWeakSubject(records),
    staleSubject: findStaleSubject(records),
  };
}

function getRecordCoreChecks(record: StudyRecord): DailyCoreChecks {
  const fallback = getCoreChecks(record.dailyTasks);
  const raw = record.coreChecks as Partial<DailyCoreChecks> & { ankiCards?: boolean; logseqPage?: boolean } | undefined;
  return {
    objectiveAnki: raw?.objectiveAnki ?? raw?.ankiCards ?? fallback.objectiveAnki,
    objectivePage: raw?.objectivePage ?? raw?.logseqPage ?? fallback.objectivePage,
    subjectiveAnki: raw?.subjectiveAnki ?? raw?.ankiCards ?? fallback.subjectiveAnki,
    subjectivePage: raw?.subjectivePage ?? raw?.logseqPage ?? fallback.subjectivePage,
    bedtimeAnki: raw?.bedtimeAnki ?? fallback.bedtimeAnki,
  };
}

function buildMotivationMessage(
  dayCount: number,
  objectiveAnkiCount: number,
  objectivePageCount: number,
  subjectiveAnkiCount: number,
  subjectivePageCount: number,
  bedtimeCount: number,
  corePointTotal: number,
  averageRate: number,
): string {
  if (dayCount === 0) return '아직 누적 데이터가 없습니다. 오늘은 1차 5장과 2차 2개 중 하나라도 체크하면 출발 성공입니다.';
  const coreRate = rate(corePointTotal, dayCount * 5);
  if (coreRate >= 85 && averageRate >= 75) return '잘하고 있습니다. 지금은 욕심보다 연속성을 지키는 쪽이 합격에 더 가깝습니다.';
  if (objectiveAnkiCount < Math.ceil(dayCount * 0.7)) return '1차 신규 ANKI가 자주 끊깁니다. 내일은 객관식 5장을 가장 먼저 처리하세요.';
  if (objectivePageCount < Math.ceil(dayCount * 0.7)) return '1차 카드는 보는데 페이지 확인이 부족합니다. 객관식 PDF를 먼저 열고 ANKI로 들어가세요.';
  if (subjectiveAnkiCount < Math.ceil(dayCount * 0.6)) return '2차 신규 ANKI가 얇습니다. 지금은 2개만이라도 매일 붙이는 게 중요합니다.';
  if (subjectivePageCount < Math.ceil(dayCount * 0.6)) return '2차 페이지 확인이 부족합니다. 주관식은 원문 흐름을 놓치면 카드가 따로 놀기 쉽습니다.';
  if (bedtimeCount < Math.ceil(dayCount * 0.5)) return '아침/낮 복습은 붙고 있습니다. 저녁 ANKI 5분만 추가하면 기억 유지가 훨씬 좋아집니다.';
  return '흐름이 살아 있습니다. 오늘은 1차와 2차 핵심 체크를 먼저 끝내고 남는 힘으로 세부 진도를 채우면 됩니다.';
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function rate(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function sumTaskCount(records: StudyRecord[], examType: 'objective' | 'subjective' | 'creation'): number {
  return records.flatMap((record) => record.dailyTasks).filter((task) => task.examType === examType).reduce((sum, task) => sum + task.actualCount, 0);
}

function calculateStreak(records: StudyRecord[], today: string): number {
  const dateSet = new Set(records.filter((record) => record.reviewCompleted || record.achievementRate > 0).map((record) => record.date));
  let streak = 0;
  let cursor = today;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function findWeakSubject(records: StudyRecord[]): string {
  const misses = new Map<string, number>();
  records.flatMap((record) => record.dailyTasks).forEach((task) => {
    if (task.actualCount < task.targetCount) misses.set(task.subject, (misses.get(task.subject) ?? 0) + 1);
  });
  return [...misses.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '아직 없음';
}

function findStaleSubject(records: StudyRecord[]): string {
  const latest = new Map<string, string>();
  records.flatMap((record) => record.dailyTasks).forEach((task) => {
    if (task.actualCount > 0) latest.set(task.subject, task.date);
  });
  return [...latest.entries()].sort((a, b) => a[1].localeCompare(b[1]))[0]?.[0] ?? '아직 없음';
}
