const express = require('express');
const router = express.Router();
const Provider = require('../models/Provider');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/providers
 * @desc    Get/search providers by service category and location (city/pincode)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, city, pincode, availableOnly = 'true' } = req.query;

    const query = {};

    // Filter by availability
    if (availableOnly === 'true') {
      query.isAvailable = true;
    }

    // Category matching (case-insensitive regex in services array)
    if (category) {
      query.services = { $regex: new RegExp(category.trim(), 'i') };
    }

    // Location matching - simple city and/or pincode match
    if (city) {
      query.city = { $regex: new RegExp(city.trim(), 'i') };
    }

    if (pincode) {
      query.pincode = { $regex: new RegExp(`^${pincode.trim()}`, 'i') };
    }

    const providers = await Provider.find(query)
      .populate('user', 'name email phone avatar')
      .sort({ rating: -1, completedJobs: -1 });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    console.error('[Get Providers Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving providers',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/providers/profile/me
 * @desc    Get logged in provider's own profile
 * @access  Private (Provider only)
 */
router.get('/profile/me', protect, authorize('provider'), async (req, res) => {
  try {
    let provider = await Provider.findOne({ user: req.user._id }).populate(
      'user',
      'name email phone avatar'
    );

    if (!provider) {
      // Auto-create default provider profile if missing
      provider = await Provider.create({
        user: req.user._id,
        businessName: `${req.user.name}'s Services`
      });
      await provider.populate('user', 'name email phone avatar');
    }

    return res.status(200).json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('[Get Provider Profile Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving provider profile',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/providers/profile
 * @desc    Update logged in provider's profile, services, location, and availability
 * @access  Private (Provider only)
 */
router.put('/profile', protect, authorize('provider'), async (req, res) => {
  try {
    const {
      businessName,
      services,
      city,
      pincode,
      serviceArea,
      experienceYears,
      hourlyRate,
      isAvailable,
      bio
    } = req.body;

    let provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      provider = new Provider({ user: req.user._id });
    }

    if (businessName !== undefined) provider.businessName = businessName.trim();
    if (services !== undefined) {
      if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one service category is required'
        });
      }
      provider.services = services;
    }
    if (city !== undefined) provider.city = city.trim();
    if (pincode !== undefined) provider.pincode = pincode.trim();
    if (serviceArea !== undefined) provider.serviceArea = serviceArea.trim();
    if (experienceYears !== undefined) provider.experienceYears = Number(experienceYears);
    if (hourlyRate !== undefined) provider.hourlyRate = Number(hourlyRate);
    if (isAvailable !== undefined) provider.isAvailable = Boolean(isAvailable);
    if (bio !== undefined) provider.bio = bio.trim();

    await provider.save();

    await provider.populate('user', 'name email phone avatar');

    return res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully',
      data: provider
    });
  } catch (error) {
    console.error('[Update Provider Profile Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating provider profile',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/providers/:id
 * @desc    Get single provider by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).populate(
      'user',
      'name email phone avatar'
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('[Get Single Provider Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving provider details',
      error: error.message
    });
  }
});

module.exports = router;
