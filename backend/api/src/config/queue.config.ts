import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT
    ? Number(process.env.REDIS_PORT)
    : undefined,
  redisUrl: process.env.REDIS_URL,
}));
