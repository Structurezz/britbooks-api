import CryptoTransaction from '../models/CryptoTransaction.js';
import User from '../models/User.js';
import { getExchangeRate } from '../services/cryptoService.js'; // Adjust the import path as necessary

// Initiate a new crypto transaction with exchange rate calculation
export const initiateCryptoTransaction = async (req, res) => {
  const { userId, sourceCurrency, targetCurrency, transactionAmount, transactionType } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate supported currencies
    const supportedCurrencies = ['BTC', 'ETH', 'XRP', 'LTC', 'DOGE', 'ADA', 'SOL', 'USDT', 'BNB', 'DOT'];
    if (!supportedCurrencies.includes(sourceCurrency) || !supportedCurrencies.includes(targetCurrency)) {
      return res.status(400).json({ message: 'Unsupported currency' });
    }

    // Fetch the exchange rate
    const exchangeRate = await getExchangeRate(sourceCurrency, targetCurrency);
    if (!exchangeRate) {
      return res.status(500).json({ message: 'Failed to fetch exchange rate' });
    }

    const newTransaction = new CryptoTransaction({
      user: userId,
      sourceCurrency,
      targetCurrency,
      transactionAmount,
      transactionType,
      transactionStatus: 'pending', // Default to pending
      exchangeRate, // Store the exchange rate in the transaction
    });

    await newTransaction.save();

    res.status(201).json({ message: 'Crypto transaction initiated successfully', transaction: newTransaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while initiating the transaction' });
  }
};
// Fetch all transactions by a specific user
export const fetchTransactionsByUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const transactions = await CryptoTransaction.find({ user: userId });
        if (!transactions) return res.status(404).json({ message: 'No transactions found for this user' });

        res.status(200).json({ transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching transactions for user' });
    }
};

// Fetch all crypto transactions for admin (for management)
export const fetchAllCryptoTransactions = async (req, res) => {
    try {
        const transactions = await CryptoTransaction.find();
        res.status(200).json({ transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching all transactions' });
    }
};

// Update the status of a crypto transaction
export const updateTransactionStatus = async (req, res) => {
    const { transactionId } = req.params;
    const { transactionStatus, transactionFee } = req.body;

    try {
        const transaction = await CryptoTransaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        transaction.transactionStatus = transactionStatus || transaction.transactionStatus;
        transaction.transactionFee = transactionFee || transaction.transactionFee;
        transaction.updatedAt = Date.now();

        await transaction.save();

        res.status(200).json({ message: 'Transaction status updated successfully', transaction });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating transaction status' });
    }
};
