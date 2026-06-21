export type ExamType = 'common' | 'objective' | 'subjective' | 'creation' | 'review';

export type TaskType =
  | 'ANKI_REVIEW'
  | 'OBJECTIVE_STUDY'
  | 'OBJECTIVE_QUIZ'
  | 'OBJECTIVE_WRONG_REVIEW'
  | 'SUBJECTIVE_KEYWORD'
  | 'SUBJECTIVE_OUTLINE'
  | 'SUBJECTIVE_ANSWER'
  | 'CARD_CREATION'
  | 'RETRIEVAL_PRACTICE'
  | 'PAGE_CHECK'
  | 'SPACED_REVIEW'
  | 'BEDTIME_REVIEW';

export type StudyUnit = '개' | '문제' | '키워드' | '목차' | '답안' | '분' | '완료';
export type Priority = '높음' | '보통' | '낮음';
export type Condition = '상' | '중' | '하';

export type StudyPhase =
  | '재시작 단계'
  | '1회독 구축 단계'
  | '1차 안정화 단계'
  | '1차 빡공 단계'
  | '2차 전환 단계'
  | '2차 빡공 단계';

export type TodayMode = '평일 암기 모드' | '주말 제작 모드' | '복습 복구 모드' | '빡공 모드';
export type JudgmentLevel = 'success' | 'normal' | 'minimum' | 'warning' | 'danger';
export type IntensityMode = 'normal' | 'hard' | 'ease';
export type TabKey = 'today' | 'plan' | 'records' | 'stats' | 'settings';
export type CoreCheckKey = 'objectiveAnki' | 'objectivePage' | 'subjectiveAnki' | 'subjectivePage' | 'bedtimeAnki';

export interface DailyCoreChecks {
  objectiveAnki: boolean;
  objectivePage: boolean;
  subjectiveAnki: boolean;
  subjectivePage: boolean;
  bedtimeAnki: boolean;
}

export interface DailyTask {
  id: string;
  date: string;
  title: string;
  examType: ExamType;
  subject: string;
  sourceLabel?: string;
  logseqFile?: string;
  pdfUrl?: string;
  ankiScope?: string;
  plannedStartCard?: number;
  plannedEndCard?: number;
  plannedTotalCards?: number;
  plannedDayInDocument?: number;
  plannedDocumentDays?: number;
  plannedDailyGoal?: number;
  taskType: TaskType;
  targetCount: number;
  actualCount: number;
  unit: StudyUnit;
  isCompleted: boolean;
  isOptional: boolean;
  priority: Priority;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyRecord {
  id: string;
  date: string;
  dayOfWeek: string;
  phase: StudyPhase;
  mode: TodayMode;
  dailyTasks: DailyTask[];
  achievementRate: number;
  coreChecks: DailyCoreChecks;
  reviewCompleted: boolean;
  bedtimeReviewCompleted: boolean;
  studyMinutes: number;
  condition: Condition;
  memo: string;
  judgment: string;
  judgmentLevel: JudgmentLevel;
  nextRecommendation: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  firstExamDate: string;
  secondExamDate: string;
  startDate: string;
  currentPhase: StudyPhase;
  currentNewCardGoal: number;
  currentObjectiveNewCardGoal: number;
  currentSubjectiveNewCardGoal: number;
  weekdayAvailableMinutes: number;
  weekendAvailableMinutes: number;
  weeklyGoals: string[];
  monthlyGoals: string[];
  intensityMode: IntensityMode;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  firstExamDate: string;
  secondExamDate: string;
  weekdayAvailableMinutes: number;
  weekendAvailableMinutes: number;
  defaultNewCardGoal: number;
  defaultObjectiveNewCardGoal: number;
  defaultSubjectiveNewCardGoal: number;
  minNewCardGoal: number;
  initialMaxNewCardGoal: number;
  stableMaxNewCardGoal: number;
  initialMaxObjectiveNewCardGoal: number;
  stableMaxObjectiveNewCardGoal: number;
  initialMaxSubjectiveNewCardGoal: number;
  stableMaxSubjectiveNewCardGoal: number;
  saturdayCreationGoal: number;
  sundayCreationGoal: number;
  bedtimeReviewEnabled: boolean;
  bedtimeReviewTime: string;
  subjectRecommendationEnabled: boolean;
  appDataVersion: string;
}

export interface AppStateSnapshot {
  settings: Settings;
  plan: Plan;
  records: StudyRecord[];
}

export interface StudyDocument {
  id: string;
  title: string;
  group: string;
  examType: 'objective' | 'subjective';
  track: 'objective-law' | 'objective-theory' | 'objective-electric' | 'objective-structure' | 'secondary-fire' | 'secondary-law' | 'secondary-inspection';
  logseqFile: string;
  pdfUrl: string;
  ankiScope: string;
  cardCount: number;
  priority: Priority;
}
