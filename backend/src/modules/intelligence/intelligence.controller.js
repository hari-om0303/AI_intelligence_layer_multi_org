const { detectRisks, calculateEfficiency, analyzeTeamPerformance } = require('./intelligence.service');

exports.getRisks = async (req, res, next) => {
  try {
    const risks = await detectRisks(req.user.orgId);
    
    if (res.sendCached) {
      res.sendCached({ success: true, data: risks }, 300); // 5 mins
    } else {
      res.status(200).json({ success: true, data: risks });
    }
  } catch (error) {
    next(error);
  }
};

exports.getEfficiency = async (req, res, next) => {
  try {
    const efficiency = await calculateEfficiency(req.user.orgId);
    
    if (res.sendCached) {
      res.sendCached({ success: true, data: efficiency }, 300); // 5 mins
    } else {
      res.status(200).json({ success: true, data: efficiency });
    }
  } catch (error) {
    next(error);
  }
};

exports.getTeamPerformance = async (req, res, next) => {
  try {
    const performance = await analyzeTeamPerformance(req.user.orgId);
    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};
