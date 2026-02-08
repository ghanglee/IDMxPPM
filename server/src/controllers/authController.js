const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, organization } = req.body;

    if (!email || !password || !name?.givenName || !name?.familyName) {
      return res.status(400).json({ message: 'Email, password, givenName, and familyName are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if registration is allowed
    if (!config.allowOpenRegistration) {
      // Only allow if no users exist yet (first admin bootstrap)
      const count = await User.countDocuments();
      if (count > 0) {
        return res.status(403).json({ message: 'Open registration is disabled. Contact an administrator.' });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // First user becomes admin
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'editor';

    const user = new User({
      email,
      passwordHash: password,
      name,
      organization: organization || '',
      role
    });

    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({ token, user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, organization } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (organization !== undefined) updates.organization = organization;

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = newPassword;
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};
