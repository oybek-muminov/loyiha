import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  correctAnswerText,
  formatAnswer,
  parseTypedAnswer,
  toPublicItem,
  toScorableItem,
  type ItemWithAnswers,
} from '../src/attempts/item-map';

function makeItem(overrides: Partial<ItemWithAnswers>): ItemWithAnswers {
  return {
    id: 'i1',
    subjectId: 's1',
    topic: 'Kinematika',
    type: 'single',
    body: 'Savol',
    imageUrl: null,
    difficulty: 2,
    explanation: 'Izoh',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [],
    numeric: null,
    keywords: [],
    ...overrides,
  };
}

const single = makeItem({
  type: 'single',
  options: [
    { id: 'o1', itemId: 'i1', label: 'A', body: '4 m', isCorrect: false, order: 1 },
    { id: 'o2', itemId: 'i1', label: 'C', body: '100 m', isCorrect: true, order: 2 },
  ],
});

const multi = makeItem({
  type: 'multi',
  options: [
    { id: 'o1', itemId: 'i1', label: 'A', body: 'Tezlik', isCorrect: true, order: 1 },
    { id: 'o2', itemId: 'i1', label: 'B', body: "Yo'l", isCorrect: false, order: 2 },
    { id: 'o3', itemId: 'i1', label: 'C', body: "Ko'chish", isCorrect: true, order: 3 },
  ],
});

const numeric = makeItem({
  type: 'numeric',
  numeric: {
    itemId: 'i1',
    answer: 9.8 as unknown as never,
    tolerance: 0.15 as unknown as never,
    unit: 'm/s²',
    unitRequired: true,
  },
});

const open = makeItem({
  type: 'open',
  keywords: [
    { id: 'k1', itemId: 'i1', keyword: 'inersiya', weight: 2, isRequired: true },
  ],
});

describe('toPublicItem', () => {
  it('does not leak correctness', () => {
    const view = toPublicItem(single) as {
      options?: Array<Record<string, unknown>>;
    };

    expect(view.options).toEqual([
      { label: 'A', body: '4 m' },
      { label: 'C', body: '100 m' },
    ]);
  });

  it('exposes unit for numeric items', () => {
    expect(toPublicItem(numeric)).toMatchObject({ unit: 'm/s²' });
  });

  it('does not expose keywords for open items', () => {
    expect(toPublicItem(open)).not.toHaveProperty('keywords');
  });
});

describe('toScorableItem', () => {
  it('maps numeric answer to numbers', () => {
    const scorable = toScorableItem(numeric);
    expect(scorable.numeric?.answer).toBe(9.8);
    expect(scorable.numeric?.tolerance).toBe(0.15);
  });

  it('maps options and keywords', () => {
    expect(toScorableItem(multi).options).toHaveLength(3);
    expect(toScorableItem(open).keywords?.[0]).toEqual({
      keyword: 'inersiya',
      weight: 2,
      isRequired: true,
    });
  });
});

describe('parseTypedAnswer', () => {
  it('accepts matching shapes', () => {
    expect(parseTypedAnswer('single', { choice: 'C' })).toEqual({ choice: 'C' });
    expect(parseTypedAnswer('multi', { choices: ['A', 'C'] })).toEqual({
      choices: ['A', 'C'],
    });
    expect(
      parseTypedAnswer('numeric', { value: 9.8, unit: 'm/s²' }),
    ).toEqual({ value: 9.8, unit: 'm/s²' });
    expect(parseTypedAnswer('open', { text: 'javob' })).toEqual({
      text: 'javob',
    });
  });

  it('rejects shape that does not match the item type', () => {
    expect(() => parseTypedAnswer('numeric', { choice: 'A' })).toThrowError(
      BadRequestException,
    );
    expect(() => parseTypedAnswer('single', { value: 1 })).toThrowError(
      BadRequestException,
    );
  });
});

describe('formatAnswer', () => {
  it('formats each answer type', () => {
    expect(formatAnswer(single, { choice: 'C' })).toBe('C');
    expect(formatAnswer(multi, { choices: ['A', 'C'] })).toBe('A, C');
    expect(formatAnswer(numeric, { value: 9.8, unit: 'm/s²' })).toBe(
      '9.8 m/s²',
    );
    expect(formatAnswer(open, { text: 'inersiya' })).toBe('inersiya');
  });

  it('returns null for empty payloads', () => {
    expect(formatAnswer(single, null)).toBeNull();
    expect(formatAnswer(numeric, {})).toBeNull();
  });
});

describe('correctAnswerText', () => {
  it('returns the correct option labels', () => {
    expect(correctAnswerText(single)).toBe('C');
    expect(correctAnswerText(multi)).toBe('A, C');
  });

  it('returns numeric answer with unit', () => {
    expect(correctAnswerText(numeric)).toBe('9.8 m/s²');
  });

  it('does not expose open keywords', () => {
    expect(correctAnswerText(open)).toBeNull();
  });
});
