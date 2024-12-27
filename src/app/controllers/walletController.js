import Wallet from '../models/Wallet.js';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';

// Create a wallet
export const createWallet = async (req, res) => {
  const { userId, type, currency } = req.body;

  try {
    // Validate currency type (could add more validation)
    if (!['BTC', 'ETH'].includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency type' });
    }

    // Generate new wallet address based on type and currency
    let cryptoAddress;
    if (currency === 'ETH') {
      const wallet = ethers.Wallet.createRandom();
      cryptoAddress = wallet.address;
    } else if (currency === 'BTC') {
      const keyPair = bitcoin.ECPair.makeRandom();
      cryptoAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
    }

    const newWallet = new Wallet({
      userId,
      type,
      currency,
      cryptoAddress,
    });

    await newWallet.save();
    res.status(201).json({ message: 'Wallet created successfully', wallet: newWallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating wallet' });
  }
};

// Regenerate crypto wallet address (for both BTC and ETH)
export const regenerateWalletAddress = async (req, res) => {
  const { walletId } = req.params;

  try {
    // Find the wallet
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

// Get all wallets for a user
export const getWalletsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const wallets = await Wallet.find({ userId });
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
