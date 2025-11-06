import express from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit-table";
import FoodItem from "../models/foodItem.js";
import User from "../models/userModel.js";

const router = express.Router();

// ✅ Export reports in Excel or PDF format
router.post("/export", async (req, res) => {
  try {
    const { format, startDate, endDate } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get food items for date range
    const foodItems = await FoodItem.find({
      userId,
      createdAt: { $lte: new Date(endDate + "T23:59:59.999Z") },
      $or: [
        { createdAt: { $gte: new Date(startDate + "T00:00:00.000Z") } },
        {
          expiryDate: {
            $gte: new Date(startDate + "T00:00:00.000Z"),
            $lte: new Date(endDate + "T23:59:59.999Z"),
          },
        },
      ],
    });

    const totalItems = foodItems.length;
    const wastedItems = foodItems.filter((item) => item.isWasted).length;
    const consumedItems = totalItems - wastedItems;

    const categoryStats = {};
    foodItems.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, wasted: 0, consumed: 0 };
      }
      categoryStats[category].total++;
      if (item.isWasted) categoryStats[category].wasted++;
      else categoryStats[category].consumed++;
    });

    const expiredItems = foodItems.filter((i) => new Date(i.expiryDate) < new Date()).length;
    const activeItems = totalItems - expiredItems;

    if (format === "excel") {
      return generateExcelReport(
        res,
        user,
        foodItems,
        { totalItems, wastedItems, consumedItems, expiredItems, activeItems },
        categoryStats,
        startDate,
        endDate
      );
    } else {
      return generatePDFReport(
        res,
        user,
        foodItems,
        { totalItems, wastedItems, consumedItems, expiredItems, activeItems },
        categoryStats,
        startDate,
        endDate
      );
    }
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ✅ Generate Excel report
async function generateExcelReport(res, user, foodItems, stats, categoryStats, startDate, endDate) {
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.addRow(["Food Usage and Wastage Report"]);
  summarySheet.addRow([`${user.firstName} ${user.lastName}`]);
  summarySheet.addRow([`Period: ${startDate} to ${endDate}`]);
  summarySheet.addRow([]);
  summarySheet.getCell("A1").font = { bold: true, size: 16 };

  summarySheet.addRow(["Overall Statistics"]);
  summarySheet.addRow(["Total Items", stats.totalItems]);
  summarySheet.addRow(["Consumed Items", stats.consumedItems]);
  summarySheet.addRow(["Wasted Items", stats.wastedItems]);
  summarySheet.addRow([
    "Wastage Percentage",
    stats.totalItems ? `${((stats.wastedItems / stats.totalItems) * 100).toFixed(2)}%` : "0%",
  ]);
  summarySheet.addRow(["Active Items", stats.activeItems]);
  summarySheet.addRow(["Expired Items", stats.expiredItems]);
  summarySheet.addRow([]);

  summarySheet.addRow(["Category Statistics"]);
  summarySheet.addRow(["Category", "Total", "Consumed", "Wasted", "Wastage %"]);

  Object.entries(categoryStats).forEach(([cat, val]) => {
    const perc = val.total ? ((val.wasted / val.total) * 100).toFixed(2) + "%" : "0%";
    summarySheet.addRow([cat, val.total, val.consumed, val.wasted, perc]);
  });

  summarySheet.columns.forEach((col) => (col.width = 20));

  const detailSheet = workbook.addWorksheet("Food Items");
  detailSheet.addRow(["Name", "Category", "Expiry Date", "Status", "Created At"]);
  foodItems.forEach((item) => {
    let status = "Active";
    if (item.isWasted) status = "Wasted";
    else if (new Date(item.expiryDate) < new Date()) status = "Expired";

    detailSheet.addRow([
      item.name,
      item.category,
      new Date(item.expiryDate).toLocaleDateString(),
      status,
      new Date(item.createdAt).toLocaleDateString(),
    ]);
  });

  detailSheet.columns.forEach((col) => (col.width = 20));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="food_report_${startDate}_to_${endDate}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

// ✅ Generate PDF report
async function generatePDFReport(res, user, foodItems, stats, categoryStats, startDate, endDate) {
  const doc = new PDFDocument({ margin: 30, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="food_report_${startDate}_to_${endDate}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text("Food Usage and Wastage Report", { align: "center" });
  doc.moveDown(0.5).fontSize(16).text(`${user.firstName} ${user.lastName}`, { align: "center" });
  doc.moveDown(0.5).fontSize(12).font("Helvetica-Oblique").text(`Period: ${startDate} to ${endDate}`, { align: "center" });
  doc.moveDown(1);

  doc.fontSize(16).font("Helvetica-Bold").text("Overall Statistics");
  const overallStats = {
    headers: ["Metric", "Value"],
    rows: [
      ["Total Items", stats.totalItems.toString()],
      ["Consumed", stats.consumedItems.toString()],
      ["Wasted", stats.wastedItems.toString()],
      ["Wastage %", stats.totalItems ? `${((stats.wastedItems / stats.totalItems) * 100).toFixed(2)}%` : "0%"],
      ["Active", stats.activeItems.toString()],
      ["Expired", stats.expiredItems.toString()],
    ],
  };
  await doc.table(overallStats);

  doc.moveDown(1).fontSize(16).text("Category Statistics");
  const categoryRows = Object.entries(categoryStats).map(([cat, val]) => [
    cat,
    val.total.toString(),
    val.consumed.toString(),
    val.wasted.toString(),
    val.total ? ((val.wasted / val.total) * 100).toFixed(2) + "%" : "0%",
  ]);
  await doc.table({ headers: ["Category", "Total", "Consumed", "Wasted", "Wastage %"], rows: categoryRows });

  doc.addPage().fontSize(16).text("Food Items");
  const foodRows = foodItems.map((item) => {
    let status = "Active";
    if (item.isWasted) status = "Wasted";
    else if (new Date(item.expiryDate) < new Date()) status = "Expired";
    return [item.name, item.category, new Date(item.expiryDate).toLocaleDateString(), status];
  });
  await doc.table({ headers: ["Name", "Category", "Expiry Date", "Status"], rows: foodRows });

  doc.end();
}

export default router;