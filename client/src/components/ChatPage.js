import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { FaArrowLeft, FaPaperPlane, FaTrashAlt, FaSmile } from "react-icons/fa";

// ✅ Initialize Socket.IO
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const ChatPage = () => {
  const { farmerId } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  // 🧠 Fetch farmer info + chat history
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔄 Fetching farmer and messages for:", farmerId);

        // ✅ Fetch farmer info
        const farmerRes = await axios.get(`http://localhost:5000/farmers/${farmerId}`);
        setFarmer(farmerRes.data);

        // ✅ Fetch existing chat messages from backend
        const msgRes = await axios.get(`http://localhost:5000/messages/${farmerId}`);
        console.log("💬 Loaded messages from DB:", msgRes.data);
        setMessages(msgRes.data || []);
      } catch (err) {
        console.error("❌ Error fetching data:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // ✅ Join a room for real-time updates
    socket.emit("joinRoom", farmerId);
    socket.off("receiveMessage"); // prevent duplicates
    console.log("📡 Joined room:", farmerId);

    socket.on("receiveMessage", (msg) => {
      if (msg.farmerId !== farmerId) return;
      setMessages((prev) => {
        const exists = prev.some(
          (m) => m._id === msg._id || (m.text === msg.text && m.timestamp === msg.timestamp)
        );
        return exists ? prev : [...prev, msg];
      });
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [farmerId]);

  // 🌀 Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 📤 Send a message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = {
      sender: "customer",
      farmerId: String(farmerId),
      text: newMessage.trim(),
      timestamp: new Date(),
    };
    setNewMessage("");
    socket.emit("sendMessage", msg);
  };

  // 🧹 Clear entire chat
  const clearChat = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear this chat?");
    if (!confirmClear) return;

    try {
      await axios.delete(`http://localhost:5000/messages/clear/${farmerId}`);
      setMessages([]);
    } catch (err) {
      console.error("❌ Failed to clear chat:", err);
    }
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

const onEmojiClick = (emojiData, event) => {
  const emoji = emojiData?.emoji || ""; // ✅ ensure it's a string
  setNewMessage((prev) => prev + emoji);
  setShowEmojiPicker(false);
};


  // 🧭 UI
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#dbe6f6] to-[#c5796d] p-4">
      {/* ====== Chat Container ====== */}
      <div className="flex flex-col w-full sm:w-[420px] h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-gray-300">

        {/* ===== Header ===== */}
        <div className="flex items-center justify-between bg-[#075E54] text-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-lg hover:text-gray-300 transition"
            >
              <FaArrowLeft />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-[#075E54] rounded-full flex items-center justify-center font-bold">
                {farmer?.name ? farmer.name[0] : "F"}
              </div>
              <div className="flex flex-col leading-tight">
                <h3 className="text-md font-semibold">{farmer?.name || "Farmer"}</h3>
                <p className="text-xs text-gray-200">{farmer?.email || "Loading..."}</p>
              </div>
            </div>
          </div>

          <button
            onClick={clearChat}
            title="Clear Chat"
            className="text-white hover:text-gray-200 transition"
          >
            <FaTrashAlt />
          </button>
        </div>

        {/* ===== Messages Section ===== */}
        <div className="flex-1 bg-[#f5f7fb] px-4 py-4 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500 text-center mt-10 animate-pulse">Loading chat...</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              👋 Start chatting with {farmer?.name || "the farmer"}!
            </p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex w-full mb-3 ${
                  msg.sender === "customer" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const confirmDelete = window.confirm("Delete this message?");
                    if (confirmDelete) {
                      setMessages((prev) => prev.filter((_, i) => i !== index));
                      axios
                        .delete(`http://localhost:5000/messages/${msg._id}`)
                        .catch((err) => console.error("❌ Failed to delete message:", err));
                    }
                  }}
                  className={`relative max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-md transition-transform cursor-pointer ${
                    msg.sender === "customer"
                      ? "bg-[#DCF8C6] text-gray-900 rounded-br-none ml-auto hover:scale-[1.02]"
                      : "bg-[#e8ebf0] text-gray-800 rounded-bl-none mr-auto hover:scale-[1.02]"
                  }`}
                >
                  {/* Avatar for farmer messages */}
                  {msg.sender !== "customer" && (
                    <div className="absolute -left-10 top-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                      {farmer?.name ? farmer.name[0] : "F"}
                    </div>
                  )}

                  <span className="block break-words">{msg.text}</span>
                  <div
                    className={`text-[10px] mt-1 ${
                      msg.sender === "customer"
                        ? "text-right text-gray-500"
                        : "text-left text-gray-400"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      {/* ===== Input Section ===== */}
<div className="relative flex items-center bg-white border-t border-gray-200 p-3">
  {/* Text Input */}
  <input
    type="text"
    value={newMessage}
    placeholder="Type a message..."
    onChange={(e) => setNewMessage(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
    className="flex-1 bg-[#f0f2f5] border border-gray-300 rounded-full px-4 py-2 outline-none text-gray-800 focus:ring-2 focus:ring-green-400 transition"
  />

  {/* Send Button */}
  <button
    onClick={sendMessage}
    className="ml-3 bg-[#075E54] text-white p-3 rounded-full hover:bg-[#0b7a66] transition"
  >
    <FaPaperPlane size={15} />
  </button>
</div>
      </div>
    </div>
  );
};

export default ChatPage;