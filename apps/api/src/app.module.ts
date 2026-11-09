import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { APP_CONFIG, type AppConfig } from './common/config';
import { AppConfigModule } from './common/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
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
  ],
})
export class AppModule {}
