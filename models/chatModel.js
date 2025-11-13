import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  recipientId: {   // ✅ FIXED: MUST MATCH FRONTEND + BACKEND
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
});

export default mongoose.model("Message", messageSchema);