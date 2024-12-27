import express from 'express';
import { initiateForexTransaction, fetchForexTransactionsByUser, fetchAllForexTransactions, updateForexTransactionStatus } from '../app/controllers/forexController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';
import { authorizeAdmin } from '../app/middleware/adminMiddleware.js';

const router = express.Router();

// User routes
router.post('/forex/transaction', authenticateUser, initiateForexTransaction);
router.get('/forex/transactions/:userId', authenticateUser, fetchForexTransactionsByUser);

// Admin routes
router.get('/admin/forex/transactions', authenticateUser, authorizeAdmin, fetchAllForexTransactions);
router.put('/admin/forex/transaction/:transactionId', authenticateUser, authorizeAdmin, updateForexTransactionStatus);

export default router;
