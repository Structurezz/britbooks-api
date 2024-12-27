import mongoose from 'mongoose';

const cryptoTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromCurrency: {
    type: String,
    enum: ['BTC', 'ETH', 'XRP', 'LTC', 'DOGE', 'ADA', 'SOL', 'USDT', 'BNB', 'DOT', /* add 100+ currencies here */],
    required: true
  },
  toCurrency: {
    type: String,
    enum: ['BTC', 'ETH', 'XRP', 'LTC', 'DOGE', 'ADA', 'SOL', 'USDT', 'BNB', 'DOT', /* add 100+ currencies here */],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionType: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer'],
    required: true
  },
  transactionFee: {
    type: Number,
    default: 0
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

export default mongoose.model('CryptoTransaction', cryptoTransactionSchema);
