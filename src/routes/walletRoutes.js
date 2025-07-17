import express from 'express';
import * as WalletController from '../app/controllers/walletController.js';

import { getAllTransactions, getAllWallets } from '../app/controllers/walletController.js';

const router = express.Router();


router.post('/create', WalletController.createWallet);

router.post('/credit',  WalletController.creditWallet);

router.post('/pay', WalletController.makePayment);

router.post('/transfer', WalletController.transferFundsWalletToWallet);


router.post('/request-refund',  WalletController.requestRefund);
router.get('/pending-refunds', WalletController.getPendingRefundsController);
router.post('/process-refund',WalletController.processRefundController);

router.get('/refunds',WalletController.getRefundsController);


router.get('/balances',  WalletController.getAllWalletBalances);
router.get('/balances/:walletId',  WalletController.getWalletBalanceById);
router.get('/refund/:refundId',  WalletController.getRefundById);

router.get('/me', WalletController.getWalletDetails);
router.get('/',  getAllWallets);
router.get("/transactions", getAllTransactions);
router.get('/transaction/:transactionId',  WalletController.getTransactionById);
router.get('/transactions/user/:userId',  WalletController.getWalletTransactionsByUserId);


router.get('/:id',  WalletController.getWalletById);

export default router;

