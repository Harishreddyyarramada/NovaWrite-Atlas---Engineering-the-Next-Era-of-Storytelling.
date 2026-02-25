const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'link'],
      default: 'text',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaPublicId: {
      type: String,
      default: null,
    },
    linkUrl: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
