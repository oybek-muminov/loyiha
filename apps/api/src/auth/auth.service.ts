import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Provider } from '@prisma/client';
import type { AuthResponse } from '@univer/contract';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { PrismaService } from '../prisma/prisma.service';
import { validateTelegramInitData } from './telegram-initdata';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async loginWithTelegram(initData: string): Promise<AuthResponse> {
    if (!this.config.TELEGRAM_BOT_TOKEN) {
      throw new ServiceUnavailableException(
        'Telegram bot token sozlanmagan',
      );
    }

    let validated;
    try {
      validated = validateTelegramInitData(
        initData,
        this.config.TELEGRAM_BOT_TOKEN,
      );
    } catch {
      throw new UnauthorizedException(
        "Telegram ma'lumotlari yaroqsiz yoki muddati tugagan",
      );
    }

    const externalId = String(validated.user.id);
    const fullName = [validated.user.first_name, validated.user.last_name]
      .filter(Boolean)
      .join(' ');
    const avatarUrl = validated.user.photo_url ?? null;

    const existing = await this.prisma.identity.findUnique({
      where: {
        provider_externalId: {
          provider: Provider.telegram,
          externalId,
        },
      },
      include: { user: true },
    });

    let userId: string;
    let name: string | null;
    let userAvatar: string | null;
    let isNew = false;

    if (existing) {
      userId = existing.userId;
      const updated = await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          name: existing.user.name ?? fullName,
          avatarUrl: existing.user.avatarUrl ?? avatarUrl,
        },
      });
      name = updated.name;
      userAvatar = updated.avatarUrl;
    } else {
      isNew = true;
      const created = await this.prisma.user.create({
        data: {
          name: fullName,
          avatarUrl,
          identities: {
            create: {
              provider: Provider.telegram,
              externalId,
              username: validated.user.username ?? null,
              verifiedAt: new Date(),
            },
          },
        },
      });
      userId = created.id;
      name = created.name;
      userAvatar = created.avatarUrl;
    }

    const tokens = await this.tokens.issue(userId);

    return {
      ...tokens,
      user: {
        id: userId,
        name,
        avatarUrl: userAvatar,
        isNew,
      },
    };
  }

  async refresh(refreshToken: string) {
    const { userId } = await this.tokens.verifyRefresh(refreshToken);
    return this.tokens.issue(userId);
  }
}
