const Organization = require('../modules/organization/organization.model');

const checkPlanAccess = (requiredPlan) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.orgId) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }

      const org = await Organization.findById(req.user.orgId);
      
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // If required plan is PRO, but user has FREE, deny access
      if (requiredPlan === 'PRO' && org.subscriptionPlan === 'FREE') {
        return res.status(403).json({ 
          success: false, 
          message: 'This feature requires a PRO subscription. Please upgrade your plan.' 
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkPlanAccess };
