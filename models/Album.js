const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  albumId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  ownerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  sharedWith: [{
    email: {
      type: String,
      lowercase: true
    },
    accessLevel: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  coverImage: {
    type: String
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

albumSchema.index({ ownerId: 1 });
albumSchema.index({ 'sharedWith.email': 1 });
albumSchema.index({ isDeleted: 1 });
albumSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Album', albumSchema);