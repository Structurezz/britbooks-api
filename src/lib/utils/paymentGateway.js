export const verifyUtilityPayment = async (paymentDetails) => {
    const { transactionId, paymentGateway } = paymentDetails;
  
    if (!transactionId || !paymentGateway) {
      throw new Error('Invalid payment details.');
    }
  
    // Simulated verification logic (replace with actual API call to a gateway)
    console.log(`Verifying payment with gateway: ${paymentGateway}, transactionId: ${transactionId}`);
  
    const fakeGatewayResponse = {
      status: 'success',
      verified: true,
      transactionId,
      paymentGateway,
    };
  
    // Simulate an API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  
    if (fakeGatewayResponse.status === 'success' && fakeGatewayResponse.verified) {
      return true;
    } else {
      return false;
    }
  };