import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./FarmerHome.css";

function FarmerHome() {
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [notInterestedUsers, setNotInterestedUsers] = useState([]);
  const navigate = useNavigate();

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users");

        const storedPrefs = JSON.parse(
          localStorage.getItem("interestPrefs") || "{}"
        );

        const interested = [];
        const notInterested = [];

        res.data.forEach((user) => {
          const pref = storedPrefs[user._id];
          if (pref === "interested") interested.push(user);
          else notInterested.push(user);
        });

        setInterestedUsers(interested);
        setNotInterestedUsers(notInterested);
      } catch (err) {
        console.error("❌ Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  // Toggle Interest
  const handleInterest = (user, status) => {
    const prefs = JSON.parse(localStorage.getItem("interestPrefs") || "{}");

    prefs[user._id] = status;
    localStorage.setItem("interestPrefs", JSON.stringify(prefs));

    if (status === "interested") {
      setInterestedUsers((prev) => [
        user,
        ...prev.filter((u) => u._id !== user._id),
      ]);
      setNotInterestedUsers((prev) => prev.filter((u) => u._id !== user._id));
    } else {
      setNotInterestedUsers((prev) => [...prev, user]);
      setInterestedUsers((prev) => prev.filter((u) => u._id !== user._id));
    }
  };

  // ✅ FIXED: Start real chat page
  const handleMessage = (user) => {
    navigate(`/chat/${user._id}`);
  };

  return (
    <div className="farmer-home-container">
      <h2 className="header-title">Farmer Dashboard 🌾</h2>

      {/* Interested Users */}
      <div className="section-card">
        <h3 className="section-title">Interested Users</h3>

        {interestedUsers.length > 0 ? (
          <div className="user-card-grid">
            {interestedUsers.map((user) => (
              <div key={user._id} className="user-card">
                <h3 className="user-name">
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`
                    : user.email.split("@")[0]}
                </h3>

                <p>
                  <strong>Location:</strong> Not provided
                </p>
                <p>
                  <strong>Contact:</strong> {user.email}
                </p>

                <div className="user-card-buttons">
                  <button
                    className="user-btn not-interested-btn"
                    onClick={() => handleInterest(user, "not-interested")}
                  >
                    Remove Interest
                  </button>

                  <button
                    className="user-btn message-btn"
                    onClick={() => handleMessage(user)}
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-box">No interested users yet.</div>
        )}
      </div>

      {/* Other Users */}
      <div className="section-card">
        <h3 className="section-title">Other Users</h3>

        {notInterestedUsers.length > 0 ? (
          <div className="user-card-grid">
            {notInterestedUsers.map((user) => (
              <div key={user._id} className="user-card">
                <h3 className="user-name">
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`
                    : user.email.split("@")[0]}
                </h3>

                <p>
                  <strong>Location:</strong> Not provided
                </p>
                <p>
                  <strong>Contact:</strong> {user.email}
                </p>

                <div className="user-card-buttons">
                  <button
                    className="user-btn interest-btn"
                    onClick={() => handleInterest(user, "interested")}
                  >
                    Interested
                  </button>

                  <button
                    className="user-btn message-btn"
                    onClick={() => handleMessage(user)}
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-box">No users available.</div>
        )}
      </div>
    </div>
  );
}

export default FarmerHome;