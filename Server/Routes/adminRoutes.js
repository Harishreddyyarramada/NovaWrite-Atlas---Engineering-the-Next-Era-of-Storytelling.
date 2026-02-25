const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Post = require('../Models/Post');
const PostInteraction = require('../Models/PostInteraction');
const authMiddleware = require('../Middleware/authMiddleware');

const router = express.Router();

const ensureAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    req.adminUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ msg: 'Authorization failed', error: error.message });
  }
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password role username profile_URL');
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ msg: 'Invalid admin credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ msg: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { email: user.email, id: user._id, role: 'admin' },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.TOKEN_EXPRIES_IN || '7d' }
    );

    return res.status(200).json({
      msg: 'Admin login successful',
      token,
      role: 'admin',
      username: user.username,
      profile_URL: user.profile_URL || '',
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Admin login failed', error: error.message });
  }
});

router.use(authMiddleware, ensureAdmin);

router.get('/dashboard', async (_req, res) => {
  try {
    const [totalUsers, totalPosts, totalInteractions, posts] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Post.countDocuments(),
      PostInteraction.find().select('likes shareCount comments postId'),
      Post.find().select('_id title views').sort({ views: -1 }).limit(1),
    ]);

    const totals = totalInteractions.reduce(
      (acc, item) => {
        acc.likes += item.likes?.length || 0;
        acc.comments += item.comments?.length || 0;
        acc.shares += item.shareCount || 0;
        return acc;
      },
      { likes: 0, comments: 0, shares: 0 }
    );

    const users = await User.find({ role: { $ne: 'admin' } })
      .select('_id username email createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    const recentPosts = await Post.find()
      .select('_id title email author category createdAt views seoTags')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      stats: {
        totalUsers,
        totalPosts,
        totalLikes: totals.likes,
        totalComments: totals.comments,
        totalShares: totals.shares,
        topPost: posts[0] || null,
      },
      users,
      posts: recentPosts,
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Failed to load admin dashboard', error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('email');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    await User.findByIdAndDelete(id);
    const userPosts = await Post.find({ email: user.email }).select('_id');
    const postIds = userPosts.map((post) => String(post._id));
    await Post.deleteMany({ email: user.email });
    if (postIds.length) {
      await PostInteraction.deleteMany({ postType: 'user', postId: { $in: postIds } });
    }
    return res.status(200).json({ msg: 'User removed' });
  } catch (error) {
    return res.status(500).json({ msg: 'Failed to delete user', error: error.message });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Post.findByIdAndDelete(id);
    await PostInteraction.deleteMany({ postType: 'user', postId: id });
    return res.status(200).json({ msg: 'Post removed' });
  } catch (error) {
    return res.status(500).json({ msg: 'Failed to delete post', error: error.message });
  }
});

module.exports = router;
