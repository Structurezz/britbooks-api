import ForexTransaction from '../models/ForexTransaction.js';
import User from '../models/User.js';

// Initiate a new forex transaction (buy/sell)
export const initiateForexTransaction = async (req, res) => {
  const { userId, sourceCurrency, targetCurrency, transactionAmount, exchangeRate, transactionType } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate supported currencies
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR']; // Extend this list
    if (!supportedCurrencies.includes(sourceCurrency) || !supportedCurrencies.includes(targetCurrency)) {
      return res.status(400).json({ message: 'Unsupported currency' });
    }

    const newTransaction = new ForexTransaction({
      user: userId,
      sourceCurrency,
      targetCurrency,
      transactionAmount,
      exchangeRate,
      transactionType,
      transactionStatus: 'pending' // Default to pending
    });

    await newTransaction.save();

    res.status(201).json({ message: 'Forex transaction initiated successfully', transaction: newTransaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while initiating the forex transaction' });
  }
};

// Fetch all forex transactions by a specific user
export const fetchForexTransactionsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = await ForexTransaction.find({ user: userId });
    if (!transactions) return res.status(404).json({ message: 'No forex transactions found for this user' });

    res.status(200).json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching forex transactions for user' });
  }
};

// Fetch all forex transactions for admin (for management purposes)
export const fetchAllForexTransactions = async (req, res) => {
  try {
    const transactions = await ForexTransaction.find();
    res.status(200).json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all forex transactions' });
  }
};

// Update the status of a forex transaction
export const updateForexTransactionStatus = async (req, res) => {
  const { transactionId } = req.params;
  const { transactionStatus, transactionFee } = req.body;

  try {
    const transaction = await ForexTransaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    transaction.transactionStatus = transactionStatus || transaction.transactionStatus;
    transaction.transactionFee = transactionFee || transaction.transactionFee;
    transaction.updatedAt = Date.now();

    await transaction.save();

    res.status(200).json({ message: 'Forex transaction status updated successfully', transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating forex transaction status' });
  }
};
