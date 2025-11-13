import React, { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

function ChatBox({ user, onClose }) {
  const farmerId = localStorage.getItem("userId");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // Load existing chat
  useEffect(() => {
    const load = async () => {
      const res = await axios.get(
        `http://localhost:5000/messages/${farmerId}/${user._id}`
      );
      setMessages(res.data);
    };
    load();

    socket.emit("joinRoom", farmerId);

    socket.off("receiveMessage");
    socket.on("receiveMessage", (msg) => {
      if (
        (msg.senderId === farmerId && msg.recipientId === user._id) ||
        (msg.senderId === user._id && msg.recipientId === farmerId)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("receiveMessage");
  }, [user, farmerId]);

  // SEND MESSAGE
  const handleSend = async () => {
    if (!message.trim()) return;

    const payload = {
      senderId: farmerId,
      receiverId: user._id,
      text: message,
    };

    setMessage("");

    await axios.post("http://localhost:5000/api/messages", payload);
    // No local push — socket will update UI
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white shadow-lg rounded-xl border">
      <div className="flex justify-between items-center bg-green-600 text-white p-3 rounded-t-xl">
        <h3>{user.firstName + " " + user.lastName}</h3>
        <button onClick={onClose}>✖</button>
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
          className="bg-green-600 text-white px-3 ml-2 rounded-md"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatBox;