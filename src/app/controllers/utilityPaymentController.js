import UtilityPaymentService from '../services/utilityPaymentService.js';
import PaymentLog from '../models/PaymentLog.js';
import Wallet from '../models/Wallet.js';

export const addUtilityCategory = async (req, res) => {
    const { name, description, subcategories } = req.body; // Include subcategories in the request body
    try {
      console.log('Adding utility category:', { name, description, subcategories }); // Log the input
      const newUtility = await UtilityPaymentService.addUtilityCategory({ name, description, subcategories });
      res.status(201).json({ message: 'Utility category added.', utility: newUtility });
    } catch (error) {
      console.error('Error adding utility category:', error.message); // Log the error
      res.status(400).json({ message: error.message });
    }
  };
  
  
  
  export const getAllUtilities = async (req, res) => {
    try {
      const utilities = await UtilityPaymentService.getAllUtilities();
      if (utilities.length === 0) {
        return res.status(200).json({ message: 'No utility categories found.', utilities });
      }
      
      // Ensure that the utilities include their subcategories
      const utilitiesWithSubcategories = utilities.map(utility => ({
        id: utility._id,
        name: utility.name,
        description: utility.description,
        subcategories: utility.subcategories, // Assuming subcategories are part of the utility model
      }));
  
      res.status(200).json({ utilities: utilitiesWithSubcategories });
    } catch (error) {
      console.error('Error fetching utilities:', error); // Log the error for debugging
      res.status(500).json({ message: error.message });
    }
  };
  

  export const deleteUtilityCategory = async (req, res) => {
    const { utilityId } = req.params;
    
    try {
      const result = await UtilityPaymentService.deleteUtilityCategory(utilityId);
      
      if (result.deletedCount === 0) {
        throw new Error("Utility category not found.");
      }
  
      res.status(200).json({ message: "This utility has been successfully deleted." });
    } catch (error) {
      console.error('Error deleting utility category:', error.message); // Log the error for debugging
      res.status(400).json({ message: error.message });
    }
  };
  

export const makeUtilityPayment = async (req, res) => {
  const { walletId, utilityType, amount, phoneNumber } = req.body;

  try {
    // Validate required fields
    if (!walletId || !utilityType || !amount || !phoneNumber) {
      throw new Error("Missing required fields: walletId, utilityType, amount, or phoneNumber");
    }

    console.log('Initiating utility payment:', { walletId, utilityType, amount, phoneNumber });

    // Call the correct function from the UtilityPaymentService
    const result = await UtilityPaymentService.processUtilityPayment({
      walletId,
      utilityType,
      amount,
      phoneNumber,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error initiating utility payment:', error.message); // Log the error for debugging
    res.status(400).json({ message: error.message });
  }
};


export const verifyOtpAndProcessPayment = async (req, res) => {
  const { paymentId, otp } = req.body; 
  try {
      // Validate required fields
      if (!paymentId || !otp) {
          throw new Error("Missing required fields: paymentId or otp");
      }

      // Retrieve the payment log using the paymentId
      const paymentLog = await PaymentLog.findById(paymentId);
      if (!paymentLog) {
          throw new Error("Payment log not found.");
      }

      // Check if the OTP matches
      if (paymentLog.otp !== otp) {
          throw new Error("Invalid OTP.");
      }

     
      const wallet = await Wallet.findById(paymentLog.walletId);
      wallet.balance -= paymentLog.amount; 
      await wallet.save(); 
      // Update the payment log status to 'success'
      paymentLog.status = 'success';
      await paymentLog.save();

      res.status(200).json({ message: "Utility payment successful.", wallet: { id: wallet._id, balance: wallet.balance } });
  } catch (error) {
      console.error('Error verifying OTP:', error.message); 
      res.status(400).json({ message: error.message });
  }
};


export const getPaymentHistory = async (req, res) => {
  const { walletId } = req.params;
  try {
    const paymentHistory = await UtilityPaymentService.getPaymentHistory(walletId);
    res.status(200).json({ history: paymentHistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUtilityById = async (req, res) => {
  const { utilityId } = req.params;
  
  try {
    // Fetch the utility category by its ID
    const utility = await UtilityPaymentService.getUtilityById(utilityId);
    if (!utility) {
      return res.status(404).json({ message: 'Utility category not found.' });
    }

    // Include subcategories in the response
    const utilityWithSubcategories = {
      id: utility._id,
      name: utility.name,
      description: utility.description,
      subcategories: utility.subcategories, 
    };

    res.status(200).json({ utility: utilityWithSubcategories });
  } catch (error) {
    console.error('Error fetching utility by ID:', error.message);
    res.status(500).json({ message: error.message });
  }
};
