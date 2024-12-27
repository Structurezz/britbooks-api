import express from 'express';
import { startSupportConversation, sendMessageToChatGPT, resolveSupportConversation } from '../app/controllers/supportController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';

const router = express.Router();

// User starts a support conversation
router.post('/support/start', authenticateUser, startSupportConversation);

// User sends a message to ChatGPT
router.post('/support/message', authenticateUser, sendMessageToChatGPT);

// Admin marks the conversation as resolved
router.patch('/support/resolve', authenticateUser, resolveSupportConversation);

export default router;
