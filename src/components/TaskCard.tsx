import { Check, ExternalLink, Minus, Plus, Trash2 } from 'lucide-react';
import { TASK_TYPE_LABELS } from '../constants/defaults';
import type { DailyTask, StudyUnit } from '../types';
import { getTaskRate, getTaskStatus } from '../utils/tasks';
import { ActionButton } from './ActionButton';

const units: StudyUnit[] = ['개', '문제', '키워드', '목차', '답안', '분', '완료'];

interface TaskCardProps {
  task: DailyTask;
  onChange: (patch: Partial<DailyTask>) => void;
  onDelete: () => void;
}

export function TaskCard({ task, onChange, onDelete }: TaskCardProps) {
  const rate = getTaskRate(task);
  const status = getTaskStatus(task);
  const ankiScopeLabel = task.ankiScope?.replace(/\s*#card\b/g, '');
  const pdfUrl = resolvePdfUrl(task.pdfUrl);

  function changeActual(delta: number) {
    const actualCount = Math.max(0, task.actualCount + delta);
    onChange({ actualCount, isCompleted: task.targetCount > 0 && actualCount >= task.targetCount });
  }

  function changeTarget(delta: number) {
    const targetCount = Math.max(0, task.targetCount + delta);
    onChange({ targetCount, isCompleted: targetCount > 0 && task.actualCount >= targetCount });
  }

  function toggleComplete() {
    const next = !task.isCompleted;
    onChange({ isCompleted: next, actualCount: next && task.actualCount < task.targetCount ? task.targetCount : task.actualCount });
  }

  return (
    <article className={`task-card ${status === '완료' ? 'done' : status === '부분완료' ? 'partial' : ''}`}>
      <div className="task-card-head">
        <button className={`check-button ${task.isCompleted ? 'checked' : ''}`} onClick={toggleComplete} aria-label="완료 전환">
          <Check size={18} />
        </button>
        <div className="task-title-wrap">
          <input className="task-title-input" value={task.title} onChange={(event) => onChange({ title: event.target.value })} />
          <div className="task-meta">
            <span>{TASK_TYPE_LABELS[task.taskType]}</span>
            <span>{task.priority}</span>
            {task.isOptional ? <span>선택</span> : null}
          </div>
        </div>
        <button className="icon-button danger-text" onClick={onDelete} aria-label="할 일 삭제">
          <Trash2 size={18} />
        </button>
      </div>

      <label className="field-label">
        과목
        <input value={task.subject} onChange={(event) => onChange({ subject: event.target.value })} />
      </label>

      {(task.sourceLabel || task.logseqFile || task.pdfUrl || task.ankiScope) ? (
        <div className="source-box">
          {task.sourceLabel ? <strong>{task.sourceLabel}</strong> : null}
          {task.logseqFile ? <span>Logseq: {task.logseqFile}</span> : null}
          {pdfUrl ? (
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              같은 학습 범위 PDF 열기
            </a>
          ) : null}
          {ankiScopeLabel ? <span>ANKI 범위: {ankiScopeLabel}</span> : null}
          {task.plannedTotalCards ? (
            <em>
              오늘 {task.plannedStartCard}-{task.plannedEndCard}/{task.plannedTotalCards}장 · {task.plannedDocumentDays}일 중 {task.plannedDayInDocument}일
            </em>
          ) : null}
          {pdfUrl && ankiScopeLabel ? <em>PDF로 페이지 구조 확인 → ANKI에서 같은 범위 랜덤 회상</em> : null}
        </div>
      ) : null}

      <div className="counter-grid">
        <div className="counter-box">
          <span>목표</span>
          <div className="counter-row">
            <button onClick={() => changeTarget(-1)} aria-label="목표 감소">
              <Minus size={17} />
            </button>
            <strong>{task.targetCount}</strong>
            <button onClick={() => changeTarget(1)} aria-label="목표 증가">
              <Plus size={17} />
            </button>
          </div>
        </div>
        <div className="counter-box">
          <span>실제</span>
          <div className="counter-row">
            <button onClick={() => changeActual(-1)} aria-label="실제 감소">
              <Minus size={17} />
            </button>
            <strong>{task.actualCount}</strong>
            <button onClick={() => changeActual(1)} aria-label="실제 증가">
              <Plus size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="task-sub-row">
        <select value={task.unit} onChange={(event) => onChange({ unit: event.target.value as StudyUnit })}>
          {units.map((unit) => (
            <option key={unit}>{unit}</option>
          ))}
        </select>
        <span className="rate-pill">{rate}%</span>
        <span className={`status-pill status-${status}`}>{status}</span>
      </div>

      <textarea rows={2} placeholder="메모" value={task.memo} onChange={(event) => onChange({ memo: event.target.value })} />

      <ActionButton variant="ghost" onClick={toggleComplete}>
        <Check size={17} />
        {task.isCompleted ? '완료 취소' : '수동 완료'}
      </ActionButton>
    </article>
  );
}

function resolvePdfUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/api\/pages\/([^/]+)\/pdf$/);
  if (!match) return url;
  return `./pdfs/pages/${decodeURIComponent(match[1])}.pdf`;
}
