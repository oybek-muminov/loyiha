import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, type AppConfig } from '../common/config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type TokenType = 'access' | 'refresh';

interface JwtPayload {
  sub: string;
  typ: TokenType;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async issue(userId: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, typ: 'access' } satisfies JwtPayload,
        { expiresIn: this.config.JWT_ACCESS_TTL },
      ),
      this.jwt.signAsync(
        { sub: userId, typ: 'refresh' } satisfies JwtPayload,
        { expiresIn: this.config.JWT_REFRESH_TTL },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.JWT_ACCESS_TTL,
    };
  }

  async verifyAccess(token: string): Promise<{ userId: string }> {
    return this.verify(token, 'access');
  }

  async verifyRefresh(token: string): Promise<{ userId: string }> {
    return this.verify(token, 'refresh');
  }

  private async verify(token: string, type: TokenType): Promise<{ userId: string }> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);

      if (payload.typ !== type || !payload.sub) {
        throw new Error('Unexpected token payload');
      }

      return { userId: payload.sub };
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati tugagan');
    }
  }
}
