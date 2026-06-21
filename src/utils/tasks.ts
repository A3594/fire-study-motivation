import {
  getObjectiveDocs,
  getObjectiveElectricDocs,
  getObjectiveLawDocs,
  getObjectiveStructureDocs,
  getObjectiveTheoryDocs,
  getSecondaryFireDocs,
  getSecondaryInspectionDocs,
  getSecondaryLawDocs,
  getStudyDocumentCardKeys,
  getSubjectiveDocs,
} from '../constants/studyCatalog';
import type {
  Condition,
  CoreCheckKey,
  DailyCoreChecks,
  DailyTask,
  ExamType,
  JudgmentLevel,
  Plan,
  Settings,
  StudyDocument,
  StudyRecord,
  StudyUnit,
  TaskType,
  TodayMode,
} from '../types';
import { addDays, daysBetween, getDayOfWeek, nowIso, toDateKey } from './date';
import { DocumentCardPlan, formatPlanPace, formatPlanRange, getObjectiveCardPlan, getObjectiveDailyGoal, getSubjectiveCardPlan, getSubjectiveDailyGoal, selectDocumentCardPlan } from './cardPlan';
import { createId } from './id';
import { getAdaptiveDailyGoals } from './mastery';
import { getTodayMode } from './plan';

interface TaskInput {
  title: string;
  examType: ExamType;
  subject: string;
  sourceLabel?: string;
  logseqFile?: string;
  pdfUrl?: string;
  ankiScope?: string;
  plannedDocumentId?: string;
  plannedStartCard?: number;
  plannedEndCard?: number;
  plannedTotalCards?: number;
  plannedDayInDocument?: number;
  plannedDocumentDays?: number;
  plannedDailyGoal?: number;
  plannedCardKeys?: string[];
  taskType: TaskType;
  targetCount: number;
  unit: StudyUnit;
  priority?: DailyTask['priority'];
  isOptional?: boolean;
}

