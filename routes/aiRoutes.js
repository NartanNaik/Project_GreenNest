import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { analyzeFoodImage } from "../utils/foodAI.js";

const router = express.Router();

// === File Upload Setup ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

// === AI Image Analysis Endpoint ===
router.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imagePath = req.file.path;
    const analysis = await analyzeFoodImage(imagePath);

    res.status(200).json({
      message: "Food analysis successful",
      data: analysis,
    });
  } catch (error) {
    console.error("❌ AI route error:", error);
    res.status(500).json({ message: "AI analysis failed", error: error.message });
  }
});

export default router;