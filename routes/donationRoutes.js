import express from "express";
import Donation from "../models/Donation.js";

const router = express.Router();

// Add Donation Record
router.post("/add", async (req, res) => {
  try {
    const { farmerId, foodId, foodName } = req.body;

    const donation = new Donation({
      farmerId,
      foodId,
      foodName,
      donatedAt: new Date()
    });

    await donation.save();

    res.status(201).json({ message: "Donation saved", donation });
  } catch (err) {
    console.error("Donation API Error:", err);
    res.status(500).json({ message: "Failed to save donation" });
  }
});

export default router;