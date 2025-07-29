import crypto from "crypto";

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Randomly generated password
 */
export const generateRandomPassword = (length = 12) => {
    return crypto.randomBytes(length)
        .toString("base64") // Convert to Base64
        .replace(/[^a-zA-Z0-9]/g, "") // Remove special characters
        .slice(0, length); // Trim to required length
};
