const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Expires in 10 minutes
});

// Create a compound index for email and otp for faster lookups
otpSchema.index({ email: 1, otp: 1 });

// Create a TTL index on createdAt field
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model("OTP", otpSchema);
