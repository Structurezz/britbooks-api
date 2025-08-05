import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderDetails,
  updateOrderStatus,
  deleteOrder,
  resendOrderDocuments,
  getOrdersByUserId
} from '../app/controllers/orderController.js';
import authMiddleware from '../app/middleware/authMiddleware.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';

const router = express.Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderDetails);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);
router.post('/:id/resend-docs', resendOrderDocuments);
router.get('/user/:userId', verifyTokenMiddleware,authMiddleware , getOrdersByUserId);

export default router;
