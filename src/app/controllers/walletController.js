import * as WalletService from '../services/walletService.js';
import Wallet from '../models/Wallet.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import User from  '../models/User.js';
import {  generateOrderReceiptPdf } from '../../lib/utils/pdfGenerator.js';
import { parseISO, isAfter } from 'date-fns';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const generateTransactionId = () => {
    return uuidv4(); 
};


export const createWallet = async (req, res) => {
    try {
        const { userId } = req.body; // Get userId from request body

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const wallet = await WalletService.createWallet(userId);
        return res.status(201).json({ success: true, message: 'Wallet created successfully!', wallet });
    } catch (error) {
        console.error('Error creating wallet:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Credit (add funds to) the wallet.
 */
export const creditWallet = async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({ success: false, message: 'User ID and amount are required.' });
        }

        const wallet = await WalletService.creditWallet(userId, amount);
        return res.status(200).json({ success: true, message: 'Wallet credited successfully!', walletBalance: wallet.balance });
    } catch (error) {
        console.error('Error crediting wallet:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Make a payment from the wallet.
 */
export const makePayment = async (req, res) => {
    try {
        const { userId, amount, bookingId } = req.body; // Ensure bookingId is included in the request body

        if (!userId || !amount || !bookingId) {
            return res.status(400).json({ success: false, message: 'User ID, amount, and booking ID are required.' });
        }

        const { wallet, status } = await WalletService.makePayment(userId, amount, bookingId);
        return res.status(200).json({ success: true, message: 'Payment successful!', walletBalance: wallet.balance, status });
    } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};



/**
 * Get wallet details for the logged-in user.
 */
export const getWalletDetails = async (req, res) => {
    try {
        const userId = req.user?.userId; // Extract userId from JWT

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found.' });
        }

        res.status(200).json({ success: true, wallet });
    } catch (error) {
        console.error('Error retrieving wallet details:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};




/**
 * Get wallet by ID (Admin use case).
 */
export const getWalletById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid wallet ID format." });
        }

        // Fetch the wallet by ID
        const wallet = await Wallet.findById(id).exec();

        // Check if the wallet exists
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found." });
        }

        // Initialize categorized transactions
        const categorizedTransactions = {
            walletPayments: [],
            debits: [],
            credits: [],
            transfers: [],
            refunds: [],
        };

        // Categorize transactions
        wallet.transactions.forEach((tx) => {
            switch (tx.transactionCategory) {
                case "wallet_payment":
                    categorizedTransactions.walletPayments.push(tx);
                    break;
                case "refund":
                    categorizedTransactions.refunds.push(tx);
                    break;
                default:
                    // Separate by transaction type
                    if (tx.type === "debit") {
                        categorizedTransactions.debits.push(tx);
                    } else if (tx.type === "credit") {
                        categorizedTransactions.credits.push(tx);
                    } else if (tx.transactionCategory === "transfer") {
                        categorizedTransactions.transfers.push(tx);
                    }
                    break;
            }
        });

        // Return structured response
        return res.status(200).json({
            success: true,
            wallet: {
                walletId: wallet._id,
                userId: wallet.userId,
                balance: wallet.balance,
                transactions: {
                    walletPayments: categorizedTransactions.walletPayments,
                    debits: categorizedTransactions.debits,
                    credits: categorizedTransactions.credits,
                    transfers: categorizedTransactions.transfers,
                    refunds: categorizedTransactions.refunds,
                },
            },
        });

    } catch (error) {
        console.error("❌ Error fetching wallet:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};










/**
 * Get all transactions for a user.
 */
export const getAllTransactions = async (req, res) => {
    try {
        // Fetch all wallets and extract transactions
        const wallets = await Wallet.find({}, 'transactions').lean();

        // Flatten all transactions from all wallets into a single array
        const allTransactions = wallets.flatMap(wallet => wallet.transactions);

        return res.status(200).json({
            success: true,
            transactions: allTransactions, // 🔹 Returns all transactions, including `transactionCategory`
        });

    } catch (error) {
        console.error('❌ Error fetching transactions:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};


export const getAllWallets = async (req, res) => {
    try {
      const wallets = await Wallet.find().populate("userId", "fullName email"); // adjust as needed
      res.status(200).json({ wallets });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallets", error: error.message });
    }
  };
  


  
  
  

export const requestRefund = async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;

        if (!userId || !amount || !reason) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const refundRequest = await WalletService.requestRefund(userId, amount, reason);
        res.status(200).json({ success: true, message: "Refund request submitted", refundRequest });

    } catch (error) {
        console.error("Error requesting refund:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getPendingRefundsController = async (req, res) => {
    try {
        const pendingRefunds = await WalletService.getPendingRefunds();

        res.status(200).json({ 
            success: true, 
            pendingRefunds: pendingRefunds || []  
        });
    } catch (error) {
        console.error("Error fetching pending refunds:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


export const processRefundController = async (req, res) => {
    try {
        const { refundId, userId, action } = req.body;

        if (!refundId || !userId || !action) {
            return res.status(400).json({ success: false, message: "Refund ID, User ID, and action are required." });
        }

        console.log(`📌 Received refund request: ${refundId}, User: ${userId}, Action: ${action}`);

        const result = await WalletService.processRefund(refundId, userId, action);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            refundRequest: result.refundRequest,
            adminWalletBalance: result.adminWalletBalance,
            userWalletBalance: result.userWalletBalance,
        });
    } catch (error) {
        console.error("❌ Error in processRefundController:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getRefundsController = async (req, res) => {
    try {
        const pendingRefunds = await WalletService.getRefundsByStatus("pending");
        const approvedRefunds = await WalletService.getRefundsByStatus("approved");
        const rejectedRefunds = await WalletService.getRefundsByStatus("rejected");

        console.log("✅ Pending Refunds:", pendingRefunds);
        console.log("✅ Approved Refunds:", approvedRefunds);
        console.log("✅ Rejected Refunds:", rejectedRefunds);

        res.status(200).json({ 
            success: true, 
            refunds: {
                pending: pendingRefunds,
                approved: approvedRefunds,
                rejected: rejectedRefunds
            }
        });
    } catch (error) {
        console.error("❌ Error fetching refunds:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllWalletBalances = async (req, res) => {
    try {
        const wallets = await WalletService.getAllWalletBalances();
        return res.status(200).json({ success: true, wallets });
    } catch (error) {
        console.error("❌ Error fetching all wallet balances:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch wallet balances." });
    }
};

export const getWalletBalanceById = async (req, res) => {
    try {
        const { walletId } = req.params;

        if (!walletId) {
            return res.status(400).json({ success: false, message: "Wallet ID is required." });
        }

        const wallet = await WalletService.getWalletBalanceById(walletId);
        return res.status(200).json({ success: true, wallet });
    } catch (error) {
        console.error("❌ Error fetching wallet balance:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch wallet balance." });
    }
};


export const getRefundById = async (req, res) => {
    try {
        const { refundId } = req.params;

        if (!refundId) {
            return res.status(400).json({ success: false, message: "Refund ID is required." });
        }

        const refund = await WalletService.getRefundById(refundId);
        return res.status(200).json({ success: true, refund });
    } catch (error) {
        console.error("❌ Error fetching refund request:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch refund request." });
    }
};


export const transferFundsWalletToWallet = async (req, res) => {
    try {
      const { recipientUserId, amount, note, isRecurring, frequency, startDate } = req.body;
      const senderUserId = req.user?.id;
  
      // Validate required fields
      if (!recipientUserId || !amount) {
        return res.status(400).json({ success: false, message: 'recipientUserId and amount are required.' });
      }
  
      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a valid positive number.' });
      }
  
      // Validate recurring payment fields if isRecurring is true
      if (isRecurring) {
        if (!frequency || !startDate) {
          return res.status(400).json({ success: false, message: 'frequency and startDate are required for recurring payments.' });
        }
  
        const validFrequencies = ['weekly', 'bi-weekly', 'monthly'];
        if (!validFrequencies.includes(frequency)) {
          return res.status(400).json({ success: false, message: 'Invalid frequency. Must be weekly, bi-weekly, or monthly.' });
        }
  
        const parsedStartDate = parseISO(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid startDate format. Use ISO 8601 (e.g., 2025-06-20T00:00:00.000Z).' });
        }
  
        if (isAfter(new Date(), parsedStartDate)) {
          return res.status(400).json({ success: false, message: 'startDate must be in the future.' });
        }
  
        // Save recurring payment to sender's wallet
        const recurringPayment = {
          senderUserId,
          recipientUserId,
          amount: numericAmount,
          note: note || 'Recurring salary payment',
          frequency,
          startDate: parsedStartDate,
          nextRun: parsedStartDate,
          status: 'active',
        };
  
        const updatedWallet = await Wallet.findOneAndUpdate(
          { userId: senderUserId },
          { $push: { recurringPayments: recurringPayment } },
          { new: true }
        );
  
        if (!updatedWallet) {
          return res.status(404).json({ success: false, message: 'Sender wallet not found.' });
        }
  
        const newRecurringPayment = updatedWallet.recurringPayments[updatedWallet.recurringPayments.length - 1];

      return res.status(201).json({
        success: true,
        message: 'Recurring payment scheduled successfully',
        recurringPayment: newRecurringPayment,
      });
    }

  
      // Process immediate payment
      const result = await WalletService.transferFundsWalletToWallet({
        senderUserId,
        recipientUserId,
        amount: numericAmount,
        note,
      });

      const wallet = await Wallet.findOne({ userId: senderUserId });
      if (wallet) {
        const now = new Date();
  
        // Find all due recurring payments for this sender and recipient
        const dueRecurring = wallet.recurringPayments.find((payment) =>
          payment.recipientUserId.toString() === recipientUserId &&
          parseFloat(payment.amount) === numericAmount &&
          payment.status === 'active' &&
          payment.nextRun &&
          new Date(payment.nextRun) <= now
        );
  
        if (dueRecurring) {
          const currentNextRun = new Date(dueRecurring.nextRun);
          let newNextRun = null;
  
          switch (dueRecurring.frequency) {
            case 'weekly':
              newNextRun = new Date(currentNextRun.setDate(currentNextRun.getDate() + 7));
              break;
            case 'bi-weekly':
              newNextRun = new Date(currentNextRun.setDate(currentNextRun.getDate() + 14));
              break;
            case 'monthly':
              newNextRun = new Date(currentNextRun.setMonth(currentNextRun.getMonth() + 1));
              break;
          }
  
          if (newNextRun) {
            dueRecurring.nextRun = newNextRun;
            await wallet.save();
          }
        }
      }

      
  
      return res.status(200).json({
        success: true,
        message: 'Transfer successful',
        transactionId: result.transactionId,
        senderWalletBalance: result.senderWalletBalance,
        recipientWalletBalance: result.recipientWalletBalance,
        receiptBase64: result.receiptPdf, // optional
      });
    } catch (error) {
      console.error('❌ Transfer Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  };
  
  
  export const downloadTransferReceipt = async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = path.resolve(__dirname, `../temp_receipts/${fileName}`);
  
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Receipt not found' });
      }
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error('❌ Error serving receipt:', error);
      res.status(500).json({ success: false, message: 'Failed to download receipt.' });
    }
  };

  export const getTransactionById = async (req, res) => {
    try {
      const { transactionId } = req.params;
      if (!transactionId) {
        return res.status(400).json({ success: false, message: "Transaction ID is required." });
      }
  
      const wallets = await Wallet.find({ "transactions.transactionId": transactionId });
      if (!wallets || wallets.length === 0) {
        return res.status(404).json({ success: false, message: "Transaction not found." });
      }
  
      let debitTransaction = null;
      let creditTransaction = null;
      let debitWallet = null;
      let creditWallet = null;
  
      for (const wallet of wallets) {
        const transaction = wallet.transactions.find(tx => tx.transactionId === transactionId);
        if (transaction) {
          if (transaction.amount < 0) {
            debitTransaction = transaction;
            debitWallet = wallet;
          } else if (transaction.amount > 0) {
            creditTransaction = transaction;
            creditWallet = wallet;
          }
        }
      }
  
      if (!debitTransaction && !creditTransaction) {
        return res.status(404).json({ success: false, message: "Transaction not found in any wallet." });
      }
  
      const getUserInfo = async (id) => {
        if (!id) return { _id: null, fullName: "Unknown", email: "unknown@unknown.com", role: "Unknown" };
        if (id === "SYSTEM") return { _id: "SYSTEM", fullName: "System", email: "system@limpiar.online", role: "System" };
        if (id === "admin") return { _id: "admin", fullName: "Admin", email: "admin@limpiar.online", role: "Admin" };
        if (id === "internal-wallet") return { _id: "internal-wallet", fullName: "Internal Wallet", email: "internal@limpiar.online", role: "System" };
      
        // Check if the id is a valid ObjectId
        const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
        // Check if the id looks like an email
        const isEmail = (id) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      
        if (isEmail(id)) {
          const user = await User.findOne({ email: id }).select('-password').lean();
          if (!user) return { _id: null, fullName: "Unknown User", email: id, role: "Unknown" };
          return user;
        }
      
        if (!isValidObjectId(id)) {
          console.warn(`Invalid ObjectId or unrecognized ID format: ${id}`);
          return { _id: id, fullName: "Unknown User", email: "unknown@unknown.com", role: "Unknown" };
        }
      
        const user = await User.findById(id).select('-password').lean();
        if (!user) return { _id: id, fullName: "Unknown User", email: "unknown@unknown.com", role: "Unknown" };
        return user;
      };
  
      const [debitFromUser, debitToUser, creditFromUser, creditToUser] = await Promise.all([
        debitTransaction ? getUserInfo(debitTransaction.from) : null,
        debitTransaction ? getUserInfo(debitTransaction.to) : null,
        creditTransaction ? getUserInfo(creditTransaction.from) : null,
        creditTransaction ? getUserInfo(creditTransaction.to) : null,
      ]);
  
      const transactionForReceipt = debitTransaction || creditTransaction;
      const fromUserForReceipt = debitFromUser || creditFromUser;
      const toUserForReceipt = debitToUser || creditToUser;
  
      const pdfBuffer = await generateTransferReceiptPdf({
        transactionId: transactionForReceipt.transactionId,
        amount: Math.abs(transactionForReceipt.amount),
        fromUser: fromUserForReceipt,
        toUser: toUserForReceipt,
        timestamp: transactionForReceipt.timestamp || new Date(),
        note: transactionForReceipt.description || "",
        currency: transactionForReceipt.currency || "USD",
        fee: transactionForReceipt.fee || 0,
        status: transactionForReceipt.status || "Completed",
      });
  
      const base64PDF = pdfBuffer.toString('base64');
  
      return res.status(200).json({
        success: true,
        debitTransaction: debitTransaction
          ? {
              ...debitTransaction.toObject(),
              fromUser: debitFromUser,
              toUser: debitToUser,
              walletId: debitWallet._id,
            }
          : null,
        creditTransaction: creditTransaction
          ? {
              ...creditTransaction.toObject(),
              fromUser: creditFromUser,
              toUser: creditToUser,
              walletId: creditWallet._id,
            }
          : null,
        pdf: base64PDF,
      });
    } catch (error) {
      console.error("Error fetching transaction by ID:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  };
  

  export const getWalletTransactionsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID format." });
        }

        const wallet = await Wallet.findOne({ userId }).lean();

        if (!wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found for this user." });
        }

        const categorizedTransactions = {
            walletPayments: [],
            debits: [],
            credits: [],
            transfers: [],
            refunds: [],
            recurringPayments: [],
        };

        wallet.transactions.forEach((tx) => {
            switch (tx.transactionCategory) {
                case "wallet_payment":
                    categorizedTransactions.walletPayments.push(tx);
                    break;
                case "refund":
                    categorizedTransactions.refunds.push(tx);
                    break;
                default:
                    if (tx.type === "debit") {
                        categorizedTransactions.debits.push(tx);
                    } else if (tx.type === "credit") {
                        categorizedTransactions.credits.push(tx);
                    } else if (tx.transactionCategory === "transfer") {
                        categorizedTransactions.transfers.push(tx);
                    }
                    break;
            }
        });

        // Populate recurring payments with sender and recipient full names
        if (wallet.recurringPayments && Array.isArray(wallet.recurringPayments)) {
            const populatedRecurring = await Promise.all(
                wallet.recurringPayments.map(async (payment) => {
                    const [sender, recipient] = await Promise.all([
                        mongoose.Types.ObjectId.isValid(payment.senderUserId)
                            ? User.findById(payment.senderUserId).select('fullName').lean()
                            : null,
                        mongoose.Types.ObjectId.isValid(payment.recipientUserId)
                            ? User.findById(payment.recipientUserId).select('fullName').lean()
                            : null,
                    ]);
        
                    return {
                        ...payment,
                        senderFullName: sender?.fullName || null,
                        recipientFullName: recipient?.fullName || null,
                    };
                })
            );
        
            categorizedTransactions.recurringPayments = populatedRecurring;
        }
        

        return res.status(200).json({
            success: true,
            wallet: {
                walletId: wallet._id,
                userId: wallet.userId,
                balance: wallet.balance,
                transactions: categorizedTransactions,
            },
        });

    } catch (error) {
        console.error("❌ Error fetching wallet transactions by userId:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};