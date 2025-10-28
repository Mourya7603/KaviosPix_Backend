const express = require('express');
const passport = require('passport');
const { 
  handleGoogleAuth, 
  getCurrentUser, 
  testAuth,
  register,
  login 
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Manual authentication routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/api/auth/failure',
    session: false 
  }),
  handleGoogleAuth
);

// Auth failure route
router.get('/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google authentication failed'
  });
});

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Test authentication route
router.get('/test', testAuth);

module.exports = router;