import IORedis, { type RedisOptions } from 'ioredis';

export function createRedisConnection() {
  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  const options: RedisOptions = {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    maxRetriesPerRequest: null,
    port: Number(process.env.REDIS_PORT ?? 6379),
  };

  return new IORedis(options);
}
