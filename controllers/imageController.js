const Image = require('../models/Image');
const Album = require('../models/Album');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (make sure you have these in your .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload Image to Cloudinary
// Upload Image to Cloudinary - FIXED VERSION
const uploadImage = async (req, res) => {
  try {
    console.log('Upload request received:', {
      albumId: req.params.albumId,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file'
    });

    const { albumId } = req.params;
    const { tags, person, isFavorite } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const album = await Album.findOne({ albumId });
    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    // Check if user has access to upload to this album
    const hasAccess = album.ownerId === req.user.userId || 
                     album.sharedWith.some(share => share.email === req.user.email);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload to this album'
      });
    }

    // Upload to Cloudinary - FIXED VERSION
    console.log('Uploading to Cloudinary...');

    // Convert buffer to base64 for more reliable upload
    const imageBuffer = req.file.buffer;
    const imageBase64 = imageBuffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${imageBase64}`;

    console.log('File details:', {
      size: imageBuffer.length,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });

    // Use upload instead of upload_stream for better reliability
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'image',
      folder: `kaviospix/${albumId}`,
      quality: 'auto',
      format: 'jpg',
      transformation: [
        { width: 1200, height: 800, crop: 'limit' }
      ]
    });

    console.log('Cloudinary upload successful:', {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      size: result.bytes
    });

    // Generate thumbnail URL separately
    const thumbnailUrl = cloudinary.url(result.public_id, {
      width: 400,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      format: 'jpg'
    });

    // Parse tags if they're sent as string
    let tagsArray = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }

    // Parse person if sent
    let personArray = [];
    if (person) {
      if (Array.isArray(person)) {
        personArray = person;
      } else if (typeof person === 'string') {
        personArray = [person.trim()];
      }
    }

    // Create image record in database
    const image = await Image.create({
      imageId: uuidv4(),
      albumId,
      name: req.file.originalname,
      originalName: req.file.originalname,
      url: result.secure_url,
      thumbnailUrl: thumbnailUrl,
      tags: tagsArray,
      person: personArray,
      isFavorite: isFavorite === 'true' || isFavorite === true,
      size: result.bytes || req.file.size, // Use Cloudinary's byte count if available
      uploadedBy: req.user.userId,
      metadata: {
        format: result.format,
        width: result.width,
        height: result.height,
        public_id: result.public_id,
        cloudinary_bytes: result.bytes
      }
    });

    console.log('Image created successfully in database:', image.imageId);

    res.status(201).json({
      success: true,
      image: {
        imageId: image.imageId,
        name: image.name,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        tags: image.tags,
        person: image.person,
        isFavorite: image.isFavorite,
        size: image.size,
        uploadedAt: image.uploadedAt,
        metadata: image.metadata
      }
    });

  } catch (error) {
    console.error('Upload error details:', error);
    
    // More specific error handling
    if (error.message.includes('File size too large')) {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    
    if (error.message.includes('Invalid image file')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image file format. Supported formats: JPEG, PNG, GIF, WebP.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Toggle Favorite
const toggleFavorite = async (req, res) => {
  try {
    const { albumId, imageId } = req.params;
    const { isFavorite } = req.body;

    const image = await Image.findOne({ imageId, albumId });
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    image.isFavorite = isFavorite;
    await image.save();

    res.json({
      success: true,
      image: {
        imageId: image.imageId,
        isFavorite: image.isFavorite
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status'
    });
  }
};

// Add Comment
const addComment = async (req, res) => {
  try {
    const { albumId, imageId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }

    const image = await Image.findOne({ imageId, albumId });
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const newComment = {
      commentId: uuidv4(),
      userId: req.user.userId,
      userEmail: req.user.email,
      comment: comment.trim(),
      createdAt: new Date()
    };

    image.comments.push(newComment);
    await image.save();

    res.status(201).json({
      success: true,
      comment: newComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

// Delete Image (also delete from Cloudinary)
const deleteImage = async (req, res) => {
  try {
    const { albumId, imageId } = req.params;

    const image = await Image.findOne({ imageId, albumId });
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Check if user owns the album or has edit access
    const album = await Album.findOne({ albumId });
    const canDelete = album.ownerId === req.user.userId;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only album owner can delete images.'
      });
    }

    // Soft delete - move to trash
    image.isDeleted = true;
    image.deletedAt = new Date();
    image.originalAlbumId = image.albumId;
    image.originalAlbumName = album.name;
    // Keep albumId as is for reference, but it will be filtered out in queries

    await image.save();

    res.json({
      success: true,
      message: 'Image moved to trash'
    });
  } catch (error) {
    console.error('Failed to delete image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
};

// Get Images in Album
const getImages = async (req, res) => {
  try {
    const { albumId } = req.params;
    const { tags, favorites } = req.query;

    let query = { albumId };

    if (favorites === 'true') {
      query.isFavorite = true;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const images = await Image.find(query).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      images: images.map(image => ({
        imageId: image.imageId,
        name: image.name,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        tags: image.tags,
        person: image.person,
        isFavorite: image.isFavorite,
        comments: image.comments,
        size: image.size,
        uploadedAt: image.uploadedAt,
        metadata: image.metadata
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images'
    });
  }
};

// Get Favorite Images
const getFavoriteImages = async (req, res) => {
  try {
    const { albumId } = req.params;

    const images = await Image.find({ 
      albumId, 
      isFavorite: true 
    }).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      images: images.map(image => ({
        imageId: image.imageId,
        name: image.name,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        tags: image.tags,
        person: image.person,
        isFavorite: image.isFavorite,
        size: image.size,
        uploadedAt: image.uploadedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite images'
    });
  }
};

module.exports = {
  uploadImage,
  toggleFavorite,
  addComment,
  deleteImage,
  getImages,
  getFavoriteImages
};