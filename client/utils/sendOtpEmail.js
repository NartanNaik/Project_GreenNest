const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,       // Your Gmail address
    pass: process.env.EMAIL_PASSWORD,   // App password from Gmail
  },
  tls: {
    rejectUnauthorized: false           // Helps with some connection issues
  }
});

// Function to send OTP email
async function sendOtpEmail(to, otp) {
  // Validate email and OTP
  if (!to || !otp) {
    console.error("Missing required parameters: email or OTP");
    return { success: false, error: "Missing required parameters" };
  }

  const mailOptions = {
    from: `"Food Shelf Life" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your OTP for Password Reset",
    text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4CAF50;">Food Shelf Life - Password Reset</h2>
        <p>Your One-Time Password (OTP) for password reset is:</p>
        <h1 style="font-size: 32px; background-color: #f5f5f5; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Thank you,<br>Food Shelf Life Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Failed to send email:", err);
    return { success: false, error: err.message };
  }
}

module.exports = sendOtpEmail;