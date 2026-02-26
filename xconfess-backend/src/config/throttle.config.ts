import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '900', 10), // 15 minutes in seconds
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10), // requests per TTL
}));