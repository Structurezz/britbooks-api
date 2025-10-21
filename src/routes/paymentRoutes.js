import express from 'express';
import {
    createPayment,
    handleWebhook,
    getAllPaymentsController,
    getPayment,
    getUserPaymentsController,
    refundPayment,
    handlePaymentSuccess,
    withdrawToBank
    
} from '../app/controllers/paymentController.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';
import authMiddleware from '../app/middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-payment', verifyTokenMiddleware, authMiddleware,  createPayment);
router.post('/webhook', verifyTokenMiddleware, authMiddleware, express.raw({ type: 'application/json' }), handleWebhook);
router.get('/', verifyTokenMiddleware, authMiddleware, getAllPaymentsController);
router.get('/:id', verifyTokenMiddleware, authMiddleware, getPayment);
router.get('/user/:userId', verifyTokenMiddleware, authMiddleware, getUserPaymentsController);
router.post('/refund/:id', verifyTokenMiddleware, authMiddleware, refundPayment);
router.post('/success/:id', verifyTokenMiddleware, authMiddleware,  handlePaymentSuccess);
router.post('/withdraw' , verifyTokenMiddleware, authMiddleware, withdrawToBank);

export default router;
