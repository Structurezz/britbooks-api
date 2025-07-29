import { register, verifyRegistration, verifyLogin, login, resendOtp,forgotPassword,changePassword,resetPassword } from '../services/authService.js';
import {createWallet, getWalletDetails} from '../services/walletService.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js'; 
import jwt from 'jsonwebtoken';
import crypto from "crypto";
import { generateRandomPassword } from "../../lib/utils/utils.js"; // Import the function
import axios from "axios";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";


dotenv.config(); 

export const registerUser = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, confirmPassword, role } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const validRoles = ["user", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const { hashedPassword, userId } = await register(fullName, email, phoneNumber, password, role);

    const token = jwt.sign(
        {
          userId,
          fullName,
          email,
          phoneNumber,        
          hashedPassword,      
          role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
    console.log("✅ User registered successfully:", { userId, email });

    res.status(200).json({
      message: "Verification codes sent to your phone and email. Use either code to verify.",
      token,
      user: { userId, fullName, email, role }
    });

  } catch (error) {
    console.error("❌ Registration Error:", error.message);
    res.status(400).json({ message: error.message });
  }
};




  
export const verifyRegistrationUser = async (req, res) => {
    try {
      const { code } = req.body;
      console.log('📥 Verify registration request:', { code });
  
      if (!code) {
        return res.status(400).json({ message: 'Verification code is required.' });
      }
  
      const cleanedCode = code.toString().trim();
      if (!/^\d{6}$/.test(cleanedCode)) {
        return res.status(400).json({ message: 'Invalid OTP format. Must be a 6-digit number.' });
      }
  
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized. Token missing.' });
      }
  
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
      }
  
      const { fullName, email, phoneNumber: decodedPhone, hashedPassword } = decoded;
  
      if (!fullName || !email || !decodedPhone || !hashedPassword) {
        return res.status(400).json({ message: 'Incomplete registration token payload.' });
      }
  
      const result = await verifyRegistration(decodedPhone, cleanedCode, {
        fullName,
        email,
        phoneNumber: decodedPhone,
        hashedPassword,
      });
  
      const { userId } = result.userDetails;
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found after verification.' });
      }
  
      // Mark as verified for specific roles
      if (
        (user.role === 'user' || user.role === 'user') &&
        !user.isVerified
      ) {
        user.isVerified = true;
        user.status = 'verified';
        await user.save();
        console.log(`🎉 ${user.role} ${user.email} verified during registration`);
      }
  
      // Ensure wallet exists
      let wallet;
      if (user.role === 'admin') {
        wallet = await Wallet.findOne({ type: 'admin' });
        if (!wallet) {
          return res.status(500).json({ message: 'Central wallet not found. Please contact support.' });
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
  
      return res.status(200).json({
        message: 'Registration successful.',
        token: result.token,
        user: {
          userId: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        wallet,
      });
    } catch (error) {
      console.error('❌ Error during registration verification:', error.message);
      res.status(400).json({ message: 'An error occurred during verification.', error: error.message });
    }
  };
  



  



  export const loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }
  
      const { userId } = await login(email, password);
  
      const user = await User.findById(userId).select('role phoneNumber email');
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      const token = jwt.sign(
        {
          userId,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      res.status(200).json({ message: 'Verify your phone number.', token });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  

  export const verifyLoginUser = async (req, res) => {
    try {
      const { code } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
  
      console.log('📥 Login verification request:', { code });
  
      if (!token) {
        return res.status(401).json({ message: 'Authorization token is missing.' });
      }
  
      if (!code) {
        return res.status(400).json({ message: 'Verification code is required.' });
      }
  
      const cleanedCode = code.toString().trim();
      if (!/^\d{6}$/.test(cleanedCode)) {
        return res.status(400).json({ message: 'Invalid OTP format. Must be a 6-digit number.' });
      }
  
      // Decode JWT to get userId and phoneNumber
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
      }
  
      const { userId, phoneNumber } = decoded;
  
      if (!userId) {
        return res.status(400).json({ message: 'Incomplete login token payload.' });
      }
  
      // Call the service function that handles verification logic
      const result = await verifyLogin(phoneNumber, cleanedCode, userId);
  
      const { userDetails, token: finalToken } = result;
  
      // Ensure wallet exists
      let wallet;
      if (userDetails.role === 'admin') {
        wallet = await Wallet.findOne({ type: 'admin' });
        if (!wallet) {
          return res.status(500).json({ message: 'Central wallet not found. Please contact support.' });
        }
      } else {
        wallet = await Wallet.findOne({ userId: userDetails.userId });
        if (!wallet) {
          wallet = await Wallet.create({
            userId: userDetails.userId,
            balance: 0,
            currency: 'GBP',
            type: 'user',
          });
        }
      }
  
      return res.status(200).json({
        message: 'Login successful.',
        token: finalToken,
        user: {
          ...userDetails,
          currency: 'GBP',
        },
        wallet,
      });
  
    } catch (error) {
      console.error('❌ Error during login verification:', error.message);
      return res.status(400).json({ message: 'An error occurred during login verification.', error: error.message });
    }
  };
  





export const logoutUser = async (req, res) => {
  try {
    res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    res.status(500).json({ message: "An error occurred during logout.", error: error.message });
  }
};


  




export const resendOtpHandler = async (req, res) => {
  try {
   
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID is missing.' });
    }

    const response = await resendOtp(userId);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body; 
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const response = await forgotPassword(email);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const resetPasswordController = async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body;

    if (!userId || !code || !newPassword) {
      return res.status(400).json({ message: "User ID, code, and new password are required." });
    }

    const response = await resetPassword(userId, code, newPassword);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const changePasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const response = await changePassword(userId, currentPassword, newPassword);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};








/**
* Generate & Send Login Credentials via GoHighLevel
*/
export const generateLoginCredentials = async (req, res) => {
  try {
      const { email } = req.body;

      if (!email) {
          return res.status(400).json({ success: false, error: "Email is required." });
      }

      const user = await User.findOne({ email });

      if (!user) {
          return res.status(404).json({ success: false, error: "User not found." });
      }

      // 🔑 Generate Password
      const password = generateRandomPassword();
      user.password = await bcrypt.hash(password, 10);
      user.status = "approved";  // Auto-approve on first login credential generation
      await user.save();

      // 📤 Call GoHighLevel Service to send login details
      const ghlResponse = await sendLoginCredentialsToGHL(user, password);

      res.status(200).json({
          success: true,
          message: "Login credentials generated & sent via GoHighLevel.",
          ghlResponse
      });

  } catch (error) {
      console.error("❌ Error generating login credentials:", error);
      res.status(500).json({ success: false, error: error.message });
  }
};









export const addAdmin = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, adminType } = req.body;

    if (!fullName || !email || !phoneNumber || !adminType) {
      return res.status(400).json({
        message: "Full name, email, phone number, and admin type are required."
      });
    }

    const validAdminTypes = [
      "super_admin",
      "support_admin",
      "compliance_admin",
      "ops_admin",
      "billing_admin"
    ];

    if (!validAdminTypes.includes(adminType)) {
      return res.status(400).json({
        message: `Invalid admin type. Allowed values: ${validAdminTypes.join(", ")}.`
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "A user with this email already exists."
      });
    }

    const rawPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = new User({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      role: "admin",
      adminType,
      isVerified: true,
      status: "approved"
    });

    await newUser.save();

    const ghlResponse = await sendAdminLoginCredentials(newUser, rawPassword);

    res.status(201).json({
      success: true,
      message: "Admin user created successfully.",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        adminType: newUser.adminType
      },
      ghlResponse
    });

  } catch (error) {
    console.error("❌ Error adding admin:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

