const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  shelfLife: { type: Number, required: true }, // in days
  mDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // link to user

  // New fields for wastage tracking
  isWasted: { type: Boolean, default: false },
  wastedAt: { type: Date, default: null },
});

const FoodItem = mongoose.model("FoodItem", foodItemSchema);

module.exports = FoodItem;