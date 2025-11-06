const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Normalize email
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
  },

  firstName: { type: String, default: "" },
  middleName: { type: String },
  lastName: { type: String, default: "" },

  purpose: { type: String, required: true }, // 'manual' or 'google'

  recoveryEmail: { type: String, default: null },

  passwordHash: {
    type: String,
    required: function () {
      // ❗ password required only if not Google
      return this.purpose !== "google";
    },
  },

  googleId: { type: String, default: null },

  // ✅ Role-based access
  role: {
    type: String,
    enum: ["user", "farmer"],
    default: "user",
  },

  farmerDocPath: {
    type: String,
    default: null,
  },

  // ✅ Notification Preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    daysBeforeExpiry: { type: Number, default: 3 },
  },

  // ✅ Achievement Badges
  badges: {
    zeroWaster: { earned: { type: Boolean, default: false }, earnedAt: Date },
    smartSaver: { earned: { type: Boolean, default: false }, earnedAt: Date },
    foodHero: { earned: { type: Boolean, default: false }, earnedAt: Date },
    inventoryMaster: { earned: { type: Boolean, default: false }, earnedAt: Date },
    donationChampion: { earned: { type: Boolean, default: false }, earnedAt: Date },
  },

  // ✅ Performance Tracking
  achievements: {
    wasteReduction: { type: Number, default: 0 }, // % reduction over time
    consecutiveSaves: { type: Number, default: 0 }, // Saved items streak
    donationsMade: { type: Number, default: 0 },
    lastMonthWastePercentage: { type: Number, default: 0 },
    currentMonthWastePercentage: { type: Number, default: 0 },
    lastMonthStats: {
      totalItems: { type: Number, default: 0 },
      wastedItems: { type: Number, default: 0 },
      savedItems: { type: Number, default: 0 },
    },
  },
});


// ✅ Automatically hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash if the password was modified and exists
  if (this.isModified("passwordHash") && this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});


// ✅ Compare plain text password with hashed password
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false; // Prevent comparing for Google users
  return bcrypt.compare(plainPassword, this.passwordHash);
};


const User = mongoose.model("User", userSchema);
module.exports = User;
