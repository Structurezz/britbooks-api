// authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next(); 
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this resource.' });
        }
        next();
    };
};

export const authenticateUser = (req, res, next) => {
    // Your authentication logic here
    // Example:
    const token = req.headers['authorization'];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    // Verify the token and user
    // You can use JWT or other methods
    try {
      // Assuming you're using JWT:
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach user info to the request
      next(); // Call next middleware
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
  