import express from "express";
import FoodItem from "../models/foodItem.js";
import DeletedFoodItem from "../models/deletedFoodItem.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

// ✅ Mark a food item as wasted
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

    console.log(`✅ Marked as wasted: ${item.name} (${item.category}) at ${item.wastedAt.toISOString()}`);
    res.json({ message: "Item marked as wasted", item });
  } catch (err) {
    console.error("❌ Failed to mark item as wasted:", err);
    res.status(500).json({ error: "Failed to mark item as wasted" });
  }
});

// ✅ Wastage stats (total + category breakdown)
router.get("/wastage-stats", authenticate, async (req, res) => {
  const { filter, specificDate } = req.query;
  const now = new Date();
  const currentDate = new Date();
  let startDate, endDate;

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
      const d = new Date(specificDate);
      startDate = new Date(d.setHours(0, 0, 0, 0));
      endDate = new Date(d.setHours(23, 59, 59, 999));
    } else {
      return res.status(400).json({ error: "Invalid filter or missing date" });
    }

    const totalCount = await FoodItem.countDocuments({
      userId: req.user.userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const categoryBreakdown = await FoodItem.aggregate([
      {
        $match: {
          userId: req.user.userId,
          $or: [
            { isWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },
            { expiryDate: { $lt: currentDate, $gte: startDate, $lte: endDate } },
          ],
        },
      },
      { $group: { _id: "$category", count: { $sum: 1 } } },
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

// ✅ Wastage chart data
router.get("/chart", authenticate, async (req, res) => {
  const { mode, date } = req.query;
  console.log(`📊 Wastage chart requested: mode=${mode}, date=${date}`);

  try {
    const parsedDate = new Date(date);
    let startDate, endDate;

    if (mode === "day") {
      startDate = new Date(parsedDate.setHours(0, 0, 0, 0));
      endDate = new Date(parsedDate.setHours(23, 59, 59, 999));
    } else if (mode === "month") {
      const y = parsedDate.getFullYear();
      const m = parsedDate.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else if (mode === "year") {
      const y = parsedDate.getFullYear();
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ error: "Invalid mode parameter" });
    }

    console.log(`🔍 Looking for wasted/expired items between ${startDate} and ${endDate}`);

    const activeFoodItems = await FoodItem.find({
      userId: req.user.userId,
      $or: [
        // ⭐ manually wasted
        { isWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },

        // ⭐ expired items => expiry <= endDate
        { expiryDate: { $lte: endDate } }
      ],
    });

    const categoryMap = {};
    activeFoodItems.forEach((item) => {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
    });

    const categories = Object.keys(categoryMap).map((k) => ({
      name: k,
      value: categoryMap[k],
    }));

    const total = categories.reduce((sum, c) => sum + c.value, 0);

    if (total === 0) {
      console.log("ℹ️ No wastage data found for this period");
      return res.json({ categories: [], total: 0 });
    }

    res.json({ categories, total });
  } catch (err) {
    console.error("❌ Error fetching wastage chart data:", err);
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
});


// ✅ Reset wastage data
router.post("/reset", authenticate, async (req, res) => {
  const { mode, date } = req.body;

  try {
    if (mode === "all") {
      const result = await FoodItem.updateMany(
        { userId: req.user.userId, isWasted: true },
        { $set: { isWasted: false, wastedAt: null } }
      );
      const deletedResult = await DeletedFoodItem.updateMany(
        { userId: req.user.userId, clearedFromGraph: false },
        { $set: { clearedFromGraph: true } }
      );
      console.log(`✅ All wastage data reset`);
      return res.json({
        message: "All wastage data reset",
        affected: result.modifiedCount + deletedResult.modifiedCount,
      });
    }

    const parsedDate = new Date(date);
    let startDate, endDate;

    if (mode === "day") {
      startDate = new Date(parsedDate.setHours(0, 0, 0, 0));
      endDate = new Date(parsedDate.setHours(23, 59, 59, 999));
    } else if (mode === "month") {
      const y = parsedDate.getFullYear();
      const m = parsedDate.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else if (mode === "year") {
      const y = parsedDate.getFullYear();
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ error: "Invalid mode parameter" });
    }

    const result = await FoodItem.updateMany(
      {
        userId: req.user.userId,
        isWasted: true,
        wastedAt: { $gte: startDate, $lte: endDate },
      },
      { $set: { isWasted: false, wastedAt: null } }
    );

    const tomorrow = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    const expiredResult = await FoodItem.updateMany(
      {
        userId: req.user.userId,
        isWasted: false,
        expiryDate: { $gte: startDate, $lte: endDate },
      },
      { $set: { expiryDate: tomorrow } }
    );

    const deletedResult = await DeletedFoodItem.updateMany(
      {
        userId: req.user.userId,
        clearedFromGraph: false,
        $or: [
          { wasWasted: true, wastedAt: { $gte: startDate, $lte: endDate } },
          { deletedAt: { $gte: startDate, $lte: endDate } },
        ],
      },
      { $set: { clearedFromGraph: true } }
    );

    const remainingWasted = await FoodItem.countDocuments({
      userId: req.user.userId,
      isWasted: true,
      wastedAt: { $gte: startDate, $lte: endDate },
    });

    console.log(`✅ Wastage data reset for ${mode}`);
    res.json({
      message: "Wastage data reset",
      affected: result.modifiedCount + expiredResult.modifiedCount + deletedResult.modifiedCount,
      verifiedCleared: remainingWasted === 0,
    });
  } catch (err) {
    console.error("❌ Error resetting wastage data:", err);
    res.status(500).json({ error: "Failed to reset wastage data" });
  }
});

export default router;