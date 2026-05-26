const express = require('express');
const { getAuditLogs } = require('./audit.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { orgRateLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(protect);
router.use(orgRateLimiter);
router.use(requireRole('ORG_ADMIN')); // Only admins can view audit logs

router.route('/').get(getAuditLogs);

module.exports = router;
