import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import session from "express-session";
import cron from "node-cron";
import fetch from "node-fetch";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import http from "http"; // ✅ For Socket.IO
import { Server } from "socket.io"; // ✅ For Socket.IO
import Message from "./models/chatModel.js"; // ✅ Chat model
import User from "./models/userModel.js"; // ✅ User model

// === Convert __dirname for ESM ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === Load environment variables ===
dotenv.config();

// === Utils & Models ===
import sendOtpEmail from "./client/utils/sendOtpEmail.js";
import generateOTP from "./client/utils/generateOtp.js";
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

// ================= AUTH ROUTES (ALL ADDED BACK) =================

// ✅ Registration Route (WITH SECURITY FIX)
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

    // ✅ **SECURITY FIX**: Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      passwordHash: passwordHash, // Store the hashed password
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

// ✅ Google Login (ADDED BACK)
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
        // Note: Google-signed-up users don't have a passwordHash
      });
      await user.save();
    } else if (!user.googleId) {
      // User existed but logged in with Google for the first time
      user.googleId = googleId;
      user.purpose = "google";
      await user.save();
    }

    // Generate our app's token
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

// ✅ OTP / Password Reset Routes (ADDED BACK)
app.post("/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 minutes

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

  delete otpStore[email]; // OTP used, delete it

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Hash the new password before saving
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  
  await user.save();
  res.json({ message: "Password reset successful" });
});

// ✅ Get all conversations for a specific user (for FarmerChatList)
app.get("/messages/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }],
    }).sort({ timestamp: -1 });

    const conversations = new Map();
    for (const msg of messages) {
      const partnerId = String(msg.senderId) === userId ? String(msg.recipientId) : String(msg.senderId);

      if (!conversations.has(partnerId)) {
        const partnerInfo = await User.findById(partnerId).select("firstName lastName email");
        
        conversations.set(partnerId, {
          partnerId: partnerId,
          partnerName: partnerInfo ? `${partnerInfo.firstName || ''} ${partnerInfo.lastName || ''}`.trim() || partnerInfo.email : "Unknown User",
          lastMessage: msg.text,
          timestamp: msg.timestamp,
          read: String(msg.senderId) === userId, // Simple read logic
        });
      }
    }
    res.json(Array.from(conversations.values()));
  } catch (err) {
    console.error("❌ Error fetching conversations:", err);
    res.status(500).json({ message: "Server error fetching conversations" });
  }
});

// ================= NEW CHAT LOGIC (YOURS IS GOOD) =================

