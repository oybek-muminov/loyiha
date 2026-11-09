/**
 * Telegram webhook boshqaruvi.
 *
 *   pnpm --filter @univer/api bot:set-webhook          # webhook o'rnatish
 *   pnpm --filter @univer/api bot:set-webhook -- --info
 *   pnpm --filter @univer/api bot:set-webhook -- --delete
 *
 * Kerakli env:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_URL   (masalan https://api.univeracademy.uz/webhooks/telegram)
 *   TELEGRAM_WEBHOOK_SECRET
 */
import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN;
const action = process.argv[2];

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN berilmagan');
  process.exit(1);
}

const endpoint = `https://api.telegram.org/bot${token}`;

async function call(
  method: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`${endpoint}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });

  const body = (await response.json()) as {
    ok: boolean;
    result?: unknown;
    description?: string;
  };

  if (!body.ok) {
    console.error(`${method} xato: ${body.description ?? 'unknown'}`);
    process.exitCode = 1;
    return;
  }

  console.log(`${method} ok`, JSON.stringify(body.result, null, 2));
}

async function main(): Promise<void> {
  if (action === '--delete') {
    await call('deleteWebhook', { drop_pending_updates: true });
    return;
  }

  if (action === '--info') {
    await call('getWebhookInfo');
    return;
  }

  const url = process.env.TELEGRAM_WEBHOOK_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!url) {
    console.error('TELEGRAM_WEBHOOK_URL berilmagan');
    process.exitCode = 1;
    return;
  }

  if (!secret) {
    console.error('TELEGRAM_WEBHOOK_SECRET berilmagan');
    process.exitCode = 1;
    return;
  }

  await call('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
}

void main();
