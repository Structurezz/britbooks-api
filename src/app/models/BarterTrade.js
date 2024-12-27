import mongoose from 'mongoose';

const barterSchema = new mongoose.Schema({
    offeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    itemOffered: {
        type: String,
        required: true
    },
    itemRequested: {
        type: String,
        required: true
    },
    offerStatus: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'canceled'],
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

export default mongoose.model('Barter', barterSchema);
