import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL = 'http://127.0.0.1:3217/api/pages';
const OUT_FILE = path.resolve('public/listening-cards.json');

const response = await fetch(API_URL);
if (!response.ok) {
  throw new Error(`Failed to read Logseq PDF server: ${response.status}`);
}

const api = await response.json();
const pages = (api.groups ?? []).flatMap((group) => group.pages ?? []);
const documents = [];

for (const page of pages) {
  if (!page.id || !page.fileName || !page.exists) continue;
  const filePath = path.join(api.graphRoot, 'pages', page.fileName);
  let raw = '';
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    continue;
  }

  const cards = extractCards(raw);
  if (cards.length === 0) continue;

  documents.push({
    id: page.id,
    title: page.title,
    label: page.label,
    group: page.group,
    cardCount: cards.length,
    cards,
  });
}

documents.sort((a, b) => a.label.localeCompare(b.label, 'ko'));

await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
await fs.writeFile(
  OUT_FILE,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'Logseq #card blocks',
      documentCount: documents.length,
      cardCount: documents.reduce((sum, document) => sum + document.cards.length, 0),
      documents,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Wrote ${OUT_FILE}`);
console.log(`Documents: ${documents.length}`);
console.log(`Cards: ${documents.reduce((sum, document) => sum + document.cards.length, 0)}`);

function extractCards(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  const cards = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!/#card\b/i.test(lines[index])) continue;

    const baseIndent = indentOf(lines[index]);
    const block = [lines[index]];
    let cursor = index + 1;

    while (cursor < lines.length) {
      const line = lines[cursor];
      const trimmed = line.trim();
      const indent = indentOf(line);
      if (/#card\b/i.test(line)) break;
      if (trimmed && indent <= baseIndent && /^-\s+/.test(trimmed)) break;
      block.push(line);
      cursor += 1;
    }

    const parsed = parseCardBlock(block, cards.length + 1);
    if (parsed) cards.push(parsed);
  }

  return cards;
}

function parseCardBlock(block, number) {
  const start = cleanText(stripLogseqLine(block[0]));
  if (!start) return null;

  const questionParts = [start];
  const answerParts = [];
  let seenChoices = false;
  let inAnswer = false;

  for (const rawLine of block.slice(1)) {
    const stripped = stripLogseqLine(rawLine);
    if (!stripped || isIgnoredLine(stripped)) continue;

    const cleaned = cleanText(stripped);
    if (!cleaned) continue;

    const answerMarker = isAnswerMarker(stripped, cleaned);
    const choice = isChoiceLine(cleaned);

    if (!inAnswer && choice) {
      seenChoices = true;
      questionParts.push(cleaned);
      continue;
    }

    if (!inAnswer && seenChoices && !answerMarker) {
      questionParts.push(cleaned);
      continue;
    }

    if (answerMarker || !seenChoices || inAnswer) {
      inAnswer = true;
      answerParts.push(removeAnswerLabel(cleaned));
    }
  }

  const answer = truncateText(answerParts.filter(Boolean).join(' '), 1300);
  const mnemonic = extractMnemonic(answerParts);

  return {
    number,
    question: truncateText(questionParts.join(' '), 700),
    answer,
    mnemonic,
  };
}

function indentOf(line) {
  return line.replace(/\t/g, '  ').match(/^\s*/)?.[0].length ?? 0;
}

function stripLogseqLine(line) {
  return line
    .replace(/\t/g, '  ')
    .trim()
    .replace(/^[-*]\s+/, '')
    .replace(/^#{1,6}\s*/, '')
    .trim();
}

function isIgnoredLine(line) {
  return (
    /^id::/i.test(line) ||
    /^collapsed::/i.test(line) ||
    /^deck::/i.test(line) ||
    /^---+$/.test(line) ||
    /^!\[[^\]]*]/.test(line)
  );
}

function cleanText(input) {
  return input
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/#card\b/gi, '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .replace(/!\[[^\]]*]\([^)]*\)(\{[^}]*})?/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*|__|==|~~/g, '')
    .replace(/&nbsp;|&lt;|&gt;|&amp;/g, ' ')
    .replace(/\{:[^}]+}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isChoiceLine(text) {
  return /^(\(?[1-5][.)]|\(?[①②③④⑤])\s*/.test(text);
}

function isAnswerMarker(raw, cleaned) {
  return /정답|해설|중요|핵심|암기|추가 설명|관련 정보|요약/.test(raw) || /정답|해설|중요|핵심|암기/.test(cleaned);
}

function removeAnswerLabel(text) {
  return text
    .replace(/^해설\s*[|:：-]?\s*/i, '')
    .replace(/^정답\s*[:：-]?\s*/i, '정답: ')
    .replace(/^중요한 내용\s*[:：-]?\s*/i, '핵심: ')
    .trim();
}

function extractMnemonic(answerParts) {
  const candidate =
    answerParts.find((part) => /핵심|중요|암기|정답|==|\*\*/.test(part) && cleanText(part).length <= 180) ??
    answerParts.find((part) => cleanText(part).length > 0 && cleanText(part).length <= 120) ??
    '';
  return truncateText(removeAnswerLabel(cleanText(candidate)), 180);
}

function truncateText(text, maxLength) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}
