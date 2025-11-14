//  Import the new CSS file
import './DonatePage.css';

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// API URL constant
const API_URL = "http://localhost:5000";

const DonatePage = () => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true); // Added loading state
  const [error, setError] = useState(null); // Added error state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${API_URL}/farmers`);
        setFarmers(res.data);
      } catch (err) {
        console.error("Error fetching farmers:", err);
        setError("Failed to fetch farmers. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, []);

  const handleMessage = (farmerId) => {
    navigate(`/chat/${farmerId}`);
  };

 const handleDonate = (farmerId) => {
  navigate(`/donate/select-food?farmerId=${farmerId}`);
};

  // --- Conditional Rendering ---

  if (loading) {
    return (
      <div className="donate-container status-message">
        <p>Loading farmers... ⏳</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donate-container status-message error">
        <p>{error}</p>
      </div>
    );
  }

  // --- Main Content ---

  return (
    <div className="donate-container">
      <h2>Support Our Farmers 🤝</h2>
      <div className="farmer-list">
        {farmers.length > 0 ? (
          farmers.map((farmer) => (
            <div key={farmer.id} className="farmer-card">
              <h3>{farmer.name}</h3>
              <p>
                <strong>Location:</strong> {farmer.location}
              </p>
              <p>
                <strong>Contact:</strong> {farmer.email}
              </p>

              <div className="button-group">

                <button
                  className="btn message-btn"
                  onClick={() => handleMessage(farmer.id)}
                >
                  Message
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="status-message">
            No farmers available to support at this time.
          </p>
        )}
      </div>
    </div>
  );
};

export default DonatePage;