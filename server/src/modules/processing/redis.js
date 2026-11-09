import IORedis from 'ioredis';
import { env } from '../../config/env.js';
export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
redisConnection.on('error', (error) => console.error(`[Redis] ${error.message}`));
