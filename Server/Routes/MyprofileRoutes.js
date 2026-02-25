const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const User = require('../Models/User.js');
const Post = require('../Models/Post.js');
const PostInteraction = require('../Models/PostInteraction.js');
const authMiddleware = require('../Middleware/authMiddleware');
const { storage, cloudinary } = require('../Config/CloudinaryConfig.js');

const upload = multer({ storage });

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'username email profile_URL bio website location linkedin themePreference lastSeenAt lastLoginAt'
    );

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profile_URL: user.profile_URL || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      linkedin: user.linkedin || '',
      themePreference: user.themePreference || 'light',
      lastSeenAt: user.lastSeenAt || null,
      lastLoginAt: user.lastLoginAt || null,
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Error loading profile', error: error.message });
  }
});

router.put('/me', upload.single('profilePic'), async (req, res) => {
  try {
    const {
      username,
      bio,
      website,
      location,
      linkedin,
      themePreference,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const updateData = {};

    if (username && username.trim() !== user.username) {
      const normalized = username.trim();
      if (normalized.length < 3 || normalized.length > 50) {
        return res.status(400).json({ msg: 'Username must be 3 to 50 characters' });
      }

      const duplicate = await User.exists({
        _id: { $ne: user._id },
        username: normalized,
      });

      if (duplicate) {
        return res.status(400).json({ msg: 'Username already taken' });
      }

      updateData.username = normalized;
    }

    if (typeof bio === 'string') updateData.bio = bio.trim().slice(0, 500);
    if (typeof website === 'string') updateData.website = website.trim().slice(0, 180);
    if (typeof location === 'string') updateData.location = location.trim().slice(0, 120);
    if (typeof linkedin === 'string') updateData.linkedin = linkedin.trim().slice(0, 220);

    if (themePreference && ['light', 'dark', 'writer', 'focus', 'neon'].includes(themePreference)) {
      updateData.themePreference = themePreference;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Current password is required to set a new password' });
      }

      const validCurrent = await bcrypt.compare(currentPassword, user.password);
      if (!validCurrent) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ msg: 'New password must be at least 6 characters' });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (req.file) {
      const newImageUrl = req.file.path;
      const newPublicId = req.file.filename;

      if (user.public_Id) {
        cloudinary.uploader.destroy(user.public_Id, () => null);
      }

      updateData.profile_URL = newImageUrl;
      updateData.public_Id = newPublicId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ msg: 'No changes provided' });
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, updateData, { new: true }).select(
      'username email profile_URL bio website location linkedin themePreference'
    );

    return res.status(200).json({
      msg: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile_URL: updatedUser.profile_URL || '',
        bio: updatedUser.bio || '',
        website: updatedUser.website || '',
        location: updatedUser.location || '',
        linkedin: updatedUser.linkedin || '',
        themePreference: updatedUser.themePreference || 'light',
      },
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Error updating profile', error: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const posts = await Post.find({ email: user.email }).select('_id title createdAt views');
    const postIds = posts.map((post) => String(post._id));

    const interactions = postIds.length
      ? await PostInteraction.find({
          postType: 'user',
          postId: { $in: postIds },
        }).select('postId likes shareCount comments createdAt')
      : [];

    const interactionMap = new Map(
      interactions.map((interaction) => [String(interaction.postId), interaction])
    );

    const totals = posts.reduce(
      (acc, post) => {
        const interaction = interactionMap.get(String(post._id));
        const likes = interaction?.likes?.length || 0;
        const comments = interaction?.comments?.length || 0;
        const shares = interaction?.shareCount || 0;
        const views = post.views || 0;
        acc.totalLikes += likes;
        acc.totalComments += comments;
        acc.totalShares += shares;
        acc.totalViews += views;
        return acc;
      },
      { totalLikes: 0, totalComments: 0, totalShares: 0, totalViews: 0 }
    );

    const bestPost = posts
      .map((post) => {
        const interaction = interactionMap.get(String(post._id));
        const score =
          (interaction?.likes?.length || 0) +
          (interaction?.comments?.length || 0) * 2 +
          (interaction?.shareCount || 0) * 3 +
          (post.views || 0);
        return { id: post._id, title: post.title, score };
      })
      .sort((a, b) => b.score - a.score)[0] || null;

    const weekly = Array.from({ length: 7 }).map((_, index) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (6 - index));

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const label = start.toLocaleDateString('en-US', { weekday: 'short' });
      const value = interactions.reduce((sum, interaction) => {
        const createdAt = new Date(interaction.createdAt);
        if (createdAt >= start && createdAt < end) {
          return (
            sum +
            (interaction.likes?.length || 0) +
            (interaction.comments?.length || 0) +
            (interaction.shareCount || 0)
          );
        }
        return sum;
      }, 0);

      return { label, value };
    });

    const returningReaderSet = new Set();
    const readerCounts = new Map();
    interactions.forEach((interaction) => {
      (interaction.readerVisits || []).forEach((visit) => {
        const key = String(visit.userId || '');
        if (!key) return;
        readerCounts.set(key, (readerCounts.get(key) || 0) + 1);
      });
    });
    readerCounts.forEach((count, userId) => {
      if (count >= 2) returningReaderSet.add(userId);
    });

    return res.status(200).json({
      totalPosts: posts.length,
      totalViews: totals.totalViews,
      totalLikes: totals.totalLikes,
      totalComments: totals.totalComments,
      totalShares: totals.totalShares,
      engagementGrowth: weekly.reduce((a, item) => a + item.value, 0),
      bestPost,
      returningReaders: returningReaderSet.size,
      weekly,
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Error loading analytics', error: error.message });
  }
});

module.exports = router;