// ✅ Get chat history between two specific users
// Get chat between customer and farmer
app.get("/messages/:customerId/:farmerId", async (req, res) => {
  try {
    const { customerId, farmerId } = req.params;

    // ✅ Backend protection: Stop invalid ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(customerId) ||
      !mongoose.Types.ObjectId.isValid(farmerId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: customerId, recipientId: farmerId },
        { senderId: farmerId, recipientId: customerId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching chat:", err);
    res.status(500).json({ message: "Server error fetching chat" });
  }
});


// Clear entire chat between a customer & farmer
app.delete("/messages/clear/:customerId/:farmerId", async (req, res) => {
  try {
    const { customerId, farmerId } = req.params;

    await Message.deleteMany({
      $or: [
        { senderId: customerId, recipientId: farmerId },
        { senderId: farmerId, recipientId: customerId }
      ]
    });

    res.json({ message: "Chat cleared successfully" });
  } catch (err) {
    console.error("❌ Error clearing chat:", err);
    res.status(500).json({ message: "Failed to clear chat" });
  }
});




// ✅ Get basic info for a user (for ChatPage header)
app.get("/user/info/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("firstName lastName email");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json({
      id: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Error fetching user info:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= OTHER API ROUTES =================

// ✅ Farmer Setup
app.post("/api/farmer/setup", auth, async (req, res) => { // Added 'auth' middleware
  try {
    const { fullName, farmingType, crops, farmSize, country, state, district } = req.body;
    const userId = req.user.userId; // Get user ID from 'auth' middleware

    const farmerData = {
      fullName, farmingType, crops, farmSize, country, state, district,
      updatedAt: new Date(),
    };

    await User.findByIdAndUpdate(userId, { farmerDetails: farmerData }, { new: true });

    res.status(200).json({ message: "Farmer details saved successfully" });
  } catch (err) {
    console.error("❌ Error saving farmer setup:", err);
    res.status(500).json({ message: "Failed to save farmer details" });
  }
});

// ✅ Save Location
app.post("/api/save-location", async (req, res) => {
  try {
    const { userId, coords } = req.body;
    if (!userId || userId === "undefined") {
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
    res.json({ message: "Location saved successfully!", location: user.location });
  } catch (err) {
    console.error("❌ Error saving location:", err);
    res.status(500).json({ message: "Error saving location", error: err.message });
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
      name: farmer.firstName ? `${farmer.firstName} ${farmer.lastName || ""}`.trim() : farmer.email.split("@")[0],
      email: farmer.email,
      location: "Not provided", // You can add location from farmerDetails if you have it
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
      "email firstName lastName"
    );

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    const formattedFarmer = {
      id: farmer._id,
      name: farmer.firstName ? `${farmer.firstName} ${farmer.lastName || ""}`.trim() : farmer.email.split("@")[0],
      email: farmer.email,
      location: "Not provided",
    };

    res.json(formattedFarmer);
  } catch (err) {
    console.error("❌ Error fetching farmer:", err);
    res.status(500).json({ message: "Error fetching farmer" });
  }
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

// === Main App Routes (Food, Wastage, etc.) ===
// These MUST be protected by the 'auth' middleware
app.use("/food", auth, foodRoutes);
app.use("/wastage", auth, wastageRoutes);
app.use("/notifications", auth, notificationRoutes);
app.use("/reports", auth, reportRoutes);
// app.use("/ai", auth, aiRoutes); // This is already defined at the top without auth, decide if it needs it

// === Cron Job ===
cron.schedule("0 8 * * *", async () => {
  console.log("📆 Running scheduled expiry check...");
  // ... (cron job logic) ...
});

// ================= SOCKET.IO INTEGRATION (UPDATED) =================
const server = http.createServer(app);

// ========== SOCKET.IO FIXED SINGLE INSTANCE ==========
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`📦 User ${socket.id} joined room: ${userId}`);
  });

  socket.on("sendMessage", async (msg) => {
    try {
      const savedMsg = await new Message({
        text: msg.text,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        timestamp: msg.timestamp,
      }).save();

      io.to(msg.recipientId).emit("receiveMessage", savedMsg);
      io.to(msg.senderId).emit("receiveMessage", savedMsg);
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ✅ Fetch farmer profile
app.get("/api/farmer/profile", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("farmerDetails");

    if (!user || !user.farmerDetails)
      return res.status(404).json({ message: "Profile not found" });

    res.json(user.farmerDetails);
  } catch (err) {
    console.error("❌ Error fetching farmer profile:", err);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});

// ✅ Get logged-in user info on refresh
app.get("/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    const user = await User.findById(decoded.userId)
      .select("email role farmerDetails firstName lastName");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      email: user.email,
      role: user.role,
      farmerDetails: user.farmerDetails || null,
      firstName: user.firstName,
      lastName: user.lastName
    });

  } catch (err) {
    console.error("❌ Error in /auth/me:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    console.log("LOGIN REQUEST BODY:", req.body);

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    console.log("LOGIN USER FOUND:", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("PASSWORD IN DB:", user.passwordHash);
    console.log("PASSWORD ENTERED:", password);

    // ⭐ FIXED ⭐
    const match = await user.comparePassword(password);

    console.log("PASSWORD MATCH:", match);

    if (!match)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    console.log("LOGIN SUCCESS:", token);

    res.json({ token, role: user.role, email: user.email });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// =======================================
// POST MESSAGE (GENERAL) → /messages
// =======================================
app.post("/messages", async (req, res) => {
  try {
    const { senderId, recipientId, text } = req.body;

    if (!senderId || !recipientId || !text) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const msg = await new Message({
      senderId,
      recipientId,
      text,
    }).save();

    // Emit socket event
    io.to(String(senderId)).emit("receiveMessage", msg);
    io.to(String(recipientId)).emit("receiveMessage", msg);

    res.json(msg);
  } catch (err) {
    console.error("❌ POST /messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================================
// POST MESSAGE (FARMER CHATBOX) → /api/messages
// =======================================
app.post("/api/messages", async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const msg = await new Message({
      senderId,
      recipientId: receiverId,
      text,
    }).save();

    io.to(String(senderId)).emit("receiveMessage", msg);
    io.to(String(receiverId)).emit("receiveMessage", msg);

    res.json(msg);
  } catch (err) {
    console.error("❌ POST /api/messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // ✅ Have user join a room based on their OWN userId
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`📦 User ${socket.id} joined their room: ${userId}`);
  });

  // ✅ Handle new message
socket.on("sendMessage", async (msg) => {
  try {
    const savedMsg = await new Message({
      text: msg.text,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      timestamp: msg.timestamp
    }).save();

    // Send to receiver
    io.to(msg.recipientId).emit("receiveMessage", savedMsg);

    // Send to sender so THEIR UI updates instantly
    io.to(msg.senderId).emit("receiveMessage", savedMsg);

    console.log("💬 Message sent to:", msg.senderId, "→", msg.recipientId);
  } catch (err) {
    console.error("❌ Error saving/sending message:", err);
  }
});


  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ================= SERVER START =================
server.listen(PORT, () => {
  console.log(`🚀 Server (HTTP + Socket.IO) running on http://localhost:${PORT}`);
});