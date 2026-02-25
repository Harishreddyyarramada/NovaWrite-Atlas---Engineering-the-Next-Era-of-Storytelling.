const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const Post = require('../Models/Post');
const Conversation = require('../Models/Conversation');
const authMiddleware = require('../Middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const onlineUsers = req.app.locals.onlineUsers || new Map();

    const filter = currentUserId ? { _id: { $ne: currentUserId } } : {};
    const users = await User.find(filter)
      .select('_id username email profile_URL lastSeenAt lastLoginAt')
      .sort({ username: 1 });

    const mapped = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profile_URL || null,
      status: onlineUsers.has(String(user._id)) ? 'online' : 'offline',
      isOnline: onlineUsers.has(String(user._id)),
      lastSeenAt: user.lastSeenAt || user.lastLoginAt || null,
      role: 'Member',
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/menu-stats', async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const currentUserEmail = req.user?.email;
    const user = await User.findById(currentUserId).select('bookmarks');

    const [myPostsCount, chatsCount] = await Promise.all([
      Post.countDocuments({ email: currentUserEmail }),
      Conversation.countDocuments({ participants: currentUserId }),
    ]);

    return res.json({
      myPostsCount,
      savedPostsCount: user?.bookmarks?.length || 0,
      chatsCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/bookmarks', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'bookmarks',
        select: 'title description image_url category seoTags author createdAt',
        options: { sort: { createdAt: -1 } },
      })
      .select('bookmarks');

    return res.json({ results: user?.bookmarks || [] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/bookmarks/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.user.id).select('bookmarks');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const post = await Post.findById(postId).select('_id');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadySaved = user.bookmarks.some((id) => String(id) === String(postId));
    if (alreadySaved) {
      user.bookmarks = user.bookmarks.filter((id) => String(id) !== String(postId));
    } else {
      user.bookmarks.push(postId);
    }

    await user.save();
    return res.json({
      message: alreadySaved ? 'Removed from saved posts' : 'Saved post added',
      saved: !alreadySaved,
      savedPostsCount: user.bookmarks.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
