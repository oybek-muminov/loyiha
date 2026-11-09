import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  TelegramInitDataError,
  validateTelegramInitData,
} from '../src/auth/telegram-initdata';

const BOT_TOKEN = '123456:TEST-TOKEN';

function buildInitData(
  params: Record<string, string>,
  botToken = BOT_TOKEN,
): string {
  const dataCheckString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return new URLSearchParams({ ...params, hash }).toString();
}

function baseParams(overrides: Record<string, string> = {}) {
  return {
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify({
      id: 42,
      first_name: 'Ali',
      username: 'ali',
      language_code: 'uz',
    }),
    auth_date: String(Math.floor(Date.now() / 1000)),
    ...overrides,
  };
}

describe('validateTelegramInitData', () => {
  it('accepts valid initData', () => {
    const result = validateTelegramInitData(
      buildInitData(baseParams()),
      BOT_TOKEN,
    );

    expect(result.user.id).toBe(42);
    expect(result.user.first_name).toBe('Ali');
  });

  it('rejects tampered payload', () => {
    const initData = buildInitData(baseParams());
    const tampered = initData.replace('Ali', 'Vali');

    expect(() => validateTelegramInitData(tampered, BOT_TOKEN)).toThrowError(
      TelegramInitDataError,
    );
  });

  it('rejects wrong bot token', () => {
    const initData = buildInitData(baseParams(), '999:OTHER');

    expect(() => validateTelegramInitData(initData, BOT_TOKEN)).toThrowError(
      TelegramInitDataError,
    );
  });

  it('rejects expired auth_date', () => {
    const old = String(Math.floor(Date.now() / 1000) - 90_000);
    const initData = buildInitData(baseParams({ auth_date: old }));

    expect(() => validateTelegramInitData(initData, BOT_TOKEN)).toThrowError(
      /EXPIRED/,
    );
  });

  it('rejects missing hash', () => {
    const params = new URLSearchParams(baseParams()).toString();

    expect(() => validateTelegramInitData(params, BOT_TOKEN)).toThrowError(
      /MISSING_HASH/,
    );
  });
});
