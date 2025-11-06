import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const OAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      login(token); // Store the token in your auth context
      navigate("/food-list");
    } else {
      console.error("No token in URL");
      navigate("/");
    }
  }, [location, login, navigate]);

  return <p>Authenticating with Google, please wait...</p>;
};

export default OAuthHandler;