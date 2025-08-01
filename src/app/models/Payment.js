import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false }, // Optional if payment is not tied to a booking
    amount: { type: Number, required: true },
    currency: { 
        type: String, 
        default: 'usd', 
        set: (v) => v.toLowerCase() // Always store lowercase
    },
    status: { 
        type: String, 
        enum: ['pending', 'succeeded', 'failed', 'refunded'], 
        default: 'pending' 
    },
    paymentIntentId: { type: String, required: function() { return this.status === 'succeeded'; } }, // Required if succeeded
  receiptUrl: { 
  type: String, 
  required: function () {
    return this.status === 'succeeded';
  }
},

    reference: { type: String, required: true, unique: true }, // Ensure uniqueness
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
