import { useEffect, useState } from 'react';
import { Download, RotateCcw, Save, Upload } from 'lucide-react';
import type { Settings } from '../types';
import { ActionButton } from '../components/ActionButton';

interface SettingsPageProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onExport: () => string;
  onImport: (raw: string) => void;
  onReset: () => void;
}

export function SettingsPage({ settings, onSave, onExport, onImport, onReset }: SettingsPageProps) {
  const [form, setForm] = useState(settings);
  const [dataText, setDataText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => setForm(settings), [settings]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function importData() {
    try {
      onImport(dataText);
      setMessage('가져왔습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '가져오기에 실패했습니다.');
    }
  }

  return (
    <main className="page">
      <section className="form-card">
        <h1>설정</h1>
        <div className="form-grid">
          <label>
            1차 목표일
            <input type="date" value={form.firstExamDate} onChange={(event) => update('firstExamDate', event.target.value)} />
          </label>
          <label>
            2차 목표일
            <input type="date" value={form.secondExamDate} onChange={(event) => update('secondExamDate', event.target.value)} />
          </label>
          <Stepper label="평일 가능 시간" value={form.weekdayAvailableMinutes} suffix="분" onChange={(value) => update('weekdayAvailableMinutes', value)} />
          <Stepper label="주말 가능 시간" value={form.weekendAvailableMinutes} suffix="분" onChange={(value) => update('weekendAvailableMinutes', value)} />
          <Stepper label="1차 기본 신규 ANKI" value={form.defaultObjectiveNewCardGoal} suffix="장" onChange={(value) => update('defaultObjectiveNewCardGoal', value)} />
          <Stepper label="2차 기본 신규 ANKI" value={form.defaultSubjectiveNewCardGoal} suffix="개" onChange={(value) => update('defaultSubjectiveNewCardGoal', value)} />
          <Stepper label="토요일 카드 제작" value={form.saturdayCreationGoal} suffix="개" onChange={(value) => update('saturdayCreationGoal', value)} />
          <Stepper label="일요일 카드 제작" value={form.sundayCreationGoal} suffix="개" onChange={(value) => update('sundayCreationGoal', value)} />
          <label className="switch-line">
            자기 전 복습 체크
            <input type="checkbox" checked={form.bedtimeReviewEnabled} onChange={(event) => update('bedtimeReviewEnabled', event.target.checked)} />
          </label>
          <label>
            복습 기준 시간
            <input type="time" value={form.bedtimeReviewTime} onChange={(event) => update('bedtimeReviewTime', event.target.value)} />
          </label>
          <label className="switch-line">
            과목 추천 사용
            <input type="checkbox" checked={form.subjectRecommendationEnabled} onChange={(event) => update('subjectRecommendationEnabled', event.target.checked)} />
          </label>
        </div>
        <ActionButton variant="primary" onClick={() => onSave(form)}>
          <Save size={18} />
          설정 저장
        </ActionButton>
      </section>

      <section className="form-card compact">
        <h2>데이터</h2>
        <div className="button-row">
          <ActionButton onClick={() => setDataText(onExport())}>
            <Download size={18} />
            내보내기
          </ActionButton>
          <ActionButton onClick={importData}>
            <Upload size={18} />
            가져오기
          </ActionButton>
        </div>
        <textarea rows={8} value={dataText} onChange={(event) => setDataText(event.target.value)} placeholder="JSON 데이터" />
        {message ? <p className="save-flash">{message}</p> : null}
        <ActionButton variant="danger" onClick={() => window.confirm('전체 데이터를 초기화할까요?') && onReset()}>
          <RotateCcw size={18} />
          전체 초기화
        </ActionButton>
      </section>
    </main>
  );
}

interface StepperProps {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}

function Stepper({ label, value, suffix, onChange }: StepperProps) {
  return (
    <label>
      {label}
      <div className="number-stepper">
        <button onClick={() => onChange(Math.max(0, value - 1))}>-</button>
        <strong>{value}{suffix}</strong>
        <button onClick={() => onChange(value + 1)}>+</button>
      </div>
    </label>
  );
}
