import OpenAI from 'openai'; // Correct import for openai v3.x.x
import Support from '../models/Support.js';
import User from '../models/User.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Your OpenAI API Key
});

// User initiates support conversation
export const startSupportConversation = async (req, res) => {
  const { userId, message } = req.body;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new support case
    const support = new Support({
      userId,
      messages: [
        { sender: 'user', message },
        { sender: 'chatgpt', message: 'Let me help you with that. Please wait a moment...' }
      ]
    });
    await support.save();

    res.status(200).json({ message: 'Support conversation started', support });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error starting the support conversation' });
  }
};

// User sends a message to ChatGPT
export const sendMessageToChatGPT = async (req, res) => {
  const { supportId, message } = req.body;

  try {
    // Find the support conversation
    const support = await Support.findById(supportId);
    if (!support) {
      return res.status(404).json({ message: 'Support conversation not found' });
    }

    // Add the user message to the conversation
    support.messages.push({ sender: 'user', message });
    await support.save();

    // Send user message to ChatGPT
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
    });

    const chatGptMessage = response.choices[0].message.content;

    // Add ChatGPT's response to the conversation
    support.messages.push({ sender: 'chatgpt', message: chatGptMessage });
    await support.save();

    res.status(200).json({ message: 'Message sent to ChatGPT', chatGptMessage });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending message to ChatGPT' });
  }
};

// Mark support case as resolved
export const resolveSupportConversation = async (req, res) => {
  const { supportId } = req.body;

  try {
    const support = await Support.findById(supportId);
    if (!support) {
      return res.status(404).json({ message: 'Support conversation not found' });
    }

    support.status = 'resolved';
    await support.save();

    res.status(200).json({ message: 'Support conversation resolved', support });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resolving support conversation' });
  }
};
