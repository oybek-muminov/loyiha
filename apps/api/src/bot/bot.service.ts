import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import type { Update } from 'grammy/types';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { isHttpsUrl, miniAppUrl } from './mini-app-url';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Bot | null;
  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private polling = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    if (!config.TELEGRAM_BOT_TOKEN) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN berilmagan — bot o‘chirilgan (API ishlayveradi)',
      );
      this.bot = null;
      return;
    }

    try {
      this.bot = new Bot(config.TELEGRAM_BOT_TOKEN, {
        client: { timeoutSeconds: 15 },
      });
      this.registerHandlers(this.bot);
    } catch (error) {
      this.logger.error(
        `Bot yaratib bo'lmadi: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.bot = null;
    }
  }

  get enabled(): boolean {
    return this.bot !== null;
  }

  async onModuleInit(): Promise<void> {
    if (!this.bot) return;

    if (this.config.TELEGRAM_BOT_POLLING) {
      this.polling = true;

      try {
        await this.ensureInitialized();
      } catch {
        return;
      }

      void this.bot
        .start({
          drop_pending_updates: true,
          onStart: (info) => {
            this.logger.log(
              `Bot @${info.username} polling rejimida ishga tushdi`,
            );
          },
        })
        .catch((error: unknown) => {
          this.logger.error(
            `Bot polling xatosi: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    } else {
      // Webhook rejimida startup'ni bloklamaymiz: birinchi update kelganda
      // (yoki fonda) `init()` bajariladi.
      void this.ensureInitialized().catch(() => undefined);
    }

    void this.configureMenu().catch((error: unknown) => {
      this.logger.warn(
        `Bot menyusini sozlab bo'lmadi: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.polling) {
      await this.bot.stop();
    }
  }

  async handleUpdate(update: Update): Promise<void> {
    await this.ensureInitialized();
    await this.bot!.handleUpdate(update);
  }

  private ensureInitialized(): Promise<void> {
    if (!this.bot) {
      return Promise.reject(
        new ServiceUnavailableException(
          'Telegram bot sozlanmagan (TELEGRAM_BOT_TOKEN)',
        ),
      );
    }

    if (this.initialized) return Promise.resolve();

    this.initPromise ??= this.bot
      .init()
      .then(() => {
        this.initialized = true;
        this.logger.log(`Bot @${this.bot?.botInfo.username} tayyor`);
      })
      .catch((error: unknown) => {
        this.initPromise = null;
        this.logger.error(
          `Botni ishga tushirib bo'lmadi (TELEGRAM_BOT_TOKEN tekshiring): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw new ServiceUnavailableException(
          'Telegram bot hozircha ishga tushmagan',
        );
      });

    return this.initPromise;
  }

  private registerHandlers(bot: Bot): void {
    bot.catch((error) => {
      this.logger.error(
        `Bot handler xatosi: ${
          error.error instanceof Error
            ? error.error.message
            : String(error.error)
        }`,
      );
    });

    bot.command('start', async (ctx) => {
      const name = ctx.from?.first_name ?? 'do‘stim';
      const base = this.config.TELEGRAM_MINIAPP_URL;
      const lines = [
        `Assalomu alaykum, ${name}! 👋`,
        '',
        'UniverAcademy — milliy sertifikat va DTM imtihonlariga',
        'tayyorgarlik platformasi.',
        '',
        'Fizika piloti: video darslar, yo‘l xaritasi va testlar.',
      ];

      if (!isHttpsUrl(base)) {
        lines.push(
          '',
          'Mini App hozircha lokal manzilda. Uni ochish uchun HTTPS',
          'manzil sozlang (tunnel yoki deploy).',
        );
      }

      await ctx.reply(lines.join('\n'), this.keyboardOptions());
    });

    bot.command('help', async (ctx) => {
      await ctx.reply(
        [
          'Buyruqlar:',
          '/start — boshlash va ilovani ochish',
          '/menu — asosiy menyu',
          '/lesson <id> — darsga to‘g‘ridan-to‘g‘ri o‘tish',
          '/help — yordam',
        ].join('\n'),
      );
    });

    bot.command('menu', async (ctx) => {
      await ctx.reply('Asosiy menyu:', this.keyboardOptions());
    });

    bot.command('lesson', async (ctx) => {
      const lessonId = (ctx.match ?? '').trim();

      if (!lessonId) {
        await ctx.reply('Foydalanish: /lesson <dars-id>');
        return;
      }

      const url = miniAppUrl(
        this.config.TELEGRAM_MINIAPP_URL,
        `/lesson/${lessonId}`,
      );

      if (!isHttpsUrl(url)) {
        await ctx.reply(`Mini App HTTPS manzilida ishlamoqda: ${url}`);
        return;
      }

      await ctx.reply('Dars tayyor:', {
        reply_markup: new InlineKeyboard().webApp('🎬 Darsni ochish', url),
      });
    });

    bot.on('message:text', async (ctx) => {
      await ctx.reply(
        'Mini App orqali davom eting 👇',
        this.keyboardOptions(),
      );
    });
  }

  private mainKeyboard(): InlineKeyboard | null {
    const base = this.config.TELEGRAM_MINIAPP_URL;

    if (!isHttpsUrl(base)) return null;

    return new InlineKeyboard()
      .webApp('📱 Ilovani ochish', base)
      .row()
      .webApp('🗺️ Fizika yo‘li', miniAppUrl(base, '/path/fizika'))
      .row();
  }

  private keyboardOptions(): { reply_markup?: InlineKeyboard } {
    const keyboard = this.mainKeyboard();
    return keyboard ? { reply_markup: keyboard } : {};
  }

  private async configureMenu(): Promise<void> {
    if (!this.bot) return;

    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Boshlash' },
      { command: 'menu', description: 'Asosiy menyu' },
      { command: 'help', description: 'Yordam' },
    ]);

    const base = this.config.TELEGRAM_MINIAPP_URL;

    if (isHttpsUrl(base)) {
      await this.bot.api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: 'UniverAcademy',
          web_app: { url: base },
        },
      });
    }
  }
}
