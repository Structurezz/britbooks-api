import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateToken } from "../../lib/utils/jwtUtils.js";
import twilio from "twilio";
import { sendEmailVerificationLink, checkEmailVerificationCode, sendLoginCredentials } from "./nexcessService.js";

// Twilio configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceId = process.env.TWILIO_VERIFY_SERVICE_SID;

// Signup - Registers a new user and sends credentials + OTP
export const signup = async (userData) => {
  const { fullName, email, phoneNumber, password, role } = userData;

  try {
    // Validate inputs
    if (!password || typeof password !== "string") {
      throw new Error("Invalid password provided");
    }
    if (!phoneNumber || !email) {
      throw new Error("Phone number and email are required");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      throw new Error("User with provided email or phone number already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user instance
    const user = new User({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      role: role || "user",
      isVerified: false,
    });

    // Save user
    await user.save();

    // Send login credentials email
    const credentialsResult = await sendLoginCredentials(user, password);
    if (!credentialsResult.success) {
      console.error(`Signup error for user ${user._id}: Failed to send login credentials:`, credentialsResult.error);
      throw new Error("Failed to send login credentials email");
    }

    // Send OTP via Twilio (SMS)
    await client.verify.services(serviceId).verifications.create({
      to: `+${phoneNumber}`,
      channel: "sms",
    });

    // Send OTP via email
    const emailOtpResult = await sendEmailVerificationLink(user);
    if (!emailOtpResult.success) {
      console.error(`Signup error for user ${user._id}: Failed to send email OTP:`, emailOtpResult.error);
      throw new Error("Failed to send verification email");
    }

    return {
      message: "Registration successful. OTP sent to your phone and email. Check your email for login credentials.",
      userId: user._id,
    };
  } catch (error) {
    console.error("Signup error:", error.message);
    throw new Error(`Signup failed: ${error.message}`);
  }
};

// Verify OTP - Confirms OTP (SMS or email) and verifies the user
export const verifyOtp = async (userId, otp, channel = "sms") => {
  try {
    // Sanitize and validate code
    const cleanedCode = otp.toString().trim();
    if (!/^\d{6}$/.test(cleanedCode)) {
      throw new Error("Invalid OTP format. Must be a 6-digit number.");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let isValid = false;

    // Verify OTP based on channel
    if (channel === "sms") {
      const verificationCheck = await client.verify.services(serviceId).verificationChecks.create({
        to: `+${user.phoneNumber}`,
        code: cleanedCode,
      });
      isValid = verificationCheck.valid;
    } else if (channel === "email") {
      const emailVerification = await checkEmailVerificationCode(user.email, cleanedCode);
      isValid = emailVerification.valid;
    } else {
      throw new Error("Invalid verification channel");
    }

    if (!isValid) {
      throw new Error("Invalid OTP");
    }

    // Mark user as verified if not already
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Generate auth token
    const token = generateToken({ id: user._id, role: user.role });

    return { message: "Verification successful", token };
  } catch (error) {
    console.error(`OTP verification error for user ${userId}:`, error.message);
    throw new Error(`Verification failed: ${error.message}`);
  }
};

// Login - Authenticates user and sends OTP via SMS and email
export const login = async (credentials) => {
    const { email, phoneNumber, password } = credentials;
  
    try {
      const user = await User.findOne({ $or: [{ email }, { phoneNumber }] });
      if (!user) {
        throw new Error("User not found");
      }
  
      if (!user.isVerified) {
        throw new Error("User is not verified");
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }
  
      let smsSent = false;
  
      // 🔹 Attempt to send SMS OTP (but don’t fail if it breaks)
      try {
        await client.verify.services(serviceId).verifications.create({
          to: `+${user.phoneNumber}`,
          channel: "sms",
        });
        smsSent = true;
        console.log(`✅ SMS OTP sent to ${user.phoneNumber}`);
      } catch (twilioError) {
        console.warn(`⚠️ Twilio SMS failed for ${user.phoneNumber}: ${twilioError.message}`);
        // Continue without blocking login
      }
  
      // 🔹 Always send Email OTP
      const emailResult = await sendEmailVerificationLink(user);
      if (!emailResult.success) {
        console.error(`❌ Email OTP failed for ${user.email}: ${emailResult.error}`);
        throw new Error("Failed to send verification email. Please try again.");
      }
  
      return {
        message: smsSent
          ? "Login successful. OTP sent to your email and phone."
          : "Login successful. OTP sent to your email.",
        userId: user._id,
        smsSent, // optional: expose if SMS was successful
      };
  
    } catch (error) {
      console.error("❌ Login error:", error.message);
      throw new Error(error.message || "Login failed");
    }
  };
  
  
  

// Get User by ID
export const getUserById = async (id) => {
  try {
    const user = await User.findById(id).select("-password");
    if (!user) throw new Error("User not found");
    return user;
  } catch (error) {
    console.error(`Get user error for user ${id}:`, error.message);
    throw new Error(error.message);
  }
};

// Update User
export const updateUser = async (id, updateData) => {
  try {
    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    Object.assign(user, updateData);
    await user.save();

    return { message: "User updated successfully", user };
  } catch (error) {
    console.error(`Update user error for user ${id}:`, error.message);
    throw new Error(error.message);
  }
};

// Delete User
export const deleteUser = async (id) => {
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new Error("User not found");
    return { message: "User deleted successfully" };
  } catch (error) {
    console.error(`Delete user error for user ${id}:`, error.message);
    throw new Error(error.message);
  }
};