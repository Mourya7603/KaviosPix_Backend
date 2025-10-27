const Album = require('../models/Album');
const Image = require('../models/Image');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// Create Album
const createAlbum = async (req, res) => {
  try {
    const { name, description } = req.body;

    const album = await Album.create({
      albumId: uuidv4(),
      name,
      description,
      ownerId: req.user.userId
    });

    res.status(201).json({
      success: true,
      album: {
        albumId: album.albumId,
        name: album.name,
        description: album.description,
        ownerId: album.ownerId,
        sharedWith: album.sharedWith,
        createdAt: album.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create album'
    });
  }
};

// Update Album
const updateAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const { name, description } = req.body;

    const album = await Album.findOne({ albumId, ownerId: req.user.userId });
    
    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found or access denied'
      });
    }

    if (name) album.name = name;
    if (description !== undefined) album.description = description;

    await album.save();

    res.json({
      success: true,
      album: {
        albumId: album.albumId,
        name: album.name,
        description: album.description,
        ownerId: album.ownerId,
        sharedWith: album.sharedWith,
        updatedAt: album.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update album'
    });
  }
};

// Share Album
const shareAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        message: 'Emails array is required'
      });
    }

    const album = await Album.findOne({ albumId, ownerId: req.user.userId });
    
    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    // Verify users exist
    const users = await User.find({ email: { $in: emails } });
    const existingEmails = users.map(user => user.email);
    const nonExistingEmails = emails.filter(email => !existingEmails.includes(email));

    if (nonExistingEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Users not found: ${nonExistingEmails.join(', ')}`
      });
    }

    // Add to shared list if not already there and not owner
    emails.forEach(email => {
      if (email !== req.user.email && 
          !album.sharedWith.some(share => share.email === email)) {
        album.sharedWith.push({ email, accessLevel: 'view' });
      }
    });

    await album.save();

    res.json({
      success: true,
      message: 'Album shared successfully',
      sharedWith: album.sharedWith
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to share album'
    });
  }
};

// Delete Album
const deleteAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;

    const album = await Album.findOne({ albumId, ownerId: req.user.userId });
    
    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found or access denied'
      });
    }

    // Soft delete the album
    album.isDeleted = true;
    album.deletedAt = new Date();
    await album.save();

    // Soft delete all images in the album
    await Image.updateMany(
      { albumId },
      { 
        isDeleted: true,
        deletedAt: new Date(),
        originalAlbumId: albumId,
        originalAlbumName: album.name
      }
    );

    res.json({
      success: true,
      message: 'Album and all associated images moved to trash'
    });
  } catch (error) {
    console.error('Failed to delete album:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete album'
    });
  }
};

// Get All Albums
const getAlbums = async (req, res) => {
  try {
    const albums = await Album.find({
      $or: [
        { ownerId: req.user.userId },
        { 'sharedWith.email': req.user.email }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      albums: albums.map(album => ({
        albumId: album.albumId,
        name: album.name,
        description: album.description,
        ownerId: album.ownerId,
        sharedWith: album.sharedWith,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch albums'
    });
  }
};

module.exports = {
  createAlbum,
  updateAlbum,
  shareAlbum,
  deleteAlbum,
  getAlbums
};