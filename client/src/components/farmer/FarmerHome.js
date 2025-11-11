import React, { useEffect, useState } from "react";
import axios from "axios";
import ChatBox from "./ChatBox";
import UserCard from "../common/UserCard"; // ✅ Import the reusable card

function FarmerHome() {
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [notInterestedUsers, setNotInterestedUsers] = useState([]);
  const [chatUser, setChatUser] = useState(null);

  // ✅ Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users");
        const storedPrefs = JSON.parse(localStorage.getItem("interestPrefs") || "{}");

        const interested = [];
        const notInterested = [];

        res.data.forEach((user) => {
          const pref = storedPrefs[user._id];
          if (pref === "interested") interested.push(user);
          else notInterested.push(user);
        });

        setInterestedUsers(interested);
        setNotInterestedUsers(notInterested);
      } catch (err) {
        console.error("❌ Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  // ✅ Handle interest toggle
  const handleInterest = (user, status) => {
    const prefs = JSON.parse(localStorage.getItem("interestPrefs") || "{}");
    prefs[user._id] = status;
    localStorage.setItem("interestPrefs", JSON.stringify(prefs));

    if (status === "interested") {
      setInterestedUsers((prev) => [user, ...prev.filter((u) => u._id !== user._id)]);
      setNotInterestedUsers((prev) => prev.filter((u) => u._id !== user._id));
    } else {
      setNotInterestedUsers((prev) => [...prev, user]);
      setInterestedUsers((prev) => prev.filter((u) => u._id !== user._id));
    }
  };

  // ✅ Start chat
  const handleMessage = (user) => {
    setChatUser(user);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-3xl font-bold text-green-700 mb-6 text-center">
        Farmer Dashboard 🌾
      </h2>

      {/* ✅ Interested Users Section */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-3 text-green-600">Interested Users</h3>
        {interestedUsers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {interestedUsers.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                isInterested={true}
                onInterestChange={handleInterest}
                onMessage={handleMessage}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No interested users yet.</p>
        )}
      </section>

      {/* ✅ Not Interested / Other Users Section */}
      <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-700">Other Users</h3>
        {notInterestedUsers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notInterestedUsers.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                isInterested={false}
                onInterestChange={handleInterest}
                onMessage={handleMessage}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No users available.</p>
        )}
      </section>

      {/* ✅ Chat Box Popup */}
      {chatUser && <ChatBox user={chatUser} onClose={() => setChatUser(null)} />}
    </div>
  );
}

export default FarmerHome;