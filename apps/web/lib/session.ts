import type { AuthResponse } from '@univer/contract';
import { apiFetch, ApiError } from './api';
import { getTelegramWebApp } from './telegram';

export const TOKEN_KEY = 'ua_access_token';
export const REFRESH_KEY = 'ua_refresh_token';

export interface Me {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  xp: number;
  level: number;
  streak: { current: number; longest: number };
}

export class OutsideTelegramError extends Error {
  constructor() {
    super('Mini App faqat Telegram ichida ishlaydi');
    this.name = 'OutsideTelegramError';
  }
}

export async function getMe(token: string): Promise<Me> {
  return apiFetch<Me>('/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function authedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...authHeaders(token) },
  });
}

/**
 * Mini App sessiyasini ta'minlaydi:
 *   1. Telegram `initData` borligini tekshiradi.
 *   2. Saqlangan token hali yaroqli bo'lsa — qayta ishlatadi.
 *   3. Aks holda `/auth/telegram` orqali yangi token oladi.
 */
export async function ensureSession(): Promise<{ token: string; me: Me }> {
  const webApp = getTelegramWebApp();

  if (!webApp || !webApp.initData) {
    throw new OutsideTelegramError();
  }

  webApp.ready();
  webApp.expand();

  const stored = window.localStorage.getItem(TOKEN_KEY);

  if (stored) {
    try {
      return { token: stored, me: await getMe(stored) };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
  }

  const auth = await apiFetch<AuthResponse>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData: webApp.initData }),
  });

  window.localStorage.setItem(TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(REFRESH_KEY, auth.refreshToken);

  const me = await getMe(auth.accessToken);
  return { token: auth.accessToken, me };
}
