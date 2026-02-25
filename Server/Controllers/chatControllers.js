const Conversation = require('../Models/Conversation');
const Message = require('../Models/Message');
const User = require('../Models/User');

const isValidObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));

const normalizeMessage = (messageDoc) => ({
  _id: messageDoc._id,
  conversationId: String(messageDoc.conversationId),
  senderId: messageDoc.senderId,
  text: messageDoc.text || '',
  messageType: messageDoc.messageType || 'text',
  mediaUrl: messageDoc.mediaUrl || null,
  mediaPublicId: messageDoc.mediaPublicId || null,
  linkUrl: messageDoc.linkUrl || null,
  isRead: Boolean(messageDoc.isRead),
  createdAt: messageDoc.createdAt,
});

const emitConversationMessage = async (req, conversation, message) => {
  const io = req.app.locals.io;
  if (!io) return;

  const payload = normalizeMessage(message);
  io.to(`conversation:${conversation._id}`).emit('chat:new-message', payload);

  conversation.participants.forEach((participant) => {
    const participantId =
      typeof participant === 'object' && participant?._id ? participant._id : participant;
    io.to(`user:${participantId}`).emit('chat:conversation-updated', {
      conversationId: conversation._id,
      lastMessage: payload,
      lastMessageTime: conversation.lastMessageTime,
    });
  });
};

const enrichConversationForUser = (conversation, currentUserId, onlineUserIds) => {
  const participants = conversation.participants || [];
  const otherUser =
    participants.find((participant) => String(participant._id) !== String(currentUserId)) || null;

  return {
    _id: conversation._id,
    participants: participants.map((participant) => ({
      _id: participant._id,
      username: participant.username,
      email: participant.email,
      profileImage: participant.profile_URL || null,
      isOnline: onlineUserIds.has(String(participant._id)),
      lastSeenAt: participant.lastSeenAt || participant.lastLoginAt || null,
    })),
    otherUser: otherUser
      ? {
          _id: otherUser._id,
          username: otherUser.username,
          email: otherUser.email,
          profileImage: otherUser.profile_URL || null,
          isOnline: onlineUserIds.has(String(otherUser._id)),
          lastSeenAt: otherUser.lastSeenAt || otherUser.lastLoginAt || null,
        }
      : null,
    lastMessage: conversation.lastMessage
      ? normalizeMessage(conversation.lastMessage)
      : null,
    lastMessageTime: conversation.lastMessageTime,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const loadConversationForUser = async (conversationId, currentUserId) => {
  const conversation = await Conversation.findById(conversationId).populate(
    'participants',
    'username email profile_URL lastSeenAt lastLoginAt'
  );

  if (!conversation) return null;
  const isParticipant = conversation.participants.some(
    (participant) => String(participant._id) === String(currentUserId)
  );
  if (!isParticipant) return null;

  return conversation;
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (String(currentUserId) === String(userId)) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    const targetUser = await User.findById(userId).select('_id');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    })
      .populate('participants', 'username email profile_URL lastSeenAt lastLoginAt')
      .populate('lastMessage');

    if (!conversation) {
      conversation = new Conversation({
        participants: [currentUserId, userId],
      });
      await conversation.save();
      await conversation.populate('participants', 'username email profile_URL lastSeenAt lastLoginAt');
    }

    const onlineUsers = req.app.locals.onlineUsers || new Map();
    const onlineUserIds = new Set(Array.from(onlineUsers.keys()));

    return res.json(enrichConversationForUser(conversation, currentUserId, onlineUserIds));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate('participants', 'username email profile_URL lastSeenAt lastLoginAt')
      .populate('lastMessage')
      .sort({ lastMessageTime: -1 });

    const onlineUsers = req.app.locals.onlineUsers || new Map();
    const onlineUserIds = new Set(Array.from(onlineUsers.keys()));
    const mapped = conversations.map((conversation) =>
      enrichConversationForUser(conversation, currentUserId, onlineUserIds)
    );

    return res.json(mapped);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await loadConversationForUser(conversationId, currentUserId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'username email profile_URL')
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: currentUserId },
        isRead: false,
      },
      { isRead: true }
    );

    const normalized = messages.map((message) => normalizeMessage(message));
    return res.json(normalized);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const {
      conversationId,
      text,
      messageType = 'text',
      mediaUrl = null,
      mediaPublicId = null,
      linkUrl = null,
    } = req.body;
    const senderId = req.user.id;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await loadConversationForUser(conversationId, senderId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const trimmedText = String(text || '').trim();
    const normalizedType = ['text', 'image', 'link'].includes(messageType) ? messageType : 'text';

    if (normalizedType === 'image' && !mediaUrl) {
      return res.status(400).json({ message: 'Image message requires media URL' });
    }

    if (normalizedType === 'link' && !linkUrl) {
      return res.status(400).json({ message: 'Link message requires URL' });
    }

    if (normalizedType === 'text' && !trimmedText) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    if (normalizedType !== 'text' && !trimmedText && !mediaUrl && !linkUrl) {
      return res.status(400).json({ message: 'Message payload is empty' });
    }

    const message = new Message({
      conversationId,
      senderId,
      text: trimmedText,
      messageType: normalizedType,
      mediaUrl,
      mediaPublicId,
      linkUrl,
    });

    await message.save();
    await message.populate('senderId', 'username email profile_URL');

    conversation.lastMessage = message._id;
    conversation.lastMessageTime = new Date();
    await conversation.save();
    await conversation.populate('participants', 'username email profile_URL');
    await conversation.populate('lastMessage');

    await emitConversationMessage(req, conversation, message);

    return res.json(normalizeMessage(message));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await loadConversationForUser(conversationId, currentUserId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: currentUserId },
        isRead: false,
      },
      { isRead: true }
    );

    return res.json({ message: 'Marked as read' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const conversation = await loadConversationForUser(conversationId, currentUserId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    return res.json({ message: 'Conversation deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
