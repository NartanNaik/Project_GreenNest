import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import session from "express-session";
import cron from "node-cron";
import fetch from "node-fetch";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import http from "http";                  // ✅ added
import { Server } from "socket.io";       // ✅ added
import Message from "./models/chatModel.js"; // ✅ added

// === Convert __dirname for ESM ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === Load environment variables ===
dotenv.config();

// === Utils & Models ===
import sendOtpEmail from "./client/utils/sendOtpEmail.js";
import generateOTP from "./client/utils/generateOtp.js";
import User from "./models/userModel.js";
import auth from "./middleware/auth.js";

// === Routes ===
import foodRoutes from "./routes/foodRoutes.js";
import wastageRoutes from "./routes/wastageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

// === Google Auth Client ===
import { OAuth2Client } from "google-auth-library";
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


// ✅ Get all messages between farmer and user
app.get("/api/messages/:farmerId/:userId", async (req, res) => {
  try {
    const { farmerId, userId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: farmerId, receiverId: userId },
        { senderId: userId, receiverId: farmerId },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
});

// ✅ Save a new message
app.post("/api/messages", async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    const msg = new Message({ senderId, receiverId, text });
    await msg.save();

    // Notify via Socket.IO
    io.emit("receiveMessage", msg);

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: "Error saving message", error: err.message });
  }
});

// === Middleware ===
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/ai", aiRoutes);
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

app.post("/api/farmer/setup", async (req, res) => {
  try {
    const { fullName, farmingType, crops, farmSize, country, state, district } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const farmerData = {
      fullName,
      farmingType,
      crops,
      farmSize,
      country,
      state,
      district,
      updatedAt: new Date(),
    };

    await User.findByIdAndUpdate(userId, { farmerDetails: farmerData }, { new: true });

    res.status(200).json({ message: "Farmer details saved successfully" });
  } catch (err) {
    console.error("❌ Error saving farmer setup:", err);
    res.status(500).json({ message: "Failed to save farmer details" });
  }
});


// === Chat Routes ===
// ✅ Get all messages for a specific farmer
// ✅ Get all messages for a specific farmer (excluding deleted ones)
app.get("/messages/:farmerId", async (req, res) => {
  try {
    const messages = await Message.find({
      farmerId: req.params.farmerId,
      deleted: false, // ✅ only active messages
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});



app.post("/messages", async (req, res) => {
  const message = new Message(req.body);
  await message.save();
  res.status(201).json(message);
});

// ✅ Delete a specific message
app.delete("/messages/:id", async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { deleted: true }, // ✅ mark as deleted
      { new: true }
    );
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting message:", err);
    res.status(500).json({ message: "Server error deleting message" });
  }
});

// ✅ Clear all messages for a specific farmer
app.delete("/messages/clear/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    // If you’re marking as deleted (not removing from DB):
    await Message.updateMany(
      { farmerId },
      { $set: { deleted: true } }
    );

    // If you prefer hard delete (actually remove them), replace above with:
    // await Message.deleteMany({ farmerId });

    res.json({ message: "All messages cleared successfully" });
  } catch (err) {
    console.error("❌ Error clearing messages:", err);
    res.status(500).json({ message: "Server error clearing messages" });
  }
});


// ================= AUTH ROUTES =================

// ✅ Registration Route
app.post("/auth/register", upload.single("farmerDocs"), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const farmerDoc = req.file;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    if (role === "farmer" && !farmerDoc)
      return res.status(400).json({ message: "Farmer document required" });

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
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ✅ Manual Login Route
// ✅ Manual Login Route (Secure & Correct)
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    // 🔍 Find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // 🔐 Compare hashed password using bcrypt
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    // 🧾 Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    // 🎯 Respond with token and basic info
    res.json({
      message: "✅ Login successful",
      token,
      role: user.role,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});



// ✅ Save or Update User Location
app.post("/api/save-location", async (req, res) => {
  try {
    const { userId, coords } = req.body;

    // 🧩 Check for missing or invalid userId
    if (!userId || userId === "undefined") {
      console.error("⚠️ Invalid userId received in save-location:", userId);
      return res.status(400).json({ message: "Invalid or missing user ID" });
    }

    if (!coords || !coords.lat || !coords.lng) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.location = {
      latitude: coords.lat,
      longitude: coords.lng,
      updatedAt: new Date(),
    };

    await user.save();

    console.log(`📍 Location updated for ${user.email}:`, user.location);

    res.json({
      message: "Location saved successfully!",
      location: user.location,
    });
  } catch (err) {
    console.error("❌ Error saving location:", err);
    res.status(500).json({ message: "Error saving location", error: err.message });
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

// ✅ Google Login
app.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ message: "Google token is required" });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        googleId,
        firstName: payload.given_name || "Google",
        lastName: payload.family_name || "User",
        purpose: "google",
        role: "user",
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.purpose = "google";
      await user.save();
    }

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
    res.status(401).json({ message: "Invalid or expired Google token" });
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
    if (!result.success)
      return res.status(500).json({ message: "Failed to send OTP email" });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: "Missing required fields" });

  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: "No OTP requested" });
  if (otp !== record.otp) return res.status(401).json({ message: "Invalid OTP" });
  if (Date.now() > record.expiresAt)
    return res.status(400).json({ message: "OTP expired" });

  delete otpStore[email];

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.passwordHash = newPassword;
  await user.save();
  res.json({ message: "Password reset successful" });
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

// ✅ Fetch all farmers (public route)
app.get("/farmers", async (req, res) => {
  try {
    const farmers = await User.find({ role: "farmer" }).select(
      "email firstName lastName farmerDocPath"
    );

    const formattedFarmers = farmers.map((farmer) => ({
      id: farmer._id,
      name: farmer.firstName
        ? `${farmer.firstName} ${farmer.lastName || ""}`
        : farmer.email.split("@")[0],
      email: farmer.email,
      location: "Not provided",
      farmerDocPath: farmer.farmerDocPath,
    }));

    res.json(formattedFarmers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch farmers" });
  }
});

// ✅ Fetch single farmer by ID
app.get("/farmers/:id", async (req, res) => {
  try {
    const farmer = await User.findById(req.params.id).select(
      "email firstName lastName farmerDocPath"
    );

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const formattedFarmer = {
      id: farmer._id,
      name: farmer.firstName
        ? `${farmer.firstName} ${farmer.lastName || ""}`
        : farmer.email.split("@")[0],
      email: farmer.email,
      location: "Not provided",
      farmerDocPath: farmer.farmerDocPath,
    };

    res.json(formattedFarmer);
  } catch (err) {
    console.error("❌ Error fetching farmer:", err);
    res.status(500).json({ message: "Error fetching farmer" });
  }
});


// === SOCKET.IO INTEGRATION (REAL-TIME CHAT) ===
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // ✅ Join farmer-specific chat room
  socket.on("joinRoom", (farmerId) => {
    socket.join(farmerId);
    console.log(`📦 User joined room: ${farmerId}`);
  });

  // ✅ Handle new message (save + broadcast to room)
  socket.on("sendMessage", async (msg) => {
    try {
      // Save message in DB
      const savedMsg = await new Message(msg).save();

      // ✅ Emit the saved message (includes _id, timestamp, etc.)
      io.to(msg.farmerId).emit("receiveMessage", savedMsg);

      console.log("💬 Message sent & broadcast:", savedMsg);
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ✅ Fetch all normal users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("firstName lastName email role");
    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});


server.listen(PORT, () => {
  console.log(`🚀 Server (HTTP + Socket.IO) running on http://localhost:${PORT}`);
});