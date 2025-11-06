import express from "express";
import jwt from "jsonwebtoken";
import FoodItem from "../models/foodItem.js";
import DeletedFoodItem from "../models/deletedFoodItem.js";

const router = express.Router();

// Inline JWT authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

// ✅ Add a new food item
router.post("/add", authenticate, async (req, res) => {
  try {
    const { name, category, shelfLife, mDate } = req.body;
    const manufacturedDate = new Date(mDate);
    const expiryDate = new Date(manufacturedDate);
    expiryDate.setDate(expiryDate.getDate() + parseInt(shelfLife));

    const newFood = new FoodItem({
      name,
      category,
      shelfLife,
      mDate: manufacturedDate,
      expiryDate,
      userId: req.user.userId,
    });

    await newFood.save();
    console.log(`✅ New food item added: ${name} (${category}) - Expires: ${expiryDate.toISOString()}`);
    res.status(201).json(newFood);
  } catch (err) {
    console.error("❌ Failed to add food item:", err);
    res.status(500).json({ error: "Failed to add food item" });
  }
});

// ✅ Get all food items for a user
router.get("/", authenticate, async (req, res) => {
  try {
    const foodItems = await FoodItem.find({ userId: req.user.userId });
    res.json(foodItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch food items" });
  }
});

// ✅ Delete a food item
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const deletedItem = await FoodItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    const deletedRecord = new DeletedFoodItem({
      name: deletedItem.name,
      category: deletedItem.category,
      userId: deletedItem.userId,
      wasWasted: deletedItem.isWasted,
      wastedAt: deletedItem.wastedAt,
      expiryDate: deletedItem.expiryDate,
      originalId: deletedItem._id.toString(),
    });

    await deletedRecord.save();

    console.log(`✅ Food item deleted: ${deletedItem.name} (${deletedItem.category})`);
    res.json({ message: "Item deleted", deletedItem });
  } catch (err) {
    console.error("❌ Failed to delete food item:", err);
    res.status(500).json({ error: "Failed to delete food item" });
  }
});

// ✅ Update a food item
router.put("/:id", authenticate, async (req, res) => {
  try {
    const updatedItem = await FoodItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: "Failed to update food item" });
  }
});

// ✅ Mark a food item as wasted
router.post("/mark-wasted/:id", authenticate, async (req, res) => {
  try {
    const item = await FoodItem.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!item) {
      return res.status(404).json({ error: "Food item not found" });
    }

    item.isWasted = true;
    item.wastedAt = new Date();
    await item.save();

    res.json({ message: "Item marked as wasted", item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark item as wasted" });
  }
});

// ✅ Get wastage statistics
router.get("/wastage/stats", authenticate, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const match = {
      userId: req.user.userId,
      isWasted: true,
    };

    const data = await FoodItem.aggregate([
      { $match: match },
      {
        $facet: {
          today: [{ $match: { wastedAt: { $gte: startOfToday } } }],
          yesterday: [{ $match: { wastedAt: { $gte: startOfYesterday, $lt: startOfToday } } }],
          month: [{ $match: { wastedAt: { $gte: startOfMonth } } }],
          year: [{ $match: { wastedAt: { $gte: startOfYear } } }],
        },
      },
    ]);

    res.json({
      today: data[0].today.length,
      yesterday: data[0].yesterday.length,
      thisMonth: data[0].month.length,
      thisYear: data[0].year.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get wastage stats" });
  }
});

// ✅ Get food inventory data
router.get("/inventory", authenticate, async (req, res) => {
  const { mode, date } = req.query;

  try {
    let startDate, endDate;
    const parsedDate = new Date(date);

    if (mode === "day") {
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(parsedDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (mode === "month") {
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (mode === "year") {
      const year = parsedDate.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ error: "Invalid mode parameter" });
    }

    const inventoryData = await FoodItem.aggregate([
      {
        $match: {
          userId: req.user.userId,
          mDate: { $lte: endDate },
          $or: [
            { expiryDate: { $gte: startDate } },
            { isWasted: true },
          ],
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const categories = inventoryData.map((item) => ({
      name: item._id,
      value: item.count,
    }));

    const total = categories.reduce((sum, item) => sum + item.value, 0);

    res.json({ categories, total });
  } catch (err) {
    console.error("Error fetching inventory data:", err);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
});

// ✅ Get food summary statistics
router.get("/summary", authenticate, async (req, res) => {
  try {
    const currentDate = new Date();
    const allFoodItems = await FoodItem.find({ userId: req.user.userId });

    const totalFood = allFoodItems.length;
    const wastedFood = allFoodItems.filter((item) => item.isWasted).length;
    const expiredFood = allFoodItems.filter(
      (item) => !item.isWasted && new Date(item.expiryDate) < currentDate
    ).length;
    const remainingFood = totalFood - wastedFood - expiredFood;
    const totalWasted = wastedFood + expiredFood;

    const deletedWastedItems = await DeletedFoodItem.countDocuments({
      userId: req.user.userId,
      wasWasted: true,
    });

    console.log(`📊 Summary:
      - Total: ${totalFood}
      - Wasted: ${wastedFood}
      - Expired: ${expiredFood}
      - Remaining: ${remainingFood}
      - Deleted Wasted: ${deletedWastedItems}
    `);

    res.json({
      totalFood,
      wastedFood: totalWasted,
      remainingFood,
      details: {
        explicitlyWasted: wastedFood,
        expired: expiredFood,
        deletedWasted: deletedWastedItems,
      },
    });
  } catch (err) {
    console.error("Error getting food summary:", err);
    res.status(500).json({ error: "Failed to fetch food summary statistics" });
  }
});

// ✅ Add test data
router.post("/add-test-data", authenticate, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user.userId;

    const testFoods = [
      {
        name: "Test Apple",
        category: "Fruits",
        shelfLife: 7,
        mDate: new Date(now - 5 * 86400000),
        expiryDate: new Date(now + 2 * 86400000),
        userId,
        isWasted: false,
      },
      {
        name: "Test Carrot",
        category: "Vegetables",
        shelfLife: 14,
        mDate: new Date(now - 10 * 86400000),
        expiryDate: new Date(now + 4 * 86400000),
        userId,
        isWasted: true,
        wastedAt: new Date(),
      },
      {
        name: "Test Milk",
        category: "Dairy Products",
        shelfLife: 7,
        mDate: new Date(now - 3 * 86400000),
        expiryDate: new Date(now + 4 * 86400000),
        userId,
        isWasted: false,
      },
      {
        name: "Test Rice",
        category: "Grains & Cereals",
        shelfLife: 365,
        mDate: new Date(now - 30 * 86400000),
        expiryDate: new Date(now + 335 * 86400000),
        userId,
        isWasted: false,
      },
    ];

    await FoodItem.insertMany(testFoods);

    res.status(201).json({
      message: "Test data added successfully",
      count: testFoods.length,
    });
  } catch (err) {
    console.error("Error adding test data:", err);
    res.status(500).json({ error: "Failed to add test data" });
  }
});

// ✅ Debug: List all food items
router.get("/debug-list", authenticate, async (req, res) => {
  try {
    const foodItems = await FoodItem.find({ userId: req.user.userId });
    res.json(
      foodItems.map((item) => ({
        name: item.name,
        category: item.category,
        expiryDate: item.expiryDate,
        isWasted: item.isWasted,
        wastedAt: item.wastedAt,
        mDate: item.mDate,
        _id: item._id,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch debug food items" });
  }
});

export default router;