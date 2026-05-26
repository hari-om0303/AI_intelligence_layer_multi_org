const express = require('express');
const { getProjects, createProject, updateProject, deleteProject, getProjectInsights, searchProjects, updateProjectStatus, getProjectHistory } = require('./project.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');
const { orgRateLimiter } = require('../../middlewares/rateLimit.middleware');
const { checkCache } = require('../../middlewares/cache.middleware');

const router = express.Router();

router.use(protect); // All project routes require authentication
router.use(orgRateLimiter); // Apply rate limiting based on org plan

router.route('/')
  .get(checkCache('projects'), getProjects)
  .post(requireRole('ORG_ADMIN'), createProject);

router.route('/search').get(searchProjects);
router.route('/insights').get(getProjectInsights);

router.route('/:id/history')
  .get(getProjectHistory);

router.route('/:id/status')
  .patch(updateProjectStatus);

router.route('/:id')
  .put(requireRole('ORG_ADMIN'), updateProject)
  .delete(requireRole('ORG_ADMIN'), deleteProject);

module.exports = router;
