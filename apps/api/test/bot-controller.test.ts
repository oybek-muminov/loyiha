import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Update } from 'grammy/types';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/common/config';
import { BotController } from '../src/bot/bot.controller';
import type { BotService } from '../src/bot/bot.service';

function makeController(secret?: string) {
  const handleUpdate = vi.fn(async () => undefined);
  const bot = { handleUpdate } as unknown as BotService;
  const config = {
    TELEGRAM_WEBHOOK_SECRET: secret,
  } as AppConfig;

  return { controller: new BotController(bot, config), handleUpdate };
}

const update = {
  update_id: 42,
  message: {
    message_id: 1,
    date: 0,
    chat: { id: 1, type: 'private' },
    from: { id: 1, is_bot: false, first_name: 'Test' },
    text: '/start',
  },
} as unknown as Update;

describe('BotController', () => {
  it('rejects when webhook secret is not configured', async () => {
    const { controller } = makeController(undefined);

    await expect(controller.telegram('anything', update)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects a wrong secret before touching the bot', async () => {
    const { controller, handleUpdate } = makeController('top-secret');

    await expect(controller.telegram('wrong', update)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  it('rejects malformed updates', async () => {
    const { controller } = makeController('top-secret');

    await expect(
      controller.telegram('top-secret', {} as Update),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forwards a valid update to the bot', async () => {
    const { controller, handleUpdate } = makeController('top-secret');

    await expect(controller.telegram('top-secret', update)).resolves.toEqual({
      ok: true,
    });
    expect(handleUpdate).toHaveBeenCalledWith(update);
  });
});
