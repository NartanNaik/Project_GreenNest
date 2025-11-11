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

  const isActive = (path) => location.pathname === path;
  const getActiveClass = (path) =>
    isActive(path) ? "navbar-item active" : "navbar-item";

  return (
    <nav className="navbar bg-white shadow-md sticky top-0 z-50">
      <div className="navbar-container flex items-center justify-between px-6 py-3">
        {/* ✅ Logo Section */}
        <div className="flex items-center gap-2">
          <FaLeaf className="text-green-600 text-2xl" />
          <Link
            to="/farmer/dashboard"
            className="text-xl font-bold text-green-700 hover:text-green-800 transition"
          >
            GreenNest Farmer
          </Link>
        </div>

        {/* ✅ Menu Section */}
        <div className="navbar-menu flex items-center gap-5">
          <Link to="/farmer/dashboard" className={getActiveClass("/farmer/dashboard")}>
            <FaHome className="navbar-icon" />
            <span className="navbar-text">Dashboard</span>
          </Link>

          <Link to="/farmer/farm-info" className={getActiveClass("/farmer/farm-info")}>
            <FaSeedling className="navbar-icon" />
            <span className="navbar-text">My Farm</span>
          </Link>

          <Link to="/farmer/ideas" className={getActiveClass("/farmer/ideas")}>
            <FaLightbulb className="navbar-icon" />
            <span className="navbar-text">Ideas</span>
          </Link>

          <Link to="/farmer/messages" className={getActiveClass("/farmer/messages")}>
            <FaEnvelope className="navbar-icon" />
            <span className="navbar-text">Messages</span>
          </Link>

          <Link to="/farmer/profile" className={getActiveClass("/farmer/profile")}>
            <FaUser className="navbar-icon" />
            <span className="navbar-text">Profile</span>
          </Link>
        </div>

        {/* ✅ Logout Section */}
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