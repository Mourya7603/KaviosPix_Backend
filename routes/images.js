const express = require('express');
const {
  uploadImage,
  toggleFavorite,
  addComment,
  deleteImage,
  getImages,
  getFavoriteImages
} = require('../controllers/imageController');
const { authenticate, authorizeAlbumAccess } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Image routes with album access authorization
router.post('/:albumId/images', 
  authorizeAlbumAccess, 
  upload.single('file'), 
  handleUploadError, 
  uploadImage
);

router.get('/:albumId/images', authorizeAlbumAccess, getImages);
router.get('/:albumId/images/favorites', authorizeAlbumAccess, getFavoriteImages);
router.put('/:albumId/images/:imageId/favorite', authorizeAlbumAccess, toggleFavorite);
router.post('/:albumId/images/:imageId/comments', authorizeAlbumAccess, addComment);
router.delete('/:albumId/images/:imageId', authorizeAlbumAccess, deleteImage);

module.exports = router;