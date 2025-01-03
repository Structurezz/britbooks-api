import AccountAggregationService from '../services/accountAggregationService.js';
import { sendOtp } from '../../lib/utils/otpUtils.js'; // Import the sendOtp function
import otpGenerator from 'otp-generator';
import LinkedAccount from '../models/LinkedAccount.js';
import twilio from 'twilio';
import mongoose from 'mongoose';



const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


// Generate OTP


// Send OTP using Twilio


export const linkAccountWithOtp = async (req, res) => {
    // Destructure fields from request body
    const { userId, bankName, accountNumber, phoneNumber, accountProvider, accountType, accountName } = req.body;
  
    try {
      // Validate input
      if (!userId || !bankName || !accountNumber || !phoneNumber || !accountProvider || !accountType || !accountName) {
        throw new Error('Missing required fields: userId, bankName, accountNumber, phoneNumber, accountProvider, accountType, or accountName');
      }
  
      // Ensure userId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid userId. Must be a valid ObjectId.');
      }
  
      // Generate OTP
      const otp = otpGenerator.generate(6, { digits: true, alphabets: false, specialChars: false });
  
      // Send OTP via Twilio
      await twilioClient.messages.create({
        body: `Your OTP for linking your account is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
  
      // Create linked account record in the database
      const linkedAccount = await LinkedAccount.create({
        userId: new mongoose.Types.ObjectId(userId), // Use 'new' to create an ObjectId
        bankName,             // Correctly include bankName
        accountNumber,        // Correctly include accountNumber
        phoneNumber,          // Correctly include phoneNumber
        otp,                  // Include OTP
        accountProvider,      // Include accountProvider
        accountType,          // Include accountType
        accountName,          // Include accountName
        status: 'pending',    // Set status as pending
      });
  
      // Respond with success message
      res.status(201).json({
        message: 'OTP sent successfully. Verify to complete linking.',
        accountId: linkedAccount._id,
      });
    } catch (error) {
      console.error('Error linking account:', error.message);
  
      // Detailed error response
      res.status(400).json({
        message: error.message,
        details: {
          userId: 'Must be a valid ObjectId',
          bankName: 'Required field',
          accountNumber: 'Required field',
          phoneNumber: 'Required field',
          accountProvider: 'Required field',
          accountType: 'Required field',
          accountName: 'Required field',
        },
      });
    }
  };
export const getAccounts = async (req, res) => {
  const { userId } = req.params;
  try {
    const accounts = await AccountAggregationService.getAccounts(userId);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAccountDetails = async (req, res) => {
  const { accountId } = req.params;
  try {
    const account = await AccountAggregationService.getAccountDetails(accountId);
    res.status(200).json(account);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const initiateUnlinkAccount = async (req, res) => {
    const { accountId } = req.params;
    try {
        const linkedAccount = await LinkedAccount.findById(accountId);
        if (!linkedAccount) {
            throw new Error('Account not found.');
        }

        const otp = otpGenerator.generate(6, { digits: true, alphabets: false, specialChars: false });
        await sendOtp(linkedAccount.phoneNumber, otp); // Send OTP to the user's phone

        linkedAccount.otp = otp; // Store the OTP for verification
        await linkedAccount.save();

        res.status(200).json({ message: 'OTP sent successfully. Please verify to unlink your account.' });
    } catch (error) {
        console.error('Error initiating unlink account:', error.message);
        res.status(400).json({ message: error.message });
    }
};

export const unlinkAccountWithOtp = async (req, res) => {
    const { accountId, otp } = req.body;
    try {
        const linkedAccount = await LinkedAccount.findById(accountId);
        if (!linkedAccount) {
            throw new Error('Account not found.');
        }

        if (linkedAccount.otp !== otp) {
            throw new Error('Invalid OTP.');
        }

        // Remove the linked account
        await linkedAccount.deleteOne(); // Correct way to delete the account

        res.status(200).json({ message: 'Account unlinked successfully.' });
    } catch (error) {
        console.error('Error unlinking account:', error.message);
        res.status(400).json({ message: error.message });
    }
};

export const aggregateAccounts = async (req, res) => {
  const { userId } = req.params;
  try {
    const summary = await AccountAggregationService.aggregateAccounts(userId);
    res.status(200).json(summary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyAccountOtp = async (req, res) => {
    const { accountId, otp } = req.body;
  
    try {
      // Validate input
      if (!accountId || !otp) {
        throw new Error('Missing required fields: accountId or otp');
      }
  
      // Retrieve the linked account
      const linkedAccount = await LinkedAccount.findById(accountId);
      if (!linkedAccount) {
        throw new Error('Account not found.');
      }
  
      // Check OTP
      if (linkedAccount.otp !== otp) {
        throw new Error('Invalid OTP.');
      }
  
      // Update account status to linked
      linkedAccount.status = 'linked';
      linkedAccount.otp = null; 
      await linkedAccount.save();
  
      res.status(200).json({ message: 'Account linked successfully.', account: linkedAccount });
    } catch (error) {
      console.error('Error verifying OTP:', error.message);
      res.status(400).json({ message: error.message });
    }
  };
  