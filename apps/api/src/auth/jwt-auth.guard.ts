import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from '../common/current-user.decorator';
import { TokenService } from './token.service';

interface RequestWithAuth {
  headers: { authorization?: string };
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization sarlavhasi yo\u2018q');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Token bo\u2018sh');
    }

    const { userId } = await this.tokens.verifyAccess(token);
    request.user = { id: userId };
    return true;
  }
}
