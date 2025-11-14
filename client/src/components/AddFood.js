import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddFood.css";

function AddFood() {
  const [image, setImage] = useState(null);
  const [foodData, setFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customShelfLife, setCustomShelfLife] = useState("");   // ⭐ NEW
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      setLoading(true);
      setFoodData(null);

      const res = await axios.post("http://localhost:5000/ai/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFoodData(res.data.data);

      // ⭐ Auto-fill detected shelf life into input
      setCustomShelfLife(res.data.data.shelfLife || "");
    } catch (err) {
      console.error("❌ Error scanning image:", err);
      alert("Failed to analyze image. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      const today = new Date();

      const payload = {
        name: foodData.name || "Unknown Food",
        category: foodData.category || "Misc",
        shelfLife: Number(customShelfLife) || foodData.shelfLife || 3,  // ⭐ Use custom input
        mDate: today.toISOString(),
      };

      await axios.post("http://localhost:5000/food/add", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      alert("✅ Food added to inventory!");
      navigate("/inventory");
    } catch (err) {
      console.error("❌ Error saving food:", err);
      alert("Error saving food.");
    }
  };

  const handleCancel = () => {
    if (window.confirm("Remove this item?")) {
      setImage(null);
      setFoodData(null);
      setCustomShelfLife("");  // reset
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="addfood-wrapper">
      <h2 className="addfood-title">Smart Food Scanner 🤖</h2>

      {/* Upload Box */}
      <label className="upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          hidden
        />

        <div className="upload-box">
          {image ? (
            <img src={image} alt="preview" className="preview-img" />
          ) : (
            <p className="upload-text">📸 Tap here to upload a food image</p>
          )}
        </div>
      </label>

      {/* SCANNING ANIMATION */}
      {loading && (
        <div className="scan-loading">
          <div className="scanner-bar"></div>
          <p>Analyzing your food... 🍽️</p>
        </div>
      )}

      {/* Results Card */}
      {foodData && (
        <div className="result-card fade-in">
          <h3 className="result-title">{foodData.name}</h3>

          <div className="result-info">
            <p>🥫 Category: {foodData.category}</p>
            <p>🧊 Storage: {foodData.storage}</p>

            {/* ⭐ Editable Shelf Life Input */}
            <p>
              ⌛ Shelf Life:{" "}
              <input
                type="number"
                value={customShelfLife}
                onChange={(e) => setCustomShelfLife(e.target.value)}
                style={{
                  width: "80px",
                  padding: "6px",
                  borderRadius: "6px",
                  border: "1px solid #2196f3",
                  marginLeft: "8px",
                }}
              />{" "}
              days
            </p>
          </div>

          <div className="result-buttons">
            <button className="btn save-btn" onClick={handleSave}>
              Save to Inventory
            </button>

            <button className="btn cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddFood;