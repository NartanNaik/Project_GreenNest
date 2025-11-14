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

  // 🚨 Validate ObjectId (24 hex chars)
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(recipientId);

  // 👉 Hooks must run ALWAYS — no return before them!
  useEffect(() => {
    if (!isValidObjectId) return; // ❗ Skip execution, but hook still exists

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

    load();
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
  }, [customerId, recipientId, isValidObjectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SEND
  const sendMessage = async () => {
    if (!newMessage.trim() || !isValidObjectId) return;

    const payload = {
      text: newMessage,
      senderId: customerId,
      recipientId,
    };

    setNewMessage("");

    try {
      await axios.post("http://localhost:5000/messages", payload);
    } catch (err) {
      console.error("❌ Send error:", err);
    }
  };

  // CLEAR CHAT
  const clearChat = async () => {
    if (!window.confirm("Clear entire chat?")) return;
    if (!isValidObjectId) return;

    await axios.delete(
      `http://localhost:5000/messages/clear/${customerId}/${recipientId}`
    );
    setMessages([]);
  };

  // 👉 NOW we safely validate AFTER hooks
  if (!isValidObjectId) {
    return (
      <div style={{ padding: "20px", fontSize: "18px", color: "red" }}>
        Invalid chat selected.
        <br />
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="chat-page-wrapper">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-left-content">
          <button onClick={() => navigate("/farmer/dashboard")} className="header-button back-button">
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