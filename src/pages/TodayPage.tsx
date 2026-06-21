import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpen, CheckCircle2, Layers3, Moon, Plus, Save, Shuffle, SquareStack } from 'lucide-react';
import type { Condition, CoreCheckKey, DailyTask, Plan, Settings, StudyRecord, TodayMode } from '../types';
import { formatKoreanDate } from '../utils/date';
import { calculateAchievementRate, getCoreChecks, judgeToday } from '../utils/tasks';
import { calculateStats } from '../utils/stats';
import { getAdaptiveDailyGoals } from '../utils/mastery';
import { ActionButton } from '../components/ActionButton';
import { StatCard } from '../components/StatCard';
import { StudyMusicPlayer } from '../components/StudyMusicPlayer';
import { TaskCard } from '../components/TaskCard';
import { WeeklyListenPanel } from '../components/WeeklyListenPanel';

interface TodayPageProps {
  settings: Settings;
  plan: Plan;
  today: string;
  todayMode: TodayMode;
  todayRecord?: StudyRecord;
  records: StudyRecord[];
  tasks: DailyTask[];
  onTaskChange: (taskId: string, patch: Partial<DailyTask>) => void;
  onCoreCheckChange: (key: CoreCheckKey, checked: boolean, condition: Condition, studyMinutes: number, memo: string) => void;
  onAddTask: () => void;
  onDeleteTask: (taskId: string) => void;
  onSave: (condition: Condition, studyMinutes: number, memo: string) => void;
}

