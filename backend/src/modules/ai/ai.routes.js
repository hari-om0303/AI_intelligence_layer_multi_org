const express = require('express');
const { getRecommendations, postAIQuery, postAITriage } = require('./ai.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { checkPlanAccess } = require('../../middlewares/subscription.middleware');

const router = express.Router();

router.use(protect);
router.use(checkPlanAccess('PRO'));

router.get('/recommendations', getRecommendations);
router.post('/query', postAIQuery);
router.post('/triage', postAITriage);

module.exports = router;
