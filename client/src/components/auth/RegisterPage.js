import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../../App.css";

const RegisterPage = () => {
  const [role, setRole] = useState("user"); // 'user' or 'farmer'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [farmerDocs, setFarmerDocs] = useState(null);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("email", email.trim());
      formData.append("password", password);
      formData.append("role", role);

      if (role === "farmer" && farmerDocs) {
        formData.append("farmerDocs", farmerDocs);
      }

      await axios.post("http://localhost:5000/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Registration successful! You can now log in.");
      navigate("/");
    } catch (err) {
      console.error("Registration error:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.message?.toLowerCase?.() ||
        err.response?.data?.toLowerCase?.() ||
        "";

      if (
        errorMsg.includes("already registered") ||
        errorMsg.includes("already exists")
      ) {
        alert("You are already registered. Redirecting to login...");
        navigate("/");
      } else {
        alert("Registration failed. Please try again.");
      }
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <div className="form-container">
      <h2>Register</h2>

      {/* Role Selection */}
      <div
        className="role-toggle"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          margin: "20px 0",
        }}
      >
        <button
          type="button"
          onClick={() => setRole("user")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: role === "user" ? "#28a745" : "#007bff",
            color: "white",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow:
              role === "user"
                ? "0 0 10px rgba(40,167,69,0.5)"
                : "0 0 6px rgba(0,123,255,0.4)",
            transform: role === "user" ? "scale(1.05)" : "scale(1)",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 0.9)}
          onMouseLeave={(e) => (e.target.style.opacity = 1)}
        >
          Register as User
        </button>

        <button
          type="button"
          onClick={() => setRole("farmer")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: role === "farmer" ? "#28a745" : "#007bff",
            color: "white",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow:
              role === "farmer"
                ? "0 0 10px rgba(40,167,69,0.5)"
                : "0 0 6px rgba(0,123,255,0.4)",
            transform: role === "farmer" ? "scale(1.05)" : "scale(1)",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 0.9)}
          onMouseLeave={(e) => (e.target.style.opacity = 1)}
        >
          Register as Farmer
        </button>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleRegister} className="auth-form">
        <input
          type="email"
          placeholder="Email ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <div className="checkbox-container">
          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword((prev) => !prev)}
            />
            Show Password
          </label>
        </div>

        {/* Farmer-specific Upload */}
        {role === "farmer" && (
          <div className="farmer-section">
            <label>
              Upload Farming-related Document (Proof of Land, License, etc.)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFarmerDocs(e.target.files[0])}
              required
            />
          </div>
        )}

        <button type="submit" className="login-btn">
          {role === "farmer" ? "Register as Farmer" : "Register as User"}
        </button>
      </form>

      {/* Google Auth for Users */}
      {role !== "farmer" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "250px",
              textAlign: "center",
              margin: "1rem 0",
              position: "relative",
            }}
          >
            <hr
              style={{
                border: "none",
                borderTop: "1px solid #ccc",
                margin: 0,
                position: "absolute",
                top: "50%",
                left: 0,
                width: "100%",
                zIndex: 0,
              }}
            />
            <span
              style={{
                backgroundColor: "#fff",
                padding: "0 10px",
                position: "relative",
                zIndex: 1,
              }}
            >
              or
            </span>
          </div>

          <button
            onClick={handleGoogleAuth}
            style={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "0.5rem",
            }}
          >
            Continue with Google
          </button>
        </div>
      )}

      {/* Login Redirect */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          marginTop: "1rem",
        }}
      >
        <p>
          Already have an account?{" "}
          <Link to="/" className="link-btn">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;