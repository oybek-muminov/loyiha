import {
  Controller,
  Get,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const XP_PER_LEVEL = 500;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() authUser?: AuthUser) {
    if (!authUser) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      include: { streak: true },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const xpAggregate = await this.prisma.xpEvent.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    });

    const xp = xpAggregate._sum.amount ?? 0;

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      xp,
      level: levelFromXp(xp),
      streak: {
        current: user.streak?.current ?? 0,
        longest: user.streak?.longest ?? 0,
      },
    };
  }
}
