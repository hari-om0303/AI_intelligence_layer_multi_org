const rateLimit = require('express-rate-limit');
const Organization = require('../modules/organization/organization.model');

// Basic API rate limiter for unauthenticated routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Organization-based rate limiter (mocked via IP for simplicity if no Redis, but ideally uses orgId)
const orgRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: async (req, res) => {
    if (req.user && req.user.orgId) {
      try {
        const org = await Organization.findById(req.user.orgId);
        if (org && org.subscriptionPlan === 'PRO') {
          return 1000;
        }
      } catch (err) {
        console.error('Rate limit org fetch error', err);
      }
    }
    return 50; // FREE plan or default limit
  },
  keyGenerator: (req) => {
    // Rate limit per organization instead of per IP
    return req.user ? req.user.orgId.toString() : req.ip;
  },
  message: { success: false, message: 'Organization rate limit exceeded. Please upgrade to PRO.' }
});

module.exports = { apiLimiter, orgRateLimiter };