export function TodayPage({ settings, plan, today, todayMode, todayRecord, records, tasks, onTaskChange, onCoreCheckChange, onAddTask, onDeleteTask, onSave }: TodayPageProps) {
  const [condition, setCondition] = useState<Condition>(todayRecord?.condition ?? '중');
  const [studyMinutes, setStudyMinutes] = useState(todayRecord?.studyMinutes ?? 0);
  const [memo, setMemo] = useState(todayRecord?.memo ?? '');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setCondition(todayRecord?.condition ?? '중');
    setStudyMinutes(todayRecord?.studyMinutes ?? 0);
    setMemo(todayRecord?.memo ?? '');
  }, [todayRecord]);

  const preview = useMemo(() => {
    const achievementRate = calculateAchievementRate(tasks);
    const coreChecks = getCoreChecks(tasks);
    return {
      achievementRate,
      ...judgeToday(achievementRate, coreChecks, tasks, memo),
      coreChecks,
      objectiveAnkiCompleted: coreChecks.objectiveAnki,
      objectivePageChecked: coreChecks.objectivePage,
      subjectiveAnkiCompleted: coreChecks.subjectiveAnki,
      subjectivePageChecked: coreChecks.subjectivePage,
      bedtimeReviewCompleted: coreChecks.bedtimeAnki,
    };
  }, [tasks, memo]);
  const stats = useMemo(() => calculateStats(records, plan, settings), [records, plan, settings]);
  const adaptiveGoals = getAdaptiveDailyGoals(plan, settings, records, today);
  const objectiveGoal = adaptiveGoals.objectiveGoal;
  const subjectiveGoal = adaptiveGoals.subjectiveGoal;

  function save() {
    onSave(condition, studyMinutes, memo);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  }

  return (
    <main className="page">
      <section className={`summary-panel judgment-${preview.level}`}>
        <div>
          <span className="eyebrow">{formatKoreanDate(today)}</span>
          <h1>오늘 체크리스트</h1>
        </div>
        <div className="phase-line">
          <span>{plan.currentPhase}</span>
          <span>{todayMode}</span>
        </div>
        <div className="rate-large">{preview.achievementRate}%</div>
        <p>{preview.message}</p>
      </section>

      <section className="stat-grid two">
        <StatCard label="1차 ANKI" value={preview.objectiveAnkiCompleted ? '완료' : `${objectiveGoal}장`} tone={preview.objectiveAnkiCompleted ? 'green' : 'red'} />
        <StatCard label="1차 페이지" value={preview.objectivePageChecked ? '완료' : '대기'} tone={preview.objectivePageChecked ? 'green' : 'orange'} />
        <StatCard label="2차 ANKI" value={preview.subjectiveAnkiCompleted ? '완료' : `${subjectiveGoal}개`} tone={preview.subjectiveAnkiCompleted ? 'green' : 'red'} />
        <StatCard label="2차 페이지" value={preview.subjectivePageChecked ? '완료' : '대기'} tone={preview.subjectivePageChecked ? 'green' : 'orange'} />
        <StatCard label="자기 전 복습" value={settings.bedtimeReviewEnabled ? (preview.bedtimeReviewCompleted ? '완료' : '대기') : '꺼짐'} tone={preview.bedtimeReviewCompleted ? 'green' : 'gray'} />
        <StatCard label="7일 핵심체크" value={`${stats.last7CoreRate}%`} tone={stats.last7CoreRate >= 80 ? 'green' : stats.last7CoreRate >= 50 ? 'blue' : 'orange'} />
      </section>

      <section className="core-check-panel">
        <div className="section-title-row">
          <h2>오늘 핵심 체크</h2>
          <span>밤 12시 새로 시작</span>
        </div>
        <div className="core-check-grid">
          <CoreCheckButton
            checked={preview.coreChecks.objectiveAnki}
            icon={<Shuffle size={21} />}
            title="1차 ANKI 했나"
            detail={`신규 ${objectiveGoal}장`}
            onClick={() => onCoreCheckChange('objectiveAnki', !preview.coreChecks.objectiveAnki, condition, studyMinutes, memo)}
          />
          <CoreCheckButton
            checked={preview.coreChecks.objectivePage}
            icon={<SquareStack size={21} />}
            title="1차 페이지 봤나"
            detail="PDF/Logseq 확인"
            onClick={() => onCoreCheckChange('objectivePage', !preview.coreChecks.objectivePage, condition, studyMinutes, memo)}
          />
          <CoreCheckButton
            checked={preview.coreChecks.subjectiveAnki}
            icon={<Layers3 size={21} />}
            title="2차 ANKI 했나"
            detail={`신규 ${subjectiveGoal}개`}
            onClick={() => onCoreCheckChange('subjectiveAnki', !preview.coreChecks.subjectiveAnki, condition, studyMinutes, memo)}
          />
          <CoreCheckButton
            checked={preview.coreChecks.subjectivePage}
            icon={<BookOpen size={21} />}
            title="2차 페이지 봤나"
            detail="PDF/Logseq 확인"
            onClick={() => onCoreCheckChange('subjectivePage', !preview.coreChecks.subjectivePage, condition, studyMinutes, memo)}
          />
          <CoreCheckButton
            checked={preview.coreChecks.bedtimeAnki}
            icon={<Moon size={21} />}
            title="저녁 ANKI 했나"
            detail={settings.bedtimeReviewTime}
            onClick={() => onCoreCheckChange('bedtimeAnki', !preview.coreChecks.bedtimeAnki, condition, studyMinutes, memo)}
          />
        </div>
      </section>

      <StudyMusicPlayer />

      <WeeklyListenPanel plan={plan} settings={settings} records={records} today={today} />

      <section className="task-list">
        <div className="section-title-row">
          <h2>오늘 할 일</h2>
          <ActionButton onClick={onAddTask}>
            <Plus size={18} />
            추가
          </ActionButton>
        </div>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onChange={(patch) => onTaskChange(task.id, patch)} onDelete={() => onDeleteTask(task.id)} />
        ))}
      </section>

      <section className="form-card compact">
        <h2>오늘 기록</h2>
        <div className="segmented">
          {(['상', '중', '하'] as Condition[]).map((item) => (
            <button key={item} className={condition === item ? 'active' : ''} onClick={() => setCondition(item)}>
              컨디션 {item}
            </button>
          ))}
        </div>
        <label>
          공부시간
          <div className="number-stepper">
            <button onClick={() => setStudyMinutes(Math.max(0, studyMinutes - 10))}>-</button>
            <strong>{studyMinutes}분</strong>
            <button onClick={() => setStudyMinutes(studyMinutes + 10)}>+</button>
          </div>
        </label>
        <textarea rows={3} placeholder="오늘 메모" value={memo} onChange={(event) => setMemo(event.target.value)} />
        <ActionButton variant="primary" onClick={save}>
          <Save size={18} />
          기록 저장
        </ActionButton>
        {savedFlash ? <p className="save-flash">저장했습니다.</p> : null}
      </section>

      <section className="recommend-card">
        <strong>누적 피드백</strong>
        <p>{stats.motivationMessage}</p>
      </section>

      <section className="recommend-card">
        <strong>내일 추천</strong>
        <p>{preview.nextRecommendation}</p>
      </section>
    </main>
  );
}

interface CoreCheckButtonProps {
  checked: boolean;
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}

function CoreCheckButton({ checked, icon, title, detail, onClick }: CoreCheckButtonProps) {
  return (
    <button className={`core-check-button ${checked ? 'checked' : ''}`} onClick={onClick}>
      <span className="core-check-icon">{checked ? <CheckCircle2 size={21} /> : icon}</span>
      <strong>{title}</strong>
      <small>{checked ? '완료' : detail}</small>
    </button>
  );
}
