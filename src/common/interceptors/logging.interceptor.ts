import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const now = Date.now();

    this.logger.log(`[${method}] ${url} - ${ip}`);

    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'success',
        data,
      })),
      tap(() => {
        const delay = Date.now() - now;
        this.logger.log(`[${method}] ${url} - 耗时 ${delay}ms`);
      }),
    );
  }
}
