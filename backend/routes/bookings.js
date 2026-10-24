const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking request
 * @access  Private (Customer only)
 */
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const {
      serviceCategory,
      address,
      city = 'Downtown',
      pincode = '',
      preferredDate,
      preferredTimeSlot,
      issueDescription = '',
      price = 85,
      isUrgent = false,
      providerId = null
    } = req.body;

    // Validate required fields
    if (!serviceCategory || !address || !preferredDate || !preferredTimeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Service category, address, preferred date, and time slot are required'
      });
    }

    // Create booking
    const booking = await Booking.create({
      customer: req.user._id,
      provider: providerId || null,
      serviceCategory: serviceCategory.trim(),
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      preferredDate,
      preferredTimeSlot,
      issueDescription: issueDescription.trim(),
      price: Number(price) || 85,
      isUrgent: Boolean(isUrgent),
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          changedBy: req.user._id,
          note: 'Booking requested by customer'
        }
      ]
    });

    await booking.populate('customer', 'name email phone');
    if (booking.provider) {
      await booking.populate('provider', 'name email phone');
    }

    return res.status(201).json({
      success: true,
      message: 'Booking request created successfully',
      data: booking
    });
  } catch (error) {
    console.error('[Create Booking Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating booking',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/bookings/my
 * @desc    Get all bookings for the logged-in customer or provider
 * @access  Private
 */
router.get('/my', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'provider') {
      query.provider = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone avatar')
      .populate('provider', 'name email phone avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('[Get My Bookings Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving bookings',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/bookings/available
 * @desc    List relevant available pending requests for an authenticated provider
 * @access  Private (Provider only)
 */
router.get('/available', protect, authorize('provider'), async (req, res) => {
  try {
    // Retrieve provider's configured services and location to offer relevant matching
    const providerProfile = await Provider.findOne({ user: req.user._id });

    const query = {
      status: 'pending',
      provider: null
    };

    // If provider has specific registered services, prioritize matching those
    if (providerProfile && providerProfile.services && providerProfile.services.length > 0) {
      query.serviceCategory = { $in: providerProfile.services };
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone city')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('[Get Available Bookings Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving available bookings',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/accept
 * @desc    Allow a provider to accept a pending booking atomically
 * @access  Private (Provider only)
 */
router.put('/:id/accept', protect, authorize('provider'), async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Atomic update to ensure no two providers accept the same booking simultaneously
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: 'pending',
        provider: null
      },
      {
        $set: {
          status: 'accepted',
          provider: req.user._id
        },
        $push: {
          statusHistory: {
            status: 'accepted',
            changedBy: req.user._id,
            note: 'Accepted by provider'
          }
        }
      },
      { new: true }
    )
      .populate('customer', 'name email phone address')
      .populate('provider', 'name email phone');

    if (!updatedBooking) {
      return res.status(409).json({
        success: false,
        message: 'This booking is no longer available or has already been accepted by another provider'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('[Accept Booking Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error accepting booking',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/status
 * @desc    Allow assigned provider to mark booking as in_progress or completed
 * @access  Private (Provider only)
 */
router.put('/:id/status', protect, authorize('provider'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowedStatuses = ['in_progress', 'completed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be either 'in_progress' or 'completed'`
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure the calling provider is the one assigned to this booking
    if (!booking.provider || booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update status for a booking assigned to another provider'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status of a cancelled booking'
      });
    }

    // Update status and append to history
    booking.status = status;
    booking.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || `Status updated to ${status} by provider`
    });

    await booking.save();

    // If completed, increment provider's completedJobs counter
    if (status === 'completed') {
      await Provider.findOneAndUpdate(
        { user: req.user._id },
        { $inc: { completedJobs: 1 } }
      );
    }

    await booking.populate('customer', 'name email phone');
    await booking.populate('provider', 'name email phone');

    return res.status(200).json({
      success: true,
      message: `Booking marked as ${status}`,
      data: booking
    });
  } catch (error) {
    console.error('[Update Booking Status Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating booking status',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Allow customer to cancel their pending booking
 * @access  Private (Customer only)
 */
router.put('/:id/cancel', protect, authorize('customer'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check ownership
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel another customer\'s booking'
      });
    }

    // Only allow cancellation of pending bookings
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending bookings can be cancelled. Current status is '${booking.status}'`
      });
    }

    booking.status = 'cancelled';
    booking.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user._id,
      note: req.body.reason || 'Cancelled by customer'
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('[Cancel Booking Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling booking',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking details by ID
 * @access  Private (Customer owner or assigned Provider)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization: must be the booking customer or assigned provider
    const isCustomer = booking.customer._id.toString() === req.user._id.toString();
    const isProvider = booking.provider && booking.provider._id.toString() === req.user._id.toString();

    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this booking'
      });
    }

    return res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('[Get Booking Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving booking',
      error: error.message
    });
  }
});

module.exports = router;
