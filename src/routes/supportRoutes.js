import express from 'express';
import { startSupportConversation, sendMessageToChatGPT, resolveSupportConversation } from '../app/controllers/supportController.js';


const router = express.Router();

// User starts a support conversation
router.post('/support/start',  startSupportConversation);

// User sends a message to ChatGPT
router.post('/support/message',  sendMessageToChatGPT);

// Admin marks the conversation as resolved
router.patch('/support/resolve',  resolveSupportConversation);

export default router;
