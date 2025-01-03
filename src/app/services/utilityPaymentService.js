import Utility from '../models/UtilityPayment.js';
import Wallet from '../models/Wallet.js';
import PaymentLog from '../models/PaymentLog.js';
import { verifyUtilityPayment } from '../../lib/utils/paymentGateway.js';
import mongoose from 'mongoose';
import twilio from 'twilio';
import otpGenerator from 'otp-generator';



const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


export default class UtilityPaymentService {
    // Add a utility category
    static async addUtilityCategory({ name, description, subcategories }) {
      const existingUtility = await Utility.findOne({ name });
      if (existingUtility) throw new Error('Utility category already exists.');
  
      const newUtility = new Utility({ name, description, subcategories }); 
  
      console.log('New utility category added:', newUtility); 
  
      return newUtility;
    }
  
  
  
  

  // Get all utility categories

static async getAllUtilities() {
    return await Utility.find().populate('subcategories'); 
  }
  

  // Delete a utility category
  static async deleteUtilityCategory(utilityId) {
    const utility = await Utility.findById(utilityId);
    if (!utility) throw new Error('Utility category not found.');

    await utility.deleteOne();
    return { message: 'Utility category deleted successfully.' };
  }

  // Process a utility payment
  static async processUtilityPayment({ walletId, utilityType, amount, phoneNumber }) {
    if (amount <= 0) throw new Error('Amount must be greater than zero.');

    // Validate utility type
    const utility = await Utility.findOne({ name: { $regex: new RegExp(`^${utilityType}$`, 'i') } });
    if (!utility) throw new Error(`Unsupported utility type: ${utilityType}`);

    // Validate wallet
    const wallet = await Wallet.findById(walletId);
    if (!wallet) throw new Error('Wallet not found.');
    if (wallet.balance < amount) throw new Error('Insufficient wallet balance.');

    // Generate OTP
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, specialChars: false });

    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP for utility payment is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    // Save payment log with "pending" status
    const paymentLog = new PaymentLog({
      walletId,
      utilityType,
      amount,
      status: 'pending',
      otp, // Store OTP temporarily (ensure to delete after usage)
      timestamp: new Date(),
    });

    await paymentLog.save();

    return {
      message: 'Payment initiated. Please verify OTP to complete the transaction.',
      paymentId: paymentLog._id,
    };
  }

  // Method to verify OTP and complete the payment
  static async verifyPaymentOtp({ paymentId, userOtp }) {
    const paymentLog = await PaymentLog.findById(paymentId);
    if (!paymentLog) throw new Error('Payment record not found.');

    // Check if OTP matches
    if (paymentLog.otp !== userOtp) {
      throw new Error('Invalid OTP. Please try again.');
    }

    // Proceed with the payment processing
    // Deduct from wallet and update payment status
    const wallet = await Wallet.findById(paymentLog.walletId);
    wallet.balance -= paymentLog.amount;
    await wallet.save();

    paymentLog.status = 'success'; // Update status to success
    await paymentLog.save();

    return {
      message: 'Utility payment successful.',
      wallet: { id: wallet._id, balance: wallet.balance },
    };
  }

  static async verifyOtpAndProcessPayment(paymentId, otp) {
    // Retrieve the payment log
    const paymentLog = await PaymentLog.findById(paymentId);
    if (!paymentLog) throw new Error('Payment not found.');
    if (paymentLog.status !== 'pending') throw new Error('Payment is already processed.');

    // Verify OTP
    if (paymentLog.otp !== otp) throw new Error('Invalid OTP.');

    // Use a transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Deduct wallet balance
      const wallet = await Wallet.findById(paymentLog.walletId);
      wallet.balance -= paymentLog.amount;
      wallet.updatedAt = new Date();
      await wallet.save({ session });

      // Update payment log
      paymentLog.status = 'success';
      paymentLog.otp = null; // Clear OTP after successful verification
      await paymentLog.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return {
        message: 'Utility payment successful.',
        wallet: { id: wallet._id, balance: wallet.balance },
      };
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Payment failed: ${error.message}`);
    }
  }



  // Get payment history
  static async getPaymentHistory(walletId) {
    if (!walletId) throw new Error('Wallet ID is required.');

    return await PaymentLog.find({ walletId }).sort({ timestamp: -1 });
  }

  // Get utility by ID
  static async getUtilityById(utilityId) {
    try {
      const utility = await Utility.findById(utilityId); 
      return utility;
    } catch (error) {
      throw new Error('Error fetching utility by ID: ' + error.message);
    }
  }
  
}
