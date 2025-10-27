const express = require('express');
const {
  createAlbum,
  updateAlbum,
  shareAlbum,
  deleteAlbum,
  getAlbums
} = require('../controllers/albumController');
const { authenticate, authorizeAlbumAccess } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Album routes
router.post('/', createAlbum);
router.get('/', getAlbums);
router.put('/:albumId', authorizeAlbumAccess, updateAlbum);
router.post('/:albumId/share', authorizeAlbumAccess, shareAlbum);
router.delete('/:albumId', authorizeAlbumAccess, deleteAlbum);

module.exports = router;