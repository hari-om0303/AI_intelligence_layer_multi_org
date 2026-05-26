const { generateRecommendations, parseNaturalLanguageQuery } = require('./ai.service');
const { getDashboardAnalytics } = require('../analytics/analytics.service');
const Project = require('../project/project.model');

exports.getRecommendations = async (req, res, next) => {
  try {
    const stats = await getDashboardAnalytics(req.user.orgId);
    const recommendations = await generateRecommendations(req.user.orgId, stats);
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};

exports.postAIQuery = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Missing query' });

    const filter = parseNaturalLanguageQuery(query);
    
    // Always enforce org isolation
    filter.orgId = req.user.orgId;

    const projects = await Project.find(filter).limit(20);
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

exports.postAITriage = (req, res, next) => {
  try {
    const { description } = req.body;
    const triageResult = require('./ai.service').triageIssue(description);
    res.status(200).json({ success: true, data: triageResult });
  } catch (error) {
    next(error);
  }
};
