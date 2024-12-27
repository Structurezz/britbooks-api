import express from 'express';
import { createOrder, getOrdersByUser, getAllOrders, updateOrderStatus, deleteOrder } from '../app/controllers/orderController.js';
import { authenticateUser } from '../app/middleware/authMiddleware.js';
import { authorizeAdmin } from '../app/middleware/adminMiddleware.js';

const router = express.Router();

// User routes
router.post('/order', authenticateUser, createOrder); // Create an order
router.get('/orders/:userId', authenticateUser, getOrdersByUser); // Get orders by user ID

// Admin routes
router.get('/admin/orders', authenticateUser, authorizeAdmin, getAllOrders); // Get all orders
router.put('/admin/order/:orderId', authenticateUser, authorizeAdmin, updateOrderStatus); // Update order status
router.delete('/admin/order/:orderId', authenticateUser, authorizeAdmin, deleteOrder); // Delete an order

export default router;
