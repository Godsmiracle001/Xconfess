import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private metrics: Map<string, number[]> = new Map();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;

        if (duration > 200) {
          this.logger.warn(`SLOW: ${method} ${url} took ${duration}ms`);
        }

        this.recordMetric(method, url, duration);
      }),
    );
  }

  private recordMetric(method: string, url: string, duration: number) {
    const key = `${method} ${url}`;
    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = [];
      this.metrics.set(key, metrics);
    }
    metrics.push(duration);
  }

  getMetrics() {
    const summary = {};
    this.metrics.forEach((durations, key) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      summary[key] = {
        avg: Math.round(avg),
        max,
        min,
        count: durations.length,
      };
    });
    return summary;
  }
}
