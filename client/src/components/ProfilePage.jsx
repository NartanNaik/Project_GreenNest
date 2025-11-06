import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import NotificationPreferences from "./NotificationPreferences";
import BadgeDisplay from "./BadgeDisplay";
import ExportReports from "./ExportReports";
import "../App.css";

const ProfilePage = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    savedItems: 0,
    wastedItems: 0
  });
  const [userBadges, setUserBadges] = useState({
    zeroWaster: { earned: false },
    smartSaver: { earned: false },
    foodHero: { earned: false },
    inventoryMaster: { earned: false },
    donationChampion: { earned: false }
  });

  useEffect(() => {
    // Fetch user statistics and profile data
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch food summary statistics
        const statsResponse = await axios.get("http://localhost:5000/food/summary", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (statsResponse.data) {
          setStats({
            totalItems: statsResponse.data.totalFood || 0,
            savedItems: statsResponse.data.remainingFood || 0,
            wastedItems: statsResponse.data.wastedFood || 0
          });
        }
        
        // Fetch user profile with badges
        const profileResponse = await axios.get("http://localhost:5000/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (profileResponse.data && profileResponse.data.badges) {
          setUserBadges(profileResponse.data.badges);
        }
        
        // Trigger badge update calculation on the server
        await axios.post("http://localhost:5000/user/update-badges", {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Set default values if there's an error
        setStats({
          totalItems: 0,
          savedItems: 0,
          wastedItems: 0
        });
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const wastageReductionTips = [
    {
      title: "Meal Planning",
      description: "Plan your meals for the week and buy only what you need. Make a shopping list and stick to it to avoid impulse purchases.",
      icon: "📝"
    },
    {
      title: "Proper Storage",
      description: "Store food properly to maximize freshness. Keep fruits and vegetables in separate drawers, and store herbs with stems in water.",
      icon: "🧊"
    },
    {
      title: "Use FIFO Method",
      description: "First In, First Out – place newer food items at the back of the fridge/pantry and older ones at the front to use first.",
      icon: "🔄"
    },
    {
      title: "Understand Expiry Dates",
      description: "\"Best by\" dates indicate quality, not safety. Many foods are still safe to eat after this date if stored properly.",
      icon: "📅"
    },
    {
      title: "Freeze Extra Food",
      description: "If you won't eat it soon, freeze it. Most foods freeze well and can be saved for later use.",
      icon: "❄️"
    }
  ];

  const wastageHandlingTips = [
    {
      title: "Check Before Discarding",
      description: "Many foods are still good past their expiry date. Use your senses – look, smell, and taste a small amount to check.",
      icon: "👀"
    },
    {
      title: "Creative Leftovers",
      description: "Transform leftovers into new meals. Stale bread can become croutons, vegetable scraps can make stock.",
      icon: "🍲"
    },
    {
      title: "Share With Others",
      description: "If you have excess food that will expire soon, share with friends, family, or neighbors.",
      icon: "🤝"
    },
    {
      title: "Composting",
      description: "If food is no longer edible, compost it instead of throwing it in the trash to reduce landfill waste.",
      icon: "🌱"
    },
    {
      title: "Smaller Portions",
      description: "Serve smaller portions to reduce plate waste. You can always go back for seconds if still hungry.",
      icon: "🍽️"
    }
  ];

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      
      <div className="profile-info-section">
        <div className="profile-header">
          <div className="profile-avatar">
            <span>{user?.email ? user.email[0].toUpperCase() : "U"}</span>
          </div>
          <div className="profile-details">
            <h3>{user?.email || "User"}</h3>
            <p>Food Waste Controller User</p>
          </div>
        </div>
        
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalItems}</div>
            <div className="stat-label">Total Items</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.savedItems}</div>
            <div className="stat-label">Items Saved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.wastedItems}</div>
            <div className="stat-label">Items Wasted</div>
          </div>
        </div>
      </div>
      
      <BadgeDisplay userBadges={userBadges} />
      
      <NotificationPreferences />
      
      <ExportReports />
      
      <div className="suggestion-section">
        <h3>How to Reduce Food Wastage</h3>
        <div className="suggestion-cards">
          {wastageReductionTips.map((tip, index) => (
            <div key={index} className="suggestion-card">
              <div className="suggestion-icon">{tip.icon}</div>
              <h4>{tip.title}</h4>
              <p>{tip.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="suggestion-section">
        <h3>What to Do When Food is About to Expire</h3>
        <div className="suggestion-cards">
          {wastageHandlingTips.map((tip, index) => (
            <div key={index} className="suggestion-card">
              <div className="suggestion-icon">{tip.icon}</div>
              <h4>{tip.title}</h4>
              <p>{tip.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="logout-section">
        <button className="btn logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfilePage; 