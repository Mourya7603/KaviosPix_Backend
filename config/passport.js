const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google Profile Received:', profile.emails[0].value);
    
    // Extract user information with fallbacks
    const email = profile.emails[0].value;
    const googleId = profile.id;
    
    // Generate a name from available profile data
    let name = profile.displayName;
    if (!name && profile.name) {
      name = `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim();
    }
    if (!name) {
      name = email.split('@')[0]; // Use email username as fallback
    }
    
    const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;

    // Check if user already exists by googleId or email
    let user = await User.findOne({ 
      $or: [
        { googleId: googleId },
        { email: email }
      ]
    });
    
    if (user) {
      console.log('Existing user found:', user.email);
      // Update user info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      return done(null, user);
    }

    // Create new user
    user = await User.create({
      userId: uuidv4(),
      email: email,
      name: name,
      avatar: avatar,
      googleId: googleId
    });

    console.log('New user created:', user.email);
    return done(null, user);
  } catch (error) {
    console.error('Google OAuth Error:', error.message);
    return done(error, null);
  }
}));

module.exports = passport;