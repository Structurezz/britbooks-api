

import mongoose from 'mongoose';

const paymentLogSchema = new mongoose.Schema({
    walletId: { type: mongoose.Schema.Types.ObjectId, required: true },
    utilityType: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'success'], required: true },
    otp: { type: String, required: true }, 
    timestamp: { type: Date, default: Date.now },
});

const PaymentLog = mongoose.model('PaymentLog', paymentLogSchema);
export default PaymentLog;
