const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    businessName: {
      type: String,
      trim: true,
      default: ''
    },
    services: {
      type: [String],
      default: ['Electrician'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A provider must select at least one service category'
      }
    },
    city: {
      type: String,
      required: [true, 'City is required for service matching'],
      trim: true,
      default: 'Downtown'
    },
    pincode: {
      type: String,
      required: [true, 'Pincode or ZIP is required for service matching'],
      trim: true,
      default: '94103'
    },
    serviceArea: {
      type: String,
      trim: true,
      default: 'City Center & Surrounding Metro'
    },
    experienceYears: {
      type: Number,
      default: 3,
      min: [0, 'Experience cannot be negative']
    },
    hourlyRate: {
      type: Number,
      default: 45,
      min: [0, 'Hourly rate cannot be negative']
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 1,
      max: 5
    },
    reviewsCount: {
      type: Number,
      default: 18
    },
    completedJobs: {
      type: Number,
      default: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    bio: {
      type: String,
      trim: true,
      default: 'Licensed and insured certified professional providing prompt, reliable home services.'
    }
  },
  {
    timestamps: true
  }
);

// Text/compound index for easy matching on category and location
providerSchema.index({ city: 1, pincode: 1 });
providerSchema.index({ services: 1 });

module.exports = mongoose.model('Provider', providerSchema);