export function createTask(date: string, input?: Partial<TaskInput>): DailyTask {
  const now = nowIso();
  const targetCount = input?.targetCount ?? 1;
  return {
    id: createId('task'),
    date,
    title: input?.title ?? '새 할 일',
    examType: input?.examType ?? 'common',
    subject: input?.subject ?? '직접 추가',
    sourceLabel: input?.sourceLabel,
    logseqFile: input?.logseqFile,
    pdfUrl: input?.pdfUrl,
    ankiScope: input?.ankiScope,
    plannedDocumentId: input?.plannedDocumentId,
    plannedStartCard: input?.plannedStartCard,
    plannedEndCard: input?.plannedEndCard,
    plannedTotalCards: input?.plannedTotalCards,
    plannedDayInDocument: input?.plannedDayInDocument,
    plannedDocumentDays: input?.plannedDocumentDays,
    plannedDailyGoal: input?.plannedDailyGoal,
    plannedCardKeys: input?.plannedCardKeys,
    taskType: input?.taskType ?? 'OBJECTIVE_STUDY',
    targetCount,
    actualCount: 0,
    unit: input?.unit ?? '개',
    isCompleted: false,
    isOptional: input?.isOptional ?? false,
    priority: input?.priority ?? '보통',
    memo: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function generateTodayTasks(plan: Plan, settings: Settings, records: StudyRecord[], date = toDateKey()): DailyTask[] {
  const existing = records.find((record) => record.date === date);
  if (existing) {
    const tasks = existing.dailyTasks.map((task) => ({ ...task }));
    const adaptiveGoals = getAdaptiveDailyGoals(plan, settings, records, date);
    const objectivePlan = getObjectiveCardPlan(plan, date, adaptiveGoals.objectiveGoal);
    const subjectivePlan = getSubjectiveCardPlan(plan, date, adaptiveGoals.subjectiveGoal);
    if (!tasks.some((task) => task.examType === 'objective' && Boolean(task.plannedTotalCards))) {
      tasks.splice(Math.min(2, tasks.length), 0, plannedCardTask(date, objectivePlan, '1차 신규 ANKI 카드', 'OBJECTIVE_STUDY', '높음'));
    }
    if (!tasks.some((task) => task.examType === 'subjective' && Boolean(task.plannedTotalCards))) {
      tasks.splice(Math.min(3, tasks.length), 0, plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '보통'));
    }
    addPageCheckTask(tasks, date, 'objective');
    addPageCheckTask(tasks, date, 'subjective');
    return tasks;
  }

  const mode = getTodayMode(plan, records, date);
  const tasks: DailyTask[] = [reviewTask(date)];
  const planDay = daysBetween(plan.startDate, date);
  const adaptiveGoals = getAdaptiveDailyGoals(plan, settings, records, date);
  const objectivePlan = getObjectiveCardPlan(plan, date, adaptiveGoals.objectiveGoal);
  const subjectivePlan = getSubjectiveCardPlan(plan, date, adaptiveGoals.subjectiveGoal);
  tasks.push(retrievalWarmupTask(date));

  if (mode === '복습 복구 모드') {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 신규 ANKI 카드', 'OBJECTIVE_STUDY', '높음'));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '보통'));
    addPageCheckTask(tasks, date, 'objective');
    addPageCheckTask(tasks, date, 'subjective');
    addSpacedRecallTask(tasks, date, planDay, records);
    addBedtimeTask(tasks, date, settings);
    return tasks;
  }

  if (mode === '주말 제작 모드') {
    const day = getDayOfWeek(date);
    const creationGoal = day === '토' ? settings.saturdayCreationGoal : settings.sundayCreationGoal;
    const creationDoc = selectSubjectiveDocument(planDay);
    tasks.push(studyDocumentTask(
      date,
      creationDoc,
      day === '일' ? '다음 주 Logseq 문서 순서 확인' : 'Logseq 문서 기반 카드 제작',
      day === '일' ? 'SUBJECTIVE_OUTLINE' : 'CARD_CREATION',
      day === '일' ? 1 : creationGoal,
      day === '일' ? '완료' : '개',
      '높음',
    ));
    tasks.push(studyDocumentTask(date, selectObjectiveDocument(planDay), '1차 객관식 감각 유지', 'OBJECTIVE_QUIZ', 1, '문제', '낮음'));
    tasks.push(studyDocumentTask(date, selectSubjectiveDocument(planDay + 1), '2차 키워드 1개 유지', 'SUBJECTIVE_KEYWORD', 1, '키워드', '보통'));
    tasks.push(createTask(date, {
      title: '제작 카드 신규학습',
      examType: 'review',
      subject: 'ANKI',
      taskType: 'OBJECTIVE_STUDY',
      targetCount: Math.min(3, Math.max(1, getObjectiveDailyGoal(plan))),
      unit: '개',
      priority: '보통',
      sourceLabel: 'ANKI',
      ankiScope: '오늘 제작한 카드',
    }));
    addPageCheckTask(tasks, date, 'objective');
    addPageCheckTask(tasks, date, 'subjective');
    addSpacedRecallTask(tasks, date, planDay, records);
    addBedtimeTask(tasks, date, settings);
    return tasks;
  }

  const objectiveGoal = adaptiveGoals.objectiveGoal;
  const subjectiveGoal = adaptiveGoals.subjectiveGoal;
  const primaryObjective = objectivePlan.document;
  const secondaryObjective = selectDocumentCardPlan(getObjectiveDocs(), planDay + objectivePlan.totalDocumentDays, objectiveGoal).document;
  const primarySubjective = subjectivePlan.document;
  const secondarySubjective = selectDocumentCardPlan(getSubjectiveDocs(), planDay + subjectivePlan.totalDocumentDays, subjectiveGoal).document;

  if (plan.currentPhase === '재시작 단계') {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 신규 ANKI 카드', 'OBJECTIVE_STUDY', '높음'));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '보통'));
  } else if (plan.currentPhase === '1회독 구축 단계') {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 신규 ANKI 카드', 'OBJECTIVE_STUDY', '높음'));
    tasks.push(studyDocumentTask(date, secondaryObjective, '1차 보조 과목 얇게 보기', 'OBJECTIVE_QUIZ', Math.max(1, Math.floor(objectiveGoal * 0.4)), '문제', '보통', true));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '보통'));
  } else if (plan.currentPhase === '1차 안정화 단계') {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 신규 ANKI 카드', 'OBJECTIVE_STUDY', '높음'));
    tasks.push(studyDocumentTask(date, primaryObjective, '1차 객관식 문제풀이', 'OBJECTIVE_QUIZ', Math.max(3, objectiveGoal), '문제', '높음'));
    tasks.push(studyDocumentTask(date, secondaryObjective, '1차 오답 복습', 'OBJECTIVE_WRONG_REVIEW', 2, '문제', '높음'));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '보통'));
  } else if (plan.currentPhase === '1차 빡공 단계') {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 신규 ANKI 카드', 'OBJECTIVE_STUDY', '높음'));
    tasks.push(studyDocumentTask(date, primaryObjective, '1차 실전 문제 회전', 'OBJECTIVE_QUIZ', Math.max(5, objectiveGoal + 2), '문제', '높음'));
    tasks.push(studyDocumentTask(date, secondaryObjective, '1차 오답 압축', 'OBJECTIVE_WRONG_REVIEW', 3, '문제', '높음'));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '보통'));
  } else if (plan.currentPhase === '2차 전환 단계') {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 유지 ANKI 카드', 'OBJECTIVE_STUDY', '낮음', true));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '높음'));
    tasks.push(studyDocumentTask(date, primarySubjective, '2차 목차 훈련', 'SUBJECTIVE_OUTLINE', 2, '목차', '높음'));
    tasks.push(studyDocumentTask(date, secondarySubjective, '2차 키워드 보강', 'SUBJECTIVE_KEYWORD', 2, '키워드', '높음'));
  } else {
    tasks.push(plannedCardTask(date, objectivePlan, '1차 유지 ANKI 카드', 'OBJECTIVE_STUDY', '낮음', true));
    tasks.push(plannedCardTask(date, subjectivePlan, '2차 신규 ANKI 카드', 'SUBJECTIVE_KEYWORD', '높음'));
    tasks.push(studyDocumentTask(date, primarySubjective, '2차 답안 작성', 'SUBJECTIVE_ANSWER', 1, '답안', '높음'));
    tasks.push(studyDocumentTask(date, secondarySubjective, '2차 목차 압축', 'SUBJECTIVE_OUTLINE', 2, '목차', '높음'));
  }

  if (mode === '빡공 모드') {
    tasks.push(studyDocumentTask(date, selectObjectiveDocument(planDay + 7), '빡공 추가 1차 오답', 'OBJECTIVE_WRONG_REVIEW', 3, '문제', '높음'));
    tasks.push(studyDocumentTask(date, selectSubjectiveDocument(planDay + 7), '빡공 추가 2차 답안', 'SUBJECTIVE_ANSWER', 1, '답안', '높음'));
  }

  addPageCheckTask(tasks, date, 'objective');
  addPageCheckTask(tasks, date, 'subjective');
  addSpacedRecallTask(tasks, date, planDay, records);
  addBedtimeTask(tasks, date, settings);
  return tasks;
}

