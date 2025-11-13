const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/userModel");
const OTP = require("../models/otpModel");
const sendOtpEmail = require("../utils/sendOtpEmail.js");
const generateOTP = require("../utils/generateOtp");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register
router.post("/register", async (req, res) => {
  const {
    email,
    firstName,
    middleName,
    lastName,
    purpose,
    password,
    recoveryEmail,
  } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const newUser = new User({
      email,
      firstName,
      middleName,
      lastName,
      purpose,
      recoveryEmail: recoveryEmail || null,
      passwordHash: password, // hashed by pre-save
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
});

// Login
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid email or password" });
//     }

//     const isPasswordValid = await user.comparePassword(password);
//     if (!isPasswordValid) {
//       return res.status(400).json({ message: "Invalid email or password" });
//     }

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "1h",
//     });

//     res.status(200).json({ message: "Login successful", token });
//   } catch (err) {
//     res.status(500).json({ message: "Error logging in", error: err.message });
//   }
// });

// Request OTP
router.post("/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();

    await OTP.deleteMany({ email });
    await OTP.create({ email, otp });

    const emailResult = await sendOtpEmail(email, otp);

    if (!emailResult.success) {
      return res.status(500).json({ message: "Failed to send OTP email", error: emailResult.error });
    }

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const existing = await OTP.findOne({ email, otp });
    if (!existing) return res.status(400).json({ message: "Invalid or expired OTP" });

    res.status(200).json({ message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed", error: err.message });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: "Missing required fields" });

  try {
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordHash = newPassword; // will be hashed in pre-save
    await user.save();

    await OTP.deleteMany({ email });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
});

// Google OAuth Login
router.post("/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        firstName: given_name,
        lastName: family_name,
        purpose: "google",
        passwordHash: "", // not used for Google login
        googleId,
      });

      await user.save();
    }

    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Google login successful", token: jwtToken });
  } catch (err) {
    res.status(401).json({ message: "Google login failed", error: err.message });
  }
});

module.exports = router;