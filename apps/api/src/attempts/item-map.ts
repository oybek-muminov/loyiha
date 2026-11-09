import { BadRequestException } from '@nestjs/common';
import type {
  Item,
  ItemKeyword,
  ItemOption,
  ItemType,
  NumericAnswer,
} from '@prisma/client';
import {
  multiAnswerSchema,
  numericAnswerSchema,
  openAnswerSchema,
  singleAnswerSchema,
} from '@univer/contract';
import type { ScorableItem, SubmittedAnswer } from '@univer/scoring';

export interface ItemWithAnswers extends Item {
  options: ItemOption[];
  numeric: NumericAnswer | null;
  keywords: ItemKeyword[];
}

export function toPublicItem(item: ItemWithAnswers) {
  return {
    id: item.id,
    type: item.type,
    body: item.body,
    imageUrl: item.imageUrl,
    ...(item.type === 'single' || item.type === 'multi'
      ? {
          options: [...item.options]
            .sort((a, b) => a.order - b.order)
            .map((option) => ({ label: option.label, body: option.body })),
        }
      : {}),
    ...(item.type === 'numeric'
      ? { unit: item.numeric?.unit ?? null }
      : {}),
  };
}

export function toScorableItem(item: ItemWithAnswers): ScorableItem {
  return {
    type: item.type,
    options: item.options.map((option) => ({
      label: option.label,
      isCorrect: option.isCorrect,
    })),
    numeric: item.numeric
      ? {
          answer: Number(item.numeric.answer),
          tolerance: Number(item.numeric.tolerance),
          unit: item.numeric.unit,
          unitRequired: item.numeric.unitRequired,
        }
      : undefined,
    keywords: item.keywords.map((keyword) => ({
      keyword: keyword.keyword,
      weight: keyword.weight,
      isRequired: keyword.isRequired,
    })),
  };
}

export function parseTypedAnswer(
  type: ItemType,
  value: unknown,
): SubmittedAnswer {
  const schema =
    type === 'single'
      ? singleAnswerSchema
      : type === 'multi'
        ? multiAnswerSchema
        : type === 'numeric'
          ? numericAnswerSchema
          : openAnswerSchema;

  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: "Javob formati savol turiga mos emas",
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  return result.data as SubmittedAnswer;
}

export function formatAnswer(
  item: ItemWithAnswers,
  raw: unknown,
): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const answer = raw as Record<string, unknown>;

  if (item.type === 'single' && typeof answer.choice === 'string') {
    return answer.choice;
  }

  if (item.type === 'multi' && Array.isArray(answer.choices)) {
    return answer.choices.filter((v) => typeof v === 'string').join(', ');
  }

  if (item.type === 'numeric' && typeof answer.value === 'number') {
    const unit = typeof answer.unit === 'string' ? ` ${answer.unit}` : '';
    return `${answer.value}${unit}`;
  }

  if (item.type === 'open' && typeof answer.text === 'string') {
    return answer.text;
  }

  return null;
}

export function correctAnswerText(item: ItemWithAnswers): string | null {
  if (item.type === 'single') {
    return item.options.find((option) => option.isCorrect)?.label ?? null;
  }

  if (item.type === 'multi') {
    const labels = item.options
      .filter((option) => option.isCorrect)
      .map((option) => option.label);
    return labels.length > 0 ? labels.join(', ') : null;
  }

  if (item.type === 'numeric' && item.numeric) {
    const unit = item.numeric.unit ? ` ${item.numeric.unit}` : '';
    return `${Number(item.numeric.answer)}${unit}`;
  }

  // `open` uchun kalit so'zlar o'quvchiga ko'rsatilmaydi.
  return null;
}