export function getTaskRate(task: DailyTask): number {
  if (task.isCompleted) return 100;
  if (task.unit === '완료' || task.taskType === 'ANKI_REVIEW' || task.taskType === 'BEDTIME_REVIEW') {
    return task.actualCount > 0 ? 100 : 0;
  }
  if (task.targetCount <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((task.actualCount / task.targetCount) * 100)));
}

export function getTaskStatus(task: DailyTask): '완료' | '부분완료' | '미완료' {
  const rate = getTaskRate(task);
  if (rate >= 100) return '완료';
  if (rate >= 50) return '부분완료';
  return '미완료';
}

export function getCoreChecks(tasks: DailyTask[]): DailyCoreChecks {
  const pageStudyTasks = tasks.filter(isPageStudyTask);
  const objectivePageCheck = tasks.find((task) => task.taskType === 'PAGE_CHECK' && task.examType === 'objective');
  const subjectivePageCheck = tasks.find((task) => task.taskType === 'PAGE_CHECK' && task.examType === 'subjective');
  const legacyPageCheck = tasks.find((task) => task.taskType === 'PAGE_CHECK' && task.examType !== 'objective' && task.examType !== 'subjective');
  const plannedObjectiveTasks = tasks.filter((task) => task.examType === 'objective' && Boolean(task.plannedTotalCards));
  const plannedSubjectiveTasks = tasks.filter((task) => task.examType === 'subjective' && Boolean(task.plannedTotalCards));

  return {
    objectiveAnki:
      plannedObjectiveTasks.length > 0
        ? plannedObjectiveTasks.some((task) => getTaskRate(task) >= 100)
        : tasks.some((task) => task.examType === 'objective' && task.taskType === 'OBJECTIVE_STUDY' && getTaskRate(task) >= 100),
    objectivePage: objectivePageCheck
      ? getTaskRate(objectivePageCheck) >= 100
      : Boolean(legacyPageCheck && getTaskRate(legacyPageCheck) >= 100) || pageStudyTasks.some((task) => task.examType === 'objective' && getTaskRate(task) >= 100),
    subjectiveAnki:
      plannedSubjectiveTasks.length > 0
        ? plannedSubjectiveTasks.some((task) => getTaskRate(task) >= 100)
        : tasks.some((task) => task.examType === 'subjective' && ['SUBJECTIVE_KEYWORD', 'SUBJECTIVE_OUTLINE', 'SUBJECTIVE_ANSWER'].includes(task.taskType) && getTaskRate(task) >= 100),
    subjectivePage: subjectivePageCheck
      ? getTaskRate(subjectivePageCheck) >= 100
      : Boolean(legacyPageCheck && getTaskRate(legacyPageCheck) >= 100) || pageStudyTasks.some((task) => task.examType === 'subjective' && getTaskRate(task) >= 100),
    bedtimeAnki: tasks.some((task) => task.taskType === 'BEDTIME_REVIEW' && getTaskRate(task) >= 100),
  };
}

