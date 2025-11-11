import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
  },

  firstName: { type: String, default: "" },
  middleName: { type: String },
  lastName: { type: String, default: "" },

  purpose: { type: String, required: true }, // 'manual' | 'google'
  recoveryEmail: { type: String, default: null },

  passwordHash: {
    type: String,
    required: function () {
      return this.purpose !== "google"; // required only for manual users
    },
  },

  googleId: { type: String, default: null },

  // ✅ Role-based access
  role: {
    type: String,
    enum: ["user", "farmer"],
    default: "user",
  },

  farmerDocPath: { type: String, default: null },

  // ✅ Farmer profile setup data
  farmerDetails: {
    fullName: { type: String },
    farmingType: { type: String }, // e.g., "Vegetable Farming"
    crops: { type: String }, // comma-separated crop list
    farmSize: { type: Number },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    updatedAt: { type: Date },
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
    wasteReduction: { type: Number, default: 0 },
    consecutiveSaves: { type: Number, default: 0 },
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
  if (this.isModified("passwordHash") && this.passwordHash) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  next();
});

// ✅ Compare plain text password with hashed password
userSchema.methods.comparePassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ✅ Optional: Remove passwordHash from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;