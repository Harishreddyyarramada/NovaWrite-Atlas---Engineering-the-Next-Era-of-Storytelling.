const express = require('express');
const middleware = require('../Middleware/authMiddleware.js');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../Models/Post.js');
const PostInteraction = require('../Models/PostInteraction.js');
const User = require('../Models/User.js');

const VALID_POST_TYPES = new Set(['featured', 'user']);
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'is',
  'are',
  'with',
  'this',
  'that',
  'from',
  'by',
  'as',
  'it',
  'be',
  'was',
  'were',
  'at',
  'we',
  'you',
  'your',
]);

const isValidObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

const buildCommentsThread = (comments = []) => {
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const commentMap = new Map();
  const roots = [];

  sortedComments.forEach((comment) => {
    const mappedComment = {
      _id: comment._id,
      userId: comment.userId,
      username: comment.username,
      email: comment.email,
      text: comment.text,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt,
      replies: [],
    };

    commentMap.set(String(comment._id), mappedComment);
  });

  sortedComments.forEach((comment) => {
    const current = commentMap.get(String(comment._id));
    const parentId = comment.parentCommentId ? String(comment.parentCommentId) : null;

    if (parentId && commentMap.has(parentId)) {
      commentMap.get(parentId).replies.push(current);
      return;
    }

    roots.push(current);
  });

  roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return roots;
};

const validateInteractionTarget = async (req, res, next) => {
  try {
    const { postType, postId } = req.params;

    if (!VALID_POST_TYPES.has(postType)) {
      return res.status(400).json({ msg: 'Invalid post type' });
    }

    if (!postId || !String(postId).trim()) {
      return res.status(400).json({ msg: 'Post ID is required' });
    }

    if (postType === 'user') {
      if (!isValidObjectId(postId)) {
        return res.status(400).json({ msg: 'Invalid post ID' });
      }

      const postExists = await Post.exists({ _id: postId });
      if (!postExists) {
        return res.status(404).json({ msg: 'Post not found' });
      }
    }

    req.interactionTarget = { postType, postId: String(postId) };
    next();
  } catch (error) {
    console.error('Validate interaction target error:', error);
    return res.status(500).json({ msg: 'Error validating post target', error: error.message });
  }
};

const getOrCreateInteraction = async (postType, postId) => {
  let interaction = await PostInteraction.findOne({ postType, postId });
  if (interaction) return interaction;

  try {
    interaction = await PostInteraction.create({
      postType,
      postId,
      likes: [],
      shareCount: 0,
      comments: [],
    });
  } catch (error) {
    if (error?.code === 11000) {
      interaction = await PostInteraction.findOne({ postType, postId });
    } else {
      throw error;
    }
  }

  return interaction;
};

const pickKeywords = (text = '', limit = 8) => {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const freq = new Map();
  words.forEach((word) => freq.set(word, (freq.get(word) || 0) + 1));

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

const improveWriting = (text = '') => {
  const cleaned = String(text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return `${sentence}. This guide explains practical implementation steps, real use-cases, and production-ready tips for modern developers.`;
};

router.get('/posts', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    const posts = await Post.find({ email });
    return res.status(200).json({ results: posts });
  } catch (error) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({ msg: 'Error fetching posts', error: error.message });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ msg: 'Invalid post ID' });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    return res.status(200).json(post);
  } catch (error) {
    console.error('Fetch post error:', error);
    return res.status(500).json({ msg: 'Error fetching post', error: error.message });
  }
});

router.post('/view/:postType/:postId', middleware, validateInteractionTarget, async (req, res) => {
  try {
    const { postType, postId } = req.interactionTarget;
    const userId = req.user?.id;

    if (postType === 'user') {
      await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });
    }

    const interaction = await getOrCreateInteraction(postType, postId);
    if (userId && isValidObjectId(userId)) {
      interaction.readerVisits = interaction.readerVisits || [];
      interaction.readerVisits.push({
        userId: new mongoose.Types.ObjectId(userId),
        visitedAt: new Date(),
      });
      await interaction.save();
    }

    return res.status(200).json({ msg: 'View updated' });
  } catch (error) {
    return res.status(500).json({ msg: 'Error updating view', error: error.message });
  }
});

