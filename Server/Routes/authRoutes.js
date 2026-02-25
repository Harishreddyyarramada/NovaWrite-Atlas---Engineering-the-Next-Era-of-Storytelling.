require('dotenv').config();
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const User = require('../Models/User.js');
const Post = require('../Models/Post.js');
const { verifyFirebaseToken } = require('../Middleware/VerifyToken.js');
const { sendLoginWelcomeDigestEmail } = require('../Services/emailService.js');

const saltrounds = 10;
const LOGIN_MAIL_COOLDOWN_HOURS = Number(process.env.LOGIN_MAIL_COOLDOWN_HOURS || 12);
const LOGIN_MAIL_POST_LIMIT = Number(process.env.LOGIN_MAIL_POST_LIMIT || 5);

const sanitizeUsername = (input) =>
  String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24);

const createUniqueUsername = async (seedName, fallbackEmail) => {
  const emailPrefix = String(fallbackEmail || 'user').split('@')[0];
  let base = sanitizeUsername(seedName) || sanitizeUsername(emailPrefix) || 'user';

  if (base.length < 3) {
    base = `${base}${Math.floor(100 + Math.random() * 900)}`;
  }

  let candidate = base;
  let counter = 1;

  // Prevent duplicate username collisions for social auth signups.
  while (await User.exists({ username: candidate })) {
    candidate = `${base}${counter}`;
    counter += 1;
  }

  return candidate;
};

const maybeSendLoginDigest = async (user) => {
  try {
    const lastSentAt = user.lastWelcomeEmailAt ? new Date(user.lastWelcomeEmailAt).getTime() : 0;
    const minGapMs = LOGIN_MAIL_COOLDOWN_HOURS * 60 * 60 * 1000;
    if (lastSentAt && Date.now() - lastSentAt < minGapMs) {
      return;
    }

    const latestPosts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(Math.max(1, LOGIN_MAIL_POST_LIMIT))
      .select('_id title category createdAt');

    const sent = await sendLoginWelcomeDigestEmail({
      toEmail: user.email,
      username: user.username,
      latestPosts,
      appUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    });

    if (sent) {
      await User.findByIdAndUpdate(user._id, { lastWelcomeEmailAt: new Date() });
    }
  } catch (error) {
    console.error('Login digest email error:', error.message);
  }
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists with the same email or username' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltrounds);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({ msg: 'Registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ msg: 'Error registering user', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide email and password' });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    // Compare passwords
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ msg: 'Password is incorrect' });
    }

    user.lastLoginAt = new Date();
    if (!user.authProvider) {
      user.authProvider = 'local';
    }
    await user.save();

    // Generate JWT token
    const token = jsonwebtoken.sign(
      { email, id: user._id, role: user.role || 'user' },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.TOKEN_EXPRIES_IN || '7d' }
    );

    // Get total users count
    const totalUsers = await User.countDocuments();
    maybeSendLoginDigest(user);

    return res.status(200).json({
      msg: 'Logged in successfully',
      token,
      userId: user._id,
      email: user.email,
      username: user.username,
      total_users: totalUsers,
      profile_URL: user.profile_URL,
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      linkedin: user.linkedin || '',
      role: user.role || 'user',
      themePreference: user.themePreference || 'light',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ msg: 'Error logging in', error: error.message });
  }
});

router.post('/firebase', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const userData = await verifyFirebaseToken(token);

    if (!userData?.email) {
      return res.status(400).json({ msg: 'Email is required from Google account' });
    }

    // Check if user exists, if not create new user
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      const generatedUsername = await createUniqueUsername(userData.name, userData.email);
      user = new User({
        email: userData.email,
        username: generatedUsername,
        password: await bcrypt.hash(Math.random().toString(36), saltrounds),
        profile_URL: userData.picture || null,
        authProvider: 'google',
        firebaseUid: userData.uid,
        emailVerified: Boolean(userData.email_verified),
        lastLoginAt: new Date(),
      });
      await user.save();
    } else {
      user.authProvider = 'google';
      user.firebaseUid = userData.uid || user.firebaseUid;
      user.emailVerified = Boolean(userData.email_verified) || user.emailVerified;
      user.lastLoginAt = new Date();
      if (userData.picture) {
        user.profile_URL = userData.picture;
      }
      await user.save();
    }

    const appToken = jsonwebtoken.sign(
      { email: user.email, id: user._id, role: user.role || 'user' },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.TOKEN_EXPRIES_IN || '7d' }
    );

    const totalUsers = await User.countDocuments();
    maybeSendLoginDigest(user);

    return res.status(200).json({
      msg: 'Logged in with Google successfully',
      token: appToken,
      userId: user._id,
      email: user.email,
      username: user.username,
      total_users: totalUsers,
      profile_URL: user.profile_URL,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      linkedin: user.linkedin || '',
      role: user.role || 'user',
      themePreference: user.themePreference || 'light',
    });
  } catch (err) {
    return res.status(401).json({ msg: err.message || 'Google login failed' });
  }
});

module.exports = router;

