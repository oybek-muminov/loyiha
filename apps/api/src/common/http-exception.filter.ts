import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface ResponseLike {
  status(code: number): { send(body: unknown): void };
}

function httpCodeToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Ichki xatolik';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        code = httpCodeToCode(status);
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        code = typeof obj.code === 'string' ? obj.code : httpCodeToCode(status);
        message =
          typeof obj.message === 'string'
            ? obj.message
            : Array.isArray(obj.message)
              ? obj.message.join(', ')
              : message;
        details = obj.details;
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).send({ error: { code, message, details } });
  }
}
