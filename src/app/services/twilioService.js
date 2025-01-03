import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendVerificationCode = async (phoneNumber) => {
    try {
        let verificationServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!verificationServiceSid) {
            const verificationService = await client.verify.v2.services.create({
                friendlyName: 'bill payment',
            });
            console.log("New Verification Service SID:", verificationService.sid);
            verificationServiceSid = verificationService.sid;
            console.log('New Verification Service created:', verificationServiceSid);
        }

        const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        const verification = await client.verify
            .services(verificationServiceSid)
            .verifications.create({ to: formattedPhoneNumber, channel: 'sms' });

        return verification.status === 'pending'; 
    } catch (error) {
        console.error(`Error sending verification code: ${error.message}`);
        throw new Error(`Error sending verification code: ${error.message}`);
    }
};


// Check verification code
export const checkVerificationCode = async (phoneNumber, code) => {
    try {
        const verificationServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!verificationServiceSid) {
            throw new Error("Twilio Verify Service SID is not configured.");
        }

        const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        const verificationCheck = await client.verify.v2.services(verificationServiceSid)
            .verificationChecks.create({
                to: formattedPhoneNumber,
                code
            });

        return { success: verificationCheck.status === 'approved', message: verificationCheck.status === 'approved' ? 'OTP verified successfully' : 'Invalid OTP' };
    } catch (error) {
        console.error(`Error checking verification code: ${error.message}`);
        throw new Error(`Error checking verification code: ${error.message}`);
    }
};


