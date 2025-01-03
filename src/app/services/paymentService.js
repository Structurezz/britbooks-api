
export const validatePaymentMethod = (paymentMethod) => {
    const validMethods = ['crypto', 'bank_transfer', 'debit_card'];
    return validMethods.includes(paymentMethod);
  };
  

  export const processPayment = async (paymentMethod, amount) => {
    try {
    
      switch (paymentMethod) {
        case 'crypto':
          
          console.log(`Processing crypto payment of ${amount}`);
          
          break;
        case 'bank_transfer':
          console.log(`Processing bank transfer payment of ${amount}`);
          
          break;
        case 'debit_card':
         
          console.log(`Processing debit card payment of ${amount}`);
          
          break;
        default:
          throw new Error('Invalid payment method.');
      }
  
      return true; 
    } catch (error) {
      console.error('Payment processing error:', error);
      return false; 
    }
  };
  