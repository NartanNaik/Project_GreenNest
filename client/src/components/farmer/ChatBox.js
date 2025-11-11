import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { transports: ["websocket"] });

function ChatBox({ user, onClose }) {
  const farmerId = localStorage.getItem("userId"); // ✅ current logged-in farmer
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // ✅ Fetch existing chat when opened
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/messages/${farmerId}/${user._id}`);
        setMessages(res.data);
      } catch (err) {
        console.error("❌ Error fetching chat:", err);
      }
    };
    fetchMessages();
  }, [farmerId, user]);

  // ✅ Listen for new incoming messages
  useEffect(() => {
    socket.on("receiveMessage", (msg) => {
      if (
        (msg.senderId === user._id && msg.receiverId === farmerId) ||
        (msg.senderId === farmerId && msg.receiverId === user._id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("receiveMessage");
  }, [user, farmerId]);

  // ✅ Send new message
  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      const msg = {
        senderId: farmerId,
        receiverId: user._id,
        text: message,
      };

      await axios.post("http://localhost:5000/api/messages", msg);
      setMessages((prev) => [...prev, msg]);
      setMessage("");
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white shadow-lg rounded-xl border">
      <div className="flex justify-between items-center bg-green-600 text-white p-3 rounded-t-xl">
        <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
        <button onClick={onClose} className="text-white">✖</button>
      </div>

      <div className="p-3 h-64 overflow-y-auto bg-gray-50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`my-1 p-2 rounded-md ${
              msg.senderId === farmerId
                ? "bg-green-100 text-right"
                : "bg-gray-200 text-left"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex p-2 border-t">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
          className="flex-1 border rounded-md px-2 py-1"
        />
        <button
          onClick={handleSend}
          className="bg-green-600 text-white px-3 ml-2 rounded-md hover:bg-green-700 transition"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatBox;