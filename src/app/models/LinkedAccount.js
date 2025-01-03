import mongoose from 'mongoose';

const linkedAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Ensure it is an ObjectId
    required: true,
  },
  accountProvider: {
    type: String,
    required: true,
  },
  accountType: {
    type: String,
    required: true,
    enum: ['Savings', 'Current', 'Credit', 'Crypto'], // Example types
  },
  accountName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'linked'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.model('LinkedAccount', linkedAccountSchema);
