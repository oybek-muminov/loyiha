import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgressModule } from '../progress/progress.module';
import { AttemptsController } from './attempts.controller';
import { AttemptService } from './attempt.service';

@Module({
  imports: [AuthModule, ProgressModule],
  controllers: [AttemptsController],
  providers: [AttemptService],
})
export class AttemptsModule {}
