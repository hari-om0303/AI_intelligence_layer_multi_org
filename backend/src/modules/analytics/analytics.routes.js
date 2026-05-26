const express = require('express');
const { getAnalytics, getAnomalies } = require('./analytics.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { checkPlanAccess } = require('../../middlewares/subscription.middleware');
const { checkCache } = require('../../middlewares/cache.middleware');

const router = express.Router();

router.use(protect);
router.use(checkPlanAccess('PRO'));

router.get('/dashboard', checkCache('analytics'), getAnalytics);
router.get('/anomalies', requireRole('ORG_ADMIN'), getAnomalies);

module.exports = router;
