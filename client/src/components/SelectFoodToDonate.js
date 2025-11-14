import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const SelectFoodToDonate = ({ farmerId }) => {
  const [expired, setExpired] = useState([]);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const userId = jwtDecode(token).userId;

  useEffect(() => {
    const loadExpired = async () => {
      const res = await axios.get("http://localhost:5000/food/expired", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpired(res.data);
    };
    loadExpired();
  },);

const handleDonateItem = async (item, farmerId) => {
  try {
    const token = localStorage.getItem("token");
    const customer = jwtDecode(token);

    await axios.post("http://localhost:5000/messages", {
      senderId: customer.userId,
      recipientId: farmerId,
      type: "donation_request",
      text: "I want to donate this food item",
      foodId: item._id,
      foodName: item.name,
      foodCategory: item.category,
      foodExpiry: item.expiryDate
    });

    alert("Donation request sent!");
  } catch (err) {
    console.error("Donation error:", err);
    alert("Error sending donation request.");
  }
};


  return (
    <div className="expired-list">
      <h3>Select Expired Food to Donate</h3>

      {expired.map((f) => (
        <div className="expired-item-card" key={f._id}>
          <h4>{f.name}</h4>
          <p>Category: {f.category}</p>
          <p>Expired: {new Date(f.expiryDate).toDateString()}</p>

          <button onClick={() => handleDonateItem(f)}>Send Donation Request</button>
        </div>
      ))}
    </div>
  );
};

export default SelectFoodToDonate;