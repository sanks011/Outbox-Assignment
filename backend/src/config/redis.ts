import { Redis, RedisOptions } from 'ioredis';
import { config } from './env.js';

let host = config.redis.host;
let port = config.redis.port;
let password = config.redis.password || undefined;
let username: string | undefined = undefined;
let tls: any = undefined;

if (config.redis.url) {
  try {
    const parsed = new URL(config.redis.url);
    host = parsed.hostname;
    port = parseInt(parsed.port || '6379', 10);
    if (parsed.password) password = parsed.password;
    if (parsed.username) username = parsed.username;
    if (parsed.protocol === 'rediss:') {
      tls = { rejectUnauthorized: false };
    }
  } catch (err: any) {
    console.warn('⚠️ Failed to parse REDIS_URL:', err.message);
  }
}

export const redisOptions: RedisOptions = {
  host,
  port,
  password,
  username,
  tls,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
};

export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisClient.on('error', (err: any) => {
  console.warn('⚠️ Redis Connection Warning:', err.message);
});
