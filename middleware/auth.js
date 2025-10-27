const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ userId: decoded.userId });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

const authorizeAlbumAccess = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const Album = require('../models/Album');
    
    const album = await Album.findOne({ albumId });
    
    if (!album) {
      return res.status(404).json({ 
        success: false, 
        message: 'Album not found' 
      });
    }

    const hasAccess = album.ownerId === req.user.userId || 
                     album.sharedWith.some(share => share.email === req.user.email);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this album' 
      });
    }

    req.album = album;
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = { authenticate, authorizeAlbumAccess };