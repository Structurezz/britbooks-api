import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Failed to authenticate token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.deletion?.isDeletionRequested || user.deletion?.isDeleted) {
            return res.status(403).json({
                message: 'Your account is scheduled for deletion or has been deleted. Access denied.'
            });
        }

        req.user = {
            id: user._id,
            role: user.role,
            email: user.email,
            settings: user.settings 
        };

        next();
    });
};

export default authMiddleware;
