// utils/foodAI.js
import fs from "fs";
import fetch from "node-fetch";

/**
 * analyzeFoodImage(imagePath)
 * Uses Clarifai’s public "Food Item Recognition" model (no setup needed).
 */
export async function analyzeFoodImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    const imageData = fs.readFileSync(imagePath, { encoding: "base64" });
    console.log("🍽️ Sending image to Clarifai for food analysis...");

    // ✅ Clarifai credentials
    const PAT = process.env.CLARIFAI_PAT;
    const USER_ID = "clarifai"; // Public Clarifai user
    const APP_ID = "main"; // Global public model app
    const MODEL_ID = "food-item-recognition"; // ✅ The correct model name

    // ✅ API call
    const response = await fetch(
      `https://api.clarifai.com/v2/users/${USER_ID}/apps/${APP_ID}/models/${MODEL_ID}/outputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: [
            {
              data: {
                image: { base64: imageData },
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Clarifai API Error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const topPrediction = data?.outputs?.[0]?.data?.concepts?.[0];

    if (!topPrediction) {
      console.warn("⚠️ Clarifai returned no predictions.");
      return {
        name: "Unknown",
        category: "Unknown",
        shelfLife: 0,
        storage: "Unknown",
      };
    }

    const name = topPrediction.name || "Unknown";

    // --- Categorization Logic ---
    const lower = name.toLowerCase();
    let category = "Unknown";
    let shelfLife = 0;
    let storage = "Unknown";

    if (["apple", "banana", "orange", "mango", "tomato", "grape", "strawberry"].some(f => lower.includes(f))) {
      category = "Fruits";
      shelfLife = 5;
      storage = "Cool Dry Place";
    } else if (["carrot", "onion", "potato", "cabbage", "spinach", "broccoli"].some(f => lower.includes(f))) {
      category = "Vegetables";
      shelfLife = 7;
      storage = "Refrigerated";
    } else if (["milk", "cheese", "yogurt", "butter", "cream"].some(f => lower.includes(f))) {
      category = "Dairy";
      shelfLife = 6;
      storage = "Refrigerated";
    } else if (["bread", "rice", "pasta", "noodle", "cereal"].some(f => lower.includes(f))) {
      category = "Grains";
      shelfLife = 3;
      storage = "Cool Dry Place";
    } else if (["chicken", "fish", "meat", "beef", "pork", "egg"].some(f => lower.includes(f))) {
      category = "Meat";
      shelfLife = 2;
      storage = "Frozen";
    } else if (["water", "juice", "soda", "tea", "coffee"].some(f => lower.includes(f))) {
      category = "Beverages";
      shelfLife = 10;
      storage = "Room Temperature";
    }

    const result = { name, category, shelfLife, storage };
    console.log("✅ [Clarifai] Food identified:", result);
    return result;

  } catch (err) {
    console.error("❌ foodAI error:", err.message);
    return {
      name: "Unknown",
      category: "Unknown",
      shelfLife: 0,
      storage: "Unknown",
    };
  }
}