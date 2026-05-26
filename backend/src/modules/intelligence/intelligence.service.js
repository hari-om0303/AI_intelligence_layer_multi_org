const Project = require('../project/project.model');
const AuditLog = require('../audit/audit.model');

/**
 * Calculates the health score of a project
 * @param {Object} project - The project document
 * @returns {Object} { healthScore, healthStatus }
 */
exports.calculateHealth = (project) => {
  let score = 100;

  const lastActivity = project.lastActivityAt ? new Date(project.lastActivityAt) : new Date(project.createdAt);
  const daysInactive = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

  if (daysInactive > 3) score -= 30;
  if (daysInactive > 7) score -= 50;

  if (project.status === "TODO") score -= 20;
  if (project.activityCount < 2) score -= 20;

  const healthScore = Math.max(score, 0);
  
  let healthStatus = "Healthy";
  if (healthScore < 50) healthStatus = "Critical";
  else if (healthScore < 80) healthStatus = "Warning";

  return { healthScore, healthStatus };
};

/**
 * Gets a recommendation for a project
 * @param {Object} project - The project document
 * @param {Number} healthScore - The computed health score
 * @returns {String} Recommendation text
 */
exports.getRecommendation = (project, healthScore) => {
  if (project.status === "TODO")
    return "Start working on this project";

  if (project.activityCount < 2)
    return "Increase activity and updates";

  if (healthScore < 50)
    return "Immediate attention required";

  return "Project is on track";
};

/**
 * Detects risks across all active projects in an organization
 * @param {String} orgId 
 * @returns {Array} List of risks
 */
exports.detectRisks = async (orgId) => {
  const projects = await Project.find({ orgId, isActive: true }).lean();
  const risks = [];

  projects.forEach(project => {
    const reasons = [];
    let severity = 'LOW';
    
    const lastActivity = project.lastActivityAt ? new Date(project.lastActivityAt) : new Date(project.createdAt);
    const daysInactive = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysInactive > 3) {
      reasons.push("No updates recently");
      severity = daysInactive > 7 ? 'CRITICAL' : 'HIGH';
    }

    if (project.status === "TODO") {
      reasons.push("Still in TODO stage");
      if (severity === 'LOW') severity = 'MEDIUM';
    }

    if (project.activityCount < 2) {
      reasons.push("Low engagement");
    }

    if (reasons.length > 0) {
      let message = `Project requires attention`;
      if (daysInactive > 3) message = `Project inactive for ${Math.floor(daysInactive)} days`;

      risks.push({
        projectId: project._id,
        title: project.title,
        severity,
        message,
        reasons
      });
    }
  });

  return risks;
};

/**
 * Calculates organization efficiency score
 * @param {String} orgId 
 * @returns {Object} { efficiencyScore, status }
 */
exports.calculateEfficiency = async (orgId) => {
  const projects = await Project.find({ orgId, isActive: true }).lean();
  
  if (projects.length === 0) return { efficiencyScore: 0, status: "N/A" };

  let totalHealth = 0;
  let doneCount = 0;

  projects.forEach(project => {
    const { healthScore } = exports.calculateHealth(project);
    totalHealth += healthScore;
    if (project.status === "DONE") doneCount++;
  });

  const avgHealth = totalHealth / projects.length;
  const donePercentage = (doneCount / projects.length) * 100;

  // Simple heuristic: 60% weight to health, 40% to completion rate
  const efficiencyScore = Math.floor((avgHealth * 0.6) + (donePercentage * 0.4));
  
  let status = "Good";
  if (efficiencyScore < 50) status = "Poor";
  else if (efficiencyScore < 75) status = "Fair";
  else if (efficiencyScore >= 90) status = "Excellent";

  return { efficiencyScore, status };
};

/**
 * Analyzes team performance using Audit Logs
 * @param {String} orgId 
 * @returns {Object} Team performance metrics
 */
exports.analyzeTeamPerformance = async (orgId) => {
  const logs = await AuditLog.find({ orgId }).populate('userId', 'name email').lean();
  
  const userActivity = {};
  
  logs.forEach(log => {
    if (!log.userId) return; // System logs or deleted users
    const uid = log.userId._id.toString();
    if (!userActivity[uid]) {
      userActivity[uid] = {
        user: log.userId,
        count: 0
      };
    }
    userActivity[uid].count++;
  });

  const activityArray = Object.values(userActivity).sort((a, b) => b.count - a.count);

  return {
    mostActive: activityArray.length > 0 ? activityArray[0] : null,
    leastActive: activityArray.length > 1 ? activityArray[activityArray.length - 1] : null,
    activityPerUser: activityArray
  };
};
