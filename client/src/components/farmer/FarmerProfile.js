import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

  if (loading) return <p className="text-center mt-6">Loading profile...</p>;
  if (error) return <p className="text-center mt-6 text-red-500">{error}</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-xl">
        <h2 className="text-3xl font-bold text-green-700 mb-6 text-center">
          👨‍🌾 Farmer Profile
        </h2>

        <div className="space-y-4 text-lg">
          <p><strong>Full Name:</strong> {profile.fullName}</p>
          <p><strong>Farming Type:</strong> {profile.farmingType}</p>
          <p><strong>Crops:</strong> {profile.crops}</p>
          <p><strong>Farm Size:</strong> {profile.farmSize} acres</p>
          <p><strong>Country:</strong> {profile.country}</p>
          <p><strong>State:</strong> {profile.state}</p>
          <p><strong>District:</strong> {profile.district}</p>
        </div>

        {/* ✅ EDIT PROFILE BUTTON */}
        <button
          onClick={() => navigate("/farmer-setup?edit=true")}
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          ✏️ Edit Profile
        </button>
      </div>
    </div>
  );
}

export default FarmerProfile;