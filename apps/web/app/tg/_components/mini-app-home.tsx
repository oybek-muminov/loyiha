'use client';

import type { AuthResponse } from '@univer/contract';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { getTelegramWebApp } from '@/lib/telegram';

type Status = 'loading' | 'ready' | 'outside-telegram' | 'error';

interface MeResponse {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: { current: number; longest: number };
}

export function MiniAppHome() {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async (initData: string) => {
    const auth = await apiFetch<AuthResponse>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('accessToken', auth.accessToken);
      window.localStorage.setItem('refreshToken', auth.refreshToken);
    }

    const profile = await apiFetch<MeResponse>('/me', {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    setMe(profile);
    setStatus('ready');
  }, []);

  useEffect(() => {
    const webApp = getTelegramWebApp();

    if (!webApp) {
      setStatus('outside-telegram');
      return;
    }

    webApp.ready();
    webApp.expand();

    if (!webApp.initData) {
      setStatus('outside-telegram');
      return;
    }

    authenticate(webApp.initData).catch((cause: unknown) => {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Kirishda xatolik yuz berdi. Qayta urinib ko'ring.",
      );
      setStatus('error');
    });
  }, [authenticate]);

  if (status === 'loading') {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </Shell>
    );
  }

  if (status === 'outside-telegram') {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <h1 className="text-xl font-semibold">Telegram ichida oching</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Mini App faqat Telegram bot orqali ishlaydi. Botni ochib,
            &laquo;Ilovani ochish&raquo; tugmasini bosing.
          </p>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <h1 className="text-lg font-semibold">Kirish amalga oshmadi</h1>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex items-center gap-3">
        {me?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
            {(me?.name ?? 'U').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Salom,</p>
          <p className="text-lg font-semibold">{me?.name ?? 'O‘quvchi'}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="XP" value={me?.xp ?? 0} />
        <Stat label="Daraja" value={me?.level ?? 1} />
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          🔥 Streak
        </p>
        <p className="mt-1 text-2xl font-bold">
          {me?.streak.current ?? 0} kun
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Eng uzun: {me?.streak.longest ?? 0} kun
        </p>
      </section>

      <nav className="grid gap-3">
        {[
          { icon: '🗺️', label: "Yo'l xaritasi", hint: 'Ketma-ket o‘rganish' },
          { icon: '📚', label: 'Kutubxona', hint: 'Erkin tanlash' },
          { icon: '📝', label: 'Testlar', hint: 'Imtihon simulyatsiyasi' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="flex-1">
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {item.hint}
              </span>
            </span>
            <span aria-hidden className="text-slate-400">
              ›
            </span>
          </button>
        ))}
      </nav>

      <p className="text-center text-xs text-slate-400">
        Fizika piloti — kontent tayyorlanmoqda
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="tg-shell flex min-h-dvh flex-col gap-5 px-4 py-6">
      {children}
    </main>
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
