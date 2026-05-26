const Redis = require('ioredis');

// Connect to Redis. We'll use a local instance for now.
// In production, this would be a Redis Cloud URL or similar.
const redis = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;
