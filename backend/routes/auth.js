const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');
const { protect } = require('../middleware/auth');

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'homeease_super_secret_dev_jwt_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer or service provider
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone, services, city, pincode } = req.body;

    // 1. Validate required inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // 2. Reject administrator self-registration
    const normalizedRole = String(role).toLowerCase().trim();
    if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
      return res.status(400).json({
        success: false,
        message: 'Registration as an administrator is not allowed'
      });
    }

    if (!['customer', 'provider'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only "customer" or "provider" registrations are accepted'
      });
    }

    // 3. Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    // 4. Create user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: normalizedRole,
      phone: phone ? phone.trim() : ''
    });

    // 5. If provider, initialize provider profile
    let providerProfile = null;
    if (normalizedRole === 'provider') {
      providerProfile = await Provider.create({
        user: newUser._id,
        businessName: `${name.trim()}'s Services`,
        services: Array.isArray(services) && services.length > 0 ? services : ['Electrician'],
        city: city ? city.trim() : 'Downtown',
        pincode: pincode ? pincode.trim() : '94103',
        isAvailable: true
      });
    }

    // 6. Generate JWT
    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        providerProfile: providerProfile || undefined
      }
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Explicitly select password for comparison
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if provider profile exists
    let providerProfile = null;
    if (user.role === 'provider') {
      providerProfile = await Provider.findOne({ user: user._id });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        providerProfile: providerProfile || undefined
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user details
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    let providerProfile = null;
    if (req.user.role === 'provider') {
      providerProfile = await Provider.findOne({ user: req.user._id });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        providerProfile: providerProfile || undefined
      }
    });
  } catch (error) {
    console.error('[Auth Me Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile',
      error: error.message
    });
  }
});

module.exports = router;
