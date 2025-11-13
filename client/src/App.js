import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import "../../App.css";
import { GoogleLogin } from "@react-oauth/google";

// const { loginWithGoogle } = useAuth();

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, user } = useAuth();

  // ✅ Handle Normal Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      console.log("📤 Attempting login:", { email, password });
      await login(email, password);
      setSuccess("✅ Login successful! Redirecting...");
      setTimeout(() => navigate("/home"), 1000);
    } catch (err) {
      console.error("❌ Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  // ✅ Request OTP for password reset
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!recoveryEmail) {
      setError("Please enter your email address");
      return;
    }
    try {
      await axios.post("http://localhost:5000/auth/request-otp", {
        email: recoveryEmail,
      });
      setOtpSent(true);
      setSuccess("✅ OTP sent to your email. Please check your inbox.");
    } catch (err) {
      console.error("❌ OTP request failed:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to send OTP.");
    }
  };

  // ✅ Reset Password Using OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await axios.post("http://localhost:5000/auth/reset-password", {
        email: recoveryEmail,
        otp,
        newPassword,
      });
      setSuccess("✅ Password reset successful! You can now log in.");
      setShowForgotPassword(false);
      setRecoveryEmail("");
      setOtp("");
      setNewPassword("");
      setOtpSent(false);
      setShowNewPassword(false);
    } catch (err) {
      console.error("❌ Password reset failed:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to reset password.");
    }
  };


  // ✅ Redirect if already logged in
useEffect(() => {
  // Redirect ONLY if the user is on the login page
  if (user && location.pathname === "/login") {
    navigate("/home");
  }
}, [user, navigate, location.pathname]);

  return (
    <div className="login-container">
      {/* Feedback Messages */}
      {error && <div className="error-message">⚠️ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      {/* === Normal Login Form === */}
      {!user && !showForgotPassword && (
        <form onSubmit={handleLogin} style={{ textAlign: "center" }}>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
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
          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword((prev) => !prev)}
            />
            Show Password
          </label>
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      )}

      {/* === Google & Forgot Password Buttons === */}
      {!showForgotPassword && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            marginTop: "2rem",
          }}
        >
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const token = credentialResponse.credential;

                // ✅ Use your AuthContext method instead of raw axios
                const user = await loginWithGoogle(token);

                console.log("✅ Google login success:", user);
                navigate("/home"); // ✅ Navigate immediately after login

              } catch (err) {
                console.error("❌ Google login failed:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Google login failed. Please try again.");
              }
            }}
            onError={() => console.error("❌ Google Login Failed")}
          />


          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(true);
              setError("");
              setSuccess("");
            }}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "5px",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "1rem",
            }}
          >
            Forgot Password?
          </button>
        </div>
      )}

      {/* === Forgot Password / OTP Section === */}
      {showForgotPassword && (
        <div style={{ textAlign: "center" }}>
          <h2>Reset Password</h2>
          {!otpSent ? (
            <form onSubmit={handleRequestOtp}>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                required
              />
              <button type="submit" className="otp-btn">
                Request OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <label>
                <input
                  type="checkbox"
                  checked={showNewPassword}
                  onChange={() => setShowNewPassword((prev) => !prev)}
                />
                Show Password
              </label>
              <button type="submit" className="otp-btn">
                Reset Password
              </button>
            </form>
          )}
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setOtpSent(false);
              setError("");
              setSuccess("");
            }}
            style={{
              marginTop: "1rem",
              backgroundColor: "#e11d48",
              color: "white",
              border: "none",
              borderRadius: "5px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Back to Login
          </button>
        </div>
      )}

      {/* === Register Link === */}
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Don't have an account? <Link to="/register">Create New Account</Link>
      </p>
    </div>
  );
};

export default LoginPage;