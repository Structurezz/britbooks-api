import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true }, 
    amount: { type: Number, required: true },
    from: { type: String, required: true },   
    to: { type: String, required: true },     
    bookingId: { type: String, required: false }, 
    status: { type: String, enum: ["pending", "success", "failed", "completed"], required: true },
    type: { type: String, enum: ['debit', 'credit'], required: true }, 
    transactionCategory: { type: String, required: true },  
    description: { type: String, default: 'No description provided' },
    timestamp: { type: Date, default: Date.now },

    receipt: {
        fileUrl: { type: String },
        uploadedAt: { type: Date },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
});

const refundRequestSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestDate: { type: Date, default: Date.now },
    adminReviewedDate: { type: Date } // Optional: When admin reviews
});

const recurringPaymentSchema = new mongoose.Schema({
    _id: { type: mongoose.SchemaTypes.ObjectId, auto: true },
  
    senderUserId: { 
      type: mongoose.SchemaTypes.ObjectId, 
      ref: 'User', 
      required: true 
    },
  
    recipientUserId: { 
      type: mongoose.SchemaTypes.ObjectId, 
      ref: 'User', 
      required: true 
    },
  
    amount: { 
      type: Number, 
      required: true,
      min: [0.01, 'Amount must be greater than 0']
    },
  
    note: { 
      type: String, 
      default: 'Recurring salary payment' 
    },
  
    frequency: { 
      type: String, 
      enum: ['weekly', 'bi-weekly', 'monthly'], 
      required: true 
    },
  
    startDate: { 
      type: Date, 
      required: true 
    },
  
    nextRun: { 
      type: Date, 
      required: true 
    },
  
    status: { 
      type: String, 
      enum: ['active', 'cancelled'], 
      default: 'active' 
    },
  
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  });
  

const walletSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        unique: true, 
        sparse: true  // Allows admin wallets without a userId
    },
    type: { 
        type: String, 
        enum: ['user', 'property_manager', 'admin'],  
        required: true 
    },
    balance: { type: Number, default: 0 },
    transactions: {
        type: [transactionSchema],  
        default: [],
        validate: {
            validator: function (transactions) {
                return transactions.every(tx => tx.transactionCategory);  
            },
            message: "All transactions must have a transactionCategory.",
        },
    },
    refundRequests: {  
        type: [refundRequestSchema],  
        default: []  
    },
    recurringPayments: { 
        type: [recurringPaymentSchema], 
        default: [] 
      }
    
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

let ADMIN_WALLET_ID = null;


const ensureAdminWallet = async () => {
    try {
        let adminWallet = await Wallet.findOne({ type: 'admin' });

        if (!adminWallet) {
            adminWallet = new Wallet({
                type: 'admin',  
                balance: 0,
                transactions: []
            });
            await adminWallet.save();
            console.log('✅ Central Admin Wallet created.');

            ADMIN_WALLET_ID = adminWallet._id;
            console.log(`✅ Admin Wallet ID: ${ADMIN_WALLET_ID}`);
        } else {
           
            if (!adminWallet.type) {
                adminWallet.type = 'admin';
                await adminWallet.save();
                console.log('✅ Admin wallet type updated.');
            }
            console.log('✅ Central Admin Wallet already exists.');
        }

        // 🔥 Only check transactions if there are any
        if (adminWallet.transactions.length > 0) {
            const invalidTransactions = adminWallet.transactions.filter(tx => !tx.transactionCategory);
            if (invalidTransactions.length > 0) {
                console.warn(`⚠️ Warning: ${invalidTransactions.length} transactions in admin wallet are missing a transactionCategory.`);
            }
        }
    } catch (error) {
        console.error('❌ Error ensuring admin wallet:', error);
    }
};

ensureAdminWallet();

export default Wallet;
