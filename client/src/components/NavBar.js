import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaHome, FaWarehouse, FaChartBar, FaSignInAlt, FaUserPlus, 
  FaUser, FaGift, FaSeedling, FaLeaf ,FaSignOutAlt
} from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import './NavBar.css';

const NavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  // Detect user role (default: "user")
  const userRole = user?.role || "user";

  const isActive = (path) => location.pathname === path;
  const getActiveClass = (path) => (isActive(path) ? "navbar-item active" : "navbar-item");

  // Show minimal navbar for login/register pages
  const isAuthPage = location.pathname === "/" || location.pathname === "/register";
  if (isAuthPage && !isAuthenticated) {
    return (
      <nav className="navbar">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1rem 0",
          }}
        >
          <FaLeaf
            style={{
              color: "#16a34a",
              fontSize: "1.875rem",
              marginRight: "0.5rem",
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
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <FaLeaf
            style={{
              color: "#16a34a",
              fontSize: "1.875rem",
            }}
          />
          <Link
            to="/home"
            style={{
              fontSize: "1.5rem",
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

        {/* Menu Section */}
        <div className="navbar-menu">
          {userRole === "farmer" ? (
            <>
              <Link to="/farmer/dashboard" className={getActiveClass('/farmer/dashboard')}>
                <FaHome className="navbar-icon" />
                <span className="navbar-text">Dashboard</span>
              </Link>

              <Link to="/farmer/produce" className={getActiveClass('/farmer/produce')}>
                <FaSeedling className="navbar-icon" />
                <span className="navbar-text">My Produce</span>
              </Link>

              <Link to="/farmer/inventory" className={getActiveClass('/farmer/inventory')}>
                <FaWarehouse className="navbar-icon" />
                <span className="navbar-text">Inventory</span>
              </Link>

              <Link to="/farmer/wastage" className={getActiveClass('/farmer/wastage')}>
                <FaChartBar className="navbar-icon" />
                <span className="navbar-text">Wastage</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/home" className={getActiveClass('/home')}>
                <FaHome className="navbar-icon" />
                <span className="navbar-text">Home</span>
              </Link>

              <Link to="/inventory" className={getActiveClass('/inventory')}>
                <FaWarehouse className="navbar-icon" />
                <span className="navbar-text">Inventory</span>
              </Link>

              <Link to="/wastage" className={getActiveClass('/wastage')}>
                <FaChartBar className="navbar-icon" />
                <span className="navbar-text">Wastage</span>
              </Link>

              {/* NEW: Donation Page for Normal Users */}
              <Link to="/donate" className={getActiveClass('/donate')}>
                <FaGift className="navbar-icon" />
                <span className="navbar-text">Donate</span>
              </Link>
            </>
          )}
        </div>

        {/* Right Side Auth Section */}
        <div
          className="navbar-auth"
          style={{ display: "flex", alignItems: "center", gap: "16px" }}
        >
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link
                to="/profile"
                className={getActiveClass('/profile')}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FaUser className="navbar-icon" />
                <span className="navbar-text">Profile</span>
              </Link>
              <button
                onClick={logout}
                className="navbar-item"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <FaSignOutAlt className="navbar-icon" />
                <span className="navbar-text">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/" className={getActiveClass('/')}>
                <FaSignInAlt className="navbar-icon" />
                <span className="navbar-text">Login</span>
              </Link>
              <Link to="/register" className={getActiveClass('/register')}>
                <FaUserPlus className="navbar-icon" />
                <span className="navbar-text">Register</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
