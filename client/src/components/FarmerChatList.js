import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const FarmerChatList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [farmerId, setFarmerId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setFarmerId(decoded.userId);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (!farmerId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `http://localhost:5000/messages/conversations/${farmerId}`
        );
        setConversations(res.data);
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [farmerId]);

  const handleChatClick = (customerId, customerName) => {
    navigate(`/chat/${customerId}`, {
      state: { recipientName: customerName },
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold text-gray-600">
        Loading conversations...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Your Conversations
      </h2>

      {conversations.length === 0 ? (
        <p className="text-gray-600 text-lg">You have no messages yet.</p>
      ) : (
        <div className="space-y-4">
          {conversations.map((convo) => (
            <div
              key={convo.customerId}
              onClick={() =>
                handleChatClick(convo.customerId, convo.customerName)
              }
              className="flex items-center gap-4 p-4 rounded-xl shadow hover:bg-gray-50 cursor-pointer border border-gray-200 transition"
            >
              {/* Avatar */}
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-600 text-white text-xl font-semibold">
                {convo.customerName[0].toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {convo.customerName}
                </h3>
                <p className="text-gray-500 text-sm truncate">
                  {convo.lastMessage}
                </p>
              </div>

              {/* Unread Dot */}
              {!convo.read && (
                <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerChatList;