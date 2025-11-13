import React from "react";

function UserCard({ user, isInterested, onInterestChange, onMessage }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        {user.firstName
          ? `${user.firstName} ${user.lastName || ""}`
          : user.email.split("@")[0]}
      </h3>

      <p className="text-gray-600 text-sm mb-1">
        <strong>Email:</strong> {user.email}
      </p>
      <p className="text-gray-600 text-sm mb-3">
        <strong>Role:</strong> {user.role}
      </p>

      {/* BUTTONS */}
      <div className="flex gap-3 mt-3">
        <button
          onClick={() =>
            onInterestChange(
              user,
              isInterested ? "notInterested" : "interested"
            )
          }
          className={`px-3 py-2 rounded-md text-sm font-medium transition ${
            isInterested
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-yellow-400 text-gray-800 hover:bg-yellow-500"
          }`}
        >
          {isInterested ? "Unmark" : "Interested"}
        </button>

        <button
          onClick={() => onMessage(user)}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          Message
        </button>
      </div>
    </div>
  );
}

export default UserCard;