import { describe, expect, it } from 'vitest';
import {
  normalizeText,
  normalizeUnit,
  scoreItem,
  type ScorableItem,
} from '../src/index';

const single: ScorableItem = {
  type: 'single',
  options: [
    { label: 'A', isCorrect: false },
    { label: 'B', isCorrect: false },
    { label: 'C', isCorrect: true },
    { label: 'D', isCorrect: false },
  ],
};

const multi: ScorableItem = {
  type: 'multi',
  options: [
    { label: 'A', isCorrect: true },
    { label: 'B', isCorrect: false },
    { label: 'C', isCorrect: true },
    { label: 'D', isCorrect: false },
  ],
};

const numeric: ScorableItem = {
  type: 'numeric',
  numeric: { answer: 9.8, tolerance: 0.1, unit: 'm/s²', unitRequired: true },
};

const open: ScorableItem = {
  type: 'open',
  keywords: [
    { keyword: 'F=ma|nyuton', weight: 2, isRequired: true },
    { keyword: 'kuch', weight: 1, isRequired: false },
    { keyword: 'massa', weight: 1, isRequired: false },
    { keyword: 'tezlanish|akseleratsiya', weight: 1, isRequired: false },
  ],
};

describe('single', () => {
  it('correct choice scores 1', () => {
    expect(scoreItem(single, { choice: 'C' })).toEqual({
      correct: true,
      score: 1,
      reviewStatus: 'none',
    });
  });

  it('wrong choice scores 0', () => {
    expect(scoreItem(single, { choice: 'A' }).score).toBe(0);
  });

  it('wrong answer shape scores 0', () => {
    expect(scoreItem(single, { text: 'C' }).score).toBe(0);
  });
});

describe('multi', () => {
  it('order does not matter', () => {
    expect(scoreItem(multi, { choices: ['C', 'A'] }).correct).toBe(true);
  });

  it('extra choice is wrong', () => {
    expect(scoreItem(multi, { choices: ['A', 'B', 'C'] }).correct).toBe(false);
  });

  it('missing choice is wrong', () => {
    expect(scoreItem(multi, { choices: ['A'] }).correct).toBe(false);
  });
});

describe('numeric', () => {
  it('accepts within tolerance', () => {
    expect(scoreItem(numeric, { value: 9.8, unit: 'm/s²' }).correct).toBe(true);
    expect(scoreItem(numeric, { value: 9.85, unit: 'm/s2' }).correct).toBe(true);
  });

  it('rejects outside tolerance', () => {
    expect(scoreItem(numeric, { value: 10.2, unit: 'm/s²' }).correct).toBe(false);
  });

  it('requires unit when configured', () => {
    expect(scoreItem(numeric, { value: 9.8 }).correct).toBe(false);
    expect(scoreItem(numeric, { value: 9.8, unit: 'km/h' }).correct).toBe(false);
  });
});

describe('open', () => {
  it('passes when enough keywords matched', () => {
    const result = scoreItem(open, {
      text: 'Nyuton qonuni: kuch massa va tezlanish orqali ifodalanadi',
    });
    expect(result.correct).toBe(true);
  });

  it('fails when required keyword missing', () => {
    const result = scoreItem(open, { text: 'kuch massa tezlanish' });
    expect(result.correct).toBe(false);
    expect(result.reviewStatus).toBe('none');
  });

  it('marks borderline answers for review', () => {
    // "F=ma" (weight 2) + "kuch" (weight 1) = 3/5 = 0.60 -> review band
    const result = scoreItem(open, { text: 'F=ma va kuch' });
    expect(result.correct).toBe(false);
    expect(result.reviewStatus).toBe('pending');
  });

  it('fails on empty text', () => {
    expect(scoreItem(open, { text: '   ' }).correct).toBe(false);
  });
});

describe('normalization', () => {
  it('normalizes uzbek apostrophes and punctuation', () => {
    expect(normalizeText("To‘g‘ri, javob!")).toBe("to'g'ri javob");
  });

  it('normalizes units', () => {
    expect(normalizeUnit('m/s²')).toBe(normalizeUnit('M/S2'));
    expect(normalizeUnit('N·m')).toBe(normalizeUnit('n*m'));
  });
});
