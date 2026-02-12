import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
};

const redis = new Redis(redisConnection);

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

export { redis, redisConnection };
export default redis;
