const User = require('./user.model');
const Organization = require('../organization/organization.model');
const socket = require('../../config/socket');
const { sendInviteEmail } = require('../email/email.service');

// @desc    Invite a new user as MEMBER
// @route   POST /api/users/invite
// @access  Private (ORG_ADMIN only)
exports.inviteUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    // Check if user already exists across the platform
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Create the member
    const user = await User.create({
      name,
      email,
      password, // Mongoose pre-save hook handles hashing
      role: 'MEMBER',
      orgId: req.user.orgId,
    });

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('USER_INVITED', userData);
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    // Fetch org details for the email
    const org = await Organization.findById(req.user.orgId);
    
    // Send Realistic Email Notification
    let previewUrl = null;
    if (org) {
      const emailResult = await sendInviteEmail(email, password, req.user.name, org.name);
      if (emailResult && emailResult.previewUrl) {
        previewUrl = emailResult.previewUrl;
      }
    }

    res.status(201).json({
      success: true,
      data: userData,
      previewUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users in the organization
// @route   GET /api/users
// @access  Private (All org members)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ orgId: req.user.orgId }).select('-password');
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user's role
// @route   PATCH /api/users/:id/role
// @access  Private (ORG_ADMIN only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;

    if (!['ORG_ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: User is not in your organization' });
    }

    // Prevent demoting the last ORG_ADMIN
    if (targetUser.role === 'ORG_ADMIN' && role === 'MEMBER') {
      const adminCount = await User.countDocuments({ orgId: req.user.orgId, role: 'ORG_ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the last organization admin' });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('USER_UPDATED', targetUser);
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(200).json({ success: true, data: targetUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a user from the organization
// @route   DELETE /api/users/:id
// @access  Private (ORG_ADMIN only)
exports.removeUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot remove yourself' });
    }

    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: User is not in your organization' });
    }

    // Prevent removing the last ORG_ADMIN
    if (targetUser.role === 'ORG_ADMIN') {
      const adminCount = await User.countDocuments({ orgId: req.user.orgId, role: 'ORG_ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot remove the last organization admin' });
      }
    }

    await targetUser.deleteOne();

    // Broadcast event
    try {
      socket.getIo().to(req.user.orgId.toString()).emit('USER_REMOVED', targetUserId);
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(200).json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    next(error);
  }
};
