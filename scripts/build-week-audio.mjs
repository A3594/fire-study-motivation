import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const LISTENING_JSON = path.resolve(ROOT, 'public/listening-cards.json');
const AUDIO_DIR = path.resolve(ROOT, 'public/audio/current-week');
const TMP_DIR = path.resolve(ROOT, '.tmp/week-audio');
const SPEAK_SCRIPT = path.resolve(ROOT, 'scripts/speak-json-to-wav.ps1');
const PLAN_START_DATE = process.env.FIRE_AUDIO_PLAN_START_DATE ?? localDateKey();
const WEEK_START_DATE = process.env.FIRE_AUDIO_START_DATE ?? PLAN_START_DATE;
const OBJECTIVE_GOAL = numberFromEnv('FIRE_AUDIO_OBJECTIVE_GOAL', 5);
const SUBJECTIVE_GOAL = numberFromEnv('FIRE_AUDIO_SUBJECTIVE_GOAL', 2);
const ANSWER_LIMIT = numberFromEnv('FIRE_AUDIO_ANSWER_LIMIT', 520);
const QUESTION_LIMIT = numberFromEnv('FIRE_AUDIO_QUESTION_LIMIT', 420);
const MNEMONIC_LIMIT = numberFromEnv('FIRE_AUDIO_MNEMONIC_LIMIT', 160);

const OBJECTIVE_DOCS = [
  'obj-law-basic',
  'obj-law-prevention',
  'obj-law-facilities',
  'obj-law-building',
  'obj-law-multiuse',
  'obj-law-highrise',
  'obj-theory-combustion',
  'obj-theory-fire-explosion',
  'obj-theory-building-fire',
  'obj-electric-dc',
  'obj-electric-capacitor',
  'obj-electric-magnetism',
  'obj-electric-ac-rlc',
  'obj-electric-ac-power',
  'obj-electric-network',
  'obj-electric-machine',
  'obj-electric-sequence',
  'obj-structure-alarm-auto',
  'obj-structure-alarm-emergency',
  'obj-structure-broadcast',
  'obj-structure-alert',
  'obj-structure-gas',
  'obj-structure-leakage',
  'obj-structure-exit-light',
  'obj-structure-power',
];

const SUBJECTIVE_DOCS = [
  'nftc101',
  'nftc102',
  'nftc103',
  'nftc201',
  'nftc202',
  'nftc203',
  'nftc204',
  'nftc205',
  'nftc206',
  'nftc301',
  'nftc303',
  'nftc501',
  'nftc602',
  'seismic',
  'law-basic',
  'law-prevention',
  'law-facilities',
  'law-multiuse',
  'law-highrise',
  'inspect-practice',
  'inspect-symbols',
  'inspect-checklist',
  'inspect-approval',
];

const listeningData = JSON.parse(await fs.readFile(LISTENING_JSON, 'utf8'));
const documentsById = new Map(listeningData.documents.map((document) => [document.id, document]));

await fs.mkdir(AUDIO_DIR, { recursive: true });
await fs.mkdir(TMP_DIR, { recursive: true });

const tracks = [
  buildTrack('objective', '1차 객관식', OBJECTIVE_DOCS, OBJECTIVE_GOAL, 'objective-week.wav'),
  buildTrack('subjective', '2차 주관식', SUBJECTIVE_DOCS, SUBJECTIVE_GOAL, 'subjective-week.wav'),
];

const manifestTracks = [];

