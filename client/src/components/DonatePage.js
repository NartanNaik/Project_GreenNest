import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const DonatePage = () => {
  const [farmers, setFarmers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/farmers");
        setFarmers(res.data);
      } catch (err) {
        console.error("Error fetching farmers:", err);
      }
    };
    fetchFarmers();
  }, []);

  const handleMessage = (farmerId) => {
    // navigate to chat page in same tab
    navigate(`/chat/${farmerId}`);
  };

  return (
    <div className="donate-container">
      <h2>Support Our Farmers 🤝</h2>
      <div className="farmer-list">
        {farmers.map((farmer) => (
          <div key={farmer.id} className="farmer-card">
            <h3>{farmer.name}</h3>
            <p>Location: {farmer.location}</p>
            <p>Contact: {farmer.email}</p>

            <div className="button-group">
              <button className="btn donate-btn">Donate Food</button>
              <button
                className="btn message-btn"
                onClick={() => handleMessage(farmer.id)}
              >
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonatePage;