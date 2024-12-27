import express from 'express';
import { initiateCryptoTransaction, fetchTransactionsByUser, fetchAllCryptoTransactions, updateTransactionStatus } from '../app/controllers/cryptoController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';
import { authorizeAdmin } from '../app/middleware/adminMiddleware.js';

const router = express.Router();

// User routes
router.post('/crypto/transaction', authenticateUser, initiateCryptoTransaction);
router.get('/crypto/transactions/:userId', authenticateUser, fetchTransactionsByUser);

// Admin routes
router.get('/admin/crypto/transactions', authenticateUser, authorizeAdmin, fetchAllCryptoTransactions);
router.put('/admin/crypto/transaction/:transactionId', authenticateUser, authorizeAdmin, updateTransactionStatus);

export default router;
