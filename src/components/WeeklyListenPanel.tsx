import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, PauseCircle, RotateCw, SkipForward, TimerReset, Volume2 } from 'lucide-react';
import type { Plan, Settings, StudyRecord } from '../types';
import { getSubjectiveCardPlan, getObjectiveCardPlan } from '../utils/cardPlan';
import { addDays } from '../utils/date';
import { getAdaptiveDailyGoals } from '../utils/mastery';

type TrackKind = 'objective' | 'subjective';
type ListenMode = 'question' | 'qa';

interface ListeningCard {
  number: number;
  question: string;
  answer: string;
  mnemonic: string;
}

interface ListeningDocument {
  id: string;
  title: string;
  label: string;
  group: string;
  cardCount: number;
  cards: ListeningCard[];
}

interface ListeningData {
  generatedAt: string;
  documentCount: number;
  cardCount: number;
  documents: ListeningDocument[];
}

interface ListeningSegment {
  documentId: string;
  title: string;
  group: string;
  ranges: Array<{ start: number; end: number }>;
}

interface ListeningTrack {
  kind: TrackKind;
  label: string;
  segments: ListeningSegment[];
}

interface ListeningCardView extends ListeningCard {
  documentId: string;
  documentTitle: string;
  group: string;
}

interface WeeklyListenPanelProps {
  plan: Plan;
  settings: Settings;
  records: StudyRecord[];
  today: string;
}

