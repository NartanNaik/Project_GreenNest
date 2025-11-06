import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationPreferences.css';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    email: true,
    inApp: true,
    daysBeforeExpiry: 3
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch user preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  // Fetch user notification preferences
  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.notificationPreferences) {
        setPreferences(response.data.notificationPreferences);
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      setError('Failed to load your notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save preferences
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const token = localStorage.getItem('token');
      
      await axios.put('http://localhost:5000/user/notification-preferences', preferences, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setError('Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="preferences-loading">Loading preferences...</div>;
  }

  return (
    <div className="notification-preferences-container">
      <h3>Notification Preferences</h3>
      
      <div className="preference-section">
        <div className="preference-item">
          <label className="toggle-switch">
            <input
              type="checkbox"
              name="email"
              checked={preferences.email}
              onChange={handleChange}
            />
            <span className="toggle-slider"></span>
          </label>
          <div className="preference-info">
            <span>Email Notifications</span>
            <p className="preference-description">
              Receive email alerts when your food items are about to expire.
            </p>
          </div>
        </div>
        
        <div className="preference-item">
          <label className="toggle-switch">
            <input
              type="checkbox"
              name="inApp"
              checked={preferences.inApp}
              onChange={handleChange}
            />
            <span className="toggle-slider"></span>
          </label>
          <div className="preference-info">
            <span>In-App Notifications</span>
            <p className="preference-description">
              See notifications in the app about expiring food items.
            </p>
          </div>
        </div>
        
        <div className="preference-item days-input">
          <label htmlFor="daysBeforeExpiry">Days before expiry to notify:</label>
          <select
            id="daysBeforeExpiry"
            name="daysBeforeExpiry"
            value={preferences.daysBeforeExpiry}
            onChange={handleChange}
          >
            <option value="1">1 day</option>
            <option value="2">2 days</option>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
          </select>
        </div>
      </div>
      
      {error && <div className="preferences-error">{error}</div>}
      {success && <div className="preferences-success">Preferences saved successfully!</div>}
      
      <button
        className="save-preferences-button"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
      
      <div className="notification-tips">
        <h4>Tips for reducing food waste:</h4>
        <ul>
          <li>Set reminders for items that expire soon</li>
          <li>Check your inventory before shopping</li>
          <li>Freeze items you won't use before they expire</li>
          <li>Plan meals around ingredients that need to be used first</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationPreferences; 