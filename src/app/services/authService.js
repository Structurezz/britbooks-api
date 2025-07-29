import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { sendVerificationCode, checkVerificationCode} from './twilioService.js';
import { generateToken } from '../../lib/utils/jwtUtils.js';
import { createWallet } from './walletService.js';
import { sendEmailVerificationLink, checkEmailVerificationCode } from './nexcessService.js';


export const register = async (fullName, email, phoneNumber, password, role) => {
  const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
  if (existingUser) throw new Error('Email or phone number already in use.');

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    fullName,
    email,
    phoneNumber,
    password: hashedPassword,
    role: role || 'user',
    isVerified: false,
  });
  await user.save();

  const phoneCodeSent = await sendVerificationCode(phoneNumber);
  const emailCodeSent = await sendEmailVerificationLink(user);
  if (!phoneCodeSent || !emailCodeSent.success) {
    throw new Error('Failed to send verification code(s).');
  }

  return { userId: user._id, hashedPassword };
};

// Service for verifying registration or login
export const verifyRegistration = async (phoneNumber, code, sessionData) => {
  console.log('🔐 Verifying registration with:', { phoneNumber, code });

  const cleanedCode = code.toString().trim();
  if (!/^\d{6}$/.test(cleanedCode)) {
    throw new Error('Invalid OTP format. Must be a 6-digit number.');
  }

  let user = await User.findOne({ phoneNumber });
  const isNewUser = !user;

  const email = user?.email || sessionData?.email;
  if (!email) {
    throw new Error('Email is required for verification.');
  }

  let phoneVerificationResult = { valid: false };
  let emailVerificationResult = { valid: false };

  // Try email verification first
  try {
    emailVerificationResult = await checkEmailVerificationCode(email, cleanedCode);
    console.log('📧 Email verification result:', emailVerificationResult);
  } catch (err) {
    console.error('❌ Email verification failed:', err.message);
  }

  // Fallback to phone verification if email fails
  if (!emailVerificationResult.valid) {
    try {
      phoneVerificationResult = await checkVerificationCode(phoneNumber, cleanedCode);
      console.log('📱 Phone verification result:', phoneVerificationResult);
    } catch (err) {
      console.error('❌ Phone verification failed:', err.message);
    }
  }

  if (!emailVerificationResult.valid && !phoneVerificationResult.valid) {
    throw new Error('Invalid OTP. Verification failed.');
  }

  // If it's a new user, create their record now
  if (isNewUser) {
    if (!sessionData?.fullName || !sessionData?.hashedPassword) {
      throw new Error('Missing registration data. Please register again.');
    }

    const { fullName, hashedPassword } = sessionData;
    user = new User({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      isVerified: true,
    });

    await user.save();

    try {
      await createWallet(user._id);
    } catch (walletError) {
      console.error('💸 Wallet creation failed:', walletError);
      throw new Error('Account created but wallet setup failed.');
    }
  } else if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    userDetails: {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    },
  };
};




// Service for logging in a user
export const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials.');

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error('Invalid credentials.');

  let emailCodeSent = { success: false };
  let phoneCodeSent = false;

  try {
    emailCodeSent = await sendEmailVerificationLink(user);
  } catch (e) {
    emailCodeSent = { success: false };
  }

  try {
    if (user.phoneNumber) {
      phoneCodeSent = await sendVerificationCode(user.phoneNumber);
    }
  } catch (e) {
    phoneCodeSent = false;
  }

  if (!emailCodeSent.success) {
    throw new Error('Failed to send email verification.');
  }

  return { userId: user._id };
};