export function WeeklyListenPanel({ plan, settings, records, today }: WeeklyListenPanelProps) {
  const [data, setData] = useState<ListeningData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [trackKind, setTrackKind] = useState<TrackKind>('objective');
  const [cardIndex, setCardIndex] = useState(0);
  const [pauseEnabled, setPauseEnabled] = useState(true);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<ListenMode>('qa');
  const sessionRef = useRef(0);
  const repeatRef = useRef(repeatEnabled);
  const cardsRef = useRef<ListeningCardView[]>([]);
  const indexRef = useRef(cardIndex);
  const modeRef = useRef<ListenMode>(mode);

  useEffect(() => {
    let cancelled = false;

    fetch('./listening-cards.json')
      .then((response) => {
        if (!response.ok) throw new Error('듣기 카드 데이터를 불러오지 못했습니다.');
        return response.json() as Promise<ListeningData>;
      })
      .then((nextData) => {
        if (!cancelled) setData(nextData);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : '듣기 데이터를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    repeatRef.current = repeatEnabled;
  }, [repeatEnabled]);

  useEffect(() => {
    indexRef.current = cardIndex;
  }, [cardIndex]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const tracks = useMemo(() => buildWeeklyTracks(plan, settings, records, today), [plan, settings, records, today]);
  const activeTrack = tracks.find((track) => track.kind === trackKind) ?? tracks[0];
  const cards = useMemo(() => buildListeningCards(activeTrack, data), [activeTrack, data]);
  const activeCard = cards[cardIndex] ?? cards[0];
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    cardsRef.current = cards;
    setCardIndex(0);
    indexRef.current = 0;
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKind, cards.length]);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function play(nextMode: ListenMode, startIndex = indexRef.current) {
    if (!supported || cardsRef.current.length === 0) return;
    const token = sessionRef.current + 1;
    sessionRef.current = token;
    setMode(nextMode);
    modeRef.current = nextMode;
    window.speechSynthesis.cancel();
    runSequence(token, nextMode, startIndex);
  }

  function stop() {
    sessionRef.current += 1;
    setSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function nextCard() {
    if (cardsRef.current.length === 0) return;
    const wasSpeaking = speaking;
    const next = (indexRef.current + 1) % cardsRef.current.length;
    stop();
    setCardIndex(next);
    indexRef.current = next;
    if (wasSpeaking) {
      window.setTimeout(() => play(modeRef.current, next), 80);
    }
  }

  async function runSequence(token: number, nextMode: ListenMode, startIndex: number) {
    const currentCards = cardsRef.current;
    if (currentCards.length === 0) return;

    const safeIndex = Math.max(0, Math.min(startIndex, currentCards.length - 1));
    const card = currentCards[safeIndex];
    setSpeaking(true);
    setCardIndex(safeIndex);
    indexRef.current = safeIndex;

    await speakText(`문제 ${safeIndex + 1}. ${card.question}`);
    if (sessionRef.current !== token) return;

    if (nextMode === 'qa') {
      if (pauseEnabled) await wait(3000);
      if (sessionRef.current !== token) return;
      await speakText(`답. ${card.answer || '답안이 비어 있습니다.'}`);
      if (sessionRef.current !== token) return;
      if (card.mnemonic && card.mnemonic !== card.answer) {
        await speakText(`핵심. ${card.mnemonic}`);
      }
    }

    if (sessionRef.current !== token) return;
    if (repeatRef.current) {
      const next = (safeIndex + 1) % currentCards.length;
      await wait(700);
      if (sessionRef.current === token) runSequence(token, nextMode, next);
      return;
    }

    setSpeaking(false);
  }

  if (loadError) {
    return (
      <section className="listen-panel">
        <div className="section-title-row">
          <h2>이번 주 듣기</h2>
        </div>
        <p className="helper-copy">{loadError}</p>
      </section>
    );
  }

  return (
    <section className="listen-panel">
      <div className="section-title-row">
        <h2>이번 주 듣기</h2>
        <span>{data ? `${data.cardCount}카드` : '불러오는 중'}</span>
      </div>

      <div className="listen-track-tabs">
        {tracks.map((track) => (
          <button key={track.kind} className={track.kind === trackKind ? 'active' : ''} onClick={() => setTrackKind(track.kind)}>
            {track.label}
          </button>
        ))}
      </div>

      <div className="listen-now">
        <span>{activeTrack.label}</span>
        <strong>{activeCard ? activeCard.documentTitle : '듣기 카드 준비 중'}</strong>
        <small>
          {activeCard
            ? `${cardIndex + 1}/${cards.length} · 원본 ${activeCard.number}번 카드`
            : activeTrack.segments.map((segment) => segment.title).join(', ')}
        </small>
      </div>

      {activeCard ? (
        <div className="listen-preview">
          <b>문제</b>
          <p>{activeCard.question}</p>
        </div>
      ) : null}

      <div className="listen-controls">
        <button onClick={() => play('question')} disabled={!supported || !activeCard}>
          <Headphones size={17} />
          문제만 듣기
        </button>
        <button onClick={() => play('qa')} disabled={!supported || !activeCard}>
          <Volume2 size={17} />
          문제 + 답 듣기
        </button>
        <button className={pauseEnabled ? 'active' : ''} onClick={() => setPauseEnabled((value) => !value)}>
          <TimerReset size={17} />
          3초 멈춤
        </button>
        <button className={repeatEnabled ? 'active' : ''} onClick={() => setRepeatEnabled((value) => !value)}>
          <RotateCw size={17} />
          반복 듣기
        </button>
        <button onClick={nextCard} disabled={!activeCard}>
          <SkipForward size={17} />
          다음 카드
        </button>
        <button onClick={stop} disabled={!speaking}>
          <PauseCircle size={17} />
          정지
        </button>
      </div>

      {!supported ? <p className="listen-help">이 브라우저는 기본 TTS를 지원하지 않습니다. Chrome 또는 Safari에서 열어주세요.</p> : null}
      {supported ? <p className="listen-help">화면을 켠 상태에서 이어폰으로 듣는 용도입니다. 백그라운드 재생은 기기 정책에 따라 멈출 수 있습니다.</p> : null}
    </section>
  );
}

function buildWeeklyTracks(plan: Plan, settings: Settings, records: StudyRecord[], today: string): ListeningTrack[] {
  const objective: ListeningTrack = { kind: 'objective', label: '1차 객관식', segments: [] };
  const subjective: ListeningTrack = { kind: 'subjective', label: '2차 주관식', segments: [] };

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, offset);
    const goals = getAdaptiveDailyGoals(plan, settings, records, date);
    addPlanSegment(objective, getObjectiveCardPlan(plan, date, goals.objectiveGoal));
    addPlanSegment(subjective, getSubjectiveCardPlan(plan, date, goals.subjectiveGoal));
  }

  return [objective, subjective];
}

function addPlanSegment(track: ListeningTrack, plan: ReturnType<typeof getObjectiveCardPlan>) {
  const existing = track.segments.find((segment) => segment.documentId === plan.document.id);
  const range = { start: plan.startCard, end: plan.endCard };

  if (existing) {
    existing.ranges = mergeRanges([...existing.ranges, range]);
    return;
  }

  track.segments.push({
    documentId: plan.document.id,
    title: plan.document.title,
    group: plan.document.group,
    ranges: [range],
  });
}

function mergeRanges(ranges: Array<{ start: number; end: number }>) {
  const sorted = ranges.slice().sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];

  sorted.forEach((range) => {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end + 1) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  });

  return merged;
}

function buildListeningCards(track: ListeningTrack, data: ListeningData | null): ListeningCardView[] {
  if (!data) return [];

  return track.segments.flatMap((segment) => {
    const document = data.documents.find((item) => item.id === segment.documentId);
    if (!document) return [];

    return document.cards
      .filter((card) => segment.ranges.some((range) => card.number >= range.start && card.number <= range.end))
      .map((card) => ({
        ...card,
        documentId: document.id,
        documentTitle: document.title,
        group: document.group,
      }));
  });
}

function speakText(text: string) {
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
