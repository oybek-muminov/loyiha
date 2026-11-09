import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface ValidatedInitData {
  user: TelegramUser;
  authDate: number;
  queryId?: string;
}

export type TelegramInitDataErrorCode =
  | 'MISSING_HASH'
  | 'INVALID_HASH'
  | 'MISSING_AUTH_DATE'
  | 'EXPIRED'
  | 'MISSING_USER'
  | 'INVALID_USER';

export class TelegramInitDataError extends Error {
  constructor(readonly code: TelegramInitDataErrorCode) {
    super(`Telegram initData validation failed: ${code}`);
    this.name = 'TelegramInitDataError';
  }
}

/**
 * Telegram Mini App `initData` imzosini tekshiradi.
 *
 * Algoritm (rasmiy):
 *   secret_key = HMAC_SHA256("WebAppData", bot_token)
 *   hash       = HMAC_SHA256(secret_key, data_check_string)
 * bu yerda data_check_string — `hash` dan tashqari barcha juftliklar,
 * `key=value` ko'rinishida, alifbo bo'yicha tartiblangan va `\n` bilan
 * birlashtirilgan.
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86_400,
): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash) {
    throw new TelegramInitDataError('MISSING_HASH');
  }

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const received = Buffer.from(receivedHash, 'hex');
  const computed = Buffer.from(computedHash, 'hex');

  if (
    received.length !== computed.length ||
    !timingSafeEqual(received, computed)
  ) {
    throw new TelegramInitDataError('INVALID_HASH');
  }

  const authDateRaw = params.get('auth_date');
  if (!authDateRaw) {
    throw new TelegramInitDataError('MISSING_AUTH_DATE');
  }

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    throw new TelegramInitDataError('MISSING_AUTH_DATE');
  }

  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > maxAgeSec) {
    throw new TelegramInitDataError('EXPIRED');
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    throw new TelegramInitDataError('MISSING_USER');
  }

  let user: TelegramUser;
  try {
    user = JSON.parse(userRaw) as TelegramUser;
  } catch {
    throw new TelegramInitDataError('INVALID_USER');
  }

  if (typeof user?.id !== 'number' || !user.first_name) {
    throw new TelegramInitDataError('INVALID_USER');
  }

  return {
    user,
    authDate,
    queryId: params.get('query_id') ?? undefined,
  };
}
