
import User from '../models/User.js';

import Wallet from '../models/Wallet.js';

import { sendEmailVerificationLink, checkEmailVerificationCode , sendAdminAlert, sendUserCancellationNotification, sendAdminCancellationAlert} from './nexcessService.js';
import bcrypt from 'bcryptjs';

// Get All Users
export const getAllUsers = async () => {
    try {
        const users = await User.find({}, { password: 0 }); // Exclude password field
        return users;
    } catch (error) {
        throw new Error('Failed to fetch users.');
    }
};

// Get User by ID
export const getUserById = async (userId) => {
    try {
        const user = await User.findById(userId, { password: 0 });
        if (!user) throw new Error('User not found.');

        const { walletId, ...userWithoutPassword } = user.toObject();
        
        return { ...userWithoutPassword, walletId };
    } catch (error) {
        throw new Error('Failed to fetch user: ' + error.message);
    }
};





export const updateUser = async (userId, updateData) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true })
            .select('-password'); // Exclude password field from response

        if (!updatedUser) throw new Error('User not found or update failed.');
        return updatedUser;
    } catch (error) {
        throw new Error('Failed to update user.');
    }
};

export const handleUserSettings = async (userId, actionType, payload, currentUser) => {
    try {
        if (!currentUser) throw new Error("No current user found.");
        if (!userId) throw new Error("User ID is missing.");

        const targetUser = await User.findById(userId);
        if (!targetUser) throw new Error("Target user not found.");

        const isSelf = currentUser.id.toString() === userId.toString();
        const isAdmin = currentUser.role === 'admin';
        const canEdit = currentUser?.settings?.accessControl?.canEdit;
        const canDelete = currentUser?.settings?.accessControl?.canDelete;
        const canAdd = currentUser?.settings?.accessControl?.canAdd;

        console.log("Current User Role:", currentUser.role);
        console.log("Current User Permissions:", currentUser.settings?.accessControl);

        switch (actionType) {
            case 'UPDATE_SETTINGS':
                if (!isSelf && !(isAdmin && canEdit)) throw new Error("Unauthorized to update settings.");
                targetUser.settings = { ...targetUser.settings, ...payload };
                break;

            case 'SET_ADMIN_PERMISSIONS':
                if (!isAdmin || !canEdit) throw new Error("Unauthorized to change permissions.");
                targetUser.settings.accessControl = { ...targetUser.settings.accessControl, ...payload };
                break;

            case 'DELETE_USER':
                if (!isAdmin || !canDelete) throw new Error("Unauthorized to delete.");
                await User.findByIdAndDelete(userId);
                return { message: "User deleted successfully." };

            case 'TOGGLE_AVAILABILITY':
                if (!isAdmin && !isSelf) throw new Error("Unauthorized to toggle availability.");
                targetUser.availability = payload?.status ?? !targetUser.availability;
                break;

            case 'VERIFY_IDENTITY':
                if (!isAdmin) throw new Error("Only admins can verify users.");
                targetUser.isVerified = true;
                break;

            case 'ASSIGN_ROLE':
                if (!isAdmin) throw new Error("Only admins can assign roles.");
                targetUser.role = payload?.role;
                break;

            case 'RESET_PASSWORD':
                return { message: "Password reset initiated.", tempPassword: "Temp@1234" };

            case 'TOGGLE_ONBOARDING':
                targetUser.onboardingChecklist = payload?.status ?? !targetUser.onboardingChecklist;
                break;

            case 'ASSIGN_TO_BUSINESS':
                if (!isAdmin) throw new Error("Unauthorized to assign.");
                targetUser.assignedProperties = payload?.properties || [];
                break;

            case 'SUSPEND_USER':
                if (!isAdmin) throw new Error("Unauthorized to suspend.");
                targetUser.isActive = false;
                break;

            case 'ACTIVATE_USER':
                if (!isAdmin) throw new Error("Unauthorized to activate.");
                targetUser.isActive = true;
                break;

            case 'ADD_INFORMATION':
                if (!isAdmin || !canAdd) throw new Error("Unauthorized to add information.");
                break;

            default:
                throw new Error("Invalid action type.");
        }

        const updatedUser = await targetUser.save();
        const cleanUser = updatedUser.toObject();
        delete cleanUser.password;

        return cleanUser;

    } catch (error) {
        throw new Error("User settings operation failed: " + error.message);
    }
};

