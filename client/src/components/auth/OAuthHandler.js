import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const OAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    // ⚠️ If no token in URL, redirect to login
    if (!token) {
      console.error("❌ No token found in OAuth callback URL");
      navigate("/");
      return;
    }

    const fetchUserData = async () => {
      try {
        // ✅ Verify token & fetch user info from backend
        const res = await axios.get("http://localhost:5000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = res.data;

        // ✅ Save everything to localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("userId", user._id || user.userId || "");
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("userRole", user.role);

        console.log("✅ Google login successful:", user);

        // ✅ Update AuthContext (so isAuthenticated becomes true)
        login(token);

        // 🚀 Redirect to /home
        navigate("/home");

      } catch (err) {
        console.error("❌ Failed to complete Google login:", err);
        navigate("/");
      }
    };

    fetchUserData();
  }, [location, login, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600 text-lg animate-pulse">
        Authenticating with Google... please wait ⏳
      </p>
    </div>
  );
};

export default OAuthHandler;