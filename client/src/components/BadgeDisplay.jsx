import React from 'react';
import '../App.css';

const BadgeDisplay = ({ userBadges }) => {
  // Badge definitions with descriptions and icons
  const badgeInfo = {
    zeroWaster: {
      title: "Zero Waster",
      description: "Achieved 0% waste in a month",
      icon: "🏆",
      color: "#FFD700"
    },
    smartSaver: {
      title: "Smart Saver",
      description: "Saved money by reducing food waste for 3 consecutive months",
      icon: "💰",
      color: "#87CEEB"
    },
    foodHero: {
      title: "Food Hero",
      description: "Used 95% of all food items before expiry",
      icon: "🍽️",
      color: "#32CD32"
    },
    inventoryMaster: {
      title: "Inventory Master",
      description: "Maintained perfect inventory tracking for a month",
      icon: "📋",
      color: "#9370DB"
    },
    donationChampion: {
      title: "Donation Champion",
      description: "Donated unused food items 5 times",
      icon: "🤲",
      color: "#FF6347"
    }
  };

  // Filter out only the badges the user has earned
  const earnedBadges = Object.entries(badgeInfo).filter(
    ([badgeKey]) => userBadges?.[badgeKey]?.earned
  );

  // If no badges earned, show a friendly message
  if (earnedBadges.length === 0) {
    return (
      <div className="badge-section">
        <h3>Your Progress Badges</h3>
        <p style={{ textAlign: "center", color: "#777", marginTop: "1rem" }}>
          You haven't earned any badges yet. Keep reducing food waste to unlock rewards! 🌱
        </p>
      </div>
    );
  }

  return (
    <div className="badge-section">
      <h3>Your Progress Badges</h3>
      <div className="badge-container">
        {earnedBadges.map(([badgeKey, badge]) => (
          <div
            key={badgeKey}
            className="badge-card badge-earned"
            title={`${badge.title}: ${badge.description}`}
            style={{
              borderColor: badge.color,
            }}
          >
            <div
              className="badge-icon"
              style={{
                color: badge.color,
                fontSize: '2rem'
              }}
            >
              {badge.icon}
            </div>
            <div
              className="badge-title"
              style={{ fontWeight: 'bold' }}
            >
              {badge.title}
            </div>
            <div className="badge-earned-label">Earned</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeDisplay;
