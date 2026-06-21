import { OBJECTIVE_DOCS, SUBJECTIVE_DOCS, getStudyDocumentCardCount } from '../constants/studyCatalog';
import type { DailyTask, Plan, Settings, StudyRecord } from '../types';
import { daysBetween, getDday, toDateKey } from './date';

export const OBJECTIVE_TARGET_REPETITIONS = 5;
export const SUBJECTIVE_TARGET_REPETITIONS = 7;
export const WARMUP_DAYS = 14;

export interface MasteryTrackProgress {
  label: string;
  totalCards: number;
  targetRepetitions: number;
  targetUnits: number;
  completedUnits: number;
  remainingUnits: number;
  firstPassCards: number;
  firstPassRate: number;
  readinessRate: number;
  daysLeft: number;
  neededDailyUnits: number;
}

export interface MasteryProgress {
  warmupDays: number;
  daysSinceStart: number;
  isWarmup: boolean;
  objective: MasteryTrackProgress;
  subjective: MasteryTrackProgress;
}

export interface AdaptiveDailyGoals {
  objectiveGoal: number;
  subjectiveGoal: number;
  objectiveNeededDailyUnits: number;
  subjectiveNeededDailyUnits: number;
  isWarmup: boolean;
  reason: string;
}

export function calculateMasteryProgress(plan: Plan, records: StudyRecord[], today = toDateKey()): MasteryProgress {
  const daysSinceStart = daysBetween(plan.startDate, today);
  return {
    warmupDays: WARMUP_DAYS,
    daysSinceStart,
    isWarmup: daysSinceStart < WARMUP_DAYS,
    objective: buildTrackProgress('1차 객관식', 'objective', OBJECTIVE_TARGET_REPETITIONS, plan.firstExamDate, records, today),
    subjective: buildTrackProgress('2차 주관식', 'subjective', SUBJECTIVE_TARGET_REPETITIONS, plan.secondExamDate, records, today),
  };
}

export function getAdaptiveDailyGoals(plan: Plan, settings: Settings, records: StudyRecord[], today = toDateKey()): AdaptiveDailyGoals {
  const progress = calculateMasteryProgress(plan, records, today);
  const currentObjective = Math.max(0, plan.currentObjectiveNewCardGoal ?? plan.currentNewCardGoal ?? settings.defaultObjectiveNewCardGoal);
  const currentSubjective = Math.max(0, plan.currentSubjectiveNewCardGoal ?? settings.defaultSubjectiveNewCardGoal);

  if (progress.isWarmup) {
    return {
      objectiveGoal: Math.min(currentObjective, settings.defaultObjectiveNewCardGoal),
      subjectiveGoal: Math.min(currentSubjective, settings.defaultSubjectiveNewCardGoal),
      objectiveNeededDailyUnits: progress.objective.neededDailyUnits,
      subjectiveNeededDailyUnits: progress.subjective.neededDailyUnits,
      isWarmup: true,
      reason: `처음 ${WARMUP_DAYS}일은 적응 기간입니다. 목표를 올리지 않고 1차 ${settings.defaultObjectiveNewCardGoal}장, 2차 ${settings.defaultSubjectiveNewCardGoal}개를 붙입니다.`,
    };
  }

  const recent = getRecentStability(records, today);
  const objectiveGoal =
    recent.objectiveStable && progress.objective.neededDailyUnits > currentObjective
      ? Math.min(settings.stableMaxObjectiveNewCardGoal, Math.max(currentObjective, Math.min(progress.objective.neededDailyUnits, currentObjective + 2)))
      : currentObjective;
  const subjectiveGoal =
    recent.subjectiveStable && progress.subjective.neededDailyUnits > currentSubjective
      ? Math.min(settings.stableMaxSubjectiveNewCardGoal, Math.max(currentSubjective, Math.min(progress.subjective.neededDailyUnits, currentSubjective + 1)))
      : currentSubjective;

  const reason =
    objectiveGoal > currentObjective || subjectiveGoal > currentSubjective
      ? `합격권 목표회상량을 맞추기 위해 오늘 목표를 1차 ${objectiveGoal}장, 2차 ${subjectiveGoal}개로 제안합니다.`
      : '현재 속도를 유지합니다. 최근 체크가 안정되면 다음 주 목표를 조금 올립니다.';

  return {
    objectiveGoal,
    subjectiveGoal,
    objectiveNeededDailyUnits: progress.objective.neededDailyUnits,
    subjectiveNeededDailyUnits: progress.subjective.neededDailyUnits,
    isWarmup: false,
    reason,
  };
}

