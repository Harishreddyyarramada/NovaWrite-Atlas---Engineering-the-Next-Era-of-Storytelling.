const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const postInteractionSchema = new mongoose.Schema(
  {
    postType: {
      type: String,
      enum: ['featured', 'user'],
      required: true,
    },
    postId: {
      type: String,
      required: true,
      trim: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    comments: [commentSchema],
    readerVisits: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        visitedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

postInteractionSchema.index({ postType: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('PostInteraction', postInteractionSchema);
