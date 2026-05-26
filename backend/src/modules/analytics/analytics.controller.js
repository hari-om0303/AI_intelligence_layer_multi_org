const { getDashboardAnalytics, detectAuditAnomalies } = require('./analytics.service');

exports.getAnalytics = async (req, res, next) => {
  try {
    const analytics = await getDashboardAnalytics(req.user.orgId);
    if (res.sendCached) {
      res.sendCached({ success: true, data: analytics }, 300); // cache for 5 minutes
    } else {
      res.status(200).json({ success: true, data: analytics });
    }
  } catch (error) {
    next(error);
  }
};

exports.getAnomalies = async (req, res, next) => {
  try {
    const anomalies = await detectAuditAnomalies(req.user.orgId);
    res.status(200).json({ success: true, data: anomalies });
  } catch (error) {
    next(error);
  }
};
