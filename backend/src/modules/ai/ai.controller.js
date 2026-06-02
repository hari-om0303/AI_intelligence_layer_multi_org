const { generateRecommendations, parseNaturalLanguageQuery, triageIssue } = require('./ai.service');
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

    // Wait for the async parser that queries Gemini
    const filter = await parseNaturalLanguageQuery(query);
    
    // Always enforce org isolation
    filter.orgId = req.user.orgId;

    const projects = await Project.find(filter).limit(20);
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

exports.postAITriage = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Missing description' });

    // Wait for the async issue triager that queries Gemini
    const triageResult = await triageIssue(description);
    res.status(200).json({ success: true, data: triageResult });
  } catch (error) {
    next(error);
  }
};
