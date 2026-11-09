import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicItem } from '../attempts/item-map';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            item: {
              include: {
                options: { orderBy: { order: 'asc' } },
                numeric: true,
                keywords: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Test topilmadi');
    }

    return {
      id: quiz.id,
      title: quiz.title,
      kind: quiz.kind,
      timeLimitSec: null,
      items: quiz.items.map((entry) => toPublicItem(entry.item)),
    };
  }
}