function buildTrackProgress(
  label: string,
  examType: 'objective' | 'subjective',
  targetRepetitions: number,
  examDate: string,
  records: StudyRecord[],
  today: string,
): MasteryTrackProgress {
  const totalCards = sumTotalCards(examType);
  const targetUnits = totalCards * targetRepetitions;
  const completedUnits = countCompletedUnits(records, examType);
  const firstPassCards = countFirstPassCards(records, examType);
  const remainingUnits = Math.max(0, targetUnits - completedUnits);
  const daysLeft = Math.max(1, getDday(examDate, today));

  return {
    label,
    totalCards,
    targetRepetitions,
    targetUnits,
    completedUnits,
    remainingUnits,
    firstPassCards,
    firstPassRate: rate(firstPassCards, totalCards),
    readinessRate: rate(completedUnits, targetUnits),
    daysLeft,
    neededDailyUnits: Math.max(1, Math.ceil(remainingUnits / daysLeft)),
  };
}

function sumTotalCards(examType: 'objective' | 'subjective'): number {
  const documents = examType === 'objective' ? OBJECTIVE_DOCS : SUBJECTIVE_DOCS;
  return documents.reduce((sum, document) => sum + getStudyDocumentCardCount(document), 0);
}

function countCompletedUnits(records: StudyRecord[], examType: 'objective' | 'subjective'): number {
  return records.flatMap((record) => record.dailyTasks)
    .filter((task) => isPlannedTrackTask(task, examType))
    .reduce((sum, task) => sum + getCompletedCount(task), 0);
}

function countFirstPassCards(records: StudyRecord[], examType: 'objective' | 'subjective'): number {
  const covered = new Map<string, Set<number>>();
  records.flatMap((record) => record.dailyTasks)
    .filter((task) => isPlannedTrackTask(task, examType))
    .forEach((task) => {
      const count = getCompletedCount(task);
      if (count <= 0) return;
      const key = task.logseqFile || task.subject;
      const start = task.plannedStartCard ?? 1;
      const end = Math.min(task.plannedEndCard ?? start + count - 1, start + count - 1);
      if (!covered.has(key)) covered.set(key, new Set<number>());
      const set = covered.get(key);
      if (!set) return;
      for (let card = start; card <= end; card += 1) set.add(card);
    });
  return [...covered.values()].reduce((sum, set) => sum + set.size, 0);
}

function isPlannedTrackTask(task: DailyTask, examType: 'objective' | 'subjective'): boolean {
  return task.examType === examType && Boolean(task.plannedTotalCards);
}

function getCompletedCount(task: DailyTask): number {
  if (task.isCompleted) return Math.max(task.targetCount, task.actualCount);
  return Math.max(0, Math.min(task.targetCount, task.actualCount));
}

function getRecentStability(records: StudyRecord[], today: string) {
  const recent = records.filter((record) => record.date <= today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const objectiveGood = recent.filter((record) => record.coreChecks?.objectiveAnki && record.coreChecks?.objectivePage).length;
  const subjectiveGood = recent.filter((record) => record.coreChecks?.subjectiveAnki && record.coreChecks?.subjectivePage).length;
  const averageRate = recent.length
    ? Math.round(recent.reduce((sum, record) => sum + record.achievementRate, 0) / recent.length)
    : 0;
  return {
    objectiveStable: recent.length >= 5 && objectiveGood >= 5 && averageRate >= 70,
    subjectiveStable: recent.length >= 5 && subjectiveGood >= 4 && averageRate >= 70,
  };
}

function rate(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}
