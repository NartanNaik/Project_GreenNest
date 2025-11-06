import React, { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  // Fetch notifications on initial load
  useEffect(() => {
    fetchNotifications();
    
    // Set up polling to check for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) return;
      
      const response = await axios.get('http://localhost:5000/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(`http://localhost:5000/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => prev.map(notif => 
        notif._id === id ? { ...notif, isRead: true } : notif
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put('http://localhost:5000/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    markAsRead(notification._id);
    
    // Navigate to inventory page to focus on that item
    navigate('/inventory', { state: { highlightItemId: notification.foodItemId } });
    
    // Close dropdown
    setShowDropdown(false);
  };
  
  // Get unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // Get icon color based on notification types
  const getNotificationColor = () => {
    if (notifications.some(n => n.type === 'expired' && !n.isRead)) {
      return 'var(--error-color, #f44336)';
    }
    if (notifications.some(n => n.type === 'warning' && !n.isRead)) {
      return 'var(--warning-color, #ff9800)';
    }
    return 'var(--text-color, #333)';
  };
  
  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  
  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className="notification-bell-button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <FaBell 
          size={20} 
          color={getNotificationColor()}
          className={unreadCount > 0 ? 'notification-bell-icon-active' : ''}
        />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className="mark-all-read-button"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${notification.type}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                  
                  {notification.suggestions && notification.suggestions.length > 0 && (
                    <div className="notification-suggestions">
                      <p className="suggestions-title">Suggestions:</p>
                      <ul className="suggestions-list">
                        {notification.suggestions.slice(0, 2).map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                        {notification.suggestions.length > 2 && (
                          <li className="more-suggestions">+ {notification.suggestions.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 