router.post('/ai/enhance', middleware, async (req, res) => {
  try {
    const { action, description = '', title = '' } = req.body;

    if (!action) {
      return res.status(400).json({ msg: 'Action is required' });
    }

    const baseText = String(description || '').trim();
    const keywords = pickKeywords(`${title} ${description}`);

    if (action === 'improve') {
      return res.status(200).json({
        action,
        result: improveWriting(baseText),
      });
    }

    if (action === 'seo-tags') {
      return res.status(200).json({
        action,
        result: keywords.slice(0, 10).map((word) => `#${word}`),
      });
    }

    if (action === 'title-suggestions') {
      const [k1 = 'Modern', k2 = 'Guide', k3 = 'Strategy'] = keywords;
      return res.status(200).json({
        action,
        result: [
          `${k1.toUpperCase()} Mastery: A Practical ${k2} Blueprint`,
          `How ${k1} and ${k2} Build Better ${k3} Workflows`,
          `${k1} in 2026: The Smart ${k2} for Real Results`,
        ],
      });
    }

    if (action === 'summary') {
      const sentences = String(baseText)
        .split(/[.!?]/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const summary = sentences.slice(0, 2).join('. ');
      return res.status(200).json({
        action,
        result: summary ? `${summary}.` : 'No summary could be generated.',
      });
    }

    if (action === 'linkedin') {
      const summary = String(baseText || '')
        .split(/[.!?]/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join('. ');
      const hashtags = keywords.slice(0, 6).map((word) => `#${word}`);

      return res.status(200).json({
        action,
        result: `${summary || improveWriting(baseText)}\n\n${hashtags.join(' ')}`.trim(),
      });
    }

    return res.status(400).json({ msg: 'Unsupported AI action' });
  } catch (error) {
    return res.status(500).json({ msg: 'AI enhancement failed', error: error.message });
  }
});

router.get('/interactions/:postType/:postId', middleware, validateInteractionTarget, async (req, res) => {
  try {
    const { postType, postId } = req.interactionTarget;
    const userId = req.user?.id ? String(req.user.id) : null;

    const interaction = await getOrCreateInteraction(postType, postId);
    const likes = interaction.likes || [];
    const comments = interaction.comments || [];

    return res.status(200).json({
      postType,
      postId,
      likesCount: likes.length,
      shareCount: interaction.shareCount || 0,
      likedByCurrentUser: userId
        ? likes.some((likeUserId) => String(likeUserId) === userId)
        : false,
      commentsCount: comments.length,
      comments: buildCommentsThread(comments),
    });
  } catch (error) {
    console.error('Get interaction error:', error);
    return res.status(500).json({ msg: 'Error fetching interactions', error: error.message });
  }
});

router.post('/interactions/:postType/:postId/like', middleware, validateInteractionTarget, async (req, res) => {
  try {
    const { postType, postId } = req.interactionTarget;
    const userId = req.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ msg: 'Invalid user session' });
    }

    const interaction = await getOrCreateInteraction(postType, postId);
    const likeIndex = (interaction.likes || []).findIndex(
      (likeUserId) => String(likeUserId) === String(userId)
    );

    let likedByCurrentUser = false;
    if (likeIndex === -1) {
      interaction.likes.push(new mongoose.Types.ObjectId(userId));
      likedByCurrentUser = true;
    } else {
      interaction.likes.splice(likeIndex, 1);
    }

    await interaction.save();

    const io = req.app.locals.io;
    if (io) {
      io.to(`post:${postType}:${postId}`).emit('post:engagement-updated', {
        postType,
        postId,
        likesCount: interaction.likes.length,
        shareCount: interaction.shareCount || 0,
        commentsCount: interaction.comments?.length || 0,
      });
    }

    return res.status(200).json({
      msg: likedByCurrentUser ? 'Post liked' : 'Like removed',
      likesCount: interaction.likes.length,
      likedByCurrentUser,
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    return res.status(500).json({ msg: 'Error updating like', error: error.message });
  }
});

router.post('/interactions/:postType/:postId/share', middleware, validateInteractionTarget, async (req, res) => {
  try {
    const { postType, postId } = req.interactionTarget;
    const interaction = await getOrCreateInteraction(postType, postId);

    interaction.shareCount = (interaction.shareCount || 0) + 1;
    await interaction.save();

    const io = req.app.locals.io;
    if (io) {
      io.to(`post:${postType}:${postId}`).emit('post:engagement-updated', {
        postType,
        postId,
        likesCount: interaction.likes?.length || 0,
        shareCount: interaction.shareCount || 0,
        commentsCount: interaction.comments?.length || 0,
      });
    }

    return res.status(200).json({
      msg: 'Share count updated',
      shareCount: interaction.shareCount,
    });
  } catch (error) {
    console.error('Increment share error:', error);
    return res.status(500).json({ msg: 'Error updating share count', error: error.message });
  }
});

router.post(
  '/interactions/:postType/:postId/comments',
  middleware,
  validateInteractionTarget,
  async (req, res) => {
    try {
      const { postType, postId } = req.interactionTarget;
      const { text, parentCommentId = null } = req.body;
      const userId = req.user?.id;
      const userEmail = req.user?.email;

      if (!userId || !isValidObjectId(userId)) {
        return res.status(401).json({ msg: 'Invalid user session' });
      }

      const sanitizedText = String(text || '').trim();
      if (!sanitizedText) {
        return res.status(400).json({ msg: 'Comment text is required' });
      }

      if (sanitizedText.length > 1500) {
        return res.status(400).json({ msg: 'Comment is too long (max 1500 characters)' });
      }

      const interaction = await getOrCreateInteraction(postType, postId);

      let normalizedParentId = null;
      if (parentCommentId) {
        if (!isValidObjectId(parentCommentId)) {
          return res.status(400).json({ msg: 'Invalid parent comment ID' });
        }

        const parentExists = interaction.comments.some(
          (comment) => String(comment._id) === String(parentCommentId)
        );

        if (!parentExists) {
          return res.status(404).json({ msg: 'Parent comment not found' });
        }

        normalizedParentId = new mongoose.Types.ObjectId(parentCommentId);
      }

      const user = await User.findById(userId).select('username email');
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      interaction.comments.push({
        userId: user._id,
        username: user.username,
        email: user.email || userEmail,
        text: sanitizedText,
        parentCommentId: normalizedParentId,
      });

      await interaction.save();

      const io = req.app.locals.io;
      if (io) {
        io.to(`post:${postType}:${postId}`).emit('post:engagement-updated', {
          postType,
          postId,
          likesCount: interaction.likes?.length || 0,
          shareCount: interaction.shareCount || 0,
          commentsCount: interaction.comments?.length || 0,
        });
      }

      return res.status(201).json({
        msg: 'Comment added successfully',
        commentsCount: interaction.comments.length,
        comments: buildCommentsThread(interaction.comments),
      });
    } catch (error) {
      console.error('Add comment error:', error);
      return res.status(500).json({ msg: 'Error adding comment', error: error.message });
    }
  }
);

module.exports = router;
