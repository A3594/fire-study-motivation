import type { StudyDocument } from '../types';

const CARD_COUNT_STORAGE_KEY = 'fire-study-motivation:cardCounts';
const DYNAMIC_DOCUMENTS_STORAGE_KEY = 'fire-study-motivation:dynamicDocuments';
const CARD_KEYS_STORAGE_KEY = 'fire-study-motivation:cardKeysByDocument';

const CARD_COUNTS: Record<string, number> = {
  nftc101: 35,
  nftc102: 56,
  nftc103: 70,
  nftc201: 3,
  nftc202: 2,
  nftc203: 59,
  nftc204: 5,
  nftc205: 10,
  nftc206: 8,
  nftc301: 25,
  nftc303: 29,
  nftc501: 19,
  nftc602: 6,
  seismic: 3,
  'law-basic': 4,
  'law-prevention': 53,
  'law-facilities': 103,
  'law-multiuse': 36,
  'law-highrise': 15,
  'inspect-practice': 144,
  'inspect-symbols': 12,
  'inspect-checklist': 90,
  'inspect-approval': 38,
  'obj-law-basic': 50,
  'obj-law-prevention': 42,
  'obj-law-facilities': 70,
  'obj-law-building': 30,
  'obj-law-multiuse': 55,
  'obj-law-highrise': 30,
  'obj-theory-combustion': 126,
  'obj-theory-fire-explosion': 51,
  'obj-theory-building-fire': 137,
  'obj-electric-dc': 71,
  'obj-electric-capacitor': 18,
  'obj-electric-magnetism': 52,
  'obj-electric-ac-rlc': 39,
  'obj-electric-ac-power': 24,
  'obj-electric-network': 5,
  'obj-electric-machine': 12,
  'obj-electric-sequence': 53,
  'obj-structure-alarm-auto': 103,
  'obj-structure-alarm-emergency': 15,
  'obj-structure-broadcast': 13,
  'obj-structure-alert': 19,
  'obj-structure-gas': 5,
  'obj-structure-leakage': 24,
  'obj-structure-exit-light': 44,
  'obj-structure-power': 18,
};

function doc(
  id: string,
  title: string,
  group: string,
  examType: StudyDocument['examType'],
  track: StudyDocument['track'],
  logseqFile: string,
  priority: StudyDocument['priority'] = '보통',
): StudyDocument {
  return {
    id,
    title,
    group,
    examType,
    track,
    logseqFile,
    pdfUrl: `./pdfs/pages/${encodeURIComponent(id)}.pdf`,
    priority,
    ankiScope: `${group} / ${title}`,
    cardCount: CARD_COUNTS[id] ?? 0,
  };
}

export function getStudyDocumentCardCount(document: StudyDocument): number {
  const overrides = readCardCountOverrides();
  return Math.max(0, overrides[document.id] ?? document.cardCount ?? 0);
}

export function getStudyDocumentCardKeys(document: StudyDocument): string[] {
  return readCardKeysByDocument()[document.id] ?? [];
}

export function readCardCountOverrides(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CARD_COUNT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, number> : {};
  } catch {
    return {};
  }
}

export function writeCardCountOverrides(counts: Record<string, number>) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CARD_COUNT_STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Ignore unavailable browser storage.
  }
}

export interface ListeningCatalogDocument {
  id: string;
  title: string;
  group: string;
  cardCount?: number;
  cards?: Array<{ number?: number; question?: string }>;
}

export function writeDynamicCatalogFromListeningCards(documents: ListeningCatalogDocument[]) {
  const dynamicDocuments = documents.map(toDynamicStudyDocument).filter((document): document is StudyDocument => Boolean(document));
  const counts: Record<string, number> = {};
  const cardKeys: Record<string, string[]> = {};

  documents.forEach((document) => {
    if (!document.id) return;
    counts[document.id] = Number(document.cardCount ?? document.cards?.length ?? 0);
    cardKeys[document.id] = (document.cards ?? []).map((card, index) => buildCardKey(document.id, card.question ?? '', card.number ?? index + 1));
  });

  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DYNAMIC_DOCUMENTS_STORAGE_KEY, JSON.stringify(dynamicDocuments));
    localStorage.setItem(CARD_COUNT_STORAGE_KEY, JSON.stringify(counts));
    localStorage.setItem(CARD_KEYS_STORAGE_KEY, JSON.stringify(cardKeys));
  } catch {
    // Ignore unavailable browser storage.
  }
}

