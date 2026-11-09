import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Update } from 'grammy/types';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { BotService } from './bot.service';

@Controller('webhooks')
export class BotController {
  constructor(
    private readonly bot: BotService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('telegram')
  @HttpCode(200)
  async telegram(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: Update,
  ) {
    if (!this.config.TELEGRAM_WEBHOOK_SECRET) {
      throw new ServiceUnavailableException(
        'TELEGRAM_WEBHOOK_SECRET sozlanmagan',
      );
    }

    if (secret !== this.config.TELEGRAM_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Webhook siri noto‘g‘ri');
    }

    if (!update || typeof update.update_id !== 'number') {
      throw new BadRequestException('Telegram update formati noto‘g‘ri');
    }

    await this.bot.handleUpdate(update);

    return { ok: true };
  }
}
