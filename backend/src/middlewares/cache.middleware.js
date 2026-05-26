const redis = require('../config/redis');

/**
 * Generates a dynamic cache key based on the prefix and the user's orgId
 * @param {string} prefix - The namespace for the cache (e.g., 'analytics')
 */
const checkCache = (prefix) => {
  return async (req, res, next) => {
    try {
      const orgId = req.user.orgId.toString();
      const cacheKey = `${prefix}:${orgId}`;

      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`[Cache Miss] ${cacheKey}`);
      // Attach a utility method to `res` to easily cache the response later in the controller
      res.sendCached = (data, expirationInSeconds = 300) => {
        redis.setex(cacheKey, expirationInSeconds, JSON.stringify(data));
        res.status(200).json(data);
      };

      next();
    } catch (error) {
      console.error('Redis Cache Middleware Error:', error);
      // If Redis fails, gracefully fallback to executing the controller without caching
      next();
    }
  };
};

/**
 * Invalidates a specific cache key
 * @param {string} prefix - The namespace for the cache
 * @param {string} orgId - The organization ID
 */
const clearCache = async (prefix, orgId) => {
  try {
    const cacheKey = `${prefix}:${orgId}`;
    await redis.del(cacheKey);
    console.log(`[Cache Cleared] ${cacheKey}`);
  } catch (error) {
    console.error('Redis Clear Cache Error:', error);
  }
};

module.exports = {
  checkCache,
  clearCache
};
