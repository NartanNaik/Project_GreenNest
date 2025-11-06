import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AddFood from "./components/AddFood";
import FoodList from "./components/FoodList";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import OAuthHandler from "./components/auth/OAuthHandler";
import WastageGraph from "./components/WastageGraph";
import ProfilePage from "./components/ProfilePage";
import NavBar from "./components/NavBar";
import TipBanner from "./components/TipBanner";
import { useAuth } from "./contexts/AuthContext";
import DonatePage from "./components/DonatePage";
import "./App.css";
import bodyImage from './bodyImage.jpg';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

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

    if (isDarkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <div className="App">
      {/* Main Navigation */}
      <NavBar />
      {/* Theme toggle */}
      <div className="theme-toggle-container">
        <label className="switch">
          <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
          <span className="slider round"></span>
        </label>
        <span>{isDarkMode ? "🌙 Dark Mode" : "🌞 Light Mode"}</span>
      </div>

      {/* Main background image only for content */}
      <div className="main-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div className="content-wrapper" style={{ position: 'relative', zIndex: 1 }}>
        {/* App routes */}
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/home" /> : <LoginPage />}
          />
          <Route
            path="/donate"
            element={isAuthenticated ? <DonatePage /> : <Navigate to="/" />}
          />

          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/home" /> : <RegisterPage />}
          />
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
            path="/profile"
            element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" />}
          />
          <Route path="/auth/google/callback" element={<OAuthHandler />} />
          {/* Catch-all route for unknown paths */}
          <Route path="*" element={isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/" />} />
        </Routes>
      </div>

      {/* Tip Banner - only show for authenticated users */}
      {isAuthenticated && <TipBanner />}
    </div>
  );
}

export default App;
