'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';

export function TgShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="tg-shell flex min-h-dvh flex-col gap-5 px-4 py-6">
      {children}
    </main>
  );
}

export function TgHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const webApp = getTelegramWebApp();
    const backButton = webApp?.BackButton;

    if (!backButton) return;

    const onClick = () => router.push(backHref);

    backButton.show();
    backButton.onClick(onClick);

    return () => {
      backButton.offClick(onClick);
      backButton.hide();
    };
  }, [backHref, router]);

  return (
    <header className="flex items-center gap-3">
      <Link
        href={backHref}
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Orqaga"
      >
        ‹
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export function LoadingScreen() {
  return (
    <TgShell>
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </TgShell>
  );
}

export function OutsideScreen() {
  return (
    <TgShell>
      <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
        <h1 className="text-xl font-semibold">Telegram ichida oching</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Mini App faqat Telegram bot orqali ishlaydi. Botni ochib,
          &laquo;Ilovani ochish&raquo; tugmasini bosing.
        </p>
      </div>
    </TgShell>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <TgShell>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <h1 className="text-lg font-semibold">Xatolik</h1>
        <p className="mt-2 text-sm">{message}</p>
      </div>
    </TgShell>
  );
}

export function EmptyScreen({ message }: { message: string }) {
  return (
    <TgShell>
      <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        {message}
      </div>
    </TgShell>
  );
}