function readDynamicDocuments(): StudyDocument[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DYNAMIC_DOCUMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as StudyDocument[] : [];
  } catch {
    return [];
  }
}

function readCardKeysByDocument(): Record<string, string[]> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CARD_KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, string[]> : {};
  } catch {
    return {};
  }
}

export const PDF_GROUP_LINKS = [
  { label: '2차 전체', group: '2차', url: './pdfs/groups/secondary-all.pdf' },
  { label: '화재안전기술기준', group: '2차', url: './pdfs/groups/secondary-fire-standards.pdf' },
  { label: '소방법 주관식', group: '2차', url: './pdfs/groups/secondary-law.pdf' },
  { label: '점검실무', group: '2차', url: './pdfs/groups/secondary-inspection.pdf' },
  { label: '객관식 전체', group: '1차', url: './pdfs/groups/objective-all.pdf' },
  { label: '소방관계법령', group: '1차', url: './pdfs/groups/objective-law.pdf' },
  { label: '소방원론', group: '1차', url: './pdfs/groups/objective-theory.pdf' },
  { label: '소방전기', group: '1차', url: './pdfs/groups/objective-electric.pdf' },
  { label: '구조원리(소방전기)', group: '1차', url: './pdfs/groups/objective-structure-electric.pdf' },
] as const;

