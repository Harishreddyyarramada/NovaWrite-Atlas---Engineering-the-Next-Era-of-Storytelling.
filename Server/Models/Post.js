const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
    },
    image_url: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    public_id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      maxlength: 5000,
    },
    category: {
      type: String,
      default: 'Technology',
      trim: true,
      maxlength: 80,
    },
    seoTags: {
      type: [String],
      default: [],
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    author: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
