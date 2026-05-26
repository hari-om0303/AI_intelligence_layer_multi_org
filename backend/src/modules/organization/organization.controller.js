const Organization = require('./organization.model');

// @desc    Upgrade organization plan to PRO
// @route   PATCH /api/organizations/upgrade
// @access  Private (ORG_ADMIN only)
exports.upgradePlan = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (org.subscriptionPlan === 'PRO') {
      return res.status(400).json({ success: false, message: 'Organization is already on PRO plan' });
    }

    org.subscriptionPlan = 'PRO';
    await org.save();

    res.status(200).json({
      success: true,
      data: org,
    });
  } catch (error) {
    next(error);
  }
};
