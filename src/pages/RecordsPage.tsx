import { useEffect, useMemo, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import type { Condition, DailyTask, Plan, StudyRecord } from '../types';
import { buildRecordFromTasks, getCoreChecks } from '../utils/tasks';
import { ActionButton } from '../components/ActionButton';
import { TaskCard } from '../components/TaskCard';

interface RecordsPageProps {
  records: StudyRecord[];
  plan: Plan;
  onUpdateRecord: (record: StudyRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

export function RecordsPage({ records, plan, onUpdateRecord, onDeleteRecord }: RecordsPageProps) {
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '');
  const selected = useMemo(() => records.find((record) => record.id === selectedId) ?? records[0], [records, selectedId]);
  const [draft, setDraft] = useState<StudyRecord | undefined>(selected);

  useEffect(() => {
    setDraft(selected);
    if (!selectedId && records[0]) setSelectedId(records[0].id);
  }, [selected, selectedId, records]);

  if (records.length === 0) {
    return (
      <main className="page">
        <section className="empty-panel">
          <h1>기록 없음</h1>
          <p>오늘 체크리스트를 저장하면 여기에 쌓입니다.</p>
        </section>
      </main>
    );
  }

  function updateDraftTask(taskId: string, patch: Partial<DailyTask>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, dailyTasks: prev.dailyTasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)) };
    });
  }

  function saveDraft() {
    if (!draft) return;
    const rebuilt = buildRecordFromTasks(draft.date, plan, draft.mode, draft.dailyTasks, draft.condition, draft.studyMinutes, draft.memo);
    onUpdateRecord({ ...rebuilt, id: draft.id, createdAt: draft.createdAt, phase: draft.phase, mode: draft.mode });
  }

  return (
    <main className="page">
      <section className="record-list">
        <h1>날짜별 기록</h1>
        {records.map((record) => (
          <button key={record.id} className={`record-row judgment-${record.judgmentLevel} ${record.id === draft?.id ? 'active' : ''}`} onClick={() => setSelectedId(record.id)}>
            <span>{record.date} ({record.dayOfWeek})</span>
            <strong>{record.achievementRate}%</strong>
            <small>{record.judgmentLevel}</small>
          </button>
        ))}
      </section>

      {draft ? (
        <section className="form-card compact">
          <h2>{draft.date} 상세</h2>
          <div className="record-summary-line">
            <span>{draft.phase}</span>
            <span>{draft.mode}</span>
            <span>{draft.reviewCompleted ? '복습 완료' : '복습 미완료'}</span>
            <span>{(draft.coreChecks ?? getCoreChecks(draft.dailyTasks)).objectiveAnki ? '1차 완료' : '1차 미완료'}</span>
            <span>{(draft.coreChecks ?? getCoreChecks(draft.dailyTasks)).subjectiveAnki ? '2차 완료' : '2차 미완료'}</span>
            <span>{(draft.coreChecks ?? getCoreChecks(draft.dailyTasks)).objectivePage ? '1차 페이지' : '1차 페이지 미완료'}</span>
            <span>{(draft.coreChecks ?? getCoreChecks(draft.dailyTasks)).subjectivePage ? '2차 페이지' : '2차 페이지 미완료'}</span>
            <span>{(draft.coreChecks ?? getCoreChecks(draft.dailyTasks)).bedtimeAnki ? '저녁 완료' : '저녁 미완료'}</span>
          </div>
          <div className="segmented">
            {(['상', '중', '하'] as Condition[]).map((item) => (
              <button key={item} className={draft.condition === item ? 'active' : ''} onClick={() => setDraft({ ...draft, condition: item })}>
                컨디션 {item}
              </button>
            ))}
          </div>
          <label>
            공부시간
            <div className="number-stepper">
              <button onClick={() => setDraft({ ...draft, studyMinutes: Math.max(0, draft.studyMinutes - 10) })}>-</button>
              <strong>{draft.studyMinutes}분</strong>
              <button onClick={() => setDraft({ ...draft, studyMinutes: draft.studyMinutes + 10 })}>+</button>
            </div>
          </label>
          <textarea rows={2} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
          {draft.dailyTasks.map((task) => (
            <TaskCard key={task.id} task={task} onChange={(patch) => updateDraftTask(task.id, patch)} onDelete={() => setDraft({ ...draft, dailyTasks: draft.dailyTasks.filter((item) => item.id !== task.id) })} />
          ))}
          <div className="button-row">
            <ActionButton variant="primary" onClick={saveDraft}>
              <Save size={18} />
              수정 저장
            </ActionButton>
            <ActionButton variant="danger" onClick={() => onDeleteRecord(draft.id)}>
              <Trash2 size={18} />
              삭제
            </ActionButton>
          </div>
        </section>
      ) : null}
    </main>
  );
}
