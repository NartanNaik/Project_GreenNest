import mongoose from "mongoose";

const DonationSchema = new mongoose.Schema({
  farmerId: { type: String, required: true },
  foodId: { type: String, required: true },
  foodName: { type: String, required: true },
  donatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Donation", DonationSchema);
