import { verifyToken } from '../../lib/utils/jwtUtils.js';

const verifyTokenMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Authorization header missing or invalid:', authHeader);
            return res.status(401).json({ error: 'Authorization token missing or invalid' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        console.log('Decoded Token:', decoded);

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};


export default verifyTokenMiddleware;
