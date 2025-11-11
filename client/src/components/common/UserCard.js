import React from "react";

function UserCard({ user, isInterested, onInterestChange, onMessage }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition">
      <p className="font-semibold text-gray-800">
        {user.firstName} {user.lastName}
      </p>
      <p className="text-sm text-gray-500">{user.email}</p>

      <div className="flex gap-3 mt-3">
        {/* Toggle Interested / Not Interested */}
        {isInterested ? (
          <button
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
            onClick={() => onInterestChange(user, "not_interested")}
          >
            Not Interested
          </button>
        ) : (
          <button
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
            onClick={() => onInterestChange(user, "interested")}
          >
            Interested
          </button>
        )}

        {/* Message Button */}
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          onClick={() => onMessage(user)}
        >
          Message
        </button>
      </div>
    </div>
  );
}

export default UserCard;