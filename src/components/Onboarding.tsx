import { useState } from 'react';
import { ArrowRight, Moon, Save } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import type { Settings } from '../types';
import { ActionButton } from './ActionButton';

interface OnboardingProps {
  onComplete: (settings: Settings) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [form, setForm] = useState<Settings>({ ...DEFAULT_SETTINGS });

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="app-shell onboarding">
      <section className="top-panel">
        <span className="eyebrow">2027 동차 루틴</span>
        <h1>작게 시작해서 매일 복습을 붙입니다</h1>
        <p>계획을 못 지킨 날은 실패가 아니라 조정 신호입니다.</p>
      </section>

      <section className="form-card">
        <h2>초기 설정</h2>
        <div className="form-grid">
          <label>
            1차 목표일
            <input type="date" value={form.firstExamDate} onChange={(event) => update('firstExamDate', event.target.value)} />
          </label>
          <label>
            2차 목표일
            <input type="date" value={form.secondExamDate} onChange={(event) => update('secondExamDate', event.target.value)} />
          </label>
          <NumberField label="평일 공부 가능 시간" value={form.weekdayAvailableMinutes} suffix="분" onChange={(value) => update('weekdayAvailableMinutes', value)} />
          <NumberField label="주말 공부 가능 시간" value={form.weekendAvailableMinutes} suffix="분" onChange={(value) => update('weekendAvailableMinutes', value)} />
          <NumberField label="1차 시작 신규 ANKI" value={form.defaultObjectiveNewCardGoal} suffix="장" onChange={(value) => update('defaultObjectiveNewCardGoal', value)} />
          <NumberField label="2차 시작 신규 ANKI" value={form.defaultSubjectiveNewCardGoal} suffix="개" onChange={(value) => update('defaultSubjectiveNewCardGoal', value)} />
          <NumberField label="토요일 카드 제작 목표" value={form.saturdayCreationGoal} suffix="개" onChange={(value) => update('saturdayCreationGoal', value)} />
          <NumberField label="일요일 카드 제작 목표" value={form.sundayCreationGoal} suffix="개" onChange={(value) => update('sundayCreationGoal', value)} />
          <label className="switch-line">
            <Moon size={18} />
            자기 전 ANKI 복습
            <input type="checkbox" checked={form.bedtimeReviewEnabled} onChange={(event) => update('bedtimeReviewEnabled', event.target.checked)} />
          </label>
          <label>
            자기 전 복습 기준 시간
            <input type="time" value={form.bedtimeReviewTime} onChange={(event) => update('bedtimeReviewTime', event.target.value)} />
          </label>
        </div>
        <ActionButton variant="primary" onClick={() => onComplete(form)}>
          <Save size={18} />
          전체계획 만들기
          <ArrowRight size={18} />
        </ActionButton>
      </section>
    </main>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}

function NumberField({ label, value, suffix, onChange }: NumberFieldProps) {
  return (
    <label>
      {label}
      <div className="number-stepper">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>-</button>
        <strong>{value}{suffix}</strong>
        <button type="button" onClick={() => onChange(value + 1)}>+</button>
      </div>
    </label>
  );
}
