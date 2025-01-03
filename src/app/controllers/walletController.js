import Wallet from '../models/Wallet.js';
import User from '../models/User.js'; // Import your User model
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { validatePaymentMethod } from '../services/paymentService.js';

// Create a wallet
export const createWallet = async (req, res) => {
  const { userId, currency } = req.body; // Accept userId and currency type

  try {
    // Validate currency type
    const fiatCurrencies = ['NGN', 'USD', 'CAD', 'EUR', 'GBP'];
    const cryptoCurrencies = ['BTC', 'ETH'];

    if (![...fiatCurrencies, ...cryptoCurrencies].includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency type. Must be a valid fiat or crypto currency.' });
    }

    // Initialize new wallet data
    let newWalletData = {
      userId, // Include userId for wallet association
      currency,
      balance: 0, // Default balance
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (cryptoCurrencies.includes(currency)) {
      // Generate new wallet address for crypto wallets
      let cryptoAddress;
      if (currency === 'ETH') {
        const wallet = ethers.Wallet.createRandom();
        cryptoAddress = wallet.address;
      } else if (currency === 'BTC') {
        // Create a random key pair
        const keyPair = bitcoin.ECPair.makeRandom(); // Access ECPair from the bitcoin namespace
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
        cryptoAddress = address; // Generate Bitcoin address from key pair
      }
      newWalletData.cryptoAddress = cryptoAddress; // Add crypto address for crypto wallets
    } else {
      // For fiat wallets, generate a random account number
      const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Generate a random 10-digit account number
      newWalletData.accountNumber = accountNumber; // Add account number for fiat wallets
    }

    // Create the wallet
    const newWallet = new Wallet(newWalletData);
    await newWallet.save();

    // Construct the response based on wallet type
    let response = {
      message: 'Wallet created successfully',
      wallet: {
        currency: newWallet.currency,
        balance: newWallet.balance,
        createdAt: newWallet.createdAt,
        updatedAt: newWallet.updatedAt,
      },
    };

    // Include specific fields based on wallet type
    if (cryptoCurrencies.includes(currency)) {
      response.wallet.cryptoAddress = newWallet.cryptoAddress; // Add crypto address for crypto wallets
    } else {
      response.wallet.accountNumber = newWallet.accountNumber; 
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error details:', error); 
    res.status(500).json({ message: 'Error creating wallet', error: error.message }); 
  }
};

// Regenerate crypto wallet address (for both BTC and ETH)
export const regenerateWalletAddress = async (req, res) => {
  const { walletId } = req.params;

  try {
    
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    let newCryptoAddress;
    if (wallet.currency === 'ETH') {
      const walletInstance = ethers.Wallet.createRandom();
      newCryptoAddress = walletInstance.address;
    } else if (wallet.currency === 'BTC') {
      const keyPair = bitcoin.ECPair.makeRandom();
      newCryptoAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
    }

    wallet.cryptoAddress = newCryptoAddress;
    await wallet.save();

    res.status(200).json({ message: 'Wallet address regenerated', newCryptoAddress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error regenerating wallet address' });
  }
};

// Get all users
export const getAllWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find(); 
    res.status(200).json({ wallets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching wallets' });
  }
};

// Get a specific wallet by wallet ID
export const getWalletById = async (req, res) => {
  const { walletId } = req.params;

  try {
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    res.status(200).json({ wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching wallet' });
  }
};

export const fundWallet = async (req, res) => {
  const { walletId, amount, paymentMethod } = req.body; 

  try {
  
    const isValidMethod = validatePaymentMethod(paymentMethod);
    if (!isValidMethod) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found.' });
    }

 
    const paymentSuccess = true; 
    if (!paymentSuccess) {
      return res.status(500).json({ message: 'Payment failed.' });
    }

  
    wallet.balance += amount;
    wallet.updatedAt = new Date(); 
    await wallet.save(); 

  
    res.status(200).json({
      message: 'Wallet funded successfully',
      wallet: {
        id: wallet._id,
        balance: wallet.balance,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error funding wallet:', error);
    res.status(500).json({ message: 'Error funding wallet', error: error.message });
  }
};


export const getWalletBalance = async (req, res) => {
  const { walletId } = req.params;

  try {
    // Find the wallet by ID
    const wallet = await Wallet.findById(walletId);

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Respond with the wallet balance
    res.status(200).json({
      message: 'Wallet balance retrieved successfully',
      balance: wallet.balance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ message: 'Error fetching wallet balance', error: error.message });
  }
};
