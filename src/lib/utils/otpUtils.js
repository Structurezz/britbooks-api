import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Twilio Account SID:', accountSid);
console.log('Twilio Auth Token:', authToken);
console.log('Twilio Phone Number:', twilioPhoneNumber);

if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Twilio credentials are not set. Please check your .env file.');
    throw new Error('Twilio credentials are not set. Please check your .env file.');
}

const client = twilio(accountSid, authToken);

const sendOtp = async (phoneNumber, otp) => {
    try {
        const message = await client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: twilioPhoneNumber,
            to: phoneNumber
        });
        return message.sid;
    } catch (error) {
        console.error('Error sending OTP:', error.message);
        throw new Error('Failed to send OTP: ' + error.message);
    }
};

export { sendOtp };
