const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      required: true,
      default: () => 'HE-' + Math.floor(10000 + Math.random() * 90000)
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required']
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    serviceCategory: {
      type: String,
      required: [true, 'Service category is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Service address is required'],
      trim: true
    },
    city: {
      type: String,
      trim: true,
      default: 'Downtown'
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    preferredDate: {
      type: String,
      required: [true, 'Preferred service date is required']
    },
    preferredTimeSlot: {
      type: String,
      required: [true, 'Preferred service time slot is required']
    },
    issueDescription: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      default: 85,
      min: [0, 'Price cannot be negative']
    },
    isUrgent: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid booking status'
      },
      default: 'pending'
    },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
bookingSchema.index({ status: 1, serviceCategory: 1, city: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
