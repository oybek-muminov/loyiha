import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LessonProgressRequest } from '@univer/contract';
import { computeNodeStates } from '@univer/roadmap';
import type { AppConfig } from '../common/config';
import { APP_CONFIG } from '../common/config';
import { PrismaService } from '../prisma/prisma.service';
import { StreakService } from '../progress/streak.service';

const LESSON_COMPLETE_XP = 20;
const COMPLETE_THRESHOLD = 0.9;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async listSubjects(userId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: {
        courses: {
          include: {
            units: {
              include: {
                nodes: {
                  include: { progress: { where: { userId } } },
                },
              },
            },
          },
        },
      },
    });

    return {
      data: subjects.map((subject) => {
        const nodes = subject.courses.flatMap((course) =>
          course.units.flatMap((unit) => unit.nodes),
        );
        const completed = nodes.filter(
          (node) => node.progress[0]?.status === 'completed',
        ).length;

        return {
          slug: subject.slug,
          title: subject.title,
          active: subject.active,
          progress: nodes.length === 0 ? 0 : completed / nodes.length,
        };
      }),
    };
  }

  async getPath(userId: string, slug: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { slug, active: true },
      include: {
        courses: {
          include: {
            units: {
              orderBy: { order: 'asc' },
              include: {
                nodes: {
                  orderBy: { order: 'asc' },
                  include: { progress: { where: { userId } } },
                },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    const units = subject.courses
      .flatMap((course) => course.units)
      .sort((a, b) => a.order - b.order);

    const ordered = units.flatMap((unit) =>
      unit.nodes.map((node) => ({ node, unitId: unit.id })),
    );

    const states = computeNodeStates(
      ordered.map((entry, index) => ({
        id: entry.node.id,
        order: index + 1,
        type: entry.node.type,
        completed: entry.node.progress[0]?.status === 'completed',
        started: entry.node.progress[0]?.status === 'in_progress',
      })),
    );

    const stateById = new Map(states.map((state) => [state.id, state.state]));

    const unitResults = units.map((unit) => {
      const completed = unit.nodes.filter(
        (node) => node.progress[0]?.status === 'completed',
      ).length;

      return {
        id: unit.id,
        title: unit.title,
        order: unit.order,
        progress: unit.nodes.length === 0 ? 0 : completed / unit.nodes.length,
        nodes: unit.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          title: node.title,
          order: node.order,
          state: stateById.get(node.id) ?? 'locked',
          lessonId: node.lessonId,
          quizId: node.quizId,
        })),
      };
    });

    const allNodes = unitResults.flatMap((unit) => unit.nodes);
    const completedNodes = allNodes.filter(
      (node) => node.state === 'completed',
    ).length;

    return {
      subject: { slug: subject.slug, title: subject.title },
      progress:
        allNodes.length === 0 ? 0 : completedNodes / allNodes.length,
      units: unitResults,
    };
  }

  async getLesson(userId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        video: true,
        progress: { where: { userId } },
        node: {
          include: {
            unit: {
              include: {
                course: { include: { subject: true } },
                nodes: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    const progress = lesson.progress[0];
    const video = lesson.video;

    let nextNodeId: string | null = null;
    let nextNode: { id: string; type: string } | null = null;
    if (lesson.node) {
      const nodes = lesson.node.unit.nodes;
      const index = nodes.findIndex((node) => node.id === lesson.node?.id);
      const next = nodes[index + 1];
      nextNodeId = next?.id ?? null;
      nextNode = next ? { id: next.id, type: next.type } : null;
    }

    const subjectSlug = lesson.node?.unit.course.subject.slug ?? null;

    return {
      id: lesson.id,
      title: lesson.title,
      contentMd: lesson.contentMd,
      durationSec: lesson.durationSec,
      subjectSlug,
      video: video
        ? {
            status: video.status,
            posterUrl: this.mediaUrl(video.posterPath),
          }
        : null,
      progress: {
        positionSec: progress?.positionSec ?? 0,
        watchedSec: progress?.watchedSec ?? 0,
        completed: Boolean(progress?.completedAt),
      },
      quizId: lesson.node?.quizId ?? null,
      nextNodeId,
      nextNode,
    };
  }

  async getPlayback(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { video: true },
    });

    if (!lesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    const video = lesson.video;

    if (!video || video.status !== 'ready' || !video.hlsMasterPath) {
      throw new ConflictException({
        code: 'VIDEO_NOT_READY',
        message: 'Video hali tayyor emas',
      });
    }

    const renditions = this.parseRenditions(video.renditions);

    const fallback =
      renditions.find((r) => r.fallbackPath)?.fallbackPath ??
      `${video.hlsMasterPath.split('/').slice(0, -1).join('/')}/480p/fallback.mp4`;

    return {
      hlsUrl: this.mediaUrl(video.hlsMasterPath),
      mp4Fallback: this.mediaUrl(fallback),
      posterUrl: this.mediaUrl(video.posterPath),
      durationSec: video.durationSec ?? lesson.durationSec,
      renditions: renditions.map(({ height, bandwidth }) => ({
        height,
        bandwidth,
      })),
    };
  }

  async saveProgress(
    userId: string,
    id: string,
    body: LessonProgressRequest,
  ): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: id } },
    });

    const watchedSec = Math.max(existing?.watchedSec ?? 0, body.watchedSec);

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: id } },
      create: {
        userId,
        lessonId: id,
        positionSec: body.positionSec,
        watchedSec,
      },
      update: {
        positionSec: body.positionSec,
        watchedSec,
        lastSeenAt: new Date(),
      },
    });
  }

  async completeLesson(userId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        video: true,
        progress: { where: { userId } },
        node: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    const durationSec = lesson.durationSec || lesson.video?.durationSec || 0;
    const existing = lesson.progress[0];
    const watchedSec = existing?.watchedSec ?? 0;

    if (
      durationSec > 0 &&
      watchedSec / durationSec < COMPLETE_THRESHOLD
    ) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_PROGRESS',
        message: "Darsni tugatish uchun kamida 90% ko'rish kerak",
        details: { watchedSec, durationSec },
      });
    }

    const isFirstCompletion = !existing?.completedAt;
    const now = new Date();

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: id } },
      create: {
        userId,
        lessonId: id,
        positionSec: existing?.positionSec ?? 0,
        watchedSec,
        completedAt: now,
      },
      update: {
        completedAt: existing?.completedAt ?? now,
        lastSeenAt: now,
      },
    });

    if (lesson.node) {
      await this.prisma.nodeProgress.upsert({
        where: {
          userId_nodeId: { userId, nodeId: lesson.node.id },
        },
        create: {
          userId,
          nodeId: lesson.node.id,
          status: 'completed',
          completedAt: now,
        },
        update: { status: 'completed', completedAt: now },
      });
    }

    if (isFirstCompletion) {
      await this.prisma.xpEvent.create({
        data: {
          userId,
          amount: LESSON_COMPLETE_XP,
          reason: 'lesson_completed',
          refId: id,
        },
      });
    }

    const streakCurrent = await this.streak.touch(userId, now);

    return {
      completed: true,
      xpAwarded: isFirstCompletion ? LESSON_COMPLETE_XP : 0,
      streak: streakCurrent,
    };
  }

  async catalog(userId: string, subjectSlug?: string, query?: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        ...(subjectSlug
          ? { node: { unit: { course: { subject: { slug: subjectSlug } } } } }
          : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' as const } },
                {
                  contentMd: { contains: query, mode: 'insensitive' as const },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        progress: { where: { userId } },
        node: {
          include: {
            unit: {
              include: { course: { include: { subject: true } } },
            },
          },
        },
      },
      take: 100,
    });

    return {
      data: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        subjectSlug: lesson.node?.unit.course.subject.slug ?? null,
        subjectTitle: lesson.node?.unit.course.subject.title ?? null,
        unitTitle: lesson.node?.unit.title ?? null,
        durationSec: lesson.durationSec,
        completed: Boolean(lesson.progress[0]?.completedAt),
      })),
    };
  }

  private mediaUrl(path: string | null): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.config.R2_PUBLIC_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private parseRenditions(
    value: unknown,
  ): Array<{ height: number; bandwidth: number; fallbackPath?: string }> {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof (entry as { height?: unknown }).height !== 'number' ||
        typeof (entry as { bandwidth?: unknown }).bandwidth !== 'number'
      ) {
        return [];
      }
      const item = entry as {
        height: number;
        bandwidth: number;
        fallbackPath?: unknown;
      };
      return [
        {
          height: item.height,
          bandwidth: item.bandwidth,
          ...(typeof item.fallbackPath === 'string'
            ? { fallbackPath: item.fallbackPath }
            : {}),
        },
      ];
    });
  }
}
