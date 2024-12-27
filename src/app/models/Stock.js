import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['tech', 'healthcare', 'finance', 'consumer', 'energy'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantityAvailable: {
    type: Number,
    required: true
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

export default mongoose.model('Stock', stockSchema);
