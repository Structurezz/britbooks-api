import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../../lib/utils/jwtUtils.js';
import { sendOtp } from '../../lib/utils/otpUtils.js';
import twilio from 'twilio';

// Twilio configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceId = process.env.TWILIO_VERIFY_SERVICE_SID;


// Your existing signup function
const signup = async (userData) => {
    const { fullName, email, phoneNumber, password, role } = userData;

    try {
        // Validate inputs
        if (!password || typeof password !== 'string') {
            throw new Error('Invalid password provided');
        }
        if (!phoneNumber || !email) {
            throw new Error('Phone number and email are required');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
        if (existingUser) {
            throw new Error('User with provided email or phone number already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user instance
        const user = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            role: role || 'user', // Default to 'user' if no role is provided
            isVerified: false,
        });

        // Save user
        await user.save();

        // Send OTP via Twilio
        await client.verify.services(serviceId).verifications.create({
            to: `+${phoneNumber}`,
            channel: 'sms',
        });

        return {
            message: 'Registration successful. OTP sent to your phone number.',
            userId: user._id,
        };
    } catch (error) {
        console.error('Signup error:', error.message);
        throw new Error(`Signup failed: ${error.message}`);
    }
};


// Verify OTP - Confirms the OTP and verifies the user
const verifyOtp = async (userId, otp) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Verify OTP with Twilio
        const verificationCheck = await client.verify.services(serviceId)
            .verificationChecks.create({ to: `+${user.phoneNumber}`, code: otp });

        if (!verificationCheck.valid) {
            throw new Error('Invalid OTP');
        }

        // Generate auth token
        const token = generateToken({ id: user._id, role: user.role });

        return { message: 'Login verified successfully', token };
    } catch (error) {
        console.error('Login OTP verification error:', error.message);
        throw new Error(`Verification failed: ${error.message}`);
    }
};

// Login - Authenticates user by email/phone and password
const login = async (credentials) => {
    const { email, phoneNumber, password } = credentials;

    try {
        const user = await User.findOne({ $or: [{ email }, { phoneNumber }] });

        if (!user) {
            throw new Error('User not found');
        }
        if (!user.isVerified) {
            throw new Error('User is not verified');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Send OTP via Twilio for verification after login
        await client.verify.services(serviceId).verifications.create({
            to: `+${user.phoneNumber}`,
            channel: 'sms',
        });

        return { message: 'Login successful. OTP sent for verification.', userId: user._id };
    } catch (error) {
        console.error('Login error:', error.message);
        throw new Error(error.message);
    }
};

// Get User by ID
const getUserById = async (id) => {
    try {
        const user = await User.findById(id).select('-password');
        if (!user) throw new Error('User not found');
        return user;
    } catch (error) {
        console.error('Get user error:', error.message);
        throw new Error(error.message);
    }
};

// Update User
const updateUser = async (id, updateData) => {
    try {
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');

        Object.assign(user, updateData);
        await user.save();

        return { message: 'User updated successfully', user };
    } catch (error) {
        console.error('Update user error:', error.message);
        throw new Error(error.message);
    }
};





// Delete User
const deleteUser = async (id) => {
    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) throw new Error('User not found');
        return { message: 'User deleted successfully' };
    } catch (error) {
        console.error('Delete user error:', error.message);
        throw new Error(error.message);
    }
};

export { signup, verifyOtp, login, getUserById, updateUser, deleteUser };
