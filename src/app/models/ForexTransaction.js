import mongoose from 'mongoose';

const forexTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', /* Add more currencies */],
    required: true
  },
  targetCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', /* Add more currencies */],
    required: true
  },
  transactionAmount: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  transactionType: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  transactionStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionFee: {
    type: Number,
    default: 0
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('ForexTransaction', forexTransactionSchema);
