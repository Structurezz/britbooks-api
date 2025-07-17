import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js'; 
import { generateTransactionId, generateOrderReceiptPdf  } from '../../lib/utils/pdfGenerator.js';






export const createWallet = async (userId) => {
    // Validate if the user exists before creating a wallet
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
    });

    await wallet.save();
    return wallet;
};

export const creditWallet = async (userId, amount) => {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');

    wallet.balance += amount;

    wallet.transactions.push({
        amount,
        type: 'credit',
        transactionCategory: 'cleaning_payment',
        transactionId: generateTransactionId(),
        description: 'Payment credited to wallet',
    });

    await wallet.save();
    return wallet;
};

export const makePayment = async (userId, amount, bookingId) => {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');

    if (wallet.balance < amount) {
        throw new Error('Insufficient funds in wallet');
    }

    // Deduct the amount from the wallet balance
    wallet.balance -= amount;

    // Create a new transaction object
    const transaction = {
        transactionId: generateTransactionId(),
        amount,
        type: 'debit',
        transactionCategory: 'cleaning_payment',
        description: `Payment for scheduled booking ${bookingId}`,
        status: 'completed', // Ensure the status is set to completed
    };

    // Push the transaction to the wallet's transactions array
    wallet.transactions.push(transaction);

    // Save the wallet with updated balance and transactions
    await wallet.save();
    
    // Return both the updated wallet and the status
    return { wallet, status: transaction.status }; 
};






export const getWalletDetails = async (req, res) => {
    try {
        const userId = req.session.userId; // Assuming userId is stored in the session

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found.' });
        }

        res.status(200).json({ wallet });
    } catch (error) {
        console.error('Error retrieving wallet details:', error.message); // Log error for debugging
        res.status(400).json({ message: error.message });
    }
};

export const getWalletById = async (id) => {
    const wallet = await Wallet.findById(id).lean();
    if (!wallet) {
        throw new Error('Wallet not found');
    }

    // 🔹 Group transactions by `transactionCategory`
    const categorizedTransactions = wallet.transactions.reduce((acc, transaction) => {
        const category = transaction.transactionCategory?.trim() || "Uncategorized"; // Default category
        
        if (!acc[category]) {
            acc[category] = [];
        }

        acc[category].push({
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            from: transaction.from,
            to: transaction.to,
            status: transaction.status,
            type: transaction.type,
            description: transaction.description || '',
            timestamp: transaction.timestamp,
            bookingId: transaction.bookingId || null
        });

        return acc;
    }, {});

    return {
        ...wallet,
        transactions: categorizedTransactions, // 🔹 Now grouped by category
    };
};

export const requestRefund = async (userId, amount, reason) => {
    if (!userId || !amount || !reason) throw new Error('User ID, amount, and reason are required.');

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found.');

  
    if (!wallet.refundRequests) {
        wallet.refundRequests = [];
    }

    const refundRequest = {
        _id: new mongoose.Types.ObjectId(),
        amount,
        reason,
        status: 'pending',
        requestDate: new Date(),
    };

    wallet.refundRequests.push(refundRequest);
    await wallet.save({ validateModifiedOnly: true });

    return refundRequest;
};

export const getPendingRefunds = async () => {
    return Wallet.find(
        { refundRequests: { $elemMatch: { status: "pending" } } }, 
        "userId refundRequests"
    );
};


