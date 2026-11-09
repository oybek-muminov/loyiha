import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuizService } from './quiz.service';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizzes: QuizService) {}

  @Get(':id')
  getQuiz(@Param('id') id: string) {
    return this.quizzes.getQuiz(id);
  }
}
