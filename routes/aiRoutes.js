import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
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

/* ----------------------------------------------------------
 🧠 1️⃣ Food Image Analysis (AI vision)
---------------------------------------------------------- */
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
    res.status(500).json({
      message: "AI analysis failed",
      error: error.message,
    });
  }
});

/* ----------------------------------------------------------
 💡 2️⃣ Farming Ideas from Donated Food (Text AI)
---------------------------------------------------------- */
router.post("/farming-ideas", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.trim() === "") {
      return res.status(400).json({ message: "Please provide food items." });
    }

    // 🧠 AI Prompt
    const prompt = `
You are an expert sustainable farming advisor.
Given these donated food items: ${items},
suggest simple, creative, and eco-friendly ways a small farmer can reuse them
— for compost, animal feed, soil improvement, or irrigation.
Keep suggestions short, practical, and easy to understand.
`;

    // 🪶 Using Hugging Face Free Model (flan-t5-base)
    const hfResponse = await axios.post(
      "https://api-inference.huggingface.co/models/google/flan-t5-base",
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, // put your key in .env
          "Content-Type": "application/json",
        },
      }
    );

    const ideas =
      hfResponse.data?.[0]?.generated_text ||
      "No farming ideas generated. Try different items.";

    res.status(200).json({ ideas });
  } catch (error) {
    console.error("❌ AI ideas error:", error.message);
    res.status(500).json({
      message: "Failed to generate farming ideas",
      error: error.message,
    });
  }
});

export default router;