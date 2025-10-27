const express = require('express');
const {
  getTrashItems,
  restoreImage,
  restoreAlbum,
  permanentDeleteImage,
  permanentDeleteAlbum,
  emptyTrash
} = require('../controllers/trashController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Trash routes
router.get('/', getTrashItems);
router.post('/albums/:albumId/restore', restoreAlbum);
router.post('/images/:imageId/restore', restoreImage);
router.delete('/albums/:albumId', permanentDeleteAlbum);
router.delete('/images/:imageId', permanentDeleteImage);
router.delete('/empty', emptyTrash);

module.exports = router;