'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/session';
import { useSession } from '@/lib/use-session';
import {
  ErrorScreen,
  LoadingScreen,
  OutsideScreen,
  TgHeader,
  TgShell,
} from './tg-shell';

type NodeState = 'locked' | 'available' | 'in_progress' | 'completed';

interface PathNode {
  id: string;
  type: 'lesson' | 'quiz' | 'checkpoint';
  title: string;
  order: number;
  state: NodeState;
  lessonId: string | null;
  quizId: string | null;
}

interface PathUnit {
  id: string;
  title: string;
  order: number;
  progress: number;
  nodes: PathNode[];
}

interface PathResponse {
  subject: { slug: string; title: string };
  progress: number;
  units: PathUnit[];
}

const STATE_ICON: Record<NodeState, string> = {
  completed: '✓',
  available: '▶',
  in_progress: '▶',
  locked: '🔒',
};

const STATE_STYLE: Record<NodeState, string> = {
  completed:
    'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
  available: 'border-brand-200 bg-white dark:border-brand-800 dark:bg-slate-900',
  in_progress:
    'border-brand-200 bg-white dark:border-brand-800 dark:bg-slate-900',
  locked:
    'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40',
};

export function PathScreen({ slug }: { slug: string }) {
  const session = useSession();
  const [path, setPath] = useState<PathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== 'ready') return;
    let cancelled = false;

    authedFetch<PathResponse>(`/subjects/${slug}/path`, session.token)
      .then((result) => {
        if (!cancelled) setPath(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Yo'lni yuklab bo'lmadi",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, slug]);

  if (session.status === 'loading') return <LoadingScreen />;
  if (session.status === 'outside') return <OutsideScreen />;
  if (session.status === 'error') return <ErrorScreen message={session.message} />;
  if (error) return <ErrorScreen message={error} />;
  if (!path) return <LoadingScreen />;

  return (
    <TgShell>
      <TgHeader
        title={path.subject.title}
        subtitle={`${Math.round(path.progress * 100)}% tugallandi`}
        backHref="/tg"
      />

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${Math.round(path.progress * 100)}%` }}
        />
      </div>

      <div className="space-y-7">
        {path.units.map((unit) => (
          <section key={unit.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{unit.title}</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round(unit.progress * 100)}%
              </span>
            </div>

            <ol className="space-y-2">
              {unit.nodes.map((node) => {
                const locked = node.state === 'locked';
                const href =
                  node.type === 'lesson'
                    ? node.lessonId
                      ? `/tg/lesson/${node.lessonId}`
                      : null
                    : node.quizId
                      ? `/tg/quiz/${node.quizId}`
                      : null;

                const content = (
                  <div
                    className={`flex items-center gap-3 rounded-2xl border p-4 ${STATE_STYLE[node.state]}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                        node.state === 'completed'
                          ? 'bg-emerald-500 text-white'
                          : node.state === 'locked'
                            ? 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                            : 'bg-brand-600 text-white'
                      }`}
                    >
                      {STATE_ICON[node.state]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {node.title}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {node.type === 'lesson'
                          ? 'Video dars'
                          : node.type === 'checkpoint'
                            ? "Bo'lim nazorati"
                            : 'Mashq'}
                      </span>
                    </span>
                    {!locked ? (
                      <span aria-hidden className="text-slate-400">
                        ›
                      </span>
                    ) : null}
                  </div>
                );

                return (
                  <li key={node.id}>
                    {locked || !href ? (
                      content
                    ) : (
                      <Link href={href} className="block transition active:scale-[0.99]">
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </TgShell>
  );
}
