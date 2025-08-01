import stripe from '../../lib/config/stripe.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { v4 as uuidv4 } from 'uuid'; 
import { sendTransferSuccessfulEmail } from './nexcessService.js';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();


const ADMIN_WALLET_ID = process.env.ADMIN_WALLET_ID;



export const createPaymentIntentForOrder = async ({
  userId,
  email,
  orderId,
  shippingAddress,
  items,
  subtotal,
  shippingFee,
  total,
  currency = 'gbp',
  token,
}) => {
  const amountInCents = Math.round(total * 100);

  if (amountInCents < 50) throw new Error('Total must be at least £0.50');
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) throw new Error('Invalid or missing userId');
  if (!orderId) throw new Error('Order ID is required');
  if (!token || typeof token !== 'string') throw new Error('Missing or invalid Stripe token');

  const user = await User.findById(userId);
  if (!user) throw new Error(`User not found for userId: ${userId}`);

  // 1. Create payment method
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: { token },
    billing_details: {
      name: shippingAddress.name,
      email,
    },
  });

  // 2. Create and confirm PaymentIntent with enforced card and capture
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    confirm: true,
    capture_method: 'automatic',
    payment_method: paymentMethod.id,
    payment_method_types: ['card'],
    receipt_email: email,
    return_url: 'https://yourdomain.com/return', // optional, prevents Stripe errors on redirect flows
    metadata: {
      userId,
      orderId,
      subtotal: subtotal.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      paymentType: 'order',
      itemSummary: items.map(i => `${i.title} (x${i.quantity})`).join(', '),
    },
    shipping: {
      name: shippingAddress.name,
      address: {
        line1: shippingAddress.line1,
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
    },
  });

  const paymentIntentId = paymentIntent.id;

  // 3. Attempt to get charge and receipt
  let charge = paymentIntent.charges?.data?.[0];
  let receiptUrl = charge?.receipt_url;

  if (!charge || !receiptUrl) {
    console.warn('⚠️ Initial charge missing. Retrying from Stripe...');
    await new Promise((res) => setTimeout(res, 1500)); // small delay before retry

    const latestIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const fallbackCharge = latestIntent.charges?.data?.[0];

    if (fallbackCharge?.id) {
      const fullCharge = await stripe.charges.retrieve(fallbackCharge.id);
      receiptUrl = fullCharge?.receipt_url || null;
      charge = fullCharge;
    }
  }

  if (!charge || !receiptUrl) {
    console.warn('⚠️ Stripe did not provide a charge or receipt URL. Proceeding with pending status.');
  }
  const finalStatus = receiptUrl ? 'succeeded' : 'pending';
  // 4. Save payment to DB
  await Payment.create({
    userId: user._id,
    email,
    amount: total,
    currency,
    reference: paymentIntentId,
    status: finalStatus,
    type: 'order-payment',
    orderId,
    shippingAddress,
    items,
    receiptUrl,
    paymentIntentId,
  });

  // 5. Send confirmation email
  await sendTransferSuccessfulEmail({
    user,
    amount: total,
    transactionId: orderId,
    type: 'transfer',
  });

  return {
    clientSecret: paymentIntent.client_secret,
    reference: paymentIntentId,
    status: paymentIntent.status,
    requiresAction: paymentIntent.status === 'requires_action',
    nextAction: paymentIntent.next_action || null,
    receiptUrl,
  };
};











export const getAllPayments = async () => {
    return await Payment.find().populate('userId bookingId');
};

export const getPaymentById = async (paymentId) => {
    return await Payment.findById(paymentId).populate('userId bookingId');
};

export const getUserPayments = async (userId) => {
    return await Payment.find({ userId }).populate('bookingId');
};

export const processRefund = async (paymentId) => {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'succeeded') throw new Error('Cannot refund an incomplete payment');

    await stripe.refunds.create({ payment_intent: payment.paymentIntentId });
    payment.status = 'refunded';
    await payment.save();

    return payment;
};

