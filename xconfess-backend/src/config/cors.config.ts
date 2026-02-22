import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const getCorsConfig = (): CorsOptions => {
  // Parse allowed origins from environment or use defaults
  const origins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  // Parse allowed methods from environment or use defaults
  const methods = (
    process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
  )
    .split(',')
    .map((m) => m.trim());

  // Parse allowed headers from environment or use defaults
  const allowedHeaders = (
    process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,Accept'
  )
    .split(',')
    .map((h) => h.trim());

  // Parse exposed headers from environment or use defaults
  const exposedHeaders = (
    process.env.CORS_EXPOSE_HEADERS ||
    'Authorization,Content-Range,X-Content-Range'
  )
    .split(',')
    .map((h) => h.trim());

  // Parse max age from environment or use default (1 hour)
  const maxAge = parseInt(process.env.CORS_MAX_AGE ?? '3600', 10);

  // Parse credentials setting from environment or default to true
  const credentials = process.env.CORS_CREDENTIALS !== 'false';

  return {
    origin: origins,
    credentials,
    methods,
    allowedHeaders,
    exposedHeaders,
    maxAge,
  };
};
