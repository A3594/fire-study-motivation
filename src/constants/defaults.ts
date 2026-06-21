import type { Settings, StudyPhase, TaskType } from '../types';

export const APP_DATA_VERSION = '2026.06.mvp2-memory';

export const DEFAULT_SETTINGS: Settings = {
  firstExamDate: '2027-05-01',
  secondExamDate: '2027-09-01',
  weekdayAvailableMinutes: 90,
  weekendAvailableMinutes: 180,
  defaultNewCardGoal: 5,
  defaultObjectiveNewCardGoal: 5,
  defaultSubjectiveNewCardGoal: 2,
  minNewCardGoal: 0,
  initialMaxNewCardGoal: 10,
  stableMaxNewCardGoal: 15,
  initialMaxObjectiveNewCardGoal: 10,
  stableMaxObjectiveNewCardGoal: 20,
  initialMaxSubjectiveNewCardGoal: 4,
  stableMaxSubjectiveNewCardGoal: 8,
  saturdayCreationGoal: 20,
  sundayCreationGoal: 20,
  bedtimeReviewEnabled: true,
  bedtimeReviewTime: '21:00',
  subjectRecommendationEnabled: true,
  appDataVersion: APP_DATA_VERSION,
};

export const PHASE_NOTES: Record<StudyPhase, string> = {
  '재시작 단계': '공부 리듬 회복, 신규학습 소량, 복습 습관 만들기',
  '1회독 구축 단계': '전 과목을 얇게 회전하고 부족한 카드를 만든다',
  '1차 안정화 단계': '객관식 정답률과 과락 위험을 관리한다',
  '1차 빡공 단계': '신규학습보다 복습, 오답, 문제풀이 중심',
  '2차 전환 단계': '주관식 중심으로 키워드와 목차를 강화한다',
  '2차 빡공 단계': '답안 작성, 시간관리, 출력 훈련 중심',
};

export const OBJECTIVE_SUBJECTS = ['소방법규', '소방시설 구조원리', '소방원론', '소방전기'];
export const SUBJECTIVE_SUBJECTS = ['화재안전기준', '소방법', '점검실무행정', '구조원리'];
export const CREATION_SUBJECTS = ['화재안전기준 카드', '소방법 카드', '객관식 오답 카드'];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  ANKI_REVIEW: 'ANKI 복습',
  OBJECTIVE_STUDY: '객관식 공부',
  OBJECTIVE_QUIZ: '객관식 문제',
  OBJECTIVE_WRONG_REVIEW: '객관식 오답',
  SUBJECTIVE_KEYWORD: '주관식 키워드',
  SUBJECTIVE_OUTLINE: '주관식 목차',
  SUBJECTIVE_ANSWER: '주관식 답안',
  CARD_CREATION: '카드 제작',
  RETRIEVAL_PRACTICE: '백지회상',
  PAGE_CHECK: '페이지 확인',
  SPACED_REVIEW: '간격 회상',
  BEDTIME_REVIEW: '자기 전 복습',
};

export function normalizeSettings(settings: Settings | null): Settings | null {
  if (!settings) return null;
  const legacy = settings as Partial<Settings>;
  const defaultObjectiveNewCardGoal = legacy.defaultObjectiveNewCardGoal ?? legacy.defaultNewCardGoal ?? DEFAULT_SETTINGS.defaultObjectiveNewCardGoal;
  const defaultSubjectiveNewCardGoal = legacy.defaultSubjectiveNewCardGoal ?? DEFAULT_SETTINGS.defaultSubjectiveNewCardGoal;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    defaultNewCardGoal: defaultObjectiveNewCardGoal,
    defaultObjectiveNewCardGoal,
    defaultSubjectiveNewCardGoal,
    initialMaxObjectiveNewCardGoal: legacy.initialMaxObjectiveNewCardGoal ?? legacy.initialMaxNewCardGoal ?? DEFAULT_SETTINGS.initialMaxObjectiveNewCardGoal,
    stableMaxObjectiveNewCardGoal: legacy.stableMaxObjectiveNewCardGoal ?? legacy.stableMaxNewCardGoal ?? DEFAULT_SETTINGS.stableMaxObjectiveNewCardGoal,
    initialMaxSubjectiveNewCardGoal: legacy.initialMaxSubjectiveNewCardGoal ?? DEFAULT_SETTINGS.initialMaxSubjectiveNewCardGoal,
    stableMaxSubjectiveNewCardGoal: legacy.stableMaxSubjectiveNewCardGoal ?? DEFAULT_SETTINGS.stableMaxSubjectiveNewCardGoal,
  };
}
