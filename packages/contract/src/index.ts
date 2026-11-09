import { z } from 'zod';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const telegramAuthRequestSchema = z.object({
  initData: z.string().min(1).max(8192),
});

export type TelegramAuthRequest = z.infer<typeof telegramAuthRequestSchema>;

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    isNew: boolean;
  };
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const itemTypeSchema = z.enum(['single', 'multi', 'numeric', 'open']);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const nodeTypeSchema = z.enum(['lesson', 'quiz', 'checkpoint']);
export type NodeType = z.infer<typeof nodeTypeSchema>;

export const nodeStateSchema = z.enum([
  'locked',
  'available',
  'in_progress',
  'completed',
]);
export type NodeState = z.infer<typeof nodeStateSchema>;

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export const singleAnswerSchema = z.object({
  choice: z.string().min(1).max(8),
});

export const multiAnswerSchema = z.object({
  choices: z.array(z.string().min(1).max(8)).min(1).max(8),
});

export const numericAnswerSchema = z.object({
  value: z.number().finite(),
  unit: z.string().max(32).optional(),
});

export const openAnswerSchema = z.object({
  text: z.string().min(1).max(4000),
});

export const answerSchema = z.union([
  singleAnswerSchema,
  multiAnswerSchema,
  numericAnswerSchema,
  openAnswerSchema,
]);

export type SingleAnswer = z.infer<typeof singleAnswerSchema>;
export type MultiAnswer = z.infer<typeof multiAnswerSchema>;
export type NumericAnswer = z.infer<typeof numericAnswerSchema>;
export type OpenAnswer = z.infer<typeof openAnswerSchema>;
export type Answer = z.infer<typeof answerSchema>;

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export const submitAttemptSchema = z.object({
  autoSubmitted: z.boolean().optional().default(false),
});

export type SubmitAttemptRequest = z.infer<typeof submitAttemptSchema>;

export const startAttemptSchema = z
  .object({
    quizId: z.string().uuid().optional(),
    examTemplateId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.quizId) !== Boolean(v.examTemplateId), {
    message: 'quizId yoki examTemplateId dan faqat bittasi berilishi kerak',
  });

export type StartAttemptRequest = z.infer<typeof startAttemptSchema>;

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export const lessonProgressSchema = z.object({
  positionSec: z.number().int().min(0).max(60 * 60 * 12),
  watchedSec: z.number().int().min(0).max(60 * 60 * 12),
});

export type LessonProgressRequest = z.infer<typeof lessonProgressSchema>;

// ---------------------------------------------------------------------------
// Common envelopes
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
