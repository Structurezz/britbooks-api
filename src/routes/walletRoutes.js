import express from 'express';
import { createWallet, regenerateWalletAddress, getWalletsByUser, getWalletById } from '../app/controllers/walletController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';

const router = express.Router();

// Create a new wallet
router.post('/wallet', authenticateUser, createWallet);

// Regenerate wallet address
router.patch('/wallet/:walletId/regenerate', authenticateUser, regenerateWalletAddress);

// Get all wallets for a user
router.get('/wallets/:userId', authenticateUser, getWalletsByUser);

// Get a specific wallet by wallet ID
router.get('/wallet/:walletId', authenticateUser, getWalletById);

export default router;
