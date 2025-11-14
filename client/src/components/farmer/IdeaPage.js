import React, { useState } from "react";
import axios from "axios";
import { FaLightbulb, FaSeedling, FaSync } from "react-icons/fa";
import "./IdeaPage.css";

function IdeaPage() {
  const [foodItems, setFoodItems] = useState("");
  const [ideas, setIdeas] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateIdeas = async () => {
    if (!foodItems.trim())
      return alert("Please enter the donated food items.");

    try {
      setLoading(true);
      setIdeas("");

      const res = await axios.post(
        "http://localhost:5000/ai/farming-ideas",
        { items: foodItems }
      );

      setIdeas(res.data.ideas);
    } catch (err) {
      console.error("❌ Error generating ideas:", err);
      alert("Failed to generate ideas. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="idea-wrapper">
      <div className="idea-card">
        <div className="idea-header">
          <FaLightbulb className="idea-icon" />
          <h2>Smart Farming Ideas</h2>
        </div>

        <p className="idea-description">
          Enter the donated food items you received — and get creative, sustainable
          farm ideas powered by AI 🌾
        </p>

        <textarea
          value={foodItems}
          onChange={(e) => setFoodItems(e.target.value)}
          placeholder="e.g., rice, banana peels, tomatoes, milk…"
          rows="4"
          className="idea-textarea"
        />

        <button
          className="idea-button"
          onClick={handleGenerateIdeas}
          disabled={loading}
        >
          {loading ? (
            <>
              <FaSync className="spin" /> Generating...
            </>
          ) : (
            <>
              <FaSeedling /> Generate Ideas
            </>
          )}
        </button>

        {ideas && (
          <div className="idea-output fade-in">
            <h3>✨ Suggestions</h3>
            <p className="idea-text">{ideas}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default IdeaPage;