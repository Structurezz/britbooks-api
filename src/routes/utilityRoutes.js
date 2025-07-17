import express from 'express';
import {
  addUtilityCategory,
  getAllUtilities,
  deleteUtilityCategory,
  makeUtilityPayment,
  getPaymentHistory,
  getUtilityById,
  verifyOtpAndProcessPayment
} from '../app/controllers/utilityPaymentController.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';

const router = express.Router();

// Utility category routes
router.post('/categories', verifyTokenMiddleware, addUtilityCategory); // Add a utility category
router.get('/categories', verifyTokenMiddleware, getAllUtilities); // Get all utility categories
router.delete('/categories/:utilityId', verifyTokenMiddleware, deleteUtilityCategory); // Delete a utility category

// Utility payment routes
router.post('/pay', verifyTokenMiddleware, makeUtilityPayment); // Make a utility payment
router.get('/history/:walletId', verifyTokenMiddleware, getPaymentHistory);
router.get('/categories/:utilityId', verifyTokenMiddleware, getUtilityById); // Get utility category by ID

router.post('/pay/verify', verifyTokenMiddleware, verifyOtpAndProcessPayment);

export default router;
