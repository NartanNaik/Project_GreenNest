import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import NotificationPreferences from "./NotificationPreferences";
import BadgeDisplay from "./BadgeDisplay";
import ExportReports from "./ExportReports";
import "./ProfilePage.css"; // 🔥 New CSS file

const ProfilePage = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    savedItems: 0,
    wastedItems: 0,
  });

  const [userBadges, setUserBadges] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");

        const statsResponse = await axios.get(
          "http://localhost:5000/food/summary",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setStats({
          totalItems: statsResponse.data.totalFood || 0,
          savedItems: statsResponse.data.remainingFood || 0,
          wastedItems: statsResponse.data.wastedFood || 0,
        });

        const profileResponse = await axios.get(
          "http://localhost:5000/user/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (profileResponse.data.badges) {
          setUserBadges(profileResponse.data.badges);
        }

        await axios.post(
          "http://localhost:5000/user/update-badges",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="userprofile-wrapper">
      <div className="profile-card">
        {/* HEADER */}
        <h2 className="profile-title">Your Profile</h2>

        {/* USER HEADER */}
        <div className="profile-header-box">
          <div className="avatar-circle">
            <span>{user?.email?.[0]?.toUpperCase() || "U"}</span>
          </div>

          <h3 className="user-email">{user?.email || "User"}</h3>
          <p className="user-role">GreenNest User</p>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          <div className="stats-card">
            <h4>{stats.totalItems}</h4>
            <p>Total Items</p>
          </div>

          <div className="stats-card">
            <h4>{stats.savedItems}</h4>
            <p>Saved Items</p>
          </div>

          <div className="stats-card">
            <h4>{stats.wastedItems}</h4>
            <p>Wasted Items</p>
          </div>
        </div>

        <BadgeDisplay userBadges={userBadges} />

        <NotificationPreferences />

        <ExportReports />

        {/* TIPS SECTION */}
        <div className="tips-section">
          <h3>Reduce Food Wastage</h3>

          <div className="tips-grid">
            {[
              {
                icon: "📝",
                title: "Meal Planning",
                desc: "Plan meals weekly and buy only what is needed.",
              },
              {
                icon: "🧊",
                title: "Proper Storage",
                desc: "Store vegetables, fruits, and dairy properly for longevity.",
              },
              {
                icon: "🔄",
                title: "FIFO Method",
                desc: "Use older items first to prevent expiration.",
              },
            ].map((tip, i) => (
              <div className="tip-card" key={i}>
                <div className="tip-icon">{tip.icon}</div>
                <h4>{tip.title}</h4>
                <p>{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;