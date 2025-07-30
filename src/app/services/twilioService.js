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
        }

        const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        const verification = await client.verify
            .services(verificationServiceSid)
            .verifications.create({ to: formattedPhoneNumber, channel: 'sms' });

        return { success: verification.status === 'pending' };
    } catch (error) {
        console.error(`Twilio verification failed: ${error.message}`);
        // Do not throw, return fallback
        return { success: false, error: error.message };
    }
};



// Check verification code
export const checkVerificationCode = async (phoneNumber, code) => {
    try {
        const verificationServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!verificationServiceSid) {
            console.warn("No Twilio Verify Service SID configured.");
            return { success: false, message: "Twilio not configured" };
        }

        const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        const verificationCheck = await client.verify.v2.services(verificationServiceSid)
            .verificationChecks.create({
                to: formattedPhoneNumber,
                code
            });

        const approved = verificationCheck.status === 'approved';

        return {
            success: approved,
            message: approved ? 'OTP verified successfully' : 'Invalid OTP'
        };
    } catch (error) {
        console.error(`Twilio OTP check failed: ${error.message}`);
        return {
            success: false,
            message: `OTP verification skipped or failed: ${error.message}`
        };
    }
};



