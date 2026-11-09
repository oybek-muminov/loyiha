'use client';

import { useEffect, useState } from 'react';
import {
  ensureSession,
  OutsideTelegramError,
  type Me,
} from './session';

export type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; token: string; me: Me }
  | { status: 'outside' }
  | { status: 'error'; message: string };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    ensureSession()
      .then((session) => {
        if (!cancelled) {
          setState({ status: 'ready', ...session });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        if (error instanceof OutsideTelegramError) {
          setState({ status: 'outside' });
          return;
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : "Kirishda xatolik yuz berdi. Qayta urinib ko'ring.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