export function applyCoreCheck(tasks: DailyTask[], key: CoreCheckKey, checked: boolean): DailyTask[] {
  const now = nowIso();
  const hasPlannedObjective = tasks.some((task) => task.examType === 'objective' && Boolean(task.plannedTotalCards));
  const hasPlannedSubjective = tasks.some((task) => task.examType === 'subjective' && Boolean(task.plannedTotalCards));

  return tasks.map((task) => {
    const isTarget = isCoreCheckTarget(task, key, hasPlannedObjective, hasPlannedSubjective);
    if (!isTarget) return task;
    return {
      ...task,
      actualCount: checked ? Math.max(task.targetCount, 1) : 0,
      isCompleted: checked,
      updatedAt: now,
    };
  });
}

function isCoreCheckTarget(task: DailyTask, key: CoreCheckKey, hasPlannedObjective: boolean, hasPlannedSubjective: boolean): boolean {
  if (key === 'objectiveAnki') return task.examType === 'objective' && (hasPlannedObjective ? Boolean(task.plannedTotalCards) : task.taskType === 'OBJECTIVE_STUDY');
  if (key === 'objectivePage') return task.examType === 'objective' && task.taskType === 'PAGE_CHECK';
  if (key === 'subjectiveAnki') return task.examType === 'subjective' && (hasPlannedSubjective ? Boolean(task.plannedTotalCards) : ['SUBJECTIVE_KEYWORD', 'SUBJECTIVE_OUTLINE', 'SUBJECTIVE_ANSWER'].includes(task.taskType));
  if (key === 'subjectivePage') return task.examType === 'subjective' && task.taskType === 'PAGE_CHECK';
  return task.taskType === 'BEDTIME_REVIEW';
}

