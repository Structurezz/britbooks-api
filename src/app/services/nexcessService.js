import axios from "axios";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import puppeteer from "puppeteer";


dotenv.config();

// SMTP Transporter (Nexcess)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,  // Secure SSL
    secure: false,  // Use SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// OTP Generator
const generateOtp = (email, timestamp) => {
  const secret = process.env.OTP_SECRET || "default-secret";
  const timeWindow = Math.floor(timestamp / (30 * 60 * 1000));
  const data = `${email}:${timeWindow}`;
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  const offset = parseInt(hmac.slice(-2), 16) % 10;
  const otp = parseInt(hmac.slice(offset, offset + 6), 16) % 1000000;
  return otp.toString().padStart(6, "0");
};

// Send Login Credentials
export const sendLoginCredentials = async (user, password = null) => {
  try {
    const generatedPassword = password || crypto.randomBytes(4).toString("hex"); // More secure random password

    const mailOptions = {
      from: `"BritBooks" <${process.env.FROM_EMAIL}>`, // Added sender name
      to: user.email,
      subject: "Your BritBooks Journey Begins - Account Details",
      html: `
        <div style="font-family: 'Georgia', serif; color: #2c2c2c; padding: 30px; max-width: 600px; margin: auto; border: 1px solid #d9b99b; background: #fdfaf6;">
          <img src="https://cdn-icons-png.flaticon.com/512/2232/2232688.png" alt="Open Book" style="width: 70px; margin: 0 auto; display: block;" />
          <h2 style="text-align: center; color: #5c4033;">Welcome to BritBooks</h2>
          <p style="line-height: 1.6;">Dear <strong>${user.fullName}</strong>,</p>
          <p style="line-height: 1.6;">A new chapter awaits you at BritBooks! Your account is ready, and we’re thrilled to have you join our community of book lovers. Below are your login details to start exploring our literary world:</p>
          <div style="background: #f5efe7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Password:</strong> ${generatedPassword}</p>
          </div>
          <p style="text-align: center;">
            <a href="https://britbooks.co.uk/login" style="padding: 12px 24px; background: #5c4033; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Begin Your Story</a>
          </p>
          <p style="line-height: 1.6; font-style: italic; color: #6b7280;">“A book is a dream that you hold in your hand.” – Neil Gaiman</p>
          <p style="line-height: 1.6;">Warmest regards,<br>The BritBooks Team</p>
          <p style="text-align: center; font-size: 12px; color: #6b7280;">© ${new Date().getFullYear()} BritBooks. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Credentials sent to ${user.email}`);
    return { success: true, password: generatedPassword };
  } catch (err) {
    console.error("❌ Error sending login email:", err);
    return { success: false, error: err.message };
  }
};

// Send Email Verification Code
export const sendEmailVerificationLink = async (user) => {
  try {
    const timestamp = Date.now();
    const code = generateOtp(user.email, timestamp);

    const mailOptions = {
      from: `"BritBooks" <${process.env.FROM_EMAIL}>`, // Added sender name
      to: user.email,
      subject: "Verify Your BritBooks Account",
      html: `
        <div style="font-family: 'Georgia', serif; color: #2c2c2c; padding: 30px; max-width: 600px; margin: auto; border: 1px solid #d9b99b; background: #fdfaf6;">
          <h2 style="text-align: center; color: #5c4033;">One Step Closer to Your Next Read</h2>
          <p style="line-height: 1.6;">Dear <strong>${user.fullName}</strong>,</p>
          <p style="line-height: 1.6;">Thank you for joining BritBooks, where stories come to life. To verify your email, please use the 6-digit code below:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 25px 0; background: #f5efe7; padding: 20px; border-radius: 8px; color: #5c4033;">
            ${code}
          </div>
          <p style="line-height: 1.6;">This code expires in 30 minutes. If you didn’t request this, feel free to ignore this email.</p>
          <p style="line-height: 1.6;">Yours in stories,<br>The BritBooks Team</p>
          <p style="text-align: center; font-size: 12px; color: #6b7280;">© ${new Date().getFullYear()} BritBooks. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📨 Verification code sent to ${user.email}`);
    return { success: true };
  } catch (err) {
    console.error("❌ Error sending verification email:", err);
    return { success: false, error: err.message };
  }
};

// Verify OTP Code
export const checkEmailVerificationCode = async (email, code) => {
  try {
    const currentTime = Date.now();
    const currentOtp = generateOtp(email, currentTime);
    const previousOtp = generateOtp(email, currentTime - 30 * 60 * 1000);
    return { valid: currentOtp === code || previousOtp === code };
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    return { valid: false };
  }
};

// Invoice Generator
export const generateInvoicePDF = async (invoiceHtml) => {
  const content = `
    <html>
      <head>
        <style>
          body { font-family: 'Georgia', serif; padding: 40px; color: #2c2c2c; background: #fdfaf6; }
          h1 { color: #5c4033; }
          .logo { width: 60px; float: left; margin-right: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #d9b99b; padding: 12px; text-align: left; }
          th { background: #5c4033; color: #fff; }
          .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 40px; }
        </style>
      </head>
      <body>
        <img src="https://cdn-icons-png.flaticon.com/512/2232/2232688.png" alt="BritBooks Logo" class="logo" />
        <h1>BritBooks Invoice</h1>
        ${invoiceHtml || "<p>No invoice details provided.</p>"}
        <div class="footer">© ${new Date().getFullYear()} BritBooks. All rights reserved.</div>
      </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(content, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return pdfBuffer;
  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ PDF error:", err);
    throw new Error("PDF generation failed");
  }
};