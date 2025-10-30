const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Manual registration
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      userId: uuidv4(),
      name,
      email,
      password,
      emailVerified: false // You can implement email verification later
    });

    // Generate token
    const token = generateToken(user.userId);

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Manual login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.userId);

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Update Google OAuth to handle both manual and Google users
const handleGoogleAuth = async (req, res) => {
  try {
    const token = generateToken(req.user.userId);

    const userData = {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      emailVerified: true
    };

    // For API clients - return JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        token,
        user: userData
      });
    }

    // For browser - redirect to React frontend ROOT PATH with token
    const frontendURL = process.env.FRONTEND_URL || 'https://kavios-pix-frontend.vercel.app';
    
    // REDIRECT TO ROOT PATH (/) instead of /auth/success
    const redirectURL = `${frontendURL}/?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    
    console.log('🔐 OAuth Success - Redirecting to root with token');
    console.log('📍 Redirect URL:', redirectURL);
    res.redirect(redirectURL);

  } catch (error) {
    console.error('Auth error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'https://kavios-pix-frontend.vercel.app';
    const redirectURL = `${frontendURL}/login?error=Authentication+failed`;
    res.redirect(redirectURL);
  }
};
// Keep existing functions...
const getCurrentUser = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        userId: req.user.userId,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        emailVerified: req.user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const testAuth = async (req, res) => {
  try {
    let user = await User.findOne({ email: 'test@kaviospix.com' });
    
    if (!user) {
      user = await User.create({
        userId: uuidv4(),
        email: 'test@kaviospix.com',
        name: 'Test User',
        password: 'password123', // For manual login testing
        googleId: 'test-google-id'
      });
    }

    const token = generateToken(user.userId);

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      },
      message: 'TEST MODE: Use this token for testing'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test authentication failed'
    });
  }
};

module.exports = { 
  handleGoogleAuth, 
  getCurrentUser, 
  testAuth,
  register,
  login
};