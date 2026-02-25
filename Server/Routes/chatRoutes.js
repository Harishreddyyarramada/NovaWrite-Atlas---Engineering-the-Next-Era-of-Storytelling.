const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatControllers = require('../Controllers/chatControllers');
const authMiddleware = require('../Middleware/authMiddleware');
const { storage } = require('../Config/CloudinaryConfig');

const upload = multer({ storage });

// All routes require authentication
router.use(authMiddleware);

router.post('/conversation', chatControllers.getOrCreateConversation);
router.get('/conversations', chatControllers.getAllConversations);
router.get('/messages/:conversationId', chatControllers.getMessages);
router.post('/messages', chatControllers.sendMessage);
router.patch('/messages/:conversationId/read', chatControllers.markConversationAsRead);
router.post('/messages/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    return res.status(201).json({
      mediaUrl: req.file.path,
      mediaPublicId: req.file.filename,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
router.delete('/conversation/:conversationId', chatControllers.deleteConversation);

module.exports = router;
