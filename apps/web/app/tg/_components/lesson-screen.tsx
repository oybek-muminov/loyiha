'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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

interface LessonDetail {
  id: string;
  title: string;
  contentMd: string;
  durationSec: number;
  subjectSlug: string | null;
  video: { status: string; posterUrl: string | null } | null;
  progress: { positionSec: number; watchedSec: number; completed: boolean };
  quizId: string | null;
  nextNodeId: string | null;
  nextNode: { id: string; type: string } | null;
}

interface Playback {
  hlsUrl: string;
  mp4Fallback: string;
  posterUrl: string | null;
  durationSec: number;
}

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const session = useSession();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (session.status !== 'ready') return;
    let cancelled = false;

    authedFetch<LessonDetail>(`/lessons/${lessonId}`, session.token)
      .then(async (result) => {
        if (cancelled) return;
        setLesson(result);

        if (result.video?.status === 'ready') {
          try {
            const media = await authedFetch<Playback>(
              `/lessons/${lessonId}/playback`,
              session.token,
            );
            if (!cancelled) setPlayback(media);
          } catch {
            // Pleer manzili hali tayyor bo'lmasa — matn bilan davom etamiz.
          }
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Darsni yuklab bo'lmadi",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, lessonId]);

  if (session.status === 'loading') return <LoadingScreen />;
  if (session.status === 'outside') return <OutsideScreen />;
  if (session.status === 'error') return <ErrorScreen message={session.message} />;
  if (error) return <ErrorScreen message={error} />;
  if (!lesson) return <LoadingScreen />;

  const backHref = lesson.subjectSlug ? `/tg/path/${lesson.subjectSlug}` : '/tg';

  const markComplete = async () => {
    if (session.status !== 'ready' || completing) return;
    setCompleting(true);

    try {
      const watched = lesson.durationSec;
      await authedFetch(`/lessons/${lesson.id}/progress`, session.token, {
        method: 'PUT',
        body: JSON.stringify({ positionSec: watched, watchedSec: watched }),
      });

      const result = await authedFetch<{
        completed: boolean;
        xpAwarded: number;
        streak: number;
      }>(`/lessons/${lesson.id}/complete`, session.token, {
        method: 'POST',
        body: '{}',
      });

      setXpAwarded(result.xpAwarded);
      setLesson({
        ...lesson,
        progress: { positionSec: watched, watchedSec: watched, completed: true },
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Darsni tugatib bo'lmadi",
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (session.status !== 'ready') return;
    const now = Date.now();
    if (now - lastSaved.current < 15_000) return;
    lastSaved.current = now;

    const element = event.currentTarget;
    void authedFetch(`/lessons/${lesson.id}/progress`, session.token, {
      method: 'PUT',
      body: JSON.stringify({
        positionSec: Math.floor(element.currentTime),
        watchedSec: Math.floor(element.currentTime),
      }),
    }).catch(() => undefined);
  };

  return (
    <TgShell>
      <TgHeader title={lesson.title} subtitle="Dars" backHref={backHref} />

      {playback ? (
        <video
          controls
          playsInline
          poster={playback.posterUrl ?? undefined}
          src={playback.mp4Fallback}
          className="w-full rounded-2xl bg-black"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => void markComplete()}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <span className="text-3xl">🎬</span>
          <p className="text-sm font-medium">
            {lesson.video?.status === 'ready'
              ? 'Video yuklanmoqda...'
              : 'Video tayyorlanmoqda'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hozircha konspekt bo‘yicha o‘qishingiz mumkin.
          </p>
        </div>
      )}

      <article className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <Markdown>{lesson.contentMd}</Markdown>
      </article>

      {xpAwarded !== null && xpAwarded > 0 ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          +{xpAwarded} XP · Dars tugallandi!
        </div>
      ) : null}

      {lesson.progress.completed ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            ✓ Tugallangan
          </div>
          {lesson.nextNode ? (
            <Link
              href={
                lesson.nextNode.type === 'lesson'
                  ? `/tg/lesson/${lesson.nextNode.id}`
                  : `/tg/quiz/${lesson.nextNode.id}`
              }
              className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
            >
              Keyingi bosqich →
            </Link>
          ) : (
            <Link
              href={backHref}
              className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-semibold dark:border-slate-700"
            >
              Yo‘l xaritasiga qaytish
            </Link>
          )}
        </div>
      ) : !lesson.video || lesson.video.status !== 'ready' ? (
        <button
          type="button"
          onClick={() => void markComplete()}
          disabled={completing}
          className="rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {completing ? 'Saqlanmoqda...' : 'Darsni o‘qib chiqdim'}
        </button>
      ) : null}
    </TgShell>
  );
}
