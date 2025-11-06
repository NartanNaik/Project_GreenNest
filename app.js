require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cron = require("node-cron");
const fetch = require("node-fetch");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// === Utils & Models ===
const sendOtpEmail = require("./client/utils/sendOtpEmail");
const generateOTP = require("./client/utils/generateOtp");
const User = require("./models/userModel");
const auth = require("./middleware/auth");

// === Route Imports ===
const foodRoutes = require("./routes/foodRoutes");
const wastageRoutes = require("./routes/wastageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");

const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 5000;

// === File Upload Setup ===
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

// === Middleware ===
app.use(express.json()); // ✅ Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // ✅ Parse URL-encoded/form bodies
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// === MongoDB Connection ===
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/foodShelfLife", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// === OTP Memory Store ===
const otpStore = {};

// ================= AUTH ROUTES =================

// ✅ Registration Route
app.post("/auth/register", upload.single("farmerDocs"), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const farmerDoc = req.file;

    console.log("📥 Register request:", req.body);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (role === "farmer" && !farmerDoc) {
      return res.status(400).json({ message: "Farmer document required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const newUser = new User({
      email,
      passwordHash: password,
      purpose: "manual",
      role: role || "user",
      farmerDocPath: farmerDoc ? farmerDoc.path : null,
    });

    await newUser.save();
    console.log("✅ User registered:", email);
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({
      message: "Server error during registration",
      error: err.message,
    });
  }
});

// ✅ Login Route
app.post("/auth/login", async (req, res) => {
  console.log("📩 Incoming login body:", req.body);

  const { email, password } = req.body;
  if (!email || !password) {
    console.log("❌ Missing fields:", { email, password });
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.purpose === "google") {
      return res.status(400).json({ message: "Please login with Google" });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful:", email);
    res.json({
      token,
      email: user.email,
      role: user.role,
      message: "Login successful",
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login error", error: err.message });
  }
});

// ✅ Authenticated User Info
app.get("/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "email role firstName lastName"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user info" });
  }
});

app.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    // 🔍 Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // must match your frontend’s clientId
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;

    // 🔎 Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // 🆕 Create a new user if not found
      user = new User({
        email,
        googleId,
        firstName: payload.given_name || "Google",
        lastName: payload.family_name || "User",
        purpose: "google",
        role: "user",
      });
      await user.save();
    } else {
      // 🧩 Update googleId if missing (user signed up manually earlier)
      if (!user.googleId) {
        user.googleId = googleId;
        user.purpose = "google";
        await user.save();
      }
    }

    // 🪙 Generate your own JWT for session authentication
    const appToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    res.json({
      token: appToken,
      email: user.email,
      role: user.role,
      message: "✅ Google login successful",
    });
  } catch (error) {
    console.error("❌ Google login verification failed:", error);
    res.status(401).json({
      message: "Invalid or expired Google token",
      error: error.message,
    });
  }
});


// ✅ OTP: Send and Reset Password
app.post("/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

    const result = await sendOtpEmail(email, otp);
    if (!result.success) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res
      .status(400)
      .json({ message: "Email, OTP, and new password are required" });

  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: "No OTP requested" });
  if (otp !== record.otp) return res.status(401).json({ message: "Invalid OTP" });
  if (Date.now() > record.expiresAt)
    return res.status(400).json({ message: "OTP expired" });

  delete otpStore[email];

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordHash = newPassword;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Reset failed", error: err.message });
  }
});

// === Other Routes ===
app.use("/food", auth, foodRoutes);
app.use("/wastage", auth, wastageRoutes);
app.use("/notifications", auth, notificationRoutes);
app.use("/reports", auth, reportRoutes);

// === User Profile ===
app.get("/user/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      notificationPreferences: user.notificationPreferences,
      badges: user.badges || {},
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// === Cron Job ===
cron.schedule("0 8 * * *", async () => {
  console.log("📆 Running scheduled expiry check...");
  try {
    const response = await fetch(`http://localhost:${PORT}/notifications/check-expiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_API_KEY || "internal-cron-key"}`,
      },
    });
    const data = await response.json();
    console.log("✅ Scheduled expiry check completed:", data.stats);
  } catch (err) {
    console.error("❌ Scheduled expiry check failed:", err);
  }
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});