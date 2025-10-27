const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const imageSchema = new mongoose.Schema({
  imageId: {
    type: String,
    required: true,
    unique: true
  },
  albumId: {
    type: String,
    required: true,
    ref: 'Album'
  },
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  person: [{
    type: String,
    trim: true
  }],
  isFavorite: {
    type: Boolean,
    default: false
  },
  comments: [commentSchema],
  size: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    format: String,
    width: Number,
    height: Number,
    public_id: String,
    cloudinary_bytes: Number
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  originalAlbumId: {
    type: String
  },
  originalAlbumName: {
    type: String
  }
}, {
  timestamps: true
});

imageSchema.index({ albumId: 1 });
imageSchema.index({ tags: 1 });
imageSchema.index({ isFavorite: 1 });
imageSchema.index({ uploadedAt: -1 });
imageSchema.index({ isDeleted: 1 });
imageSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Image', imageSchema);