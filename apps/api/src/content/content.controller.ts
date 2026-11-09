import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  lessonProgressSchema,
  type LessonProgressRequest,
} from '@univer/contract';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ContentService } from './content.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('subjects')
  listSubjects(@CurrentUser() user: AuthUser) {
    return this.content.listSubjects(user.id);
  }

  @Get('subjects/:slug/path')
  getPath(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.content.getPath(user.id, slug);
  }

  @Get('lessons/:id')
  getLesson(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.content.getLesson(user.id, id);
  }

  @Get('lessons/:id/playback')
  getPlayback(@Param('id') id: string) {
    return this.content.getPlayback(id);
  }

  @Put('lessons/:id/progress')
  @HttpCode(204)
  async saveProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(lessonProgressSchema))
    body: LessonProgressRequest,
  ): Promise<void> {
    await this.content.saveProgress(user.id, id, body);
  }

  @Post('lessons/:id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.content.completeLesson(user.id, id);
  }

  @Get('catalog')
  catalog(
    @CurrentUser() user: AuthUser,
    @Query('subject') subject?: string,
    @Query('q') q?: string,
  ) {
    return this.content.catalog(user.id, subject, q);
  }
}
