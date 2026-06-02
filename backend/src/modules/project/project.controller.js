const Project = require('./project.model');
const AuditLog = require('../audit/audit.model');

// Helper function to log audit
const logAudit = async (action, userId, orgId, metadata) => {
  try {
    await AuditLog.create({ action, userId, orgId, metadata });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

const { evaluateProjectInsights } = require('../ai/ai.service');
const { calculateHealth, getRecommendation } = require('../intelligence/intelligence.service');
const { clearCache } = require('../../middlewares/cache.middleware');
const socket = require('../../config/socket');

// @desc    Get all projects for current organization
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // VERY IMPORTANT: Always filter by orgId from JWT
    const query = { orgId: req.user.orgId, isActive: true };

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .lean()
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'name email');

    const mappedProjects = projects.map(p => {
      const { healthScore, healthStatus } = calculateHealth(p);
      return {
        ...p,
        healthScore,
        healthStatus,
        recommendation: getRecommendation(p, healthScore)
      };
    });

    const responseData = {
      success: true,
      count: mappedProjects.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: mappedProjects,
    };

    if (res.sendCached) {
      res.sendCached(responseData, 300); // 5 min cache
    } else {
      res.status(200).json(responseData);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a project
// @route   POST /api/projects
// @access  Private (ORG_ADMIN only)
exports.createProject = async (req, res, next) => {
  try {
    const { title, description, priority, type, dueDate, githubIssueUrl, attachments } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Please provide a title' });
    }

    // Check project limit for FREE plan
    const org = await require('../organization/organization.model').findById(req.user.orgId);
    if (org && org.subscriptionPlan === 'FREE') {
      const projectCount = await Project.countDocuments({ orgId: req.user.orgId, isActive: true });
      if (projectCount >= 5) {
        return res.status(403).json({ 
          success: false, 
          message: 'Project limit reached. Please upgrade to PRO to create more projects.' 
        });
      }
    }

    const project = await Project.create({
      title,
      description,
      priority: priority || 'Medium',
      type: type || 'Feature',
      dueDate,
      githubIssueUrl,
      orgId: req.user.orgId,
      createdBy: req.user._id,
      activityCount: 1,
      lastActivityAt: Date.now(),
      attachments: attachments || []
    });

    await logAudit('CREATE_PROJECT', req.user._id, req.user.orgId, { projectId: project._id, title });
    await clearCache('analytics', req.user.orgId);
    await clearCache('projects', req.user.orgId);
    await clearCache('intelligence:risks', req.user.orgId);
    await clearCache('intelligence:efficiency', req.user.orgId);

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('PROJECT_CREATED', project);
      socket.getIo().to(req.user.orgId.toString()).emit('intelligenceUpdated');
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (ORG_ADMIN only)
exports.updateProject = async (req, res, next) => {
  try {
    const { title, description, attachments } = req.body;

    let project = await Project.findOne({ _id: req.params.id, orgId: req.user.orgId, isActive: true });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.title = title || project.title;
    project.description = description !== undefined ? description : project.description;
    project.attachments = attachments || project.attachments;
    project.activityCount = (project.activityCount || 0) + 1;
    project.lastActivityAt = Date.now();

    await project.save();

    await logAudit('UPDATE_PROJECT', req.user._id, req.user.orgId, { projectId: project._id });
    await clearCache('analytics', req.user.orgId);
    await clearCache('projects', req.user.orgId);
    await clearCache('intelligence:risks', req.user.orgId);
    await clearCache('intelligence:efficiency', req.user.orgId);

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('PROJECT_UPDATED', project);
      socket.getIo().to(req.user.orgId.toString()).emit('intelligenceUpdated');
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a project status
// @route   PATCH /api/projects/:id/status
// @access  Private
exports.updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    let project = await Project.findOne({ _id: req.params.id, orgId: req.user.orgId, isActive: true });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.status = status;
    project.activityCount = (project.activityCount || 0) + 1;
    project.lastActivityAt = Date.now();
    await project.save();

    // Mock GitHub Integration
    if (status === 'DONE') {
      console.log(`[GitHub Sync] Simulating closing issue for project ${project.title}`);
      if (project.githubIssueUrl) {
        console.log(`[GitHub Sync] Successfully closed issue at ${project.githubIssueUrl}`);
        await logAudit('GITHUB_ISSUE_CLOSED', req.user._id, req.user.orgId, { projectId: project._id, url: project.githubIssueUrl });
      }
    }

    await logAudit('UPDATE_PROJECT_STATUS', req.user._id, req.user.orgId, { projectId: project._id, status });
    await clearCache('analytics', req.user.orgId);
    await clearCache('projects', req.user.orgId);
    await clearCache('intelligence:risks', req.user.orgId);
    await clearCache('intelligence:efficiency', req.user.orgId);

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('PROJECT_UPDATED', project);
      socket.getIo().to(req.user.orgId.toString()).emit('intelligenceUpdated');
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a project (Soft Delete)
// @route   DELETE /api/projects/:id
// @access  Private (ORG_ADMIN only)
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, orgId: req.user.orgId, isActive: true });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.isActive = false;
    await project.save();

    await logAudit('DELETE_PROJECT', req.user._id, req.user.orgId, { projectId: project._id });
    await clearCache('analytics', req.user.orgId);
    await clearCache('projects', req.user.orgId);
    await clearCache('intelligence:risks', req.user.orgId);
    await clearCache('intelligence:efficiency', req.user.orgId);

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('PROJECT_DELETED', project._id);
      socket.getIo().to(req.user.orgId.toString()).emit('intelligenceUpdated');
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project insights
// @route   GET /api/projects/insights
// @access  Private
exports.getProjectInsights = async (req, res, next) => {
  try {
    const query = { orgId: req.user.orgId, isActive: true };
    if (req.query.status && req.query.status !== 'ALL') {
      query.status = req.query.status;
    }

    let sortObj = { createdAt: -1 };
    if (req.query.sortBy === 'oldest') {
      sortObj = { createdAt: 1 };
    }
    
    const projects = await Project.find(query).lean().sort(sortObj);
    
    // Evaluate scores for all in-memory (0 DB Writes)
    let enrichedProjects = projects.map(p => evaluateProjectInsights(p));
    
    if (req.query.sortBy === 'health') {
      enrichedProjects.sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));
    } else if (req.query.sortBy === 'risk') {
      enrichedProjects.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    }

    res.status(200).json({
      success: true,
      data: enrichedProjects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Semantic search projects
// @route   GET /api/projects/search?q=
// @access  Private
exports.searchProjects = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Missing search query' });
    }

    // Using MongoDB Text Search (Semantic matching of keywords)
    const projects = await Project.find({
      orgId: req.user.orgId,
      isActive: true,
      $text: { $search: q }
    }).lean().sort({ score: { $meta: 'textScore' } });

    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project history (Audit Logs)
// @route   GET /api/projects/:id/history
// @access  Private
exports.getProjectHistory = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, orgId: req.user.orgId, isActive: true });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const history = await AuditLog.find({ 
      orgId: req.user.orgId, 
      'metadata.projectId': project._id 
    }).lean().sort({ createdAt: -1 }).populate('userId', 'name email');

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
