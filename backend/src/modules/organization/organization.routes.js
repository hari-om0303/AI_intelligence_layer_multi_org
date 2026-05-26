const express = require('express');
const { upgradePlan } = require('./organization.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);
router.patch('/upgrade', requireRole('ORG_ADMIN'), upgradePlan);

module.exports = router;