export const processRefund = async (refundId, userId, action) => {
    try {
        if (!refundId || !userId || !action) {
            console.error("❌ Error: Missing required parameters.");
            return { success: false, error: "Refund ID, User ID, and action are required." };
        }

        console.log(`🔍 Processing refund request ${refundId} for user ${userId} - Action: ${action}`);

        const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!userWallet) throw new Error("User wallet not found.");

        const refundRequest = userWallet.refundRequests.find(req => req._id.toString() === refundId);
        if (!refundRequest) throw new Error("Refund request not found.");

        if (refundRequest.status !== 'pending') throw new Error("Refund request has already been processed.");

        console.log("📌 Validating admin wallet...");
        let adminWallet = await Wallet.findOne({ type: 'admin' });

        if (!adminWallet) {
            console.log("🆕 Creating a new admin wallet...");
            adminWallet = new Wallet({
                type: "admin",
                balance: 0,
                transactions: [],
            });
            await adminWallet.save();
        }

        const amount = refundRequest.amount;
        if (!amount || amount <= 0) throw new Error("Invalid refund amount.");

        if (action === 'approve') {
            if (adminWallet.balance < amount) throw new Error("Insufficient funds in admin wallet.");

            const transactionId = generateTransactionId();

            // Debit from admin wallet
            const debitTransaction = {
                transactionId,
                amount: -amount,
                from: "admin",
                to: userId,
                type: "debit",
                status: "pending",
                transactionCategory: "refund",
                description: `Refund approved for user ${userId}`,
                timestamp: new Date(),
            };

            adminWallet.transactions.push(debitTransaction);
            adminWallet.balance -= amount;

            console.log(`💸 Deducted ${amount} from admin wallet.`);

            // Credit to user wallet
            const creditTransaction = {
                transactionId,
                amount,
                from: "admin",
                to: userId,
                type: "credit",
                status: "pending",
                transactionCategory: "refund",
                description: `Refund received from admin`,
                timestamp: new Date(),
            };

            userWallet.transactions.push(creditTransaction);
            userWallet.balance += amount;

            console.log(`💰 Refund of ${amount} credited to user wallet.`);

            refundRequest.status = 'approved';
        } else {
            refundRequest.status = 'rejected';
            console.log(`🚫 Refund request ${refundId} rejected.`);
        }

        await adminWallet.save();
        await userWallet.save();

        return {
            success: true,
            message: `Refund ${action}d successfully.`,
            refundRequest,
            adminWalletBalance: adminWallet.balance,
            userWalletBalance: userWallet.balance,
        };
    } catch (error) {
        console.error("❌ Error in processRefund:", error);
        return { success: false, error: error.message };
    }
};


export const getRefundsByStatus = async (status) => {
    try {
        const wallets = await Wallet.find({ "refundRequests.status": status }, { refundRequests: 1 });

        let refunds = wallets.flatMap(wallet => wallet.refundRequests.filter(refund => refund.status === status));

        console.log(`Fetched ${status} refunds:`, refunds);

        return refunds;
    } catch (error) {
        console.error(`Error fetching ${status} refunds:`, error.message);
        throw new Error(`Failed to fetch ${status} refunds`);
    }
};


export const getAllWalletBalances = async () => {
    try {
        const wallets = await Wallet.find({}, { userId: 1, balance: 1, type: 1 });
        return wallets.map(wallet => ({
            userId: wallet.userId,
            type: wallet.type,
            balance: wallet.balance,
        }));
    } catch (error) {
        console.error("❌ Error fetching all wallet balances:", error);
        throw new Error("Failed to fetch wallet balances.");
    }
};

export const getWalletBalanceById = async (walletId) => {
    try {
        const wallet = await Wallet.findById(walletId, { balance: 1 });
        if (!wallet) throw new Error("Wallet not found.");
        return { walletId, balance: wallet.balance };
    } catch (error) {
        console.error("❌ Error fetching wallet balance by ID:", error);
        throw new Error("Failed to fetch wallet balance.");
    }
};


export const getRefundById = async (refundId) => {
    try {
        const wallet = await Wallet.findOne({ "refundRequests._id": refundId }, { refundRequests: 1 });

        if (!wallet) throw new Error("Refund request not found.");

        const refund = wallet.refundRequests.find(req => req._id.toString() === refundId);
        if (!refund) throw new Error("Refund request not found in wallet.");

        return refund;
    } catch (error) {
        console.error("❌ Error fetching refund by ID:", error);
        throw new Error("Failed to fetch refund.");
    }
};


