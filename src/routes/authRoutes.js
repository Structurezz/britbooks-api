import express from 'express';
import { userSignup, userLogin, getUser, updateUserProfile, deleteUserAccount } from '../app/controllers/authController.js';
import { authenticate, authorize } from '../app/middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.get('/user/:id', authenticate, getUser);
router.put('/user/:id', authenticate, authorize(['admin', 'user']), updateUserProfile);
router.delete('/user/:id', authenticate, authorize(['admin']), deleteUserAccount);

export default router;
