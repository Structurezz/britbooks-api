import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Function to send SMS verification code
export const sendVerificationCode = async (phoneNumber) => {
    try {
        // Retrieve the verification service SID from environment variables
        let verificationServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!verificationServiceSid) {
            // If service SID is not provided, create one and store it securely
            const verificationService = await client.verify.v2.services.create({
                friendlyName: 'GreatMan', // You can change the friendly name
            });

            verificationServiceSid = verificationService.sid;

            // Log the SID (for debugging, but avoid logging sensitive information in production)
            console.log('New Verification Service created:', verificationServiceSid);

            // Save the SID in a secure place, such as a database or config file.
        }

        // Ensure phone number is in E.164 format
        const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        // Send a verification code to the phone number
        const verification = await client.verify
            .services(verificationServiceSid)
            .verifications.create({ to: formattedPhoneNumber, channel: 'sms' });

        // Return true if the verification code was sent successfully
        return verification.status === 'pending'; 
    } catch (error) {
        console.error(`Error sending verification code: ${error.message}`);
        throw new Error(`Error sending verification code: ${error.message}`);
    }
};

// Function to check verification code
export const checkVerificationCode = async (phoneNumber, code) => {
    try {
        const verificationServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
        if (!verificationServiceSid) {
            throw new Error("Twilio Verify Service SID is not configured.");
        }

        console.log(`Checking verification code for phone number: ${phoneNumber}...`);

        const verificationCheck = await client.verify
            .services(verificationServiceSid)
            .verificationChecks.create({ to: phoneNumber, code });

        console.log('Verification check result:', verificationCheck); // Log the full object

        if (verificationCheck.status === 'approved') {
            return { success: true, message: 'Verification successful' };
        } else {
            return { success: false, message: `Verification failed. Status: ${verificationCheck.status}` };
        }
    } catch (error) {
        console.error('Error checking verification code:', error.message);
        throw new Error(`Error checking verification code: ${error.message}`);
    }
};
