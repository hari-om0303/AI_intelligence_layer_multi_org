const Project = require('../project/project.model');
const AuditLog = require('../audit/audit.model');
const mongoose = require('mongoose');

exports.getDashboardAnalytics = async (orgId) => {
  // Aggregate projects by status
  const projectStats = await Project.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(orgId) } },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: { 
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } 
        },
        inactiveProjects: { 
          $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } 
        }
      }
    }
  ]);

  const stats = projectStats[0] || { totalProjects: 0, activeProjects: 0, inactiveProjects: 0 };

  // Aggregate project growth over the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const projectGrowth = await Project.aggregate([
    { 
      $match: { 
        orgId: new mongoose.Types.ObjectId(orgId),
        createdAt: { $gte: sixMonthsAgo }
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  // Format for frontend (e.g., Recharts)
  const growthData = projectGrowth.map(item => ({
    name: item._id, // e.g., '2023-10'
    projects: item.count
  }));

  return {
    ...stats,
    projectGrowth: growthData
  };
};

exports.detectAuditAnomalies = async (orgId) => {
  const anomalies = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check for unusual spike in deletions
  const recentDeletions = await AuditLog.countDocuments({
    orgId,
    action: 'DELETE_PROJECT',
    createdAt: { $gte: oneDayAgo }
  });

  if (recentDeletions > 5) {
    anomalies.push({
      type: 'HIGH_RISK',
      message: `Detected unusually high number of project deletions (${recentDeletions}) in the last 24 hours.`,
      timestamp: new Date()
    });
  }

  // Check for mass project creation (potential spam)
  const recentCreations = await AuditLog.countDocuments({
    orgId,
    action: 'CREATE_PROJECT',
    createdAt: { $gte: oneDayAgo }
  });

  if (recentCreations > 20) {
    anomalies.push({
      type: 'WARNING',
      message: `Detected a spike in project creations (${recentCreations}) in the last 24 hours.`,
      timestamp: new Date()
    });
  }

  return anomalies;
};
