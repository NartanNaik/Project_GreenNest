const express = require("express");
const router = express.Router();
const FoodItem = require("../models/foodItem");
const Notification = require("../models/notification");
const User = require("../models/userModel");
const { sendExpiryNotification, generateSuggestions } = require("../client/utils/sendExpiryNotification");

// Get all notifications for a user
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.user.userId 
    }).sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json(notification);
  } catch (err) {
    console.error("Failed to update notification:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all notifications as read
router.put("/read-all", async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { isRead: true }
    );
    
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// Delete a notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Failed to delete notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Check for expiring items and create notifications
router.post("/check-expiry", async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3); // 3 days in advance
    
    // Get items that will expire in the next 3 days
    const expiringItems = await FoodItem.find({
      expiryDate: { $gt: now, $lte: threeDaysFromNow },
      isWasted: false,
    }).populate('userId');
    
    // Get already expired items that don't have notifications yet
    const expiredItems = await FoodItem.find({
      expiryDate: { $lte: now },
      isWasted: false,
    }).populate('userId');
    
    let notificationsCreated = 0;
    let emailsSent = 0;
    
    // Process expiring items
    for (const item of expiringItems) {
      // Calculate days until expiry
      const daysUntilExpiry = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));
      
      // Get suggestions based on food category
      const suggestions = generateSuggestions(item.category, item.name);
      
      // Check if notification already exists
      const existingNotification = await Notification.findOne({
        userId: item.userId._id,
        foodItemId: item._id,
        type: "warning"
      });
      
      if (!existingNotification) {
        // Create new notification
        await Notification.create({
          userId: item.userId._id,
          foodItemId: item._id,
          message: `${item.name} will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
          type: "warning",
          suggestions,
        });
        
        notificationsCreated++;
        
        // Send email notification if user has email
        if (item.userId.email) {
          const emailResult = await sendExpiryNotification(
            item.userId.email,
            item,
            daysUntilExpiry
          );
          
          if (emailResult.success) emailsSent++;
        }
      }
    }
    
    // Process expired items
    for (const item of expiredItems) {
      // Check if notification already exists
      const existingNotification = await Notification.findOne({
        userId: item.userId._id,
        foodItemId: item._id,
        type: "expired"
      });
      
      if (!existingNotification) {
        // Get suggestions
        const suggestions = generateSuggestions(item.category, item.name);
        
        // Create new notification
        await Notification.create({
          userId: item.userId._id,
          foodItemId: item._id,
          message: `${item.name} has expired!`,
          type: "expired",
          suggestions,
        });
        
        notificationsCreated++;
        
        // Send email notification
        if (item.userId.email) {
          const emailResult = await sendExpiryNotification(
            item.userId.email,
            item,
            0 // 0 days means expired
          );
          
          if (emailResult.success) emailsSent++;
        }
      }
    }
    
    res.json({ 
      message: "Expiry check completed", 
      stats: {
        expiringItems: expiringItems.length,
        expiredItems: expiredItems.length,
        notificationsCreated,
        emailsSent
      }
    });
  } catch (err) {
    console.error("Failed to check expiry:", err);
    res.status(500).json({ error: "Failed to check expiry" });
  }
});

module.exports = router; 