export const SECONDARY_FIRE_DOCS: StudyDocument[] = [
  doc('nftc101', '소화기구 및 자동소화장치(NFTC101)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___소화기구 및 자동소화장치(NFTC101).md', '높음'),
  doc('nftc102', '옥내소화전(NFTC102)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___옥내소화전(NFTC102).md', '높음'),
  doc('nftc103', '스프링클러설비(NFTC103)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___스프링클러설비(NFTC103).md', '높음'),
  doc('nftc201', '비상경보설비 및 단독경보형감지기(NFTC201)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___비상경보설비 및 단독경보형감지기(NFTC201).md'),
  doc('nftc202', '비상방송설비(NFTC 202)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___비상방송설비(NFTC 202).md'),
  doc('nftc203', '자동화재탐지설비 및 시각경보장치(NFTC203)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___자동화재탐지설비 및 시각경보장치(NFTC203).md', '높음'),
  doc('nftc204', '자동화재속보설비(NFTC204)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___자동화재속보설비(NFTC204).md'),
  doc('nftc205', '누전경보기(NFTC205)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___누전경보기(NFTC205).md'),
  doc('nftc206', '가스누설경보기(NFTC206)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___가스누설경보기(NFTC206).md'),
  doc('nftc301', '피난기구(NFTC301)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___피난기구(NFTC301).md'),
  doc('nftc303', '유도등 및 유도표지,피난유도선(NFTC303)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___유도등 및 유도표지,피난유도선(NFTC303).md'),
  doc('nftc501', '제연설비(NFTC501)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___제연설비(NFTC501).md', '높음'),
  doc('nftc602', '비상전원수전설비(NFTC602)', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___비상전원수전설비(NFTC602).md'),
  doc('seismic', '내진설계 기준', '2차 화재안전기술기준', 'subjective', 'secondary-fire', 'PARA___Resource___화재안전기술기준___내진설계 기준.md'),
];

export const SECONDARY_LAW_DOCS: StudyDocument[] = [
  doc('law-basic', '소방기본법', '2차 소방법 주관식', 'subjective', 'secondary-law', 'PARA___Resource___점검실무행정___소방법___소방기본법.md', '높음'),
  doc('law-prevention', '화재예방법', '2차 소방법 주관식', 'subjective', 'secondary-law', 'PARA___Resource___점검실무행정___소방법___화재예방법.md', '높음'),
  doc('law-facilities', '소방시설법', '2차 소방법 주관식', 'subjective', 'secondary-law', 'PARA___Resource___점검실무행정___소방법___소방시설법.md', '높음'),
  doc('law-multiuse', '다중이용업소 안전관리에 관한 특별법', '2차 소방법 주관식', 'subjective', 'secondary-law', 'PARA___Resource___점검실무행정___소방법___다중이용업소 안전관리에 관한 특별법.md'),
  doc('law-highrise', '초고층 및 지하연계 복합건축물 재난관리에 관한 특별법', '2차 소방법 주관식', 'subjective', 'secondary-law', 'PARA___Resource___점검실무행정___소방법___초고층 및 지하연계 복합건축물 재난관리에 관한 특별법.md'),
];

export const SECONDARY_INSPECTION_DOCS: StudyDocument[] = [
  doc('inspect-practice', '점검실무 / 점검', '2차 점검실무', 'subjective', 'secondary-inspection', 'PARA___Resource___점검실무행정___점검실무___점검.md', '높음'),
  doc('inspect-symbols', '점검실무 / 도시기호', '2차 점검실무', 'subjective', 'secondary-inspection', 'PARA___Resource___점검실무행정___점검실무___도시기호.md'),
  doc('inspect-checklist', '점검표 / 종합 및 작동', '2차 점검실무', 'subjective', 'secondary-inspection', 'PARA___Resource___점검실무행정___점검표___종합및작동.md'),
  doc('inspect-approval', '기술기준 / 형식승인 및 제품검사', '2차 점검실무', 'subjective', 'secondary-inspection', 'PARA___Resource___점검실무행정___기술기준___형식승인 및 제품검사.md'),
];

export const OBJECTIVE_LAW_DOCS: StudyDocument[] = [
  doc('obj-law-basic', '소방기본법', '1차 객관식 소방관계법령', 'objective', 'objective-law', '객관식___소방관계법령___02.소방기본법.md', '높음'),
  doc('obj-law-prevention', '화재예방법', '1차 객관식 소방관계법령', 'objective', 'objective-law', '객관식___소방관계법령___화재예방법.md', '높음'),
  doc('obj-law-facilities', '소방시설법', '1차 객관식 소방관계법령', 'objective', 'objective-law', '객관식___소방관계법령___소방시설법.md', '높음'),
  doc('obj-law-building', '건축법', '1차 객관식 소방관계법령', 'objective', 'objective-law', '객관식___소방관계법령___건축법.md'),
  doc('obj-law-multiuse', '다중이용업소', '1차 객관식 소방관계법령', 'objective', 'objective-law', '객관식___소방관계법령___다중이용업소.md'),
  doc('obj-law-highrise', '초고층ㆍ지하연계법', '1차 객관식 소방관계법령', 'objective', 'objective-law', '객관식___소방관계법령___초고층 및 지하연계 복합건축물 재난관리법.md'),
];

export const OBJECTIVE_THEORY_DOCS: StudyDocument[] = [
  doc('obj-theory-combustion', '연소공학', '1차 객관식 소방원론', 'objective', 'objective-theory', '객관식___소방원론___1.연소공학___문제.md', '높음'),
  doc('obj-theory-fire-explosion', '화재와 폭발', '1차 객관식 소방원론', 'objective', 'objective-theory', '객관식___소방원론___2.화재와폭발___문제.md'),
  doc('obj-theory-building-fire', '건축물의 화재현상', '1차 객관식 소방원론', 'objective', 'objective-theory', '객관식___소방원론___3. 건축물의 화재현상___문제.md'),
];

export const OBJECTIVE_ELECTRIC_DOCS: StudyDocument[] = [
  doc('obj-electric-dc', '전기회로 / 직류회로', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___전기회로___01직류회로___문제.md'),
  doc('obj-electric-capacitor', '전기회로 / 정전기와 콘덴서', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___전기회로___02정전기와 콘덴서___문제.md'),
  doc('obj-electric-magnetism', '전기회로 / 정자계ㆍ전자력ㆍ전자유도', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___전기회로___03정자계,04전자력과 전자유도___문제.md'),
  doc('obj-electric-ac-rlc', '전기회로 / 교류 발생ㆍRLC', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___전기회로___05교류 기본회로___01.교류의발생,02교류회로의 R.L.C___문제.md'),
  doc('obj-electric-ac-power', '전기회로 / 교류전력', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___전기회로___05교류 기본회로___03교류전력___문제.md'),
  doc('obj-electric-network', '전기회로 / 회로망', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___전기회로___05교류 기본회로___06회로망___문제.md'),
  doc('obj-electric-machine', '전기기계', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___04전기기계___01전기기계.md'),
  doc('obj-electric-sequence', '시퀀스 제어ㆍ논리회로', '1차 객관식 소방전기', 'objective', 'objective-electric', '객관식___소방전기___제어회로___02시퀀스 제어___01시퀀스 제어,02논리회로.md'),
];

export const OBJECTIVE_STRUCTURE_DOCS: StudyDocument[] = [
  doc('obj-structure-alarm-auto', '경보설비 / 자동화재탐지설비', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___01경보설비02자동화재탐지설비.md', '높음'),
  doc('obj-structure-alarm-emergency', '비상경보설비ㆍ단독경보형 감지기', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___03비상경보설비04단독경보형 감지기.md'),
  doc('obj-structure-broadcast', '비상방송설비', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___05비상방송설비.md'),
  doc('obj-structure-alert', '자동화재속보설비ㆍ화재알림설비', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___06자동화재속보설비07화재알림설비.md'),
  doc('obj-structure-gas', '가스누설경보기', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___08가스누설경보기.md'),
  doc('obj-structure-leakage', '누전경보기', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___09누전경보기.md'),
  doc('obj-structure-exit-light', '유도등 및 유도표지', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___피난구조설비(유도등 및 유도표지).md'),
  doc('obj-structure-power', '비상전원 수전설비', '1차 객관식 구조원리', 'objective', 'objective-structure', '객관식___소방시설의 구조원리(소방전기)___소화활동설비(비상전원 수전설비).md'),
];

export const OBJECTIVE_DOCS = [
  ...OBJECTIVE_LAW_DOCS,
  ...OBJECTIVE_THEORY_DOCS,
  ...OBJECTIVE_ELECTRIC_DOCS,
  ...OBJECTIVE_STRUCTURE_DOCS,
];

export const SUBJECTIVE_DOCS = [
  ...SECONDARY_FIRE_DOCS,
  ...SECONDARY_LAW_DOCS,
  ...SECONDARY_INSPECTION_DOCS,
];

export function getCatalogSummary() {
  return [
  { label: '1차 객관식 소방관계법령', count: OBJECTIVE_LAW_DOCS.length, cardCount: sumCards(OBJECTIVE_LAW_DOCS) },
  { label: '1차 객관식 소방원론', count: OBJECTIVE_THEORY_DOCS.length, cardCount: sumCards(OBJECTIVE_THEORY_DOCS) },
  { label: '1차 객관식 소방전기', count: OBJECTIVE_ELECTRIC_DOCS.length, cardCount: sumCards(OBJECTIVE_ELECTRIC_DOCS) },
  { label: '1차 객관식 구조원리', count: OBJECTIVE_STRUCTURE_DOCS.length, cardCount: sumCards(OBJECTIVE_STRUCTURE_DOCS) },
  { label: '2차 화재안전기술기준', count: SECONDARY_FIRE_DOCS.length, cardCount: sumCards(SECONDARY_FIRE_DOCS) },
  { label: '2차 소방법 주관식', count: SECONDARY_LAW_DOCS.length, cardCount: sumCards(SECONDARY_LAW_DOCS) },
  { label: '2차 점검실무', count: SECONDARY_INSPECTION_DOCS.length, cardCount: sumCards(SECONDARY_INSPECTION_DOCS) },
  ];
}

function sumCards(documents: StudyDocument[]): number {
  return documents.reduce((sum, document) => sum + getStudyDocumentCardCount(document), 0);
}

export function getObjectiveLawDocs(): StudyDocument[] {
  return mergeDynamicDocuments(OBJECTIVE_LAW_DOCS, 'objective-law');
}

export function getObjectiveTheoryDocs(): StudyDocument[] {
  return mergeDynamicDocuments(OBJECTIVE_THEORY_DOCS, 'objective-theory');
}

export function getObjectiveElectricDocs(): StudyDocument[] {
  return mergeDynamicDocuments(OBJECTIVE_ELECTRIC_DOCS, 'objective-electric');
}

export function getObjectiveStructureDocs(): StudyDocument[] {
  return mergeDynamicDocuments(OBJECTIVE_STRUCTURE_DOCS, 'objective-structure');
}

export function getSecondaryFireDocs(): StudyDocument[] {
  return mergeDynamicDocuments(SECONDARY_FIRE_DOCS, 'secondary-fire');
}

export function getSecondaryLawDocs(): StudyDocument[] {
  return mergeDynamicDocuments(SECONDARY_LAW_DOCS, 'secondary-law');
}

export function getSecondaryInspectionDocs(): StudyDocument[] {
  return mergeDynamicDocuments(SECONDARY_INSPECTION_DOCS, 'secondary-inspection');
}

export function getObjectiveDocs(): StudyDocument[] {
  return [
    ...getObjectiveLawDocs(),
    ...getObjectiveTheoryDocs(),
    ...getObjectiveElectricDocs(),
    ...getObjectiveStructureDocs(),
  ];
}

export function getSubjectiveDocs(): StudyDocument[] {
  return [
    ...getSecondaryFireDocs(),
    ...getSecondaryLawDocs(),
    ...getSecondaryInspectionDocs(),
  ];
}

export function getDynamicCatalogSummary() {
  const objectiveLawDocs = getObjectiveLawDocs();
  const objectiveTheoryDocs = getObjectiveTheoryDocs();
  const objectiveElectricDocs = getObjectiveElectricDocs();
  const objectiveStructureDocs = getObjectiveStructureDocs();
  const secondaryFireDocs = getSecondaryFireDocs();
  const secondaryLawDocs = getSecondaryLawDocs();
  const secondaryInspectionDocs = getSecondaryInspectionDocs();

  return [
    { label: '1차 객관식 소방관계법규', count: objectiveLawDocs.length, cardCount: sumCards(objectiveLawDocs) },
    { label: '1차 객관식 소방원론', count: objectiveTheoryDocs.length, cardCount: sumCards(objectiveTheoryDocs) },
    { label: '1차 객관식 소방전기', count: objectiveElectricDocs.length, cardCount: sumCards(objectiveElectricDocs) },
    { label: '1차 객관식 구조원리', count: objectiveStructureDocs.length, cardCount: sumCards(objectiveStructureDocs) },
    { label: '2차 화재안전기술기준', count: secondaryFireDocs.length, cardCount: sumCards(secondaryFireDocs) },
    { label: '2차 소방법 주관식', count: secondaryLawDocs.length, cardCount: sumCards(secondaryLawDocs) },
    { label: '2차 점검실무', count: secondaryInspectionDocs.length, cardCount: sumCards(secondaryInspectionDocs) },
  ];
}

function mergeDynamicDocuments(baseDocuments: StudyDocument[], track: StudyDocument['track']): StudyDocument[] {
  const baseIds = new Set(baseDocuments.map((document) => document.id));
  const extras = readDynamicDocuments()
    .filter((document) => document.track === track && !baseIds.has(document.id))
    .sort((a, b) => `${a.group} ${a.title}`.localeCompare(`${b.group} ${b.title}`, 'ko'));
  return [...baseDocuments, ...extras];
}

function toDynamicStudyDocument(document: ListeningCatalogDocument): StudyDocument | null {
  if (!document.id || !document.title || !document.group) return null;
  const inferred = inferTrack(document.group, document.title);
  if (!inferred) return null;

  return {
    id: document.id,
    title: document.title,
    group: document.group,
    examType: inferred.examType,
    track: inferred.track,
    logseqFile: `${document.id}.md`,
    pdfUrl: `./pdfs/pages/${encodeURIComponent(document.id)}.pdf`,
    ankiScope: `${document.group} / ${document.title}`,
    cardCount: Number(document.cardCount ?? document.cards?.length ?? 0),
    priority: '보통',
  };
}

function inferTrack(group: string, title: string): Pick<StudyDocument, 'examType' | 'track'> | null {
  const text = `${group} ${title}`;
  if (/객관식/.test(text)) {
    if (/관계법|법규|법령|건축법|다중|초고층/.test(text)) return { examType: 'objective', track: 'objective-law' };
    if (/원론|연소|화재|폭발/.test(text)) return { examType: 'objective', track: 'objective-theory' };
    if (/전기|회로|자기|교류|직류|시퀀스/.test(text)) return { examType: 'objective', track: 'objective-electric' };
    return { examType: 'objective', track: 'objective-structure' };
  }
  if (/점검|실무|행정|종합|작동|승인|제품검사|도시기호|표시기호/.test(text)) {
    return { examType: 'subjective', track: 'secondary-inspection' };
  }
  if (/법규|소방법|기본법|예방법|시설법|다중|초고층/.test(text)) {
    return { examType: 'subjective', track: 'secondary-law' };
  }
  return { examType: 'subjective', track: 'secondary-fire' };
}

function buildCardKey(documentId: string, question: string, fallbackNumber: number): string {
  const normalized = question
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 220);
  const source = normalized || `card-${fallbackNumber}`;
  return `${documentId}:${hashString(source)}`;
}

function hashString(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
