import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaHome,
  FaSeedling,
  FaLightbulb,
  FaEnvelope,
  FaUser,
  FaSignOutAlt,
  FaLeaf,
} from "react-icons/fa";

const FarmerNavBar = ({ logout }) => {
  const location = useLocation();

  const isActive = (path) => {
    try {
      const current = location?.pathname || "";

      // Special case: Chat should highlight for ANY /chat/:id route
      if (path === "/farmer/messages") {
        return current.startsWith("/farmer/messages") ||
          current.startsWith("/chat/");
      }

      return current.startsWith(path);
    } catch {
      return false;
    }
  };

  const getActiveClass = (path) =>
    isActive(path) ? "navbar-item active" : "navbar-item";

  return (
    <nav className="navbar bg-white shadow-md sticky top-0 z-50">
      <div className="navbar-container flex items-center justify-between px-6 py-3">

        {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
  <FaLeaf
    style={{
      color: "#16a34a",
      fontSize: "1.875rem",
    }}
  />

  <Link
    to="/"
    style={{
      fontSize: "1.75rem",
      fontWeight: "bold",
      color: "#15803d",
      textDecoration: "none",
      transition: "color 0.2s ease-in-out",
    }}
    onMouseEnter={(e) => (e.target.style.color = "#166534")}
    onMouseLeave={(e) => (e.target.style.color = "#15803d")}
  >
    GreenNest
  </Link>
</div>


        {/* Menu */}
        <div className="navbar-menu flex items-center gap-5">

          <Link
            to="/farmer/dashboard"
            className={getActiveClass("/farmer/dashboard")}
          >
            <FaHome className="navbar-icon" />
            <span className="navbar-text">Dashboard</span>
          </Link>

          <Link
            to="/farmer-setup"
            className={getActiveClass("/farmer-setup")}
          >
            <FaSeedling className="navbar-icon" />
            <span className="navbar-text">My Farm</span>
          </Link>

          <Link
            to="/farmer/ideas"
            className={getActiveClass("/farmer/ideas")}
          >
            <FaLightbulb className="navbar-icon" />
            <span className="navbar-text">Ideas</span>
          </Link>

          {/* FIXED → Correct route for Messages */}
          {/* Auto-open latest chat */}
          <button
            onClick={async () => {
              try {
                const userId = localStorage.getItem("userId");
                if (!userId) return;

                const res = await fetch(`http://localhost:5000/messages/conversations/${userId}`);
                const conversations = await res.json();

                if (conversations.length > 0) {
                  const latest = conversations[0]; // newest chat
                  window.location.href = `/chat/${latest.partnerId}`;
                } else {
                  window.location.href = "/farmer/messages"; // fallback
                }
              } catch (err) {
                window.location.href = "/farmer/messages";
              }
            }}
            className={getActiveClass("/farmer/messages")}
          >
            <FaEnvelope className="navbar-icon" />
            <span className="navbar-text">Messages</span>
          </button>


          <Link
            to="/farmer-profile"
            className={getActiveClass("/farmer-profile")}
          >
            <FaUser className="navbar-icon" />
            <span className="navbar-text">Profile</span>
          </Link>
        </div>

        {/* Logout */}
        <div className="flex items-center">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 transition font-medium"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>

      </div>
    </nav>
  );
};

export default FarmerNavBar;