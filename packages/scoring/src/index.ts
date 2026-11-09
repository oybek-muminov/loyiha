export type ScorableItemType = 'single' | 'multi' | 'numeric' | 'open';

export interface ScoringOption {
  label: string;
  isCorrect: boolean;
}

export interface ScoringNumeric {
  answer: number;
  tolerance: number;
  unit?: string | null;
  unitRequired: boolean;
}

export interface ScoringKeyword {
  /** `|` bilan ajratilgan sinonimlar: "tezlanish|akseleratsiya" */
  keyword: string;
  weight: number;
  isRequired: boolean;
}

export interface ScorableItem {
  type: ScorableItemType;
  options?: ScoringOption[];
  numeric?: ScoringNumeric;
  keywords?: ScoringKeyword[];
}

export type SubmittedAnswer =
  | { choice: string }
  | { choices: string[] }
  | { value: number; unit?: string }
  | { text: string };

export type ReviewStatus = 'none' | 'pending';

export interface ScoreResult {
  correct: boolean;
  /** 0 yoki 1 — Rasch uchun dichotomous */
  score: 0 | 1;
  reviewStatus: ReviewStatus;
}

const CORRECT: ScoreResult = { correct: true, score: 1, reviewStatus: 'none' };
const INCORRECT: ScoreResult = { correct: false, score: 0, reviewStatus: 'none' };
const PENDING: ScoreResult = { correct: false, score: 0, reviewStatus: 'pending' };

const APOSTROPHES = /[\u2018\u2019\u02BC\u02BB`´']/g;

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUnit(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/·/g, '*')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/\^/g, '');
}

function hasChoice(answer: SubmittedAnswer): answer is { choice: string } {
  return typeof (answer as { choice?: unknown }).choice === 'string';
}

function hasChoices(answer: SubmittedAnswer): answer is { choices: string[] } {
  return Array.isArray((answer as { choices?: unknown }).choices);
}

function hasValue(answer: SubmittedAnswer): answer is { value: number; unit?: string } {
  return typeof (answer as { value?: unknown }).value === 'number';
}

function hasText(answer: SubmittedAnswer): answer is { text: string } {
  return typeof (answer as { text?: unknown }).text === 'string';
}

export function scoreSingle(
  item: ScorableItem,
  answer: SubmittedAnswer,
): ScoreResult {
  if (!hasChoice(answer)) return INCORRECT;
  const expected = (item.options ?? []).find((o) => o.isCorrect);
  if (!expected) return INCORRECT;
  return expected.label === answer.choice ? CORRECT : INCORRECT;
}

export function scoreMulti(
  item: ScorableItem,
  answer: SubmittedAnswer,
): ScoreResult {
  if (!hasChoices(answer)) return INCORRECT;
  const correctLabels = new Set(
    (item.options ?? []).filter((o) => o.isCorrect).map((o) => o.label),
  );
  if (correctLabels.size === 0) return INCORRECT;

  const given = new Set(answer.choices);
  if (given.size !== correctLabels.size) return INCORRECT;

  for (const label of given) {
    if (!correctLabels.has(label)) return INCORRECT;
  }
  return CORRECT;
}

export function scoreNumeric(
  item: ScorableItem,
  answer: SubmittedAnswer,
): ScoreResult {
  if (!hasValue(answer)) return INCORRECT;
  const spec = item.numeric;
  if (!spec || !Number.isFinite(spec.answer)) return INCORRECT;

  const scale = Math.max(1, Math.abs(spec.answer));
  const tolerance = Math.abs(spec.tolerance) + 1e-9 * scale;

  if (Math.abs(answer.value - spec.answer) > tolerance) return INCORRECT;

  if (spec.unitRequired) {
    const expected = normalizeUnit(spec.unit);
    const given = normalizeUnit(answer.unit);
    if (!expected) return INCORRECT;
    if (given !== expected) return INCORRECT;
  }

  return CORRECT;
}

export const OPEN_PASS_RATIO = 0.75;
export const OPEN_REVIEW_RATIO = 0.4;

export function scoreOpen(
  item: ScorableItem,
  answer: SubmittedAnswer,
): ScoreResult {
  if (!hasText(answer)) return INCORRECT;

  const keywords = item.keywords ?? [];
  if (keywords.length === 0) return PENDING;

  const text = normalizeText(answer.text);
  if (text.length === 0) return INCORRECT;

  const totalWeight =
    keywords.reduce((sum, k) => sum + Math.max(k.weight, 0), 0) ||
    keywords.length;

  let matchedWeight = 0;
  let missingRequired = false;

  for (const keyword of keywords) {
    const weight = Math.max(keyword.weight, 0) || 1;
    const variants = keyword.keyword
      .split('|')
      .map((v) => normalizeText(v))
      .filter((v) => v.length > 0);

    const hit = variants.some((v) => text.includes(v));

    if (hit) {
      matchedWeight += weight;
    } else if (keyword.isRequired) {
      missingRequired = true;
    }
  }

  if (missingRequired) return INCORRECT;

  const ratio = matchedWeight / totalWeight;
  if (ratio >= OPEN_PASS_RATIO) return CORRECT;
  if (ratio <= OPEN_REVIEW_RATIO) return INCORRECT;
  return PENDING;
}

export function scoreItem(
  item: ScorableItem,
  answer: SubmittedAnswer,
): ScoreResult {
  switch (item.type) {
    case 'single':
      return scoreSingle(item, answer);
    case 'multi':
      return scoreMulti(item, answer);
    case 'numeric':
      return scoreNumeric(item, answer);
    case 'open':
      return scoreOpen(item, answer);
    default:
      return INCORRECT;
  }
}
