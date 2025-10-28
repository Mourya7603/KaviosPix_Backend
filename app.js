require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');

const connectDB = require('./config/database');
require('./config/passport');

// Route imports
const authRoutes = require('./routes/auth');
const albumRoutes = require('./routes/albums');
const imageRoutes = require('./routes/images');
const trashRoutes = require('./routes/trash');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Passport middleware
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/albums', imageRoutes);
app.use('/api/trash', trashRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'KaviosPix API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KaviosPix API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      albums: '/api/albums',
      trash: '/api/trash'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// 404 handler - FIXED: Remove the '*' parameter
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    path: req.path
  });
});

const PORT = process.env.PORT || 3000;

// Export for Vercel serverless
module.exports = app;

// Only listen if not in Vercel environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`KaviosPix server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}