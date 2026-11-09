import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AttemptsModule } from './attempts/attempts.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { APP_CONFIG, type AppConfig } from './common/config';
import { AppConfigModule } from './common/config.module';
import { ContentModule } from './content/content.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuizModule } from './quizzes/quiz.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    JwtModule.registerAsync({
      global: true,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_SECRET,
        signOptions: { issuer: 'univeracademy' },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ContentModule,
    QuizModule,
    AttemptsModule,
    BotModule,
  ],
})
export class AppModule {}
