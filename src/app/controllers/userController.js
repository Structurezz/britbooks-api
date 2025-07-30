import * as userService from '../services/userServices.js';
import User from '../models/User.js'
import mongoose from "mongoose";
import Wallet from '../models/Wallet.js';

// Get All Users
export const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



  
  
  



// Get User by ID
export const getUserById = async (req, res) => {
    try {
      const { userId } = req.params;
  
      const user = await User.findById(userId, { password: 0 }).lean();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      let wallet;
  
      if (user.role === 'admin') {
        wallet = await Wallet.findOne({ type: 'admin' });
        if (!wallet) {
          return res.status(500).json({ error: 'Central wallet not found' });
        }
      } else {
        wallet = await Wallet.findOne({ userId });
        if (!wallet) {
          wallet = await Wallet.create({
            userId,
            balance: 0,
            currency: 'NGN',
            type: 'user',
          });
        }
      }
  
      res.status(200).json({
        ...user,
        wallet,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };





export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updatedUser = await userService.updateUser(userId, req.body);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const fetchUserById = async (req, res) => {
    const { id } = req.params; // Assuming you're passing the user ID in the request params
    try {
        const user = await userService.getUserById(id);
        res.status(200).json(user); // This will include phoneNumber in the response
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const handleUserSettings = async (req, res) => {
    const { userId, actionType } = req.params;
    const { payload } = req.body;
    const currentUser = req.user;

    try {
        // Log the current user role to check if it's correctly populated
        console.log("Current User Role:", currentUser.role);
        console.log("Current User:", currentUser);

        const result = await userService.handleUserSettings(userId, actionType, payload, currentUser);
        res.status(200).json({
            success: true,
            message: "User settings updated successfully.",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const assignAdminType = async (req, res) => {
    const { userId } = req.params;
    const { adminType } = req.body; // e.g. "super_admin", "ops_admin"
    const currentUser = req.user;
  
    try {
      // TEMP: Allow any admin to assign type (until setup is finalized)
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can assign admin type for now.' });
      }
  
      // Validate adminType
      const validAdminTypes = [
        'super_admin',
        'support_admin',
        'compliance_admin',
        'ops_admin',
        'billing_admin'
      ];
  
      if (!validAdminTypes.includes(adminType)) {
        return res.status(400).json({ error: 'Invalid admin type.' });
      }
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      if (user.role !== 'admin') {
        return res.status(400).json({ error: 'User is not an admin. Assign admin role first.' });
      }
  
      user.adminType = adminType;
      await user.save();
  
      res.status(200).json({
        message: `Admin type '${adminType}' assigned successfully`,
        user
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const handleAccountClosureRequest = async (req, res) => {
    const { userId } = req.params;
    const { password, feedback } = req.body;


    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }
  
    try {
      const result = await userService.requestAccountClosure(userId, password, feedback);
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  
  

  export const handleAccountClosureCodeVerification = async (req, res) => {
    const { userId } = req.params;
    const { code } = req.body;
  
    try {
      const result = await userService.verifyAccountClosureCode(userId, code);
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };

  export const handleCancelAccountClosureRequest = async (req, res) => {
    const { userId } = req.params;
    const currentUser = req.user;
  
    try {
      // Ensure only admins can perform this action
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can cancel account closure requests.'
        });
      }
  
      const result = await userService.cancelAccountClosureRequest(userId);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      console.error('❌ Account closure cancellation failed:', err.message);
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };
  
  