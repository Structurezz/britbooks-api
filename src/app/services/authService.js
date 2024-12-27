import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../../lib/utils/jwtUtils.js';
import { sendOtp } from '../../lib/utils/otpUtils.js';

// Signup
const signup = async (userData) => {
    const { fullName, email, phoneNumber, password, role } = userData;

    try {
        // Validate password input
        if (!password || typeof password !== 'string') {
            throw new Error('Invalid password provided');
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash the password securely
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a 6-digit OTP and set an expiration time
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60000); // Current time + 10 minutes

        // Create a new user instance
        const user = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            role: role || 'user',
            otp,
            otpExpiry,
        });

        // Save the user to the database
        await user.save();

        // Send OTP via your OTP service
        await sendOtp(phoneNumber, otp);

        // Return a success message and user ID
        return { message: 'OTP sent successfully', userId: user._id };
    } catch (error) {
        console.error('Signup failed:', error.message);
        throw new Error(`Signup failed: ${error.message}`);
    }
};

// Login
const login = async (email, password) => {
    try {
        // Find user by email
        const user = await User.findOne({ email });
        
        // Check if user exists and is verified
        if (!user) {
            throw new Error('User not found');
        }
        
        if (!user.isVerified) {
            throw new Error('User not verified');
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = generateToken({ id: user._id, role: user.role });

        // Return success message and token
        return { message: 'Login successful', token };
    } catch (error) {
        // Log error for debugging (optional)
        console.error('Login error:', error.message);

        // Return specific error messages
        if (error.message === 'User not found') {
            throw new Error('No user found with this email.');
        }
        
        if (error.message === 'User not verified') {
            throw new Error('Please verify your email before logging in.');
        }

        if (error.message === 'Invalid credentials') {
            throw new Error('Incorrect password. Please try again.');
        }

        // Catch any other unexpected errors
        throw new Error('An unexpected error occurred during login.');
    }
};

// Get User by ID
const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};

// Update User
const updateUser = async (id, updateData) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');

    Object.assign(user, updateData);
    await user.save();

    return { message: 'User updated successfully', user };
};

// Delete User
const deleteUser = async (id) => {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new Error('User not found');
    return { message: 'User deleted successfully' };
};

export { signup, login, getUserById, updateUser, deleteUser };