// Service for verifying login
export const verifyLogin = async (phoneNumber, code, userId) => {
  console.log('🔍 Verifying login with:', { phoneNumber, code, userId });

  // Validate code
  const cleanedCode = code?.toString().trim();
  if (!cleanedCode || !/^\d{6}$/.test(cleanedCode)) {
    throw new Error('Invalid OTP format. Must be a 6-digit number.');
  }

  // Load user
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found.');

  // Optional: use phone number from DB if not passed explicitly
  const phone = phoneNumber || user.phoneNumber;

  let phoneVerificationResult = { valid: false };
  let emailVerificationResult = { valid: false };

  // First try email
  try {
    emailVerificationResult = await checkEmailVerificationCode(user.email, cleanedCode);
    console.log('📧 Email verification result:', emailVerificationResult);
  } catch (error) {
    console.error('❌ Email OTP check error:', error.message);
  }

  // Then try phone
  if (!emailVerificationResult.valid) {
    try {
      phoneVerificationResult = await checkVerificationCode(phone, cleanedCode);
      console.log('📱 Phone verification result:', phoneVerificationResult);
    } catch (error) {
      console.error('❌ Phone OTP check error:', error.message);
    }
  }

  if (!phoneVerificationResult.valid && !emailVerificationResult.valid) {
    throw new Error('Invalid OTP. The code does not match the phone or email OTP.');
  }

  // Generate JWT
  const token = generateToken({
    userId: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    userDetails: {
      userId: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
    },
  };
};


export const resendOtp = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const { phoneNumber, email } = user;
    if (!phoneNumber && !email) {
      throw new Error("User must have at least a phone number or email.");
    }

    let phoneCodeSent = false;
    let emailCodeSent = { success: false };

    if (phoneNumber) {
      phoneCodeSent = await sendVerificationCode(phoneNumber);
    }

    if (email) {
      emailCodeSent = await sendEmailVerificationLink(user);
    }

    if (!phoneCodeSent && !emailCodeSent.success) {
      throw new Error("Failed to send any verification code.");
    }

    return { message: "Verification code sent to your phone and/or email." };
  } catch (error) {
    throw new Error(error.message);
  }
};




export const forgotPassword = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found.");
    }

    const { phoneNumber } = user;
    if (!phoneNumber && !email) {
      throw new Error("User must have at least a phone number or email.");
    }

    let emailCodeSent = { success: false };
    let phoneCodeSent = false;

    if (email) {
      try {
        emailCodeSent = await sendEmailVerificationLink(user);
      } catch (e) {
        emailCodeSent = { success: false };
      }
    }

    if (phoneNumber) {
      try {
        phoneCodeSent = await sendVerificationCode(phoneNumber);
      } catch (e) {
        phoneCodeSent = false;
      }
    }

    if (!emailCodeSent.success && !phoneCodeSent) {
      throw new Error("Failed to send any verification code.");
    }

    return {
      message: emailCodeSent.success
        ? "Verification link sent to your email."
        : "Verification code sent to your phone.",
        userId: user._id,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};




export const resetPassword = async (userId, code, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const { phoneNumber, email } = user;
    if (!email && !phoneNumber) {
      throw new Error("User must have a phone number or email.");
    }

    let isCodeValid = false;

    if (email) {
      try {
        const result = await checkEmailVerificationCode(email, code);
        if (result?.valid === true) {
          isCodeValid = true;
        }
      } catch (err) {
        console.warn(`Email verification failed for ${email}: ${err.message}`);
      }
    }

    if (!isCodeValid && phoneNumber) {
      try {
        const result = await checkVerificationCode(phoneNumber, code);
        if (result?.valid === true) {
          isCodeValid = true;
        }
      } catch (err) {
        console.warn(`Phone verification failed for ${phoneNumber}: ${err.message}`);
      }
    }

    if (!isCodeValid) {
      throw new Error("Invalid or expired verification code.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: userId }, { password: hashedPassword });

    return { message: "Password reset successful." };
  } catch (error) {
    console.error("Password reset error:", error.message);
    throw new Error(error.message);
  }
};



export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  return { message: "Password updated successfully." };
};


export async function validateApiKey(apiKey) {
  const user = await User.findOne({ apiKey });
  if (!user) return null;
  return { id: user._id.toString(), role: user.role };
}