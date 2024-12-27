import express from 'express';
import { authenticate } from '../app/middleware/authMiddleware.js';
import {
    createOffer,
    getOffers,
    getUserHistory,
    acceptOffer,
    declineOffer,
    cancelOffer
} from '../app/controllers/barterController.js';

const router = express.Router();

router.post('/create', authenticate, createOffer);
router.get('/offers', authenticate, getOffers);
router.get('/history', authenticate, getUserHistory);
router.put('/accept/:id', authenticate, acceptOffer);
router.put('/decline/:id', authenticate, declineOffer);
router.delete('/cancel/:id', authenticate, cancelOffer);

export default router;