export const updatePaymentStatus = async (paymentIntentId, status, receiptUrl = null) => {
    const payment = await Payment.findOne({ paymentIntentId });
    if (!payment) throw new Error('Payment not found');

    payment.status = status;
    if (receiptUrl) payment.receiptUrl = receiptUrl;

    await payment.save();
    return payment;
};


export const creditUserWallet = async (userId, amount) => {
  
    const user = await User.findById(userId);
    user.walletBalance += amount; 
    await user.save();
    return user;
};


export const processSuccessfulPayment = async (reference, receiptUrl) => {
  try {
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      return { success: false, message: 'Payment record not found.' };
    }

    const user = await User.findById(payment.userId);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const walletType = user.role === 'admin' ? 'admin' : 'user';
    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return { success: false, message: `${walletType} wallet not found.` };
    }

    const existingTransaction = wallet.transactions.find(
      txn => txn.transactionId === reference
    );
    if (existingTransaction) {
      return {
        success: true,
        message: 'Payment already verified.',
        walletBalance: wallet.balance,
        transactions: wallet.transactions
      };
    }

    // ⛔️ Ensure receiptUrl is present before marking as succeeded
    if (!receiptUrl) {
      return {
        success: false,
        message: 'Payment validation failed: receiptUrl is required to mark payment as succeeded.'
      };
    }

    // ✅ Update the payment record
    payment.status = 'succeeded';
    payment.receiptUrl = receiptUrl;
    await payment.save();

    // 💳 Credit the wallet
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      {
        $inc: { balance: payment.amount },
        $push: {
          transactions: {
            transactionId: reference,
            amount: payment.amount,
            date: new Date(),
            type: 'credit',
            description: `Payment received with reference: ${reference}`,
            status: 'completed',
            to: user._id,
            from: 'SYSTEM',
            receiptUrl
          }
        }
      },
      { new: true }
    );

    // 📧 Send confirmation email
    try {
      await sendWalletTopUpEmail(
        user,
        payment.amount,
        receiptUrl,
        walletType === 'admin' ? 'Admin Wallet' : 'User Wallet'
      );
    } catch (emailErr) {
      console.error('❌ Failed to send wallet top-up email:', emailErr.message);
    }

    return {
      success: true,
      message: `Payment successful and ${walletType} wallet credited!`,
      walletBalance: updatedWallet.balance,
      transactions: updatedWallet.transactions
    };
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    return { success: false, error: error.message };
  }
};







export const getOrCreateStripeAccount = async (user) => {
    if (user.stripeAccountId) {
      return user.stripeAccountId;
    }
  
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Change based on user location
      email: user.email,
      business_type: 'individual',
      capabilities: {
        transfers: { requested: true },
      },
    });
  
    user.stripeAccountId = account.id;
    await user.save();
    return account.id;
  };

  export const attachBankAccount = async (stripeAccountId, routingNumber, accountNumber, accountHolderName) => {
    const bankAccount = await stripe.accounts.createExternalAccount(
      stripeAccountId,
      {
        external_account: {
          object: 'bank_account',
          country: 'US', // Adjust based on user country
          currency: 'usd',
          routing_number: routingNumber,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
          account_holder_type: 'individual',
        }
      }
    );
  
    return bankAccount;
  };

  export const sendPayout = async (stripeAccountId, amountInCents) => {
    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: 'usd',
    }, {
      stripeAccount: stripeAccountId
    });
  
    return payout;
  };

  export const createStripeOnboardingLink = async (user) => {
    const accountId = user.stripeAccountId;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://your-app.com/retry-onboarding',
      return_url: 'https://your-app.com/onboarding-success',
      type: 'account_onboarding',
    });
    return accountLink.url;
  };
  
  
  export const createBankAccountSetupIntent = async (stripeAccountId) => {
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
    }, {
      stripeAccount: stripeAccountId
    });
  
    return setupIntent.client_secret;
  };
  