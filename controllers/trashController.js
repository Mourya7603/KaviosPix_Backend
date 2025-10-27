const Image = require('../models/Image');
const Album = require('../models/Album');
const cloudinary = require('cloudinary').v2;

// Get all deleted items
const getTrashItems = async (req, res) => {
  try {
    const deletedImages = await Image.find({
      isDeleted: true,
      $or: [
        { uploadedBy: req.user.userId }, // User's own deleted images
        { originalAlbumId: { $in: await getUsersAlbumIds(req.user.userId) } } // Images from user's albums
      ]
    }).sort({ deletedAt: -1 });

    const deletedAlbums = await Album.find({
      isDeleted: true,
      ownerId: req.user.userId
    }).sort({ deletedAt: -1 });

    const items = [
      ...deletedImages.map(image => ({
        id: image.imageId,
        type: 'image',
        name: image.name,
        thumbnailUrl: image.thumbnailUrl,
        size: image.size,
        deletedAt: image.deletedAt,
        originalAlbum: image.originalAlbumName,
        originalAlbumId: image.originalAlbumId,
        tags: image.tags,
        isFavorite: image.isFavorite,
        metadata: image.metadata
      })),
      ...deletedAlbums.map(album => ({
        id: album.albumId,
        type: 'album',
        name: album.name,
        size: 0, // You might want to calculate total album size
        deletedAt: album.deletedAt,
        itemCount: 0 // You might want to count images in album
      }))
    ];

    res.json({
      success: true,
      items: items.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
    });
  } catch (error) {
    console.error('Failed to load trash items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load trash items'
    });
  }
};

// Helper function to get user's album IDs
const getUsersAlbumIds = async (userId) => {
  const albums = await Album.find({
    $or: [
      { ownerId: userId },
      { 'sharedWith.email': userId } // Assuming userId is email or you need to adjust
    ]
  });
  return albums.map(album => album.albumId);
};

// Restore image
const restoreImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await Image.findOne({ 
      imageId, 
      isDeleted: true 
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Deleted image not found'
      });
    }

    // Check if user has permission to restore
    const canRestore = image.uploadedBy === req.user.userId || 
                      await userHasAlbumAccess(req.user.userId, image.originalAlbumId);

    if (!canRestore) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Restore the image
    image.isDeleted = false;
    image.albumId = image.originalAlbumId;
    image.deletedAt = null;
    image.originalAlbumId = undefined;
    image.originalAlbumName = undefined;

    await image.save();

    res.json({
      success: true,
      message: 'Image restored successfully'
    });
  } catch (error) {
    console.error('Restore image failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore image'
    });
  }
};

// Restore album
const restoreAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;

    const album = await Album.findOne({ 
      albumId, 
      isDeleted: true,
      ownerId: req.user.userId 
    });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Deleted album not found'
      });
    }

    // Restore the album
    album.isDeleted = false;
    album.deletedAt = null;
    await album.save();

    // Restore all images in the album
    await Image.updateMany(
      { 
        originalAlbumId: albumId,
        isDeleted: true 
      },
      { 
        isDeleted: false,
        albumId: albumId,
        deletedAt: null,
        originalAlbumId: undefined,
        originalAlbumName: undefined
      }
    );

    res.json({
      success: true,
      message: 'Album and all images restored successfully'
    });
  } catch (error) {
    console.error('Restore album failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore album'
    });
  }
};

// Permanently delete image
const permanentDeleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await Image.findOne({ 
      imageId, 
      isDeleted: true 
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Deleted image not found'
      });
    }

    // Check if user has permission to delete
    const canDelete = image.uploadedBy === req.user.userId || 
                     await userHasAlbumAccess(req.user.userId, image.originalAlbumId);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete from Cloudinary
    if (image.metadata && image.metadata.public_id) {
      try {
        await cloudinary.uploader.destroy(image.metadata.public_id);
        console.log('Image permanently deleted from Cloudinary:', image.metadata.public_id);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    // Delete from database
    await Image.deleteOne({ imageId });

    res.json({
      success: true,
      message: 'Image permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete image failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete image'
    });
  }
};

// Permanently delete album
const permanentDeleteAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;

    const album = await Album.findOne({ 
      albumId, 
      isDeleted: true,
      ownerId: req.user.userId 
    });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Deleted album not found'
      });
    }

    // Get all images in the album to delete from Cloudinary
    const images = await Image.find({ 
      originalAlbumId: albumId,
      isDeleted: true 
    });

    // Delete all images from Cloudinary and database
    for (const image of images) {
      if (image.metadata && image.metadata.public_id) {
        try {
          await cloudinary.uploader.destroy(image.metadata.public_id);
        } catch (cloudinaryError) {
          console.error('Error deleting image from Cloudinary:', cloudinaryError);
        }
      }
      await Image.deleteOne({ imageId: image.imageId });
    }

    // Delete the album
    await Album.deleteOne({ albumId });

    res.json({
      success: true,
      message: 'Album and all images permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete album failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete album'
    });
  }
};

// Empty trash
const emptyTrash = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's deleted images
    const deletedImages = await Image.find({
      isDeleted: true,
      $or: [
        { uploadedBy: userId },
        { originalAlbumId: { $in: await getUsersAlbumIds(userId) } }
      ]
    });

    // Delete images from Cloudinary and database
    for (const image of deletedImages) {
      if (image.metadata && image.metadata.public_id) {
        try {
          await cloudinary.uploader.destroy(image.metadata.public_id);
        } catch (cloudinaryError) {
          console.error('Error deleting image from Cloudinary:', cloudinaryError);
        }
      }
      await Image.deleteOne({ imageId: image.imageId });
    }

    // Get user's deleted albums
    const deletedAlbums = await Album.find({
      isDeleted: true,
      ownerId: userId
    });

    // Delete albums
    for (const album of deletedAlbums) {
      await Album.deleteOne({ albumId: album.albumId });
    }

    res.json({
      success: true,
      message: 'Trash emptied successfully',
      deletedImages: deletedImages.length,
      deletedAlbums: deletedAlbums.length
    });
  } catch (error) {
    console.error('Empty trash failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to empty trash'
    });
  }
};

// Helper function to check album access
const userHasAlbumAccess = async (userId, albumId) => {
  const album = await Album.findOne({ albumId });
  if (!album) return false;
  
  return album.ownerId === userId || 
         album.sharedWith.some(share => share.email === userId);
};

module.exports = {
  getTrashItems,
  restoreImage,
  restoreAlbum,
  permanentDeleteImage,
  permanentDeleteAlbum,
  emptyTrash
};