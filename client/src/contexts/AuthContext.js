import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Automatically check token on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        try {
          const response = await axios.get("http://localhost:5000/auth/me");
          setUser({
            email: response.data.email,
            role: response.data.role || "user",
          });
          setIsAuthenticated(true);
        } catch (error) {
          console.error(
            "❌ Auth token invalid or expired:",
            error.response?.data || error.message
          );
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // ✅ Manual login (email/password)
  const login = async (email, password) => {
    try {
      console.log("📤 Sending login request:", { email, password });

      // ❗ FIXED: removed JSON.stringify()
      const response = await axios.post(
        "http://localhost:5000/auth/login",
        { email, password },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const { token, email: userEmail, role } = response.data;
      console.log("✅ Login response:", response.data);

      // Save token and update axios
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser({ email: userEmail, role, token });
      setIsAuthenticated(true);
    } catch (error) {
      console.error("❌ Login failed:", error.response?.data || error.message);
      throw error;
    }
  };

  // ✅ Google login (after redirect with token)
const loginWithGoogle = async (googleToken) => {
  try {
    const response = await axios.post("http://localhost:5000/auth/google", {
      token: googleToken,
    });

    const { token, email, role } = response.data;

    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const newUser = { email, role, token };
    setUser(newUser);
    setIsAuthenticated(true);

    console.log("✅ Google login successful:", response.data);
    return newUser; // ✅ Return this so LoginPage can act instantly
  } catch (err) {
    console.error("❌ Google login failed:", err.response?.data || err.message);
    throw err;
  }
};

  // ✅ Logout user
  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setIsAuthenticated(false);
    console.log("👋 Logged out successfully");
  };

  // ✅ OTP utilities
  const requestPasswordReset = async (email) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/auth/request-otp",
        { email }
      );
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to send OTP",
      };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/auth/verify-otp",
        { email, otp }
      );
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "OTP verification failed",
      };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/auth/reset-password",
        {
          email,
          otp,
          newPassword,
        }
      );
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Password reset failed",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        loginWithGoogle,
        logout,
        setUser,
        requestPasswordReset,
        verifyOtp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Custom hook for consuming AuthContext
export const useAuth = () => useContext(AuthContext);