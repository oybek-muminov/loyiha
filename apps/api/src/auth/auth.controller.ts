import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  telegramAuthRequestSchema,
  type TelegramAuthRequest,
} from '@univer/contract';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});

type RefreshRequest = z.infer<typeof refreshSchema>;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('telegram')
  @HttpCode(200)
  telegram(
    @Body(new ZodValidationPipe(telegramAuthRequestSchema))
    body: TelegramAuthRequest,
  ) {
    return this.auth.loginWithTelegram(body.initData);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshRequest) {
    return this.auth.refresh(body.refreshToken);
  }
}
