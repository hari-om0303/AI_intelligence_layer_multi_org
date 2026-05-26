const Project = require('../project/project.model');
const Organization = require('../organization/organization.model');

// AI Recommendations based on Org Data
exports.generateRecommendations = async (orgId, stats) => {
  const recommendations = [];
  const org = await Organization.findById(orgId);
  const projects = await Project.find({ orgId, isActive: true });

  const now = new Date();

  // Find oldest untouched project
  const untouched = projects.filter(p => {
    const daysSinceUpdate = (now - new Date(p.updatedAt)) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 5 && p.status !== 'DONE';
  }).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  if (untouched.length > 0) {
    const p = untouched[0];
    const days = Math.floor((now - new Date(p.updatedAt)) / (1000 * 60 * 60 * 24));
    recommendations.push({
      type: 'WARNING',
      text: `Project "${p.title}" has been inactive for ${days} days. Consider following up.`,
    });
  }

  // Find projects stuck in TODO
  const todos = projects.filter(p => p.status === 'TODO');
  if (todos.length >= 3) {
    recommendations.push({
      type: 'CLEANUP',
      text: `You have ${todos.length} projects stuck in "To Do". Consider moving some to "In Progress".`,
    });
  }

  // Completion rate insight
  const done = projects.filter(p => p.status === 'DONE');
  if (projects.length > 0) {
    const doneRatio = done.length / projects.length;
    if (doneRatio >= 0.5) {
      recommendations.push({
        type: 'SUCCESS',
        text: `Great progress! ${Math.round(doneRatio * 100)}% of your active projects are marked as Done.`,
      });
    }
  }

  // Analyze limits
  if (org.subscriptionPlan === 'FREE' && projects.length >= 4) {
    recommendations.push({
      type: 'UPGRADE',
      text: `You are nearing the free tier limits (${projects.length}/5 projects). Upgrade to PRO for unlimited access.`,
    });
  }

  if (projects.length === 0) {
    recommendations.push({
      type: 'ENGAGEMENT',
      text: 'Your organization currently has no active projects. Create a new project to get started!',
    });
  }

  return recommendations;
};

// Simple heuristic NLP Parser
exports.parseNaturalLanguageQuery = (queryText) => {
  const q = queryText.toLowerCase();
  const filter = {};

  // Parse status
  if (q.includes('inactive') || q.includes('deleted') || q.includes('archived')) {
    filter.isActive = false;
  } else if (q.includes('active') || q.includes('current')) {
    filter.isActive = true;
  }

  // Parse risk
  if (q.includes('high risk') || q.includes('risky')) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.updatedAt = { $lte: thirtyDaysAgo };
  } else if (q.includes('healthy') || q.includes('low risk')) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    filter.updatedAt = { $gt: sevenDaysAgo };
  }

  return filter;
};

// Evaluate project scores in memory (No DB writes to prevent N+1 queries)
exports.evaluateProjectInsights = (project) => {
  if (!project) return null;

  const now = new Date();
  const timeSinceUpdate = now - new Date(project.updatedAt);
  const daysSinceUpdate = timeSinceUpdate / (1000 * 60 * 60 * 24);

  let activityScore = 100;
  let riskScore = 0;

  // Simple decay logic for activity
  if (daysSinceUpdate > 30) {
    activityScore = 20;
    riskScore = 80; // High risk if untouched for a month
  } else if (daysSinceUpdate > 7) {
    activityScore = 60;
    riskScore = 40;
  } else {
    activityScore = 95;
    riskScore = 5;
  }

  return {
    ...project,
    activityScore,
    riskScore
  };
};

// AI Heuristic Triage
exports.triageIssue = (description) => {
  if (!description) return { priority: 'Medium', type: 'Feature' };

  const text = description.toLowerCase();
  
  let priority = 'Medium';
  let type = 'Feature';

  // Detect Type
  if (text.includes('crash') || text.includes('bug') || text.includes('error') || text.includes('fail') || text.includes('broken')) {
    type = 'Bug';
  } else if (text.includes('refactor') || text.includes('clean up') || text.includes('debt') || text.includes('optimize')) {
    type = 'Tech Debt';
  }

  // Detect Priority
  if (text.includes('critical') || text.includes('urgent') || text.includes('asap') || text.includes('production down') || text.includes('crash')) {
    priority = 'Critical';
  } else if (text.includes('high') || text.includes('important') || text.includes('soon')) {
    priority = 'High';
  } else if (text.includes('low') || text.includes('minor') || text.includes('whenever')) {
    priority = 'Low';
  }

  return { priority, type };
};
