'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/session';
import { useSession } from '@/lib/use-session';
import { Markdown } from './markdown';
import {
  ErrorScreen,
  LoadingScreen,
  OutsideScreen,
  TgHeader,
  TgShell,
} from './tg-shell';

type ItemType = 'single' | 'multi' | 'numeric' | 'open';

interface QuizItem {
  id: string;
  type: ItemType;
  body: string;
  imageUrl: string | null;
  options?: Array<{ label: string; body: string }>;
  unit?: string | null;
}

interface Quiz {
  id: string;
  title: string;
  kind: string;
  timeLimitSec: number | null;
  items: QuizItem[];
}

interface Attempt {
  id: string;
  status: string;
  items: QuizItem[];
}

interface ResultItem {
  itemId: string;
  type: ItemType;
  topic: string;
  body: string;
  isCorrect: boolean;
  reviewStatus: 'none' | 'pending' | 'approved' | 'rejected';
  yourAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
}

interface Result {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  xpAwarded: number;
  items: ResultItem[];
  byTopic: Array<{ topic: string; correct: number; total: number }>;
}

interface AnswerState {
  choice?: string;
  choices?: string[];
  value?: string;
  text?: string;
}

export function QuizScreen({ quizId }: { quizId: string }) {
  const session = useSession();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session.status !== 'ready') return;
    let cancelled = false;

    (async () => {
      const loaded = await authedFetch<Quiz>(`/quizzes/${quizId}`, session.token);
      if (cancelled) return;
      setQuiz(loaded);

      const started = await authedFetch<Attempt>('/attempts', session.token, {
        method: 'POST',
        body: JSON.stringify({ quizId }),
      });
      if (cancelled) return;
      setAttempt(started);
    })().catch((cause: unknown) => {
      if (!cancelled) {
        setError(
          cause instanceof Error ? cause.message : "Testni yuklab bo'lmadi",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session, quizId]);

  if (session.status === 'loading') return <LoadingScreen />;
  if (session.status === 'outside') return <OutsideScreen />;
  if (session.status === 'error') return <ErrorScreen message={session.message} />;
  if (error) return <ErrorScreen message={error} />;
  if (result) return <ResultScreen result={result} quiz={quiz} />;
  if (!quiz || !attempt) return <LoadingScreen />;

  const update = (itemId: string, next: AnswerState) => {
    setAnswers((current) => ({ ...current, [itemId]: next }));
  };

  const toggleMulti = (itemId: string, label: string) => {
    const current = answers[itemId]?.choices ?? [];
    const next = current.includes(label)
      ? current.filter((choice) => choice !== label)
      : [...current, label];
    update(itemId, { choices: next });
  };

  const buildAnswer = (item: QuizItem): unknown | null => {
    const answer = answers[item.id];
    if (!answer) return null;

    if (item.type === 'single') {
      return answer.choice ? { choice: answer.choice } : null;
    }

    if (item.type === 'multi') {
      return answer.choices && answer.choices.length > 0
        ? { choices: answer.choices }
        : null;
    }

    if (item.type === 'numeric') {
      const raw = answer.value?.trim() ?? '';
      if (raw === '') return null;
      const value = Number(raw.replace(',', '.'));
      if (!Number.isFinite(value)) return null;
      return { value, ...(item.unit ? { unit: item.unit } : {}) };
    }

    const text = answer.text?.trim() ?? '';
    return text ? { text } : null;
  };

  const answeredCount = quiz.items.filter(
    (item) => buildAnswer(item) !== null,
  ).length;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      for (const item of quiz.items) {
        const answer = buildAnswer(item);
        if (answer === null) continue;

        await authedFetch(
          `/attempts/${attempt.id}/responses/${item.id}`,
          session.token,
          { method: 'PATCH', body: JSON.stringify({ answer }) },
        );
      }

      const submitted = await authedFetch<Result>(
        `/attempts/${attempt.id}/submit`,
        session.token,
        { method: 'POST', body: JSON.stringify({ autoSubmitted: false }) },
      );

      setResult(submitted);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Testni topshirib bo'lmadi",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TgShell>
      <TgHeader
        title={quiz.title}
        subtitle={`${answeredCount}/${quiz.items.length} javob berildi`}
        backHref="/tg"
      />

      <div className="space-y-4">
        {quiz.items.map((item, index) => (
          <article
            key={item.id}
            className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Markdown>{item.body}</Markdown>
              </div>
            </div>

            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="max-h-64 w-full rounded-xl object-contain"
              />
            ) : null}

            {item.type === 'single' || item.type === 'multi' ? (
              <div className="space-y-2">
                {(item.options ?? []).map((option) => {
                  const selected =
                    item.type === 'single'
                      ? answers[item.id]?.choice === option.label
                      : (answers[item.id]?.choices ?? []).includes(option.label);

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        item.type === 'single'
                          ? update(item.id, { choice: option.label })
                          : toggleMulti(item.id, option.label)
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-600 dark:bg-brand-600/15 dark:text-brand-100'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                        {option.label}
                      </span>
                      <span className="flex-1">{option.body}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {item.type === 'numeric' ? (
              <div className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={answers[item.id]?.value ?? ''}
                  onChange={(event) =>
                    update(item.id, { value: event.target.value })
                  }
                  placeholder="Javobni kiriting"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
                />
                {item.unit ? (
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {item.unit}
                  </span>
                ) : null}
              </div>
            ) : null}

            {item.type === 'open' ? (
              <textarea
                value={answers[item.id]?.text ?? ''}
                onChange={(event) =>
                  update(item.id, { text: event.target.value })
                }
                rows={3}
                placeholder="Javobingizni yozing"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
              />
            ) : null}
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting}
        className="rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Tekshirilmoqda...' : 'Testni yakunlash'}
      </button>
    </TgShell>
  );
}

function ResultScreen({ result, quiz }: { result: Result; quiz: Quiz | null }) {
  return (
    <TgShell>
      <TgHeader
        title="Natija"
        subtitle={quiz?.title ?? 'Test'}
        backHref="/tg"
      />

      <section
        className={`rounded-2xl border p-5 text-center ${
          result.passed
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
        }`}
      >
        <p className="text-3xl font-bold">
          {result.score}/{result.maxScore}
        </p>
        <p className="mt-1 text-sm font-medium">{result.percent}%</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {result.passed ? "O'tdingiz ✓" : 'Yana urinib ko‘ring'}
          {result.xpAwarded > 0 ? ` · +${result.xpAwarded} XP` : ''}
        </p>
      </section>

      <section className="space-y-2">
        {result.byTopic.map((topic) => (
          <div
            key={topic.topic}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
          >
            <span>{topic.topic}</span>
            <span className="font-semibold">
              {topic.correct}/{topic.total}
            </span>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        {result.items.map((item, index) => (
          <article
            key={item.itemId}
            className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  item.isCorrect
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {item.isCorrect ? '✓' : '✕'}
              </span>
              <span>Savol {index + 1}</span>
              {item.reviewStatus === 'pending' ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                  tekshirilmoqda
                </span>
              ) : null}
            </div>

            <Markdown>{item.body}</Markdown>

            <div className="space-y-1 text-xs">
              <p>
                <span className="text-slate-500 dark:text-slate-400">
                  Sizning javob:{' '}
                </span>
                {item.yourAnswer ?? '—'}
              </p>
              {item.correctAnswer ? (
                <p>
                  <span className="text-slate-500 dark:text-slate-400">
                    To‘g‘ri javob:{' '}
                  </span>
                  {item.correctAnswer}
                </p>
              ) : null}
              {item.explanation ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {item.explanation}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <Link
        href="/tg"
        className="rounded-xl bg-brand-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
      >
        Bosh sahifaga qaytish
      </Link>
    </TgShell>
  );
}
