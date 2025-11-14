import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./ConversationList.css";

const FarmerChatList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return navigate("/login");

  const { userId } = jwtDecode(token);

  const load = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/messages/conversations/${userId}`
      );
      setConversations(res.data);
    } catch (err) {
      console.error("Error fetching:", err);
    } finally {
      setLoading(false);
    }
  };

  load();
}, [navigate]);

// ⭐ NEW AUTO-OPEN LOGIC ⭐
useEffect(() => {
  if (!loading && conversations.length > 0) {
    const latest = conversations.reduce((a, b) =>
      new Date(a.timestamp) > new Date(b.timestamp) ? a : b
    );

    navigate(`/chat/${latest.partnerId}`); // 🚀 Auto open
  }
}, [loading, conversations, navigate]);


  const openChat = (partnerId) => {
    navigate(`/chat/${partnerId}`);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading...
      </div>
    );

  return (
    <div className="chat-page-wrapper">
      <div className="chat-container">

        {/* HEADER MATCHING CHATPAGE */}
        <div className="chat-header">
          <div className="header-left-content">
            <div className="header-user-info">
              <div className="header-avatar">💬</div>
              <div>
                <h3>Your Conversations</h3>
                <p>Tap to open a chat</p>
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="message-list-container" style={{ paddingTop: "1rem" }}>
          {conversations.length === 0 ? (
            <p className="text-center text-gray-500">No conversations yet</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.partnerId}
                onClick={() => openChat(c.partnerId)}
                className="flex items-center gap-4 p-3 rounded-xl bg-white border shadow-sm hover:bg-gray-100 cursor-pointer transition mb-3"
              >
                <div className="header-avatar">
                  {c.partnerName[0]?.toUpperCase()}
                </div>

                <div className="flex-1">
                  <p className="text-lg font-semibold">{c.partnerName}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {c.lastMessage}
                  </p>
                </div>

                {!c.read && (
                  <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerChatList;
