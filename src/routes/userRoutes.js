import express from 'express';
import * as userController from '../app/controllers/userController.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';
import authMiddleware from '../app/middleware/authMiddleware.js';
const router = express.Router();

router.get('/',  userController.getAllUsers);

router.get('/:userId', userController.getUserById);
router.put('/:userId',verifyTokenMiddleware,authMiddleware, userController.updateUser);
router.put('/settings/:userId/:actionType', verifyTokenMiddleware,authMiddleware, userController.handleUserSettings);


router.patch('/assign-admin-type/:userId', verifyTokenMiddleware,authMiddleware, userController.assignAdminType);
router.post( '/request-closure/:userId', verifyTokenMiddleware,authMiddleware ,userController.handleAccountClosureRequest);
router.post('/verify-closure/:userId', verifyTokenMiddleware,authMiddleware, userController.handleAccountClosureCodeVerification);
router.post('/cancel-closure/:userId', verifyTokenMiddleware, authMiddleware, userController.handleCancelAccountClosureRequest); 

router.post('/:userId/address',  userController.saveUserAddress);



export default router;