for (const track of tracks) {
  const outPath = path.join(AUDIO_DIR, track.fileName);
  const tmpJson = path.join(TMP_DIR, `${track.kind}-segments.json`);
  await fs.writeFile(tmpJson, JSON.stringify({ segments: track.audioSegments }, null, 2), 'utf8');

  console.log(`Generating ${track.label}: ${track.cards.length} cards -> ${path.relative(ROOT, outPath)}`);
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SPEAK_SCRIPT, '-InputJsonPath', tmpJson, '-OutputWavPath', outPath, '-Rate', '0'],
    { cwd: ROOT, stdio: 'inherit' },
  );

  if (result.status !== 0) {
    throw new Error(`Failed to generate ${track.fileName}`);
  }

  const stat = await fs.stat(outPath);
  if (stat.size > 95 * 1024 * 1024) {
    throw new Error(`${track.fileName} is too large for GitHub Pages-friendly deployment: ${formatBytes(stat.size)}`);
  }

  manifestTracks.push({
    kind: track.kind,
    label: track.label,
    title: `${track.label} 이번 주 듣기`,
    url: `./audio/current-week/${track.fileName}`,
    cardCount: track.cards.length,
    documentCount: track.segments.length,
    rangeSummary: track.segments.map((segment) => ({
      documentId: segment.documentId,
      title: segment.title,
      ranges: segment.ranges,
    })),
    bytes: stat.size,
    estimatedSeconds: Math.round(Math.max(0, stat.size - 44) / 32000),
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'Logseq #card bundled listening-cards.json',
  planStartDate: PLAN_START_DATE,
  weekStartDate: WEEK_START_DATE,
  weekEndDate: addDays(WEEK_START_DATE, 6),
  objectiveGoal: OBJECTIVE_GOAL,
  subjectiveGoal: SUBJECTIVE_GOAL,
  tracks: manifestTracks,
};

await fs.writeFile(path.join(AUDIO_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Wrote ${path.relative(ROOT, path.join(AUDIO_DIR, 'manifest.json'))}`);
for (const track of manifestTracks) {
  console.log(`${track.label}: ${track.cardCount} cards, ${formatBytes(track.bytes)}, ~${formatDuration(track.estimatedSeconds)}`);
}

function buildTrack(kind, label, documentIds, dailyGoal, fileName) {
  const documentPlans = documentIds
    .map((id) => documentsById.get(id))
    .filter(Boolean)
    .map((document) => ({
      document,
      totalCards: Math.max(1, document.cardCount || document.cards?.length || 1),
      days: Math.max(1, Math.ceil(Math.max(1, document.cardCount || document.cards?.length || 1) / Math.max(1, dailyGoal))),
    }));

  const segments = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(WEEK_START_DATE, offset);
    const selected = selectDocumentCardPlan(documentPlans, daysBetween(PLAN_START_DATE, date), dailyGoal);
    addSegment(segments, selected.document, { start: selected.startCard, end: selected.endCard });
  }

  const cards = buildCards(segments);
  const audioSegments = buildAudioSegments(label, cards);
  return { kind, label, fileName, segments, cards, audioSegments };
}

function selectDocumentCardPlan(documentPlans, planDay, dailyGoal) {
  const safeGoal = Math.max(1, dailyGoal);
  const cycleDays = documentPlans.reduce((sum, item) => sum + item.days, 0);
  let dayInCycle = cycleDays > 0 ? planDay % cycleDays : 0;

  for (const item of documentPlans) {
    if (dayInCycle >= item.days) {
      dayInCycle -= item.days;
      continue;
    }

    const startCard = dayInCycle * safeGoal + 1;
    const endCard = Math.min(item.totalCards, startCard + safeGoal - 1);
    return {
      document: item.document,
      startCard,
      endCard,
    };
  }

  const fallback = documentPlans[0];
  return {
    document: fallback.document,
    startCard: 1,
    endCard: Math.min(fallback.totalCards, safeGoal),
  };
}

function addSegment(segments, document, range) {
  const existing = segments.find((segment) => segment.documentId === document.id);
  if (existing) {
    existing.ranges = mergeRanges([...existing.ranges, range]);
    return;
  }

  segments.push({
    documentId: document.id,
    title: document.title,
    group: document.group,
    ranges: [range],
  });
}

function mergeRanges(ranges) {
  const sorted = ranges.slice().sort((a, b) => a.start - b.start);
  const merged = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end + 1) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

function buildCards(segments) {
  return segments.flatMap((segment) => {
    const document = documentsById.get(segment.documentId);
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

function buildAudioSegments(label, cards) {
  const segments = [
    { type: 'text', text: `${label} 이번 주 듣기입니다. 총 ${cards.length}개 카드입니다. 문제를 들은 뒤 3초 동안 답을 떠올려 보세요.` },
    { type: 'break', ms: 900 },
  ];

  cards.forEach((card, index) => {
    const answer = trimForSpeech(card.answer || '답안이 비어 있습니다.', ANSWER_LIMIT);
    const mnemonic = trimForSpeech(card.mnemonic || '', MNEMONIC_LIMIT);
    segments.push(
      { type: 'text', text: `${index + 1}번 카드. ${cleanForSpeech(card.documentTitle)}. 문제. ${trimForSpeech(card.question, QUESTION_LIMIT)}` },
      { type: 'break', ms: 3000 },
      { type: 'text', text: `답. ${answer}` },
    );

    if (mnemonic && !answer.includes(mnemonic)) {
      segments.push({ type: 'text', text: `핵심 암기문. ${mnemonic}` });
    }

    segments.push({ type: 'break', ms: 850 });
  });

  segments.push({ type: 'text', text: `${label} 이번 주 듣기를 마칩니다.` });
  return segments;
}

function trimForSpeech(text, maxLength) {
  const cleaned = cleanForSpeech(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function cleanForSpeech(text) {
  return String(text ?? '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[{}[\]<>`*_~#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function daysBetween(fromDateKey, toDateKeyValue) {
  const from = parseDateKey(fromDateKey).getTime();
  const to = parseDateKey(toDateKeyValue).getTime();
  return Math.max(0, Math.floor((to - from) / 86400000));
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}
