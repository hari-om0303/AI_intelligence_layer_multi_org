const express = require('express');
const { getSystemMetrics } = require('./system.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { checkCache } = require('../../middlewares/cache.middleware');

const router = express.Router();

router.use(protect);
router.use(requireRole('ORG_ADMIN'));

router.route('/metrics').get(checkCache('system'), getSystemMetrics);

module.exports = router;
