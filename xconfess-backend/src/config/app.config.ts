import { registerAs } from '@nestjs/config';

/**
 * Typed "app" config namespace.
 *
 * Access via ConfigService: this.configService.get('app.port'), etc.
 */
export default registerAs('app', () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL ?? '',
    appSecret: process.env.APP_SECRET ?? '',
    confessionAesKey: process.env.CONFESSION_AES_KEY ?? '',
}));
