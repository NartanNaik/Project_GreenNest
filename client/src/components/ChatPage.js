import React, { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "./socket";
import { FaArrowLeft, FaPaperPlane, FaTrashAlt } from "react-icons/fa";
import "./ChatPage.css";

const ChatPage = () => {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const customerId = jwtDecode(token).userId;

  // Fetch farmer & messages
  useEffect(() => {
    const load = async () => {
      try {
        const f = await axios.get(`http://localhost:5000/farmers/${recipientId}`);
        setFarmer(f.data);

        const m = await axios.get(
          `http://localhost:5000/messages/${customerId}/${recipientId}`
        );
        setMessages(m.data || []);
      } catch (err) {
        console.error("❌ Chat load error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (recipientId) load();
    socket.emit("joinRoom", customerId);

    socket.off("receiveMessage");
    socket.on("receiveMessage", (msg) => {
      if (
        (msg.senderId === customerId && msg.recipientId === recipientId) ||
        (msg.senderId === recipientId && msg.recipientId === customerId)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("receiveMessage");
  }, [customerId, recipientId]);

  // Autoscroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SEND
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const payload = {
      text: newMessage,
      senderId: customerId,
      recipientId,
    };

    setNewMessage("");

    try {
      await axios.post("http://localhost:5000/messages", payload);
      // DO NOT add to messages — socket will do that
    } catch (err) {
      console.error("❌ Send error:", err);
    }
  };

  // CLEAR CHAT
  const clearChat = async () => {
    if (!window.confirm("Clear entire chat?")) return;
    await axios.delete(
      `http://localhost:5000/messages/clear/${customerId}/${recipientId}`
    );
    setMessages([]);
  };

  return (
    <div className="chat-page-wrapper">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-left-content">
            <button onClick={() => navigate(-1)} className="header-button back-button">
              <FaArrowLeft />
            </button>

            <div className="header-user-info">
              <div className="header-avatar">{farmer?.name?.[0] || "F"}</div>
              <div>
                <h3>{farmer?.name}</h3>
                <p>{farmer?.email}</p>
              </div>
            </div>
          </div>

          <button onClick={clearChat} className="header-button clear-chat-button">
            <FaTrashAlt />
          </button>
        </div>

        <div className="message-list-container">
          {loading ? (
            <p>Loading chat...</p>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`message-row ${
                  msg.senderId === customerId ? "customer-message" : "farmer-message"
                }`}
              >
                <div className="message-bubble">
                  <span>{msg.text}</span>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area-wrapper">
          <div className="chat-input-controls">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message..."
              className="chat-input-field"
            />
            <button onClick={sendMessage} className="control-button send-button">
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
