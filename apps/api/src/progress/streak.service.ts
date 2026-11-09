import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const TZ = 'Asia/Tashkent';

/** Toshkent vaqti bo'yicha `YYYY-MM-DD`. */
export function tashkentDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

function shiftDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Kunlik faollikni qayd etadi va streak'ni yangilaydi.
 * Qaytaradi: joriy streak uzunligi.
 */
@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  async touch(userId: string, at: Date = new Date()): Promise<number> {
    const today = tashkentDate(at);
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });

    if (!streak) {
      await this.prisma.streak.create({
        data: {
          userId,
          current: 1,
          longest: 1,
          lastActiveDate: new Date(`${today}T00:00:00Z`),
        },
      });
      return 1;
    }

    const last = streak.lastActiveDate
      ? tashkentDate(streak.lastActiveDate)
      : null;

    if (last === today) {
      return streak.current;
    }

    const current = last === shiftDate(today, -1) ? streak.current + 1 : 1;
    const longest = Math.max(streak.longest, current);

    await this.prisma.streak.update({
      where: { userId },
      data: {
        current,
        longest,
        lastActiveDate: new Date(`${today}T00:00:00Z`),
      },
    });

    return current;
  }
}
