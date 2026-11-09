'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ErrorScreen,
  LoadingScreen,
  OutsideScreen,
  TgShell,
} from './tg-shell';
import { authedFetch } from '@/lib/session';
import { useSession } from '@/lib/use-session';

interface SubjectSummary {
  slug: string;
  title: string;
  active: boolean;
  progress: number;
}

export function MiniAppHome() {
  const session = useSession();
  const [subjects, setSubjects] = useState<SubjectSummary[] | null>(null);

  useEffect(() => {
    if (session.status !== 'ready') return;
    let cancelled = false;

    authedFetch<{ data: SubjectSummary[] }>('/subjects', session.token)
      .then((result) => {
        if (!cancelled) setSubjects(result.data);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session.status === 'loading') return <LoadingScreen />;
  if (session.status === 'outside') return <OutsideScreen />;
  if (session.status === 'error') return <ErrorScreen message={session.message} />;

  const { me, token } = session;
  const active = subjects?.filter((subject) => subject.active) ?? [];

  return (
    <TgShell>
      <header className="flex items-center gap-3">
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
            {(me.name ?? 'U').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">Salom,</p>
          <p className="truncate text-lg font-semibold">
            {me.name ?? 'O‘quvchi'}
          </p>
        </div>
        <div className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600 dark:bg-orange-950 dark:text-orange-300">
          🔥 {me.streak.current}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="XP" value={me.xp} />
        <Stat label="Daraja" value={me.level} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Fanlar
        </h2>

        {subjects === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ) : active.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Hozircha faol fan yo‘q.
          </div>
        ) : (
          active.map((subject) => (
            <Link
              key={subject.slug}
              href={`/tg/path/${subject.slug}`}
              className="block rounded-2xl border border-slate-200 p-5 transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{subject.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Yo‘l xaritasi bo‘yicha o‘rganish
                  </p>
                </div>
                <span aria-hidden className="text-xl text-slate-400">
                  ›
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${Math.round(subject.progress * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {Math.round(subject.progress * 100)}% tugallandi
              </p>
            </Link>
          ))
        )}
      </section>

      <section className="grid gap-3">
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
          <p className="font-semibold">📝 Imtihon simulyatsiyasi</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tez orada: milliy sertifikat va DTM formatidagi testlar.
          </p>
        </div>
      </section>

      <p className="mt-auto text-center text-xs text-slate-400">
        Fizika piloti · {token ? 'sessiya faol' : ''}
      </p>
    </TgShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
