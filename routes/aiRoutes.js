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

    const list = items.split(",").map(i => i.trim().toLowerCase());
    const suggestions = [];

    /* ---------------------------
       🍌 Banana-specific ideas
    ----------------------------*/
    if (list.some(i => i.includes("banana"))) {
      suggestions.push("• Banana peels can be soaked in water for 48 hours to make potassium-rich fertilizer.");
      suggestions.push("• Dried banana peels work as natural pest repellents.");
    }

    /* ---------------------------
       🍎 Generic Fruit ideas
       (apple, mango, orange, etc.)
       WITHOUT banana-only lines
    ----------------------------*/
    if (list.some(i =>
      ["apple", "orange", "mango", "pineapple", "grape", "fruit", "peel"]
      .some(f => i.includes(f))
    )) {
      suggestions.push("• Fruit waste can be composted to create nutrient-rich fertilizer.");
      suggestions.push("• Fermented fruit scraps can be used to make natural bio-enzyme for cleaning plants.");
    }

    /* ---------------------------
       🍅 Vegetables
    ----------------------------*/
    if (list.some(i => ["tomato", "onion", "potato", "cabbage", "veggie"].some(f => i.includes(f)))) {
      suggestions.push("• Vegetable scraps boost soil microbes when added to compost.");
      suggestions.push("• Tomato waste can be fermented to create a natural growth booster.");
    }

    /* ---------------------------
       🌾 Grains
    ----------------------------*/
    if (list.some(i => ["rice", "rice water", "pasta", "wheat"].some(f => i.includes(f)))) {
      suggestions.push("• Rice water works as a natural fertilizer for leafy plants.");
      suggestions.push("• Cooked rice can be mixed into compost to increase nitrogen levels.");
    }

    /* ---------------------------
       🥛 Dairy
    ----------------------------*/
    if (list.some(i => ["milk", "yogurt", "curd"].some(f => i.includes(f)))) {
      suggestions.push("• Diluted milk acts as an anti-fungal spray for crops.");
    }

    /* ---------------------------
       🥬 Generic fallback
    ----------------------------*/
    if (suggestions.length === 0) {
      suggestions.push("• Organic waste can be composted to improve soil health.");
      suggestions.push("• Fermented waste can be used as natural bio-enzymes.");
    }

    res.status(200).json({ ideas: suggestions.join("\n") });

  } catch (error) {
    console.error("❌ Farming Ideas Error:", error.message);
    res.status(500).json({
      message: "Failed to generate farming ideas",
      error: error.message,
    });
  }
});

export default router;