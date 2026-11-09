import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  responsePatchSchema,
  startAttemptSchema,
  submitAttemptSchema,
  type ResponsePatchRequest,
  type StartAttemptRequest,
  type SubmitAttemptRequest,
} from '@univer/contract';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AttemptService } from './attempt.service';

@Controller('attempts')
@UseGuards(JwtAuthGuard)
export class AttemptsController {
  constructor(private readonly attempts: AttemptService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(startAttemptSchema)) body: StartAttemptRequest,
  ) {
    return this.attempts.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.attempts.list(
      user.id,
      Number.isFinite(parsed) && parsed > 0 ? parsed : 20,
    );
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.attempts.get(user.id, id);
  }

  @Patch(':id/responses/:itemId')
  @HttpCode(204)
  async saveResponse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(responsePatchSchema))
    body: ResponsePatchRequest,
  ): Promise<void> {
    await this.attempts.saveResponse(user.id, id, itemId, body.answer);
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(submitAttemptSchema))
    _body: SubmitAttemptRequest,
  ) {
    return this.attempts.submit(user.id, id);
  }
}
