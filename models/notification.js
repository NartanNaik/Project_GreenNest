import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodItem", required: true },
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ["warning", "expired", "suggestion"] },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  suggestions: [{ type: String }], // Array of suggestions for using the food
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;