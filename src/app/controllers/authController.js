import { sendVerificationCode, checkVerificationCode } from '../services/twilioService.js';
import { signup, login, getUserById, updateUser, deleteUser } from '../services/authService.js';
import bcrypt from 'bcrypt';
import Joi from 'joi';

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

    const saltRounds = 10; // Define the number of salt rounds
    return await bcrypt.hash(password, saltRounds); // Properly hash the password
};


export const userSignup = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber } = req.body;

        // Validate input
        validateSignupData({ fullName, email, password, phoneNumber });

        // Send SMS verification code
        const isCodeSent = await sendVerificationCode(phoneNumber);
        if (!isCodeSent) {
            return res.status(400).json({ error: 'Failed to send verification code' });
        }

        // Hash the password before storing
        console.log('Password before hashing:', password); // Debugging log
        const hashedPassword = await hashPassword(password);
        console.log('Hashed Password:', hashedPassword); // Debugging log

        // Proceed with the regular signup process
        const result = await signup({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber,
        });

        res.status(201).json({ message: 'User signed up successfully', result });
    } catch (error) {
        console.error('Error during user signup:', error.message);
        res.status(400).json({ error: error.message });
    }
};

export const userLogin = async (req, res) => {
    try {
        const { email, password, phoneNumber, code } = req.body;

        // Step 1: Verify the provided code
        const verificationResult = await checkVerificationCode(phoneNumber, code);

        if (!verificationResult.success) {
            return res.status(400).json({ error: verificationResult.message });
        }

        // Step 2: Proceed with the regular login process
        const result = await login(email, password);

        // Step 3: Respond with the login result
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



export const getUser = async (req, res) => {
    try {
        const result = await getUserById(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const result = await updateUser(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteUserAccount = async (req, res) => {
    try {
        const result = await deleteUser(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
