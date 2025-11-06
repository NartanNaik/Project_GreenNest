import React, { useState, useEffect } from 'react';
import '../styles/TipBanner.css';

// List of motivational tips and facts about food waste
const tips = [
  "Reducing food waste is one of the most effective ways to fight climate change! 🌍",
  "Plan your meals for the week to avoid buying excess food that might go to waste. 📝",
  "Store fruits and vegetables properly to extend their shelf life. 🥕🍎",
  "Love your leftovers! Get creative with yesterday's meal for today's lunch. 🍲",
  "Freeze food that you can't eat before it expires. Future you will thank you! ❄️",
  "The average family wastes $1,500 worth of food each year. Save money by reducing waste! 💰",
  "Learn to understand expiration dates - 'best by' doesn't always mean 'bad after'. 📅",
  "Compost food scraps to return nutrients to the earth instead of landfills. 🌱",
  "Properly stored, many foods last much longer than you might expect! 🥫",
  "Track what you throw away to become more aware of your food waste patterns. 📊"
];

const TipBanner = () => {
  const [currentTip, setCurrentTip] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Change tip every 12 seconds
  useEffect(() => {
    if (isDismissed) return;
    
    const tipInterval = setInterval(() => {
      setIsVisible(false);
      
      // After fade out, change the tip
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
        setIsVisible(true);
      }, 500);
    }, 12000);
    
    return () => clearInterval(tipInterval);
  }, [isDismissed]);

  // Persist dismissed state in localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('tipBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('tipBannerDismissed', 'true');
  };

  const handleNextTip = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    
    setTimeout(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
      setIsVisible(true);
    }, 500);
  };

  if (isDismissed) return null;

  return (
    <div className={`tip-banner ${isVisible ? 'visible' : ''}`}>
      <div className="tip-icon">💡</div>
      <p className="tip-text">{tips[currentTip]}</p>
      <div className="tip-actions">
        <button className="tip-next" onClick={handleNextTip}>
          Next Tip
        </button>
        <button className="tip-dismiss" onClick={handleDismiss}>
          <span>×</span>
        </button>
      </div>
    </div>
  );
};

export default TipBanner; 