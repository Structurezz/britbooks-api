import Barter from '../models/BarterTrade.js';

// Create a new barter offer
export const createBarterOffer = async (userId, offerData) => {
    const barter = new Barter({ offeredBy: userId, ...offerData });
    await barter.save();
    return barter;
};

// Get available barter offers (filter by status: 'pending')
export const getAvailableBarterOffers = async () => {
    return await Barter.find({ offerStatus: 'pending' }).populate('offeredBy', 'fullName email');
};

// Get user's barter history
export const getUserBarterHistory = async (userId) => {
    return await Barter.find({ $or: [{ offeredBy: userId }, { requestedBy: userId }] });
};

// Accept a barter offer
export const acceptBarterOffer = async (barterId, userId) => {
    const barter = await Barter.findById(barterId);
    if (!barter || barter.offerStatus !== 'pending') {
        throw new Error('Invalid or already processed barter offer');
    }

    barter.requestedBy = userId;
    barter.offerStatus = 'accepted';
    await barter.save();
    return barter;
};

// Decline a barter offer
export const declineBarterOffer = async (barterId) => {
    const barter = await Barter.findById(barterId);
    if (!barter || barter.offerStatus !== 'pending') {
        throw new Error('Invalid or already processed barter offer');
    }

    barter.offerStatus = 'declined';
    await barter.save();
    return barter;
};

// Cancel a barter offer
export const cancelBarterOffer = async (barterId, userId) => {
    const barter = await Barter.findById(barterId);
    if (!barter || barter.offeredBy.toString() !== userId || barter.offerStatus !== 'pending') {
        throw new Error('Cannot cancel this barter offer');
    }

    barter.offerStatus = 'canceled';
    await barter.save();
    return barter;
};
