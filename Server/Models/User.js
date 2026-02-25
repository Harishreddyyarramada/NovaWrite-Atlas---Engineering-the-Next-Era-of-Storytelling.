const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    profile_URL: {
      type: String,
      default: null,
    },
    public_Id: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    website: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
      maxlength: 120,
    },
    linkedin: {
      type: String,
      default: '',
      maxlength: 220,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'writer', 'focus', 'neon'],
      default: 'light',
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastWelcomeEmailAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
