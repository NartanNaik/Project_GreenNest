import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddFood() {
  const [image, setImage] = useState(null);
  const [foodData, setFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview image
    setImage(URL.createObjectURL(file));

    // Prepare FormData for backend
    const formData = new FormData();
    formData.append("image", file);

    try {
      setLoading(true);

      // ✅ Corrected API endpoint — matches your backend aiRoutes.js
      const res = await axios.post("http://localhost:5000/ai/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Backend returns { message, data }, so extract `data`
      setFoodData(res.data.data);
    } catch (err) {
      console.error("❌ Error scanning image:", err);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      // Save the analyzed food to inventory
      await axios.post(
        "http://localhost:5000/food/add",
        foodData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Food added successfully!");
      navigate("/inventory");
    } catch (err) {
      console.error("❌ Error saving food:", err);
      alert("Error saving food: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="add-food-container">
      <h2>Smart Food Scanner 🤖</h2>

      {/* Image upload box */}
      <label className="upload-area">
        <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
        <div className="upload-box">
          {image ? (
            <img
              src={image}
              alt="preview"
              style={{
                width: "200px",
                borderRadius: "10px",
                marginTop: "10px",
              }}
            />
          ) : (
            <p>📸 Click or upload an image of your food item</p>
          )}
        </div>
      </label>

      {loading && <p>Analyzing image... please wait ⏳</p>}

      {/* Display results */}
      {foodData && (
        <div className="food-info-card">
          <h3>{foodData.name || "Unknown Food"}</h3>
          <p>🥫 Category: {foodData.category || "N/A"}</p>
          <p>🧊 Best Stored: {foodData.storage || "Unknown"}</p>
          <p>⌛ Shelf Life: {foodData.shelfLife || "?"} days</p>

          <button className="btn add-btn" onClick={handleSave}>
            Save to Inventory
          </button>
        </div>
      )}
    </div>
  );
}

export default AddFood;