import {
    createBarterOffer,
    getAvailableBarterOffers,
    getUserBarterHistory,
    acceptBarterOffer,
    declineBarterOffer,
    cancelBarterOffer
} from '../services/barterService.js';

// Create a new barter offer
export const createOffer = async (req, res) => {
    try {
        const userId = req.user._id;
        const barter = await createBarterOffer(userId, req.body);
        res.status(201).json({ message: 'Barter offer created successfully', barter });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get available barter offers
export const getOffers = async (req, res) => {
    try {
        const offers = await getAvailableBarterOffers();
        res.status(200).json(offers);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get user's barter history
export const getUserHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const history = await getUserBarterHistory(userId);
        res.status(200).json(history);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Accept a barter offer
export const acceptOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const barter = await acceptBarterOffer(id, userId);
        res.status(200).json({ message: 'Barter offer accepted', barter });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Decline a barter offer
export const declineOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const barter = await declineBarterOffer(id);
        res.status(200).json({ message: 'Barter offer declined', barter });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Cancel a barter offer
export const cancelOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const barter = await cancelBarterOffer(id, userId);
        res.status(200).json({ message: 'Barter offer canceled', barter });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
