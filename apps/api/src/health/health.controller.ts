import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptimeSec: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
