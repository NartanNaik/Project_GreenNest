const mongoose = require("mongoose");

const deletedFoodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  wasWasted: { type: Boolean, default: false },
  wastedAt: { type: Date, default: null },
  expiryDate: { type: Date, default: null }, // Store expiry date to track expired items
  deletedAt: { type: Date, default: Date.now },
  originalId: { type: String },  // To store the original item ID
  clearedFromGraph: { type: Boolean, default: false } // Flag to track if cleared from graph
});

const DeletedFoodItem = mongoose.model("DeletedFoodItem", deletedFoodItemSchema);

module.exports = DeletedFoodItem; 