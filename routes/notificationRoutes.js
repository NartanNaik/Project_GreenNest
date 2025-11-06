import express from "express";
import FoodItem from "../models/foodItem.js";
import Notification from "../models/notification.js";
import User from "../models/userModel.js";
import { sendExpiryNotification, generateSuggestions } from "../client/utils/sendExpiryNotification.js";

const router = express.Router();

// ✅ Get all notifications for a user
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("❌ Failed to fetch notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ✅ Mark notification as read
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
    console.error("❌ Failed to update notification:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// ✅ Mark all notifications as read
router.put("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("❌ Failed to mark all as read:", err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// ✅ Delete a notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("❌ Failed to delete notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// ✅ Check for expiring or expired items and send notifications
router.post("/check-expiry", async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Find items that will expire soon
    const expiringItems = await FoodItem.find({
      expiryDate: { $gt: now, $lte: threeDaysFromNow },
      isWasted: false,
    }).populate("userId");

    // Find already expired items
    const expiredItems = await FoodItem.find({
      expiryDate: { $lte: now },
      isWasted: false,
    }).populate("userId");

    let notificationsCreated = 0;
    let emailsSent = 0;

    // Process expiring items
    for (const item of expiringItems) {
      const daysUntilExpiry = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));
      const suggestions = generateSuggestions(item.category, item.name);

      const existingNotification = await Notification.findOne({
        userId: item.userId._id,
        foodItemId: item._id,
        type: "warning",
      });

      if (!existingNotification) {
        await Notification.create({
          userId: item.userId._id,
          foodItemId: item._id,
          message: `${item.name} will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`,
          type: "warning",
          suggestions,
        });

        notificationsCreated++;

        // Send email if applicable
        if (item.userId.email) {
          const emailResult = await sendExpiryNotification(item.userId.email, item, daysUntilExpiry);
          if (emailResult.success) emailsSent++;
        }
      }
    }

    // Process expired items
    for (const item of expiredItems) {
      const existingNotification = await Notification.findOne({
        userId: item.userId._id,
        foodItemId: item._id,
        type: "expired",
      });

      if (!existingNotification) {
        const suggestions = generateSuggestions(item.category, item.name);

        await Notification.create({
          userId: item.userId._id,
          foodItemId: item._id,
          message: `${item.name} has expired!`,
          type: "expired",
          suggestions,
        });

        notificationsCreated++;

        // Send email if applicable
        if (item.userId.email) {
          const emailResult = await sendExpiryNotification(item.userId.email, item, 0);
          if (emailResult.success) emailsSent++;
        }
      }
    }

    res.json({
      message: "✅ Expiry check completed",
      stats: {
        expiringItems: expiringItems.length,
        expiredItems: expiredItems.length,
        notificationsCreated,
        emailsSent,
      },
    });
  } catch (err) {
    console.error("❌ Failed to check expiry:", err);
    res.status(500).json({ error: "Failed to check expiry" });
  }
});

export default router;