const jwt = require('jsonwebtoken');
const User = require('../user/user.model');
const Organization = require('../organization/organization.model');

const generateToken = (userId, orgId, role) => {
  return jwt.sign({ userId, orgId, role }, process.env.JWT_SECRET || 'supersecretjwtkeyforlocaldev', {
    expiresIn: '30d',
  });
};

// @desc    Register user & organization
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create organization
    // Notice: we generate an ObjectId for the user first to link it
    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId();

    const organization = await Organization.create({
      name: organizationName,
      createdBy: userId,
      subscriptionPlan: 'FREE', // default
    });

    // Create user (ORG_ADMIN)
    const user = await User.create({
      _id: userId,
      name,
      email,
      password,
      role: 'ORG_ADMIN',
      orgId: organization._id,
    });

    const token = generateToken(user._id, user.orgId, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id, user.orgId, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('orgId', 'name subscriptionPlan');
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
