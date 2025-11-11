import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function FarmerSetup() {
  const [formData, setFormData] = useState({
    fullName: "",
    farmingType: "",
    crops: "",
    farmSize: "",
    country: "India",
    state: "",
    district: "",
  });

  const navigate = useNavigate();

  // ✅ Handle form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in first.");
        return;
      }

      await axios.post("http://localhost:5000/api/farmer/setup", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("✅ Farmer profile saved successfully!");
      navigate("/farmer-home");
    } catch (err) {
      console.error("❌ Error saving farmer details:", err);
      alert("Failed to save details. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg"
      >
        <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
          👨‍🌾 Farmer Profile Setup
        </h2>

        {/* Full Name */}
        <label className="block mb-3">
          <span className="text-gray-700">Full Name</span>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded mt-1"
            placeholder="Enter your full name"
          />
        </label>

        {/* Farming Type */}
        <label className="block mb-3">
          <span className="text-gray-700">Farming Type</span>
          <select
            name="farmingType"
            value={formData.farmingType}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded mt-1"
          >
            <option value="">Select type</option>
            <option value="Vegetable Farming">Vegetable Farming</option>
            <option value="Fruit Farming">Fruit Farming</option>
            <option value="Mixed Farming">Mixed Farming</option>
            <option value="Dairy Farming">Dairy Farming</option>
            <option value="Organic Farming">Organic Farming</option>
          </select>
        </label>

        {/* Crops */}
        <label className="block mb-3">
          <span className="text-gray-700">Crops You Grow</span>
          <input
            type="text"
            name="crops"
            value={formData.crops}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded mt-1"
            placeholder="e.g., Tomato, Onion, Rice"
          />
        </label>

        {/* Farm Size */}
        <label className="block mb-3">
          <span className="text-gray-700">Farm Size (in acres)</span>
          <input
            type="number"
            name="farmSize"
            value={formData.farmSize}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded mt-1"
            placeholder="e.g., 5"
          />
        </label>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label>
            <span className="text-gray-700">State</span>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded mt-1"
            >
              <option value="">Select State</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Kerala">Kerala</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </select>
          </label>

          <label>
            <span className="text-gray-700">District</span>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded mt-1"
              placeholder="e.g., Udupi"
            />
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
}

export default FarmerSetup;