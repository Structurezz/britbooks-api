import Investment from '../models/Investment.js';
import User from '../models/User.js';

// Create a new investment
export const createInvestment = async (req, res) => {
  const { userId, investmentType, amountInvested, investmentTerm, returnRate } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newInvestment = new Investment({
      user: userId,
      investmentType,
      amountInvested,
      investmentTerm,
      returnRate,
      investmentStatus: 'pending' // Default status
    });

    await newInvestment.save();

    res.status(201).json({ message: 'Investment created successfully', investment: newInvestment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the investment' });
  }
};

// Fetch all investments by a specific user
export const getInvestmentsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const investments = await Investment.find({ user: userId });
    if (!investments || investments.length === 0) {
      return res.status(404).json({ message: 'No investments found for this user' });
    }

    res.status(200).json({ investments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching investments for user' });
  }
};

// Fetch all investments for admin (view all users' investments)
export const getAllInvestments = async (req, res) => {
  try {
    const investments = await Investment.find();
    res.status(200).json({ investments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all investments' });
  }
};

// Update the status of an investment
export const updateInvestmentStatus = async (req, res) => {
  const { investmentId } = req.params;
  const { investmentStatus } = req.body;

  try {
    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    investment.investmentStatus = investmentStatus || investment.investmentStatus;
    investment.updatedAt = Date.now();

    await investment.save();

    res.status(200).json({ message: 'Investment status updated successfully', investment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating investment status' });
  }
};

// Delete an investment (admin only)
export const deleteInvestment = async (req, res) => {
  const { investmentId } = req.params;

  try {
    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    await investment.remove();
    res.status(200).json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting investment' });
  }
};
