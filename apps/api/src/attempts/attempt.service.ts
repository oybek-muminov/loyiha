import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { StartAttemptRequest } from '@univer/contract';
import { scoreItem, type SubmittedAnswer } from '@univer/scoring';
import { PrismaService } from '../prisma/prisma.service';
import { StreakService } from '../progress/streak.service';
import {
  correctAnswerText,
  formatAnswer,
  parseTypedAnswer,
  toPublicItem,
  toScorableItem,
} from './item-map';

const PASS_PERCENT = 60;

const ATTEMPT_INCLUDE = {
  quiz: {
    include: {
      items: {
        orderBy: { order: 'asc' as const },
        include: {
          item: {
            include: {
              options: { orderBy: { order: 'asc' as const } },
              numeric: true,
              keywords: true,
            },
          },
        },
      },
    },
  },
  responses: true,
} satisfies Prisma.AttemptInclude;

type AttemptWithDetails = Prisma.AttemptGetPayload<{
  include: typeof ATTEMPT_INCLUDE;
}>;

@Injectable()
export class AttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
  ) {}

  async create(userId: string, body: StartAttemptRequest) {
    if (!body.quizId) {
      throw new BadRequestException({
        code: 'EXAM_NOT_READY',
        message: "Imtihon rejimi hali tayyor emas",
      });
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: body.quizId },
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

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        quizId: quiz.id,
        mode: quiz.kind === 'checkpoint' ? 'checkpoint' : 'practice',
      },
    });

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      timeLimitSec: attempt.timeLimitSec,
      items: quiz.items.map((entry) => toPublicItem(entry.item)),
    };
  }

  async get(userId: string, id: string) {
    const attempt = await this.findOwned(userId, id);

    if (attempt.status === 'submitted') {
      return this.buildResult(attempt, 0);
    }

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      timeLimitSec: attempt.timeLimitSec,
      items:
        attempt.quiz?.items.map((entry) => toPublicItem(entry.item)) ?? [],
      responses: attempt.responses.map((response) => ({
        itemId: response.itemId,
        answer: response.answer,
      })),
    };
  }

  async saveResponse(
    userId: string,
    id: string,
    itemId: string,
    answer: unknown,
  ): Promise<void> {
    const attempt = await this.findOwned(userId, id);

    if (attempt.status !== 'in_progress') {
      throw new BadRequestException({
        code: 'ATTEMPT_EXPIRED',
        message: "Urinish yakunlangan, javob o'zgartirib bo'lmaydi",
      });
    }

    const entry = attempt.quiz?.items.find(
      (candidate) => candidate.itemId === itemId,
    );

    if (!entry) {
      throw new NotFoundException('Savol urinishga tegishli emas');
    }

    const parsed = parseTypedAnswer(entry.item.type, answer);

    await this.prisma.response.upsert({
      where: { attemptId_itemId: { attemptId: id, itemId } },
      create: {
        attemptId: id,
        itemId,
        answer: parsed as unknown as Prisma.InputJsonValue,
      },
      update: {
        answer: parsed as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async submit(userId: string, id: string) {
    const attempt = await this.findOwned(userId, id);

    if (attempt.status === 'submitted') {
      return this.buildResult(attempt, 0);
    }

    if (!attempt.quiz) {
      throw new BadRequestException({
        code: 'EXAM_NOT_READY',
        message: "Imtihon urinishini yakunlash hali qo'llanmaydi",
      });
    }

    const responseByItem = new Map(
      attempt.responses.map((response) => [response.itemId, response]),
    );

    let score = 0;

    for (const entry of attempt.quiz.items) {
      const item = entry.item;
      const response = responseByItem.get(item.id);

      const result = response
        ? scoreItem(
            toScorableItem(item),
            response.answer as unknown as SubmittedAnswer,
          )
        : { correct: false, score: 0 as const, reviewStatus: 'none' as const };

      if (result.correct) score += 1;

      const reviewStatus =
        result.reviewStatus === 'pending' ? 'pending' : 'none';

      if (response) {
        await this.prisma.response.update({
          where: { attemptId_itemId: { attemptId: id, itemId: item.id } },
          data: {
            isCorrect: result.correct,
            score: result.score,
            reviewStatus,
          },
        });
      } else {
        await this.prisma.response.create({
          data: {
            attemptId: id,
            itemId: item.id,
            answer: {},
            isCorrect: result.correct,
            score: result.score,
            reviewStatus,
          },
        });
      }
    }

    const maxScore = attempt.quiz.items.length;
    const percent =
      maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
    const passed = percent >= PASS_PERCENT;
    const xpAwarded = 10 + score * 2;
    const now = new Date();

    await this.prisma.attempt.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: now,
        score,
        maxScore,
      },
    });

    await this.prisma.xpEvent.create({
      data: {
        userId,
        amount: xpAwarded,
        reason: 'quiz_completed',
        refId: id,
      },
    });

    if (passed) {
      const nodes = await this.prisma.node.findMany({
        where: { quizId: attempt.quiz.id },
      });

      for (const node of nodes) {
        await this.prisma.nodeProgress.upsert({
          where: { userId_nodeId: { userId, nodeId: node.id } },
          create: {
            userId,
            nodeId: node.id,
            status: 'completed',
            completedAt: now,
          },
          update: { status: 'completed', completedAt: now },
        });
      }
    }

    await this.streak.touch(userId, now);

    const finalAttempt = await this.findOwned(userId, id);
    return this.buildResult(finalAttempt, xpAwarded);
  }

  async list(userId: string, limit = 20) {
    const attempts = await this.prisma.attempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: { quiz: { select: { title: true } } },
    });

    return {
      data: attempts.map((attempt) => ({
        id: attempt.id,
        quizTitle: attempt.quiz?.title ?? null,
        mode: attempt.mode,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      })),
    };
  }

  private async findOwned(
    userId: string,
    id: string,
  ): Promise<AttemptWithDetails> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id },
      include: ATTEMPT_INCLUDE,
    });

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Urinish topilmadi');
    }

    return attempt;
  }

  private buildResult(attempt: AttemptWithDetails, xpAwarded: number) {
    const responseByItem = new Map(
      attempt.responses.map((response) => [response.itemId, response]),
    );

    const items =
      attempt.quiz?.items.map((entry) => {
        const item = entry.item;
        const response = responseByItem.get(item.id);

        return {
          itemId: item.id,
          type: item.type,
          topic: item.topic,
          body: item.body,
          isCorrect: response?.isCorrect ?? false,
          reviewStatus: response?.reviewStatus ?? 'none',
          yourAnswer: formatAnswer(item, response?.answer),
          correctAnswer: correctAnswerText(item),
          explanation: item.explanation,
        };
      }) ?? [];

    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const item of items) {
      const current = byTopic.get(item.topic) ?? { correct: 0, total: 0 };
      current.total += 1;
      if (item.isCorrect) current.correct += 1;
      byTopic.set(item.topic, current);
    }

    const maxScore = attempt.maxScore ?? items.length;
    const score = attempt.score ?? 0;
    const percent =
      maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);

    return {
      attemptId: attempt.id,
      score,
      maxScore,
      percent,
      passed: percent >= PASS_PERCENT,
      xpAwarded,
      items,
      byTopic: [...byTopic.entries()].map(([topic, value]) => ({
        topic,
        ...value,
      })),
    };
  }
}