export const transferFundsWalletToWallet = async ({ senderUserId, recipientUserId, amount, note = '' }) => {
    const maxRetries = 3;
    let retries = maxRetries;
  
    while (retries > 0) {
      const session = await mongoose.startSession();
  
      try {
        session.startTransaction();
  
        // Validate inputs
        if (!senderUserId || !recipientUserId || !amount || amount <= 0) {
          throw new Error('Sender, recipient, and valid amount are required.');
        }
  
        if (senderUserId === recipientUserId) {
          throw new Error('Sender and recipient cannot be the same.');
        }
  
        // Fetch users
        const [senderUser, recipientUser] = await Promise.all([
          User.findById(senderUserId).lean().session(session),
          User.findById(recipientUserId).lean().session(session),
        ]);
  
        if (!senderUser || !recipientUser) {
          throw new Error('Sender or recipient user not found.');
        }
  
        // Fetch wallets
        const recipientWallet = await Wallet.findOne({ userId: recipientUserId }).session(session);
        if (!recipientWallet) {
          throw new Error('Recipient wallet not found.');
        }
  
        let senderWallet = await Wallet.findOne({ userId: senderUserId }).session(session);
  
        if (!senderWallet && senderUser.role === 'admin') {
          senderWallet = await Wallet.findOne({ type: 'admin', userId: { $exists: false } }).session(session);
          if (!senderWallet) {
            throw new Error('Central Admin Wallet not found.');
          }
        }
  
        if (!senderWallet) {
          throw new Error('Sender wallet not found.');
        }
  
        if (senderWallet.balance < amount) {
          throw new Error('Insufficient funds in sender wallet.');
        }
  
        const transactionId = generateTransactionId();
        const timestamp = new Date();
  
        // Create transactions
        const senderTransaction = {
          transactionId,
          amount: -amount,
          type: 'debit',
          from: senderUserId,
          to: recipientUserId,
          transactionCategory: 'wallet_transfer',
          description: `${note ? `${note}` : ''}`,
          timestamp,
          status: 'completed',
        };
  
        const recipientTransaction = {
          transactionId,
          amount,
          type: 'credit',
          from: senderUserId,
          to: recipientUserId,
          transactionCategory: 'wallet_transfer',
          description: `Transfer from user ${senderUserId}${note ? ` - ${note}` : ''}`,
          timestamp,
          status: 'completed',
        };
  
        // Update legacy transactions
        senderWallet.transactions.forEach((tx) => {
          if (!tx.transactionCategory) tx.transactionCategory = 'legacy';
        });
        recipientWallet.transactions.forEach((tx) => {
          if (!tx.transactionCategory) tx.transactionCategory = 'legacy';
        });
  
        // Update wallets
        senderWallet.balance -= amount;
        senderWallet.transactions.push(senderTransaction);
  
        recipientWallet.balance += amount;
        recipientWallet.transactions.push(recipientTransaction);
  
        // Save wallets atomically
        await Promise.all([
          senderWallet.save({ session }),
          recipientWallet.save({ session }),
        ]);
  
        // Generate receipt PDF
        const receiptPdfBuffer = await generateTransferReceiptPdf({
          transactionId,
          amount,
          fromUser: senderUser,
          toUser: recipientUser,
          timestamp,
          note,
        });
  
        // Send email
        try {
          await sendPaymentConfirmationEmail(senderUser, {
            amount,
            date: timestamp,
            method: 'Wallet Transfer',
            transactionId,
            note,
          }, receiptPdfBuffer);
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }
  
        await session.commitTransaction();
  
        return {
          success: true,
          message: `Transferred ${amount} from user ${senderUserId} to user ${recipientUserId}`,
          transactionId,
          receiptPdf: receiptPdfBuffer.toString('base64'),
          emailSent: true,
          senderWalletBalance: senderWallet.balance,
          recipientWalletBalance: recipientWallet.balance,
        };
      } catch (error) {
        await session.abortTransaction();
        if (error.name === 'VersionError' && retries > 1) {
          retries--;
          console.warn(`Retrying transfer due to VersionError. Attempts left: ${retries}`);
          continue;
        }
        throw error;
      } finally {
        session.endSession();
      }
    }
  
    throw new Error(`Max retries (${maxRetries}) exceeded for transfer due to persistent VersionError.`);
  };
  
  
