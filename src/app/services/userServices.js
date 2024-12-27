import User from '../models/userModel.js';

// Create a new user (for signup)
export const createUser = async (userData) => {
    const user = new User(userData);
    await user.save();
    return user;
};

// Get a user by ID
export const getUserById = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
};

// Update user details
export const updateUser = async (userId, updateData) => {
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) throw new Error('User not found');
    return user;
};

// Delete a user
export const deleteUser = async (userId) => {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new Error('User not found');
    return user;
};

// Get all users (only accessible by admin)
export const getAllUsers = async () => {
    const users = await User.find();
    return users;
};
