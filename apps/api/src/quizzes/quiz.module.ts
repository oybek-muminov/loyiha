import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [AuthModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
