import { BatteryCharging, Gauge, RefreshCw, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { PHASE_NOTES } from '../constants/defaults';
import { MEMORY_PRINCIPLES, ROTATION_POLICY } from '../constants/memoryStrategy';
import { PDF_GROUP_LINKS, getDynamicCatalogSummary } from '../constants/studyCatalog';
import type { Plan, Settings, StudyRecord } from '../types';
import { getDday } from '../utils/date';
import { calculateStats } from '../utils/stats';
import { formatPlanPace, formatPlanRange, getObjectiveCardPlan, getSubjectiveCardPlan } from '../utils/cardPlan';
import { calculateMasteryProgress, getAdaptiveDailyGoals } from '../utils/mastery';
import { ActionButton } from '../components/ActionButton';
import { StatCard } from '../components/StatCard';

interface PlanPageProps {
  plan: Plan;
  settings: Settings;
  records: StudyRecord[];
  onLower: () => void;
  onKeep: () => void;
  onRaise: () => void;
  onHard: () => void;
  onEase: () => void;
  onRegenerate: () => void;
}

export function PlanPage({ plan, settings, records, onLower, onKeep, onRaise, onHard, onEase, onRegenerate }: PlanPageProps) {
  const stats = calculateStats(records, plan, settings);
  const catalogSummary = getDynamicCatalogSummary();
  const firstDday = getDday(plan.firstExamDate);
  const secondDday = getDday(plan.secondExamDate);
  const mastery = calculateMasteryProgress(plan, records);
  const adaptiveGoals = getAdaptiveDailyGoals(plan, settings, records);
  const objectivePlan = getObjectiveCardPlan(plan, undefined, adaptiveGoals.objectiveGoal);
  const subjectivePlan = getSubjectiveCardPlan(plan, undefined, adaptiveGoals.subjectiveGoal);
  const needsAdjustment =
    stats.recommendedObjectiveNewCardGoal !== plan.currentObjectiveNewCardGoal ||
    stats.recommendedSubjectiveNewCardGoal !== plan.currentSubjectiveNewCardGoal ||
    stats.last7AverageRate < 50;

  return (
    <main className="page">
      <section className="summary-panel plan-summary">
        <span className="eyebrow">2027 동차 전체계획</span>
        <h1>{plan.currentPhase}</h1>
        <p>{PHASE_NOTES[plan.currentPhase]}</p>
      </section>

      <section className="stat-grid two">
        <StatCard label="1차 D-day" value={`D-${firstDday}`} tone={firstDday <= 60 ? 'orange' : 'blue'} />
        <StatCard label="2차 D-day" value={`D-${secondDday}`} tone={secondDday <= 60 ? 'orange' : 'green'} />
        <StatCard label="오늘 1차 목표" value={`${adaptiveGoals.objectiveGoal}장`} tone="ink" footnote={`현재 기준 ${plan.currentObjectiveNewCardGoal}장`} />
        <StatCard label="오늘 2차 목표" value={`${adaptiveGoals.subjectiveGoal}개`} tone="green" footnote={`현재 기준 ${plan.currentSubjectiveNewCardGoal}개`} />
        <StatCard label="계획 이행률" value={`${stats.last7AverageRate}%`} tone={stats.last7AverageRate >= 80 ? 'green' : stats.last7AverageRate >= 50 ? 'blue' : 'red'} />
      </section>

      <section className="form-card compact">
        <h2>합격권 회상 목표</h2>
        <div className="plan-card-grid">
          <MasteryCard
            label="1차 객관식"
            totalCards={mastery.objective.totalCards}
            targetRepetitions={mastery.objective.targetRepetitions}
            completedUnits={mastery.objective.completedUnits}
            targetUnits={mastery.objective.targetUnits}
            readinessRate={mastery.objective.readinessRate}
            firstPassRate={mastery.objective.firstPassRate}
            neededDailyUnits={mastery.objective.neededDailyUnits}
          />
          <MasteryCard
            label="2차 주관식"
            totalCards={mastery.subjective.totalCards}
            targetRepetitions={mastery.subjective.targetRepetitions}
            completedUnits={mastery.subjective.completedUnits}
            targetUnits={mastery.subjective.targetUnits}
            readinessRate={mastery.subjective.readinessRate}
            firstPassRate={mastery.subjective.firstPassRate}
            neededDailyUnits={mastery.subjective.neededDailyUnits}
          />
        </div>
        <p className="helper-copy">{adaptiveGoals.reason}</p>
      </section>

      <section className="form-card compact">
        <h2>오늘 카드 세부계획</h2>
        <div className="plan-card-grid">
          <PlanCard
            label="1차 객관식"
            title={objectivePlan.document.title}
            group={objectivePlan.document.group}
            pace={formatPlanPace(objectivePlan)}
            range={formatPlanRange(objectivePlan)}
          />
          <PlanCard
            label="2차 주관식"
            title={subjectivePlan.document.title}
            group={subjectivePlan.document.group}
            pace={formatPlanPace(subjectivePlan)}
            range={formatPlanRange(subjectivePlan)}
          />
        </div>
      </section>

      <section className="form-card compact">
        <h2>PDF 자료실</h2>
        <p className="helper-copy">휴대폰에서도 바로 열 수 있도록 GitHub에 저장된 과목별 PDF입니다.</p>
        <div className="pdf-link-grid">
          {PDF_GROUP_LINKS.map((item) => (
            <a key={item.url} className="pdf-link" href={item.url} target="_blank" rel="noreferrer">
              <span>{item.group}</span>
              <strong>{item.label}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="form-card compact">
        <h2>이번 달 목표</h2>
        <ul className="plain-list">
          {plan.monthlyGoals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section className="form-card compact">
        <h2>이번 주 목표</h2>
        <ul className="plain-list">
          {plan.weeklyGoals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section className="form-card compact">
        <h2>자동생성 기준</h2>
        <p className="helper-copy">오늘 할 일은 계획 시작일 기준으로 Logseq 문서를 순환시키고, 각 문서는 같은 ANKI 학습 범위와 함께 표시합니다.</p>
        <div className="catalog-grid">
          {catalogSummary.map((item) => (
            <div key={item.label} className="catalog-item">
              <span>{item.label}</span>
              <strong>{item.count}문서</strong>
              <small>{item.cardCount}카드</small>
            </div>
          ))}
        </div>
      </section>

      <section className="form-card compact">
        <h2>암기 방식</h2>
        <div className="memory-grid">
          {MEMORY_PRINCIPLES.map((item) => (
            <article key={item.title} className="memory-item">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="form-card compact">
        <h2>과목 회전 기준</h2>
        <ul className="plain-list">
          {ROTATION_POLICY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={`recommend-card ${needsAdjustment ? 'needs-adjustment' : ''}`}>
        <strong>{needsAdjustment ? '계획 수정 필요' : '계획 유지 가능'}</strong>
        <p>{stats.adjustmentReason} 다음 주 추천: 1차 {stats.recommendedObjectiveNewCardGoal}장, 2차 {stats.recommendedSubjectiveNewCardGoal}개.</p>
      </section>

      <section className="button-stack">
        <ActionButton onClick={onLower}>
          <TrendingDown size={18} />
          이번 주 목표 낮추기
        </ActionButton>
        <ActionButton onClick={onKeep}>
          <Gauge size={18} />
          이번 주 목표 유지
        </ActionButton>
        <ActionButton onClick={onRaise}>
          <TrendingUp size={18} />
          다음 주 목표 올리기
        </ActionButton>
        <ActionButton onClick={onHard}>
          <Zap size={18} />
          빡공 모드 전환
        </ActionButton>
        <ActionButton onClick={onEase}>
          <BatteryCharging size={18} />
          완화 모드 전환
        </ActionButton>
        <ActionButton variant="ghost" onClick={onRegenerate}>
          <RefreshCw size={18} />
          계획 다시 생성
        </ActionButton>
      </section>
    </main>
  );
}

interface PlanCardProps {
  label: string;
  title: string;
  group: string;
  pace: string;
  range: string;
}

function PlanCard({ label, title, group, pace, range }: PlanCardProps) {
  return (
    <article className="plan-card-item">
      <span>{label}</span>
      <strong>{title}</strong>
      <small>{group}</small>
      <em>{pace}</em>
      <b>오늘 {range}</b>
    </article>
  );
}

interface MasteryCardProps {
  label: string;
  totalCards: number;
  targetRepetitions: number;
  completedUnits: number;
  targetUnits: number;
  readinessRate: number;
  firstPassRate: number;
  neededDailyUnits: number;
}

function MasteryCard({ label, totalCards, targetRepetitions, completedUnits, targetUnits, readinessRate, firstPassRate, neededDailyUnits }: MasteryCardProps) {
  return (
    <article className="plan-card-item">
      <span>{label}</span>
      <strong>{totalCards}장 × {targetRepetitions}회</strong>
      <small>합격권 목표 {targetUnits}회상 · 현재 {completedUnits}회상</small>
      <em>합격권 {readinessRate}% · 1회독 {firstPassRate}%</em>
      <b>필요 평균 {neededDailyUnits}회상/일</b>
    </article>
  );
}
