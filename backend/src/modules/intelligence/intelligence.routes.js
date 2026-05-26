const express = require('express');
const { getRisks, getEfficiency, getTeamPerformance } = require('./intelligence.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { checkCache } = require('../../middlewares/cache.middleware');

const router = express.Router();

router.use(protect);

router.get('/risks', checkCache('intelligence:risks'), getRisks);
router.get('/efficiency', checkCache('intelligence:efficiency'), getEfficiency);
router.get('/team', getTeamPerformance);

module.exports = router;
