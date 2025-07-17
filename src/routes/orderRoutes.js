import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderDetails,
  updateOrderStatus,
  deleteOrder,
  resendOrderDocuments,
} from '../app/controllers/orderController.js';

const router = express.Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderDetails);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);
router.post('/:id/resend-docs', resendOrderDocuments);

export default router;
