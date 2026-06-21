import type { Plan, Settings, StudyRecord } from '../types';
import { calculateStats } from '../utils/stats';
import { StatCard } from '../components/StatCard';

interface StatsPageProps {
  records: StudyRecord[];
  plan: Plan;
  settings: Settings;
}

export function StatsPage({ records, plan, settings }: StatsPageProps) {
  const stats = calculateStats(records, plan, settings);

  return (
    <main className="page">
      <section className="summary-panel stats-summary">
        <span className="eyebrow">숫자 점검</span>
        <h1>복습이 실제 암기입니다</h1>
        <p>안정되면 조금 늘리고, 무너지면 즉시 줄입니다.</p>
      </section>

      <section className="stat-grid two">
        <StatCard label="연속 학습일" value={`${stats.streakDays}일`} tone="green" />
        <StatCard label="7일 평균" value={`${stats.last7AverageRate}%`} tone="blue" />
        <StatCard label="7일 1차 ANKI" value={`${stats.last7ObjectiveAnkiRate}%`} tone={stats.last7ObjectiveAnkiRate >= 70 ? 'green' : 'orange'} />
        <StatCard label="7일 1차 페이지" value={`${stats.last7ObjectivePageRate}%`} tone={stats.last7ObjectivePageRate >= 70 ? 'green' : 'orange'} />
        <StatCard label="7일 2차 ANKI" value={`${stats.last7SubjectiveAnkiRate}%`} tone={stats.last7SubjectiveAnkiRate >= 60 ? 'green' : 'orange'} />
        <StatCard label="7일 2차 페이지" value={`${stats.last7SubjectivePageRate}%`} tone={stats.last7SubjectivePageRate >= 60 ? 'green' : 'orange'} />
        <StatCard label="자기 전 복습" value={`${stats.last7BedtimeRate}%`} tone="ink" />
        <StatCard label="7일 핵심체크" value={`${stats.last7CoreRate}%`} tone={stats.last7CoreRate >= 80 ? 'green' : 'blue'} />
        <StatCard label="객관식 수행량" value={`${stats.weeklyObjectiveCount}개`} tone="blue" />
        <StatCard label="주관식 수행량" value={`${stats.weeklySubjectiveCount}개`} tone="green" />
        <StatCard label="카드 제작" value={`${stats.weeklyCreationCount}개`} tone="orange" />
        <StatCard label="현재 1차 신규" value={`${plan.currentObjectiveNewCardGoal}장`} tone="ink" />
        <StatCard label="현재 2차 신규" value={`${plan.currentSubjectiveNewCardGoal}개`} tone="green" />
        <StatCard label="다음 주 추천" value={`1차 ${stats.recommendedObjectiveNewCardGoal} / 2차 ${stats.recommendedSubjectiveNewCardGoal}`} tone="red" footnote={stats.adjustmentReason} />
        <StatCard label="미완료 많은 과목" value={stats.weakSubject} tone="gray" />
        <StatCard label="오래 방치된 과목" value={stats.staleSubject} tone="gray" />
      </section>

      <section className="recommend-card">
        <strong>누적 피드백</strong>
        <p>{stats.motivationMessage}</p>
      </section>
    </main>
  );
}
