import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { getCorsConfig } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with environment configuration
  app.enableCors(getCorsConfig());

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Apply global rate limit exception filter
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
