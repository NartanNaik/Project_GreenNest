import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaUser,
  FaSeedling,
  FaLeaf,
  FaClipboardList,
  FaGlobeAsia,
  FaEdit,
  FaMapMarkerAlt,
} from "react-icons/fa";

import "./FarmerSetup.css";

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
  const location = useLocation();

  const isEditMode = location.search.includes("edit=true");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isEditMode) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get("http://localhost:5000/api/farmer/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFormData(res.data);
      } catch (err) {
        console.error("❌ Failed to load profile:", err);
      }
    };

    fetchProfile();
  }, [isEditMode]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Please log in first.");

      await axios.post("http://localhost:5000/api/farmer/setup", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Profile saved successfully!");
      navigate("/farmer-profile");
    } catch (err) {
      console.error("❌ Error saving profile:", err);
      alert("Failed to save. Try again.");
    }
  };

  return (
    <div className="setup-wrapper">
      <form className="setup-card" onSubmit={handleSubmit}>
        
        <div className="setup-header">
          <FaLeaf className="setup-header-icon" />
          <h2>
            {isEditMode ? "Edit Farmer Profile" : "Farmer Profile Setup"}
          </h2>
        </div>

        <div className="setup-grid">

          {/* Full Name */}
          <div className="setup-field">
            <label><FaUser className="field-icon" /> Full Name</label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Farming Type */}
          <div className="setup-field">
            <label><FaSeedling className="field-icon" /> Farming Type</label>
            <select
              name="farmingType"
              value={formData.farmingType}
              onChange={handleChange}
              required
            >
              <option value="">Select Type</option>
              <option value="Vegetable Farming">Vegetable Farming</option>
              <option value="Fruit Farming">Fruit Farming</option>
              <option value="Mixed Farming">Mixed Farming</option>
              <option value="Dairy Farming">Dairy Farming</option>
              <option value="Organic Farming">Organic Farming</option>
            </select>
          </div>

          {/* Crops */}
          <div className="setup-field">
            <label><FaClipboardList className="field-icon" /> Crops</label>
            <input
              type="text"
              name="crops"
              placeholder="e.g. Tomato, Onion, Rice"
              value={formData.crops}
              onChange={handleChange}
              required
            />
          </div>

          {/* Farm Size */}
          <div className="setup-field">
            <label><FaLeaf className="field-icon" /> Farm Size (acres)</label>
            <input
              type="number"
              name="farmSize"
              value={formData.farmSize}
              onChange={handleChange}
              required
            />
          </div>

          {/* State */}
          <div className="setup-field">
            <label><FaMapMarkerAlt className="field-icon" /> State</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            >
              <option value="">Select State</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Kerala">Kerala</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </select>
          </div>

          {/* District */}
          <div className="setup-field">
            <label><FaMapMarkerAlt className="field-icon" /> District</label>
            <input
              type="text"
              name="district"
              placeholder="Enter district"
              value={formData.district}
              onChange={handleChange}
              required
            />
          </div>

        </div>

        <button type="submit" className="setup-submit-button">
          {isEditMode ? <FaEdit /> : "Save Profile"}  
          {isEditMode ? " Save Changes" : ""}
        </button>

      </form>
    </div>
  );
}

export default FarmerSetup;