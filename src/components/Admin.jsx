
import React from "react";
import { updateLeaderboard } from "./updateLeaderboard";

export default function Admin() {
  const handleClick = async () => {
    await updateLeaderboard();
    alert("Leaderboard updated!");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button
        onClick={handleClick}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-blue-700"
      >
        Update Leaderboard
      </button>
    </div>
  );
}
