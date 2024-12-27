import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOtp = async (phoneNumber, otp) => {
    try {
        const message = await client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
        return message.sid;
    } catch (error) {
        throw new Error('Failed to send OTP');
    }
};

export { sendOtp };
