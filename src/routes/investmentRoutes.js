import express from 'express';
import { createInvestment, getInvestmentsByUser, getAllInvestments, updateInvestmentStatus, deleteInvestment } from '../app/controllers/investmentController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';
import { authorizeAdmin } from '../app/middleware/adminMiddleware.js';

const router = express.Router();

// User routes
router.post('/investment', authenticateUser, createInvestment);
router.get('/investments/:userId', authenticateUser, getInvestmentsByUser);

// Admin routes
router.get('/admin/investments', authenticateUser, authorizeAdmin, getAllInvestments);
router.put('/admin/investment/:investmentId', authenticateUser, authorizeAdmin, updateInvestmentStatus);
router.delete('/admin/investment/:investmentId', authenticateUser, authorizeAdmin, deleteInvestment);

export default router;
