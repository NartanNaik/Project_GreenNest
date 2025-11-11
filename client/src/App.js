import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";

import AddFood from "./components/AddFood";
import FoodList from "./components/FoodList";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import OAuthHandler from "./components/auth/OAuthHandler";
import WastageGraph from "./components/WastageGraph";
import ProfilePage from "./components/ProfilePage";
import NavBar from "./components/NavBar";
import FarmerNavBar from "./components/farmer/FarmerNavBar"; // ✅ Farmer NavBar
import TipBanner from "./components/TipBanner";
import { useAuth } from "./contexts/AuthContext";
import DonatePage from "./components/DonatePage";
import ChatPage from "./components/ChatPage";
import FarmerHome from "./components/farmer/FarmerHome"; // ✅ Farmer Home
import FarmerSetup from "./components/farmer/FarmerSetup"; // ✅ Farmer Setup
import IdeaPage from "./components/farmer/IdeaPage"; 
import "./App.css";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth(); // ✅ Access user + role

  // === THEME SETUP ===
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setIsDarkMode(true);
  }, []);

  useEffect(() => {
    const bg = isDarkMode ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 98%)";
    const textColor = isDarkMode ? "#f0f0f0" : "#111";

    document.body.style.setProperty("--bg-color", bg);
    document.body.style.setProperty("--text-color", textColor);
    document.body.style.backgroundColor = bg;
    document.body.style.color = textColor;

    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    if (isDarkMode) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // === LAYOUT HIDING FOR CHAT PAGE ===
  const hideLayout = location.pathname.startsWith("/chat");

  // === 🧭 AUTO LOCATION SAVE AFTER LOGIN ===
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (isAuthenticated && token && userId) {
      if (sessionStorage.getItem("locationUpdated") === "true") return;

      sessionStorage.setItem("locationUpdated", "true");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          try {
            await axios.post("http://localhost:5000/api/save-location", {
              userId,
              coords,
            });
            console.log("✅ Location auto-updated:", coords);
          } catch (err) {
            console.error("❌ Failed to auto-save location:", err);
          }
        },
        (err) => {
          console.warn("⚠️ Location access denied or unavailable:", err.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
      );
    }
  }, [isAuthenticated]);

  // === DETERMINE USER ROLE ===
  const userRole = user?.role || localStorage.getItem("userRole") || "user";

  return (
    <div className="App">
      {/* 🧭 Navbar (hidden on chat page) */}
      {!hideLayout && (
        <>
          {/* ✅ Dynamically render navbar */}
          {userRole === "farmer" ? (
            <FarmerNavBar logout={logout} />
          ) : (
            <NavBar />
          )}

          {/* ✅ Theme Toggle */}
          <div className="theme-toggle-container">
            <label className="switch">
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <span className="slider round"></span>
            </label>
            <span>{isDarkMode ? "🌙 Dark Mode" : "🌞 Light Mode"}</span>
          </div>
        </>
      )}

      {/* 🌄 Background image (hidden on chat page) */}
      {!hideLayout && (
        <div
          className="main-bg"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        />
      )}

      <div
        className={`content-wrapper ${
          hideLayout ? "h-screen w-full p-0" : "relative z-10"
        }`}
      >
        {/* === ROUTES === */}
        <Routes>
          {/* === LOGIN & REGISTER === */}
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/home" /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/home" /> : <RegisterPage />}
          />
          <Route path="/auth/google/callback" element={<OAuthHandler />} />

          {/* === NORMAL USER ROUTES === */}
          <Route
            path="/home"
            element={isAuthenticated ? <AddFood /> : <Navigate to="/" />}
          />
          <Route
            path="/inventory"
            element={isAuthenticated ? <FoodList /> : <Navigate to="/" />}
          />
          <Route
            path="/wastage"
            element={isAuthenticated ? <WastageGraph /> : <Navigate to="/" />}
          />
          <Route
            path="/donate"
            element={isAuthenticated ? <DonatePage /> : <Navigate to="/" />}
          />
          <Route
            path="/profile"
            element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" />}
          />

          {/* === FARMER ROUTES === */}
          <Route
            path="/farmer/dashboard"
            element={isAuthenticated ? <FarmerHome /> : <Navigate to="/" />}
          />
          <Route
            path="/farmer/farm-info"
            element={isAuthenticated ? <FarmerSetup /> : <Navigate to="/" />}
          />
          <Route
            path="/farmer/ideas"
            element={isAuthenticated ? <IdeaPage /> : <Navigate to="/" />}
          />

          {/* ✅ Chat Page (full screen, no layout) */}
          <Route path="/chat/:farmerId" element={<ChatPage />} />

          {/* Catch-all redirect */}
          <Route
            path="*"
            element={
              isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/" />
            }
          />
        </Routes>
      </div>

      {/* 💡 Tip Banner */}
      {!hideLayout && isAuthenticated && userRole === "user" && <TipBanner />}
    </div>
  );
}

export default App;