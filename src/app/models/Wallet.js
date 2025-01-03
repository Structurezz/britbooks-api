import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['trade', 'hot', 'cold'], // Make sure this is not mandatory in the case of fiat wallets
    required: false // Make it optional
  },
  cryptoAddress: {
    type: String,
    required: false // Make it optional
  },
  accountNumber: {
    type: String,
    required: false // Add this for fiat wallets
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
