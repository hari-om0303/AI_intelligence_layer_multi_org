const Redis = require('ioredis');

let redis = null;
let isRedisAvailable = false;

const redisUri = process.env.REDIS_URI;

if (redisUri) {
  try {
    redis = new Redis(redisUri, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Max connection retries reached. Redis features will be disabled.');
          isRedisAvailable = false;
          return null; // Stop attempting reconnection
        }
        return 1000; // Retry after 1 second
      }
    });

    redis.on('connect', () => {
      isRedisAvailable = true;
      console.log('Redis connected successfully');
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isRedisAvailable = false;
    });
  } catch (err) {
    console.error('[Redis] Failed to initialize client:', err.message);
    isRedisAvailable = false;
  }
} else {
  console.log('[Redis] Caching disabled: REDIS_URI environment variable is missing.');
}

module.exports = {
  redis,
  isAvailable: () => isRedisAvailable && redis && redis.status === 'ready'
};
