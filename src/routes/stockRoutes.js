import express from 'express';
import { createOrUpdateStock, getAllStocks, getStockBySymbol, deleteStock, buyStock, sellStock } from '../app/controllers/stockController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';
import { authorizeAdmin } from '../app/middleware/adminMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/stocks', getAllStocks); // Get all stocks
router.get('/stock/:symbol', getStockBySymbol); // Get stock by symbol

// User Routes
router.post('/buy-stock/:userId', authenticateUser, buyStock); // Buy stock

router.post('/sell-stock/:userId', authenticateUser, sellStock); // Sell stock

// Admin Routes
router.post('/admin/stock', authenticateUser, authorizeAdmin, createOrUpdateStock); // Create or update stock
router.delete('/admin/stock/:symbol', authenticateUser, authorizeAdmin, deleteStock); // Delete stock

export default router;
