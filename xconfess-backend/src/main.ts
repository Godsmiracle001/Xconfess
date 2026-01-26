import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * ─────────────────────────────────────
   * TRUST PROXY (IMPORTANT FOR RATE LIMITING)
   * ─────────────────────────────────────
   */
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  /**
   * ─────────────────────────────────────
   * SECURITY HEADERS
   * ─────────────────────────────────────
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  /**
   * ─────────────────────────────────────
   * REQUEST SIZE LIMITS
   * ─────────────────────────────────────
   */
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  /**
   * ─────────────────────────────────────
   * GLOBAL INPUT VALIDATION
   * ─────────────────────────────────────
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * ─────────────────────────────────────
   * RATE LIMIT EXCEPTION HANDLING
   * ─────────────────────────────────────
   */
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  /**
   * ─────────────────────────────────────
   * CORS LOCKDOWN
   * ─────────────────────────────────────
   */
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  /**
   * ─────────────────────────────────────
   * SWAGGER / OPENAPI DOCUMENTATION
   * ─────────────────────────────────────
  */
 
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Confession Platform API')
      .setDescription(
        'Comprehensive API documentation for authentication, confessions, interactions, search, and Stellar integrations.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste JWT access token here',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