export const requestAccountClosure = async (userId, password, feedback = null) => {
  try {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error("User not found.");
    if (!user.password) throw new Error("User password record missing. Please contact support.");
    
    const passwordCorrect = await bcrypt.compare(password, user.password);
    if (!passwordCorrect) throw new Error("Incorrect password.");

    const activeBookings = await Booking.find({
      userId,
      status: { $in: ["Pending", "Confirmed", "In Progress"] }
    });
    if (activeBookings.length > 0) throw new Error("Please complete or cancel all active bookings before closing your account.");

    const wallet = await Wallet.findOne({ userId });
    if (wallet && wallet.balance > 0) throw new Error("Withdraw your wallet balance before closing your account.");

    const emailResult = await sendEmailVerificationLink(user);
    if (!emailResult.success) throw new Error("Failed to send email verification code.");

    user.exitFeedback = feedback || null;
    await user.save();


    return {
      success: true,
      message: "Verification code sent to your email. Please verify to complete the closure request."
    };

  } catch (err) {
    console.error("❌ Account closure request failed:", err.message);
    throw new Error(`Account closure request failed: ${err.message}`);
  }
};




export const verifyAccountClosureCode = async (userId, code) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    const { valid } = await checkEmailVerificationCode(user.email, code);
    if (!valid) throw new Error("Invalid or expired verification code.");

    // Capture original data for alert
    const originalUserData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    user.deletionBackup = {
      email: user.email,
      phoneNumber: user.phoneNumber
    };

    user.deletion = {
      isDeletionRequested: true,
      deletionRequestedAt: new Date(),
      isDeleted: true,
      deletedAt: new Date()
    };

    user.fullName = `${user.fullName} (Deleted Account)`;
    user.email = `deleted_${user._id}@example.com`;
    user.phoneNumber = null;

    await user.save();

    const alertResult = await sendAdminAlert(originalUserData);
    if (!alertResult.success) {
      console.warn("⚠️ Admin alert email failed.");
    }

    return { message: "Account closure verified. Your account has been marked as deleted." };
  } catch (err) {
    console.error("❌ Closure verification failed:", err.message);
    throw new Error(err.message);
  }
};



export const cancelAccountClosureRequest = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    if (!user.deletion?.isDeletionRequested) {
      throw new Error("No deletion request found for this account.");
    }

    if (user.fullName.includes(' (Deleted Account)')) {
      user.fullName = user.fullName.replace(' (Deleted Account)', '');
    }

    if (user.deletionBackup) {
      user.email = user.deletionBackup.email || user.email;
      user.phoneNumber = user.deletionBackup.phoneNumber || user.phoneNumber;
    } else {
      console.warn("⚠️ No deletionBackup found. Email and phone number cannot be restored.");
    }

    user.deletion = {
      isDeletionRequested: false,
      deletionRequestedAt: null,
      isDeleted: false,
      deletedAt: null
    };

    user.deletionBackup = undefined;

    await user.save();

    // Send admin cancellation alert
    const adminAlertResult = await sendAdminCancellationAlert(user);
    if (!adminAlertResult.success) {
      console.warn("⚠️ Admin cancellation alert email failed.");
    }

    // Send user cancellation notification
    const userNotifyResult = await sendUserCancellationNotification(user);
    if (!userNotifyResult.success) {
      console.warn("⚠️ User cancellation notification email failed.");
    }

    return {
      success: true,
      message: "Account deletion request has been canceled and user data restored."
    };
  } catch (err) {
    console.error("❌ Cancellation failed:", err.message);
    throw new Error(err.message);
  }
};









