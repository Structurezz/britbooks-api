import express from 'express';
import {
  linkAccountWithOtp,
  getAccounts,
  getAccountDetails,
  unlinkAccountWithOtp,
  aggregateAccounts,
  verifyAccountOtp,
  initiateUnlinkAccount
} from '../app/controllers/accountAggregationController.js';
import verifyTokenMiddleware from '../app/middleware/verifyTokenMiddleware.js';

const router = express.Router();

router.post('/accounts/link', verifyTokenMiddleware, linkAccountWithOtp);
router.get('/accounts/:userId', verifyTokenMiddleware, getAccounts);
router.get('/accounts/:accountId/details', verifyTokenMiddleware, getAccountDetails);
router.post('/accounts/:accountId/unlink/initiate', verifyTokenMiddleware, initiateUnlinkAccount);
router.post('/accounts/unlink', verifyTokenMiddleware, unlinkAccountWithOtp);
router.get('/accounts/:userId/aggregate', verifyTokenMiddleware, aggregateAccounts);
router.post('/accounts/verify', verifyTokenMiddleware, verifyAccountOtp);

export default router;
