import { sendVerificationCode, checkVerificationCode} from '../services/twilioService.js';
import { signup, login, getUserById, updateUser, deleteUser } from '../services/authService.js';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import User from '../models/User.js';
import { generateToken } from '../../lib/utils/jwtUtils.js';

const validateSignupData = (data) => {
    const schema = Joi.object({
        fullName: Joi.string().min(2).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(), 
        phoneNumber: Joi.string().regex(/^\+?[1-9]\d{1,14}$/).required(),
    });

    const { error } = schema.validate(data);
    if (error) throw new Error(`Validation failed: ${error.details[0].message}`);
};


const hashPassword = async (password) => {
    if (!password || typeof password !== 'string') {
        throw new Error('Invalid password. Password must be a non-empty string');
    }

    const saltRounds = 30; // Define the number of salt rounds
    return await bcrypt.hash(password, saltRounds); // Properly hash the password
};

export const userSignup = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber, role } = req.body;

        // Validate input
        validateSignupData({ fullName, email, password, phoneNumber });

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
        if (existingUser) {
            throw new Error('User with provided email or phone number already exists');
        }

        // Call the signup function with the provided data
        const result = await signup({
            fullName,
            email,
            password,
            phoneNumber,
            role: role || 'user', // Default to 'user' if no role is provided
        });

        // Send verification code via SMS
        await sendVerificationCode(phoneNumber); // Ensure this function sends the OTP

        // Indicate successful registration
        res.status(201).json({
            message: ' Please verify your number to complete your registration.',
            result: {
                userId: result.userId,
                role: result.role, // Include role in the response
                createdAt: new Date().toISOString(), // Registration time
            }
        });
    } catch (error) {
        console.error('Error during user signup:', error.message);
        res.status(400).json({ error: error.message });
    }
};



// Verify OTP for signup






export const userLogin = async (req, res) => {
    try {
        const { email, password, phoneNumber } = req.body;

        // Check if user exists
        const user = await User.findOne({ $or: [{ email }, { phoneNumber }] });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Send OTP for login verification
        await sendVerificationCode(user.phoneNumber);

        res.status(200).json({
            message: ' OTP sent for verification.',
            userId: user._id,
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(400).json({ error: error.message });
    }
};




export const verifyOtp = async (req, res) => {
    const { phoneNumber, code, isSignup } = req.body;

    try {
        // Verify OTP using Twilio
        const verificationResult = await checkVerificationCode(phoneNumber, code);

        if (verificationResult.success) {
            // Check if the user already exists
            let user = await User.findOne({ phoneNumber });

            if (isSignup) {
                // If signup, ensure the user doesn't already exist
                if (user) {
                    throw new Error('User already exists with this phone number');
                }

                // Create a new user
                const newUser = new User({
                    phoneNumber,
                    isVerified: true,
                });

                await newUser.save();
                user = newUser; 
            } else {
                // For login, ensure the user exists
                if (!user) {
                    throw new Error('User not found. Please sign up first.');
                }

                if (!user.isVerified) {
                    user.isVerified = true;
                    await user.save();
                }
            }

            // Generate JWT token
            const token = generateToken({ userId: user._id, email: user.email, role: user.role });

            // Respond with success message and user details
            res.status(200).json({
                message: isSignup ? 'Signup verification successful' : 'Login verification successful',
                token,
                userDetails: {
                    userId: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                },
            });
        } else {
            res.status(400).json({ error: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error during OTP verification:', error.message);
        res.status(400).json({ error: error.message });
    }
};




export const getUser = async (req, res) => {
    try {
        // Validate the token and extract user information
        const userId = req.user.userId; 
        
        // Optionally, check if the user is requesting their own data or an admin is accessing another user's data
        if (userId !== req.params.id) {
            // Only admins can access another user's data
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get the user details
        const result = await getUserById(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error during get user:', error.message);
        res.status(404).json({ error: error.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        console.log('Request User:', req.user);
        const users = await User.find();
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }
        res.status(200).json(users);
    } catch (error) {
        console.error('Error during get all users:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        console.log('User:', req.user); 
        console.log('Updating User ID:', req.params.id); 
        

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update user profiles' });
        }

        // Proceed with updating the user profile
        const result = await updateUser(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error during update user profile:', error.message);
        res.status(400).json({ error: error.message });
    }
};





export const deleteUserAccount = async (req, res) => {
    try {
        const result = await deleteUser(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error during delete user account:', error.message);
        res.status(400).json({ error: error.message });
    }
};
