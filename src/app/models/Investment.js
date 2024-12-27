import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  investmentType: {
    type: String,
    enum: ['stock', 'real-estate', 'crypto', 'savings', 'bonds', /* Add more investment types */],
    required: true
  },
  amountInvested: {
    type: Number,
    required: true
  },
  investmentTerm: {
    type: String,
    enum: ['short-term', 'medium-term', 'long-term'],
    required: true
  },
  returnRate: {
    type: Number,
    required: true
  },
  investmentStatus: {
    type: String,
    enum: ['pending', 'active', 'completed', 'failed'],
    default: 'pending'
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

export default mongoose.model('Investment', investmentSchema);
