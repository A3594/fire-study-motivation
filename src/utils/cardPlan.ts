import { getObjectiveDocs, getSubjectiveDocs, getStudyDocumentCardCount } from '../constants/studyCatalog';
import type { Plan, StudyDocument } from '../types';
import { daysBetween, toDateKey } from './date';

export interface DocumentCardPlan {
  document: StudyDocument;
  documentIndex: number;
  dayInDocument: number;
  totalDocumentDays: number;
  dailyGoal: number;
  startCard: number;
  endCard: number;
  totalCards: number;
  remainingCardsAfterToday: number;
}

export function getObjectiveDailyGoal(plan: Plan): number {
  return Math.max(0, plan.currentObjectiveNewCardGoal ?? plan.currentNewCardGoal ?? 5);
}

export function getSubjectiveDailyGoal(plan: Plan): number {
  return Math.max(0, plan.currentSubjectiveNewCardGoal ?? 2);
}

export function getObjectiveCardPlan(plan: Plan, date = toDateKey(), dailyGoal = getObjectiveDailyGoal(plan)): DocumentCardPlan {
  return selectDocumentCardPlan(getObjectiveDocs(), daysBetween(plan.startDate, date), dailyGoal);
}

export function getSubjectiveCardPlan(plan: Plan, date = toDateKey(), dailyGoal = getSubjectiveDailyGoal(plan)): DocumentCardPlan {
  return selectDocumentCardPlan(getSubjectiveDocs(), daysBetween(plan.startDate, date), dailyGoal);
}

export function selectDocumentCardPlan(documents: StudyDocument[], planDay: number, dailyGoal: number): DocumentCardPlan {
  const safeGoal = Math.max(1, dailyGoal);
  const spans = documents.map((document) => {
    const totalCards = Math.max(1, getStudyDocumentCardCount(document) || 1);
    return {
      document,
      totalCards,
      days: Math.max(1, Math.ceil(totalCards / safeGoal)),
    };
  });
  const cycleDays = spans.reduce((sum, item) => sum + item.days, 0);
  let dayInCycle = cycleDays > 0 ? planDay % cycleDays : 0;

  for (let index = 0; index < spans.length; index += 1) {
    const item = spans[index];
    if (dayInCycle >= item.days) {
      dayInCycle -= item.days;
      continue;
    }

    const startCard = dayInCycle * safeGoal + 1;
    const endCard = Math.min(item.totalCards, startCard + safeGoal - 1);
    return {
      document: item.document,
      documentIndex: index,
      dayInDocument: dayInCycle + 1,
      totalDocumentDays: item.days,
      dailyGoal: safeGoal,
      startCard,
      endCard,
      totalCards: item.totalCards,
      remainingCardsAfterToday: Math.max(0, item.totalCards - endCard),
    };
  }

  const fallback = spans[0];
  return {
    document: fallback.document,
    documentIndex: 0,
    dayInDocument: 1,
    totalDocumentDays: fallback.days,
    dailyGoal: safeGoal,
    startCard: 1,
    endCard: Math.min(fallback.totalCards, safeGoal),
    totalCards: fallback.totalCards,
    remainingCardsAfterToday: Math.max(0, fallback.totalCards - safeGoal),
  };
}

export function formatPlanRange(plan: DocumentCardPlan): string {
  return `${plan.startCard}-${plan.endCard}/${plan.totalCards}장`;
}

export function formatPlanPace(plan: DocumentCardPlan): string {
  return `${plan.totalCards}장 · ${plan.dailyGoal}장/일 · ${plan.totalDocumentDays}일 중 ${plan.dayInDocument}일`;
}
