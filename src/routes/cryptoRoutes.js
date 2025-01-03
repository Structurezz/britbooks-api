import express from 'express';
import {
    initiateCryptoTransaction,
    fetchTransactionsByUser,
    fetchAllCryptoTransactions,
    updateTransactionStatus
} from '../app/controllers/cryptoController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';
import { authorizeAdmin } from '../app/middleware/adminMiddleware.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';

const router = express.Router();

// User routes
// Route to initiate a new crypto transaction
router.post('/crypto/transaction', verifyTokenMiddleware, initiateCryptoTransaction);
router.get('/crypto/transactions/:userId', authenticateUser, verifyTokenMiddleware,fetchTransactionsByUser);

router.get('/admin/crypto/transactions', verifyTokenMiddleware,authenticateUser, authorizeAdmin, fetchAllCryptoTransactions);
router.put('/admin/crypto/transaction/:transactionId', verifyTokenMiddleware,authenticateUser, authorizeAdmin, updateTransactionStatus);

export default router;
