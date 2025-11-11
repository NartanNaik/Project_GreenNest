import React, { useState } from "react";
import axios from "axios";

function IdeaPage() {
  const [foodItems, setFoodItems] = useState("");
  const [ideas, setIdeas] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateIdeas = async () => {
    if (!foodItems.trim()) return alert("Please enter the donated food items.");

    try {
      setLoading(true);
      setIdeas("");

      const res = await axios.post("http://localhost:5000/api/ai/farming-ideas", {
        items: foodItems,
      });

      setIdeas(res.data.ideas);
    } catch (err) {
      console.error("❌ Error generating ideas:", err);
      alert("Failed to generate ideas. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-green-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-green-700 text-center mb-6">
          💡 Smart Farming Ideas
        </h2>

        <p className="text-gray-600 mb-4 text-center">
          Enter the donated food items you’ve received — we’ll suggest creative
          ways to use them in your farm 🌾
        </p>

        <textarea
          value={foodItems}
          onChange={(e) => setFoodItems(e.target.value)}
          placeholder="e.g., rice, banana peels, milk, tomatoes"
          rows="4"
          className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        />

        <button
          onClick={handleGenerateIdeas}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          {loading ? "Generating ideas..." : "Get Smart Farming Ideas"}
        </button>

        {ideas && (
          <div className="mt-6 bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-700 mb-2">✨ Suggestions:</h3>
            <p className="text-gray-700 whitespace-pre-line">{ideas}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default IdeaPage;