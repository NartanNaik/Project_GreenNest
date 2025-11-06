const express = require("express");
const router = express.Router();
const FoodItem = require("../models/foodItem");
const DeletedFoodItem = require("../models/deletedFoodItem");
const authenticate = require("../middleware/auth");

// Route to mark a food item as wasted
router.post("/mark-wasted/:id", authenticate, async (req, res) => {
  try {
    const item = await FoodItem.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!item) {
      console.log(`❌ Item not found for marking as wasted: ${req.params.id}`);
      return res.status(404).json({ error: "Food item not found" });
    }

    item.isWasted = true;
    item.wastedAt = new Date();
    await item.save();
    
    console.log(`✅ Food item marked as wasted in MongoDB: ${item.name} (${item.category}) - WastedAt: ${item.wastedAt.toISOString()}`);
    res.json({ message: "Item marked as wasted", item });
  } catch (err) {
    console.error("❌ Failed to mark item as wasted:", err);
    res.status(500).json({ error: "Failed to mark item as wasted" });
  }
});

// Route to get wastage stats with total + category-wise breakdown
router.get("/wastage-stats", authenticate, async (req, res) => {
  const { filter, specificDate } = req.query;

  let startDate, endDate;
  const now = new Date();
  const currentDate = new Date();

  try {
    if (filter === "today") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (filter === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.setHours(0, 0, 0, 0));
      endDate = new Date(y.setHours(23, 59, 59, 999));
    } else if (filter === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filter === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filter === "date" && specificDate) {
      const selected = new Date(specificDate);
      startDate = new Date(selected.setHours(0, 0, 0, 0));
      endDate = new Date(selected.setHours(23, 59, 59, 999));
    } else {
      return res.status(400).json({ error: "Invalid filter or missing date" });
    }

    // Total food items (created) in the time window
    const totalCount = await FoodItem.countDocuments({
      userId: req.user.userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Wasted food items grouped by category (including expired items)
    const categoryBreakdown = await FoodItem.aggregate([
      {
        $match: {
          userId: req.user.userId, // Note: req.user.id is a string; _id is ObjectId
          $or: [
            // Items explicitly marked as wasted
            { isWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },
            // Items that have expired (expiryDate in the past)
            { expiryDate: { $lt: currentDate, $gte: startDate, $lte: endDate } }
          ]
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      total: totalCount,
      wastedByCategory: categoryBreakdown.map((c) => ({
        category: c._id,
        count: c.count,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch wastage stats" });
  }
});

// NEW: Route to get wastage chart data by date/mode
// This matches the client's expected URL pattern
router.get("/chart", authenticate, async (req, res) => {
  const { mode, date } = req.query;
  console.log(`📊 Wastage chart requested: mode=${mode}, date=${date}`);
  
  try {
    // Parse the date based on mode
    let startDate, endDate;
    const parsedDate = new Date(date);
    const currentDate = new Date();
    
    if (mode === "day") {
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(parsedDate);
      endDate.setHours(23, 59, 59, 999);
    } 
    else if (mode === "month") {
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } 
    else if (mode === "year") {
      const year = parsedDate.getFullYear();
      
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }
    else {
      console.log(`❌ Invalid mode parameter: ${mode}`);
      return res.status(400).json({ error: "Invalid mode parameter" });
    }

    console.log(`🔍 Looking for wasted items between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    // First, get all active food items for the user that are wasted or expired ON the selected day
    const activeFoodItems = await FoodItem.find({
      userId: req.user.userId,
      $or: [
        // Items explicitly marked as wasted ON the selected day
        { isWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },
        // Items that expired ON the selected day
        { expiryDate: { $gte: startDate, $lte: endDate } }
      ]
    });
    
    console.log(`📋 Found ${activeFoodItems.length} active wasted/expired items`);
    
    // Also get deleted items that were wasted or expired ON the selected day
    const deletedFoodItems = await DeletedFoodItem.find({
      userId: req.user.userId,
      clearedFromGraph: false,
      $or: [
        // Items that were wasted when deleted ON the selected day
        { wasWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },
        // Deleted items that expired ON the selected day
        { expiryDate: { $gte: startDate, $lte: endDate, $ne: null } },
        // Include all deleted items within the date range
        { deletedAt: { $gte: startDate, $lte: endDate } }
      ]
    });
    
    console.log(`🗑️ Found ${deletedFoodItems.length} deleted items still tracked for wastage`);

    // Group them by category manually
    const categoryMap = {};
    
    // First add active items
    activeFoodItems.forEach(item => {
      const category = item.category;
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category]++;
    });
    
    // Then add deleted items
    deletedFoodItems.forEach(item => {
      const category = item.category;
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category]++;
    });

    // Convert to the format expected by the chart
    const categories = Object.keys(categoryMap).map(category => ({
      name: category,
      value: categoryMap[category]
    }));
    
    const total = categories.reduce((sum, item) => sum + item.value, 0);
    
    // Return empty data when no results found, so the graph still renders
    if (total === 0) {
      console.log(`ℹ️ No wastage data found for this period, returning empty data`);
      return res.json({
        categories: [],
        total: 0
      });
    }
    
    console.log(`✅ Chart data prepared: ${total} items in ${categories.length} categories (includes deleted items)`);
    console.log(`📊 Chart data by category: ${JSON.stringify(categories)}`);
    
    res.json({
      categories,
      total
    });
    
  } catch (err) {
    console.error("❌ Error fetching wastage chart data:", err);
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
});

// Reset wastage data for a specific time period
router.post("/reset", authenticate, async (req, res) => {
  const { mode, date } = req.body;

  try {
    let result;
    
    // For complete reset (ignore date ranges and clear all wastage data)
    if (mode === "all") {
      // Reset ALL items marked as wasted for this user
      result = await FoodItem.updateMany(
        {
          userId: req.user.userId,
          isWasted: true
        },
        {
          $set: { isWasted: false, wastedAt: null }
        }
      );
      
      // Also mark all deleted items as cleared from graph
      const deletedResult = await DeletedFoodItem.updateMany(
        {
          userId: req.user.userId,
          clearedFromGraph: false
        },
        {
          $set: { clearedFromGraph: true }
        }
      );
      
      console.log(`✅ All wastage data reset - ${result.modifiedCount} active items and ${deletedResult.modifiedCount} deleted items affected`);
      res.json({
        message: "ALL wastage data has been permanently reset",
        affected: result.modifiedCount + deletedResult.modifiedCount
      });
      return;
    }
    
    // Determine date range based on mode
    let startDate, endDate;
    const parsedDate = new Date(date);
    
    if (mode === "day") {
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(parsedDate);
      endDate.setHours(23, 59, 59, 999);
    } 
    else if (mode === "month") {
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } 
    else if (mode === "year") {
      const year = parsedDate.getFullYear();
      
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }
    else {
      return res.status(400).json({ error: "Invalid mode parameter" });
    }
    
    // Reset all items marked as wasted in the given time range
    result = await FoodItem.updateMany(
      {
        userId: req.user.userId,
        isWasted: true,
        wastedAt: { $gte: startDate, $lte: endDate }
      },
      {
        $set: { isWasted: false, wastedAt: null }
      }
    );

    // Also "un-expire" items that expired in the given time range by setting expiryDate to tomorrow
    const tomorrow = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    const expiredResult = await FoodItem.updateMany(
      {
        userId: req.user.userId,
        isWasted: false,
        expiryDate: { $gte: startDate, $lte: endDate }
      },
      {
        $set: { expiryDate: tomorrow }
      }
    );

    // Also mark deleted items in this time range as cleared from graph
    const deletedResult = await DeletedFoodItem.updateMany(
      {
        userId: req.user.userId,
        clearedFromGraph: false,
        $or: [
          { wasWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },
          { deletedAt: { $gte: startDate, $lte: endDate } }
        ]
      },
      {
        $set: { clearedFromGraph: true }
      }
    );

    console.log(`✅ Wastage data reset for ${mode} (${startDate.toISOString()} to ${endDate.toISOString()}) - ${result.modifiedCount} active items, ${expiredResult.modifiedCount} expired items, and ${deletedResult.modifiedCount} deleted items affected`);
    
    // For extra safety, verify the reset was successful by checking if any wasted items remain
    const remainingWasted = await FoodItem.countDocuments({
      userId: req.user.userId,
      isWasted: true,
      wastedAt: { $gte: startDate, $lte: endDate }
    });
    
    res.json({
      message: "Wastage data has been permanently reset",
      affected: result.modifiedCount + expiredResult.modifiedCount + deletedResult.modifiedCount,
      verifiedCleared: remainingWasted === 0
    });
    
  } catch (err) {
    console.error("❌ Error resetting wastage data:", err);
    res.status(500).json({ error: "Failed to reset wastage data" });
  }
});

module.exports = router;