export function buildRecordFromTasks(
  date: string,
  plan: Plan,
  mode: TodayMode,
  tasks: DailyTask[],
  condition: Condition,
  studyMinutes: number,
  memo: string,
): StudyRecord {
  const now = nowIso();
  const coreChecks = getCoreChecks(tasks);
  const reviewCompleted = coreChecks.objectiveAnki && coreChecks.subjectiveAnki;
  const bedtimeReviewCompleted = coreChecks.bedtimeAnki;
  const achievementRate = calculateAchievementRate(tasks);
  const judgmentInfo = judgeToday(achievementRate, coreChecks, tasks, memo);

  return {
    id: createId('record'),
    date,
    dayOfWeek: getDayOfWeek(date),
    phase: plan.currentPhase,
    mode,
    dailyTasks: tasks.map((task) => ({ ...task, updatedAt: now })),
    achievementRate,
    coreChecks,
    reviewCompleted,
    bedtimeReviewCompleted,
    studyMinutes,
    condition,
    memo,
    judgment: judgmentInfo.message,
    judgmentLevel: judgmentInfo.level,
    nextRecommendation: judgmentInfo.nextRecommendation,
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateAchievementRate(tasks: DailyTask[]): number {
  if (tasks.length === 0) return 0;
  let totalWeight = 0;
  let sum = 0;
  tasks.forEach((task) => {
    const weight = task.taskType === 'ANKI_REVIEW' ? 2 : task.taskType === 'PAGE_CHECK' ? 1.5 : task.taskType === 'BEDTIME_REVIEW' ? 1.25 : task.isOptional ? 0.6 : 1;
    totalWeight += weight;
    sum += getTaskRate(task) * weight;
  });
  return Math.round(sum / totalWeight);
}

export function judgeToday(
  achievementRate: number,
  coreChecks: DailyCoreChecks,
  tasks: DailyTask[],
  memo: string,
): { level: JudgmentLevel; message: string; nextRecommendation: string } {
  const hasAgainCardSignal = [...tasks.map((task) => task.memo), memo].some((text) => text.includes('다시 카드'));

  if (!coreChecks.objectiveAnki && !coreChecks.subjectiveAnki) {
    return {
      level: 'danger',
      message: '1차와 2차 ANKI가 모두 비었습니다. 내일은 신규 진도보다 카드 복구부터 붙이세요.',
      nextRecommendation: '내일은 1차 5장, 2차 2장 중 최소 하나라도 먼저 완료합니다.',
    };
  }

  if (!coreChecks.objectiveAnki || !coreChecks.subjectiveAnki) {
    return {
      level: 'warning',
      message: '1차와 2차 중 한쪽 ANKI가 빠졌습니다. 동차 목표라서 둘 다 아주 작게라도 붙이는 쪽이 좋습니다.',
      nextRecommendation: '내일은 빠진 쪽을 먼저 처리하고, 목표량은 올리지 않습니다.',
    };
  }

  if (!coreChecks.objectivePage || !coreChecks.subjectivePage) {
    return {
      level: 'warning',
      message: 'ANKI는 했지만 1차/2차 페이지 확인 중 빠진 부분이 있습니다. 범위와 카드가 떨어지지 않게 다시 묶으세요.',
      nextRecommendation: '내일은 1차와 2차 각각 PDF를 먼저 열고 해당 범위 ANKI로 들어갑니다.',
    };
  }

  if (hasAgainCardSignal) {
    return {
      level: 'warning',
      message: '다시 카드 비율이 높습니다. 내일은 신규학습보다 정확도 회복이 우선입니다.',
      nextRecommendation: '신규학습은 줄이고 오답·다시 카드를 먼저 처리하세요.',
    };
  }

  const bedtime = coreChecks.bedtimeAnki ? ' 자기 전 ANKI까지 마감했습니다. 오늘은 충분합니다.' : ' 저녁 ANKI까지 하면 더 단단해집니다.';
  if (achievementRate >= 80) {
    return {
      level: 'success',
      message: `오늘 계획은 충분히 수행했습니다. 무리하지 말고 이 흐름을 유지하세요.${bedtime}`,
      nextRecommendation: '내일 목표는 유지합니다. 최근 7일이 안정되면 다음 주에 조금 늘립니다.',
    };
  }
  if (achievementRate >= 50) {
    return {
      level: 'normal',
      message: `핵심 복습은 지켰습니다. 미완료 항목은 내일 무리해서 몰아넣지 않습니다.${bedtime}`,
      nextRecommendation: '내일 목표는 유지하거나 소폭 감량합니다.',
    };
  }
  return {
    level: 'minimum',
    message: `오늘은 최소 성공입니다. 복습을 끊지 않은 것이 중요합니다.${bedtime}`,
    nextRecommendation: '내일은 목표를 낮춰서 다시 붙입니다.',
  };
}

function reviewTask(date: string): DailyTask {
  return createTask(date, {
    title: 'ANKI 복습카드 처리',
    examType: 'review',
    subject: 'ANKI',
    sourceLabel: 'ANKI 전체',
    ankiScope: '오늘 due 카드 전체',
    taskType: 'ANKI_REVIEW',
    targetCount: 1,
    unit: '완료',
    priority: '높음',
  });
}

function retrievalWarmupTask(date: string): DailyTask {
  return createTask(date, {
    title: '오늘 문서 보기 전 백지회상',
    examType: 'review',
    subject: '암기 루틴',
    sourceLabel: '암기법: 인출 연습',
    ankiScope: '보기 전에 기억나는 것 3분 적기',
    taskType: 'RETRIEVAL_PRACTICE',
    targetCount: 3,
    unit: '분',
    priority: '높음',
  });
}

function addPageCheckTask(tasks: DailyTask[], date: string, examType: 'objective' | 'subjective') {
  if (tasks.some((task) => task.taskType === 'PAGE_CHECK' && task.examType === examType)) return;
  const pageTask = tasks.find((task) => isPageStudyTask(task) && task.examType === examType);
  const checkTask = createTask(date, {
    title: examType === 'objective' ? '1차 페이지/PDF 확인' : '2차 페이지/PDF 확인',
    examType,
    subject: pageTask?.subject ?? (examType === 'objective' ? '1차 오늘 학습 범위' : '2차 오늘 학습 범위'),
    sourceLabel: examType === 'objective' ? '1차 오늘 범위' : '2차 오늘 범위',
    logseqFile: pageTask?.logseqFile,
    pdfUrl: pageTask?.pdfUrl,
    ankiScope: pageTask?.ankiScope,
    taskType: 'PAGE_CHECK',
    targetCount: 1,
    unit: '완료',
    priority: '높음',
  });
  tasks.splice(Math.min(2, tasks.length), 0, checkTask);
}

function isPageStudyTask(task: DailyTask): boolean {
  if (!task.logseqFile && !task.pdfUrl) return false;
  return !['ANKI_REVIEW', 'BEDTIME_REVIEW', 'PAGE_CHECK', 'SPACED_REVIEW'].includes(task.taskType);
}

function plannedCardTask(
  date: string,
  cardPlan: DocumentCardPlan,
  title: string,
  taskType: TaskType,
  priority: DailyTask['priority'],
  isOptional = false,
): DailyTask {
  const document = cardPlan.document;
  const plannedCardKeys = getStudyDocumentCardKeys(document).slice(cardPlan.startCard - 1, cardPlan.endCard);
  return createTask(date, {
    title,
    examType: document.examType,
    subject: `${document.group} / ${document.title}`,
    sourceLabel: `카드계획: ${formatPlanPace(cardPlan)}`,
    logseqFile: document.logseqFile,
    pdfUrl: document.pdfUrl,
    ankiScope: `${document.ankiScope} · ${formatPlanRange(cardPlan)}`,
    plannedDocumentId: document.id,
    plannedStartCard: cardPlan.startCard,
    plannedEndCard: cardPlan.endCard,
    plannedTotalCards: cardPlan.totalCards,
    plannedDayInDocument: cardPlan.dayInDocument,
    plannedDocumentDays: cardPlan.totalDocumentDays,
    plannedDailyGoal: cardPlan.dailyGoal,
    plannedCardKeys: plannedCardKeys.length ? plannedCardKeys : undefined,
    taskType,
    targetCount: Math.max(1, cardPlan.endCard - cardPlan.startCard + 1),
    unit: '개',
    priority,
    isOptional,
  });
}

function addBedtimeTask(tasks: DailyTask[], date: string, settings: Settings) {
  if (!settings.bedtimeReviewEnabled) return;
  tasks.push(createTask(date, {
    title: `자기 전 ANKI 복습 (${settings.bedtimeReviewTime})`,
    examType: 'review',
    subject: 'ANKI',
    sourceLabel: 'ANKI 마감',
    ankiScope: '자기 전 잔여 due 카드',
    taskType: 'BEDTIME_REVIEW',
    targetCount: 1,
    unit: '완료',
    priority: '높음',
  }));
}

function addSpacedRecallTask(tasks: DailyTask[], date: string, planDay: number, records: StudyRecord[]) {
  if (planDay < 1) return;
  const source = findSpacedRecallSourceTask(records, date);
  if (source) {
    tasks.push(createTask(date, {
      title: `${source.gap}일 전 범위 간격 회상`,
      examType: 'review',
      subject: source.task.subject,
      sourceLabel: '실제 학습 이력 기반 간격 반복',
      logseqFile: source.task.logseqFile,
      pdfUrl: source.task.pdfUrl,
      ankiScope: source.task.ankiScope,
      plannedDocumentId: source.task.plannedDocumentId,
      plannedStartCard: source.task.plannedStartCard,
      plannedEndCard: source.task.plannedEndCard,
      plannedTotalCards: source.task.plannedTotalCards,
      plannedDayInDocument: source.task.plannedDayInDocument,
      plannedDocumentDays: source.task.plannedDocumentDays,
      plannedDailyGoal: source.task.plannedDailyGoal,
      plannedCardKeys: source.task.plannedCardKeys,
      taskType: 'SPACED_REVIEW',
      targetCount: 1,
      unit: '완료',
      priority: source.gap >= 7 ? '높음' : '보통',
      isOptional: source.gap < 3,
    }));
    return;
  }

  const gap = planDay >= 7 ? 7 : planDay >= 3 ? 3 : 1;
  const recallIndex = Math.max(0, planDay - gap);
  const document = recallIndex % 2 === 0 ? selectObjectiveDocument(recallIndex) : selectSubjectiveDocument(recallIndex);
  tasks.push(createTask(date, {
    title: `${gap}일 전 문서 간격 회상`,
    examType: 'review',
    subject: `${document.group} / ${document.title}`,
    sourceLabel: '암기법: 간격 반복',
    logseqFile: document.logseqFile,
    pdfUrl: document.pdfUrl,
    ankiScope: `${document.ankiScope} 중 기억 안 나는 카드만`,
    taskType: 'SPACED_REVIEW',
    targetCount: 1,
    unit: '완료',
    priority: '보통',
    isOptional: planDay < 3,
  }));
}

function findSpacedRecallSourceTask(records: StudyRecord[], date: string): { task: DailyTask; gap: number } | null {
  for (const gap of [7, 3, 1]) {
    const targetDate = addDays(date, -gap);
    const record = records.find((item) => item.date === targetDate);
    const task = record?.dailyTasks.find((item) => {
      if (!item.plannedTotalCards) return false;
      if (item.examType !== 'objective' && item.examType !== 'subjective') return false;
      return getTaskRate(item) >= 100 || item.actualCount > 0;
    });
    if (task) return { task, gap };
  }

  return null;
}

function studyDocumentTask(
  date: string,
  document: StudyDocument,
  title: string,
  taskType: TaskType,
  targetCount: number,
  unit: StudyUnit,
  priority: DailyTask['priority'],
  isOptional = false,
): DailyTask {
  return createTask(date, {
    title,
    examType: document.examType,
    subject: `${document.group} / ${document.title}`,
    sourceLabel: 'Logseq + ANKI',
    logseqFile: document.logseqFile,
    pdfUrl: document.pdfUrl,
    ankiScope: document.ankiScope,
    taskType,
    targetCount,
    unit,
    priority,
    isOptional,
  });
}

function selectObjectiveDocument(dayIndex: number): StudyDocument {
  const dailyTracks = [
    getObjectiveLawDocs(),
    getObjectiveStructureDocs(),
    getObjectiveTheoryDocs(),
    getObjectiveElectricDocs(),
  ];
  const track = dailyTracks[dayIndex % dailyTracks.length];
  const round = Math.floor(dayIndex / dailyTracks.length);
  return selectDocument(track, round);
}

function selectSubjectiveDocument(dayIndex: number): StudyDocument {
  const dailyTracks = [
    getSecondaryFireDocs(),
    getSecondaryLawDocs(),
    getSecondaryFireDocs(),
    getSecondaryInspectionDocs(),
  ];
  const track = dailyTracks[dayIndex % dailyTracks.length];
  const round = Math.floor(dayIndex / dailyTracks.length);
  return selectDocument(track, round);
}

function selectDocument(documents: StudyDocument[], index: number): StudyDocument {
  return documents[index % documents.length];
}
