const express = require('express');
const router = express.Router();
const multer = require('multer');
const Post = require('../Models/Post.js');
const User = require('../Models/User.js');
const { storage } = require('../Config/CloudinaryConfig.js');

const upload = multer({ storage });

router.post('/uploads', upload.single('image'), async (req, res) => {
  try {
    const { email, title, description, category = 'Technology', seoTags = '' } = req.body;

    if (!email || !req.file) {
      return res.status(400).json({ msg: 'Missing email or image' });
    }

    const imageURL = req.file.path;
    const publicId = req.file.filename;

    // Get author info
    const user = await User.findOne({ email });
    const author = user ? user.username : email;

    // Create new post
    const parsedTags = String(seoTags || '')
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);

    const newPost = new Post({
      email,
      image_url: imageURL,
      public_id: publicId,
      title,
      description,
      category: String(category || 'Technology').trim(),
      seoTags: parsedTags,
      author,
    });

    await newPost.save();

    return res.status(201).json({
      msg: 'Post created successfully',
      id: newPost._id,
      email,
      image: imageURL,
      title,
      description,
      category: newPost.category,
      seoTags: newPost.seoTags,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ msg: 'Error uploading post', error: error.message });
  }
});

router.get('/blogs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 8,
      q = '',
      tag = '',
      category = '',
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 8, 1), 24);

    const query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { seoTags: { $regex: q, $options: 'i' } },
      ];
    }
    if (tag) {
      query.seoTags = { $regex: String(tag).toLowerCase(), $options: 'i' };
    }
    if (category) {
      query.category = category;
    }

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .select('image_url title description author createdAt category seoTags views')
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
    ]);

    const totalPages = Math.max(Math.ceil(total / limitNumber), 1);

    return res.status(200).json({
      results: posts,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error('Fetch blogs error:', error);
    return res.status(500).json({ msg: 'Error loading blogs', error: error.message });
  }
});

module.exports = router;
