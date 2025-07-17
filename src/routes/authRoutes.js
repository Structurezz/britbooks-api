import express from 'express';
import {
    userSignup,
    userLogin,
    getUser,
    getAllUsers,
    updateUserProfile,
    deleteUserAccount,
    verifyOtp
} from '../app/controllers/authController.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';
import { authenticate, authorize } from '../app/middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.post('/verify', verifyOtp);
router.get('/users', verifyTokenMiddleware, getAllUsers); 
router.get('/user/:id', verifyTokenMiddleware, getUser);  
router.put('/user/:id', verifyTokenMiddleware, updateUserProfile);
router.delete('/user/:id', verifyTokenMiddleware, deleteUserAccount);

export default router;
