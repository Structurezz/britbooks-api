// routes/walletRoutes.js
import express from 'express';
import { createWallet, regenerateWalletAddress, getAllWallets, getWalletById, fundWallet,getWalletBalance } from '../app/controllers/walletController.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';

const router = express.Router();


router.post('/create', verifyTokenMiddleware, createWallet);

router.patch('/:walletId/regenerate', verifyTokenMiddleware, regenerateWalletAddress);

router.get('/', verifyTokenMiddleware, getAllWallets);

router.get('/:walletId', verifyTokenMiddleware, getWalletById);

router.post('/:walletId/fund', verifyTokenMiddleware, fundWallet);

router.get('/:walletId/balance', verifyTokenMiddleware, getWalletBalance);


export default router;
