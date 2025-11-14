import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaSeedling,
  FaUser,
  FaMapMarkedAlt,
  FaTractor,
  FaClipboardList,
  FaEdit,
} from "react-icons/fa";

import "./FarmerProfile.css";

function FarmerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please login to view profile.");
          setLoading(false);
          return;
        }

        const res = await axios.get("http://localhost:5000/api/farmer/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(res.data);
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <p className="loading-text">Loading profile...</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        <div className="profile-header">
          <FaSeedling className="header-icon" />
          <h2>Farmer Profile</h2>
        </div>

        <div className="profile-grid">

          <div className="profile-box">
            <FaUser className="box-icon" />
            <h4>Full Name</h4>
            <p>{profile.fullName}</p>
          </div>

          <div className="profile-box">
            <FaTractor className="box-icon" />
            <h4>Farming Type</h4>
            <p>{profile.farmingType}</p>
          </div>

          <div className="profile-box">
            <FaClipboardList className="box-icon" />
            <h4>Crops</h4>
            <p>{profile.crops}</p>
          </div>

          <div className="profile-box">
            <FaSeedling className="box-icon" />
            <h4>Farm Size</h4>
            <p>{profile.farmSize} acres</p>
          </div>

          <div className="profile-box">
            <FaMapMarkedAlt className="box-icon" />
            <h4>Country</h4>
            <p>{profile.country}</p>
          </div>

          <div className="profile-box">
            <FaMapMarkedAlt className="box-icon" />
            <h4>State</h4>
            <p>{profile.state}</p>
          </div>

          <div className="profile-box">
            <FaMapMarkedAlt className="box-icon" />
            <h4>District</h4>
            <p>{profile.district}</p>
          </div>

        </div>

        {/* EDIT BUTTON */}
        <button
          onClick={() => navigate("/farmer-setup?edit=true")}
          className="edit-button"
        >
          <FaEdit /> Edit Profile
        </button>
      </div>
    </div>
  );
}

export default FarmerProfile;