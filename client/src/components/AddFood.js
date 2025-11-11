import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddFood() {
  const [image, setImage] = useState(null);
  const [foodData, setFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null); // 👈 Reference to file input
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
      const res = await axios.post("http://localhost:5000/ai/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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

      if (!foodData) {
        return alert("No food data to save. Please scan an image first.");
      }

      const today = new Date();

      const payload = {
        name: foodData.name || "Unknown Food",
        category: foodData.category || "Misc",
        shelfLife: foodData.shelfLife || 3,
        mDate: today.toISOString(),
      };

      console.log("📦 Sending payload to backend:", payload);

      await axios.post("http://localhost:5000/food/add", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      alert("✅ Food added successfully!");
      navigate("/inventory");
    } catch (err) {
      console.error("❌ Error saving food:", err);
      alert("Error saving food: " + (err.response?.data?.message || err.message));
    }
  };

  // 🧹 Cancel / Reset function
  const handleCancel = () => {
    if (window.confirm("Are you sure you want to remove this item?")) {
      setImage(null);
      setFoodData(null);
      setLoading(false);

      // 👇 Reset file input value so the same file can be reselected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="add-food-container">
      <h2>Smart Food Scanner 🤖</h2>

      {/* Image upload box */}
      <label className="upload-area">
        <input
          ref={fileInputRef} // 👈 attach the ref
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          hidden
        />
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

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn add-btn" onClick={handleSave}>
              Save to Inventory
            </button>
            <button
              className="btn cancel-btn"
              style={{
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
              }}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddFood;