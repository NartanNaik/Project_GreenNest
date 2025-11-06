const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit-table");
const FoodItem = require("../models/foodItem");
const User = require("../models/userModel");

// Export reports in Excel or PDF format
router.post("/export", async (req, res) => {
  try {
    const { format, startDate, endDate } = req.body;
    const userId = req.user.userId;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get food items for the date range
    const foodItems = await FoodItem.find({
      userId,
      // Items that were recorded before the end date
      createdAt: { $lte: new Date(endDate + "T23:59:59.999Z") },
      // Exclude items created after the start date
      $or: [
        { createdAt: { $gte: new Date(startDate + "T00:00:00.000Z") } },
        // Include items from before the start date but expiring within the range
        { 
          expiryDate: { 
            $gte: new Date(startDate + "T00:00:00.000Z"),
            $lte: new Date(endDate + "T23:59:59.999Z")
          }
        }
      ]
    });

    // Calculate statistics
    const totalItems = foodItems.length;
    const wastedItems = foodItems.filter(item => item.isWasted).length;
    const consumedItems = totalItems - wastedItems;
    
    // Group by category
    const categoryStats = {};
    foodItems.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!categoryStats[category]) {
        categoryStats[category] = {
          total: 0,
          wasted: 0,
          consumed: 0
        };
      }
      categoryStats[category].total += 1;
      if (item.isWasted) {
        categoryStats[category].wasted += 1;
      } else {
        categoryStats[category].consumed += 1;
      }
    });

    // Group by expiry status
    const expiredItems = foodItems.filter(item => new Date(item.expiryDate) < new Date()).length;
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

async function generateExcelReport(res, user, foodItems, statistics, categoryStats, startDate, endDate) {
  // Create a new Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Food Waste Controller";
  workbook.lastModifiedBy = "Food Waste Controller";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create a summary sheet
  const summarySheet = workbook.addWorksheet("Summary");
  
  // Add title and date range
  summarySheet.addRow(["Food Usage and Wastage Report"]);
  summarySheet.addRow([`${user.firstName} ${user.lastName}`]);
  summarySheet.addRow([`Period: ${startDate} to ${endDate}`]);
  summarySheet.addRow([]);
  
  // Style the header rows
  summarySheet.getCell("A1").font = { bold: true, size: 16 };
  summarySheet.getCell("A2").font = { bold: true, size: 14 };
  summarySheet.getCell("A3").font = { italic: true };
  
  // Add overall statistics
  summarySheet.addRow(["Overall Statistics"]);
  summarySheet.addRow(["Total Items", statistics.totalItems]);
  summarySheet.addRow(["Consumed Items", statistics.consumedItems]);
  summarySheet.addRow(["Wasted Items", statistics.wastedItems]);
  summarySheet.addRow(["Wastage Percentage", statistics.totalItems ? `${((statistics.wastedItems / statistics.totalItems) * 100).toFixed(2)}%` : "0%"]);
  summarySheet.addRow(["Active Items", statistics.activeItems]);
  summarySheet.addRow(["Expired Items", statistics.expiredItems]);
  summarySheet.addRow([]);
  
  // Style the statistics header
  summarySheet.getCell("A5").font = { bold: true, size: 14 };
  
  // Add category statistics
  summarySheet.addRow(["Category Statistics"]);
  summarySheet.addRow(["Category", "Total Items", "Consumed", "Wasted", "Wastage Percentage"]);
  
  // Add data for each category
  Object.entries(categoryStats).forEach(([category, stats]) => {
    const wastagePercentage = stats.total ? ((stats.wasted / stats.total) * 100).toFixed(2) + "%" : "0%";
    summarySheet.addRow([category, stats.total, stats.consumed, stats.wasted, wastagePercentage]);
  });
  
  // Style the category statistics header
  summarySheet.getCell("A13").font = { bold: true, size: 14 };
  
  // Style the category table headers
  ["A14", "B14", "C14", "D14", "E14"].forEach(cell => {
    summarySheet.getCell(cell).font = { bold: true };
    summarySheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Adjust column widths
  summarySheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Create a detailed sheet with all food items
  const detailSheet = workbook.addWorksheet("Food Items");
  
  // Add headers
  detailSheet.addRow(["Name", "Category", "Expiry Date", "Status", "Created At"]);
  
  // Style the headers
  ["A1", "B1", "C1", "D1", "E1"].forEach(cell => {
    detailSheet.getCell(cell).font = { bold: true };
    detailSheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Add food items
  foodItems.forEach(item => {
    let status = "Active";
    if (item.isWasted) {
      status = "Wasted";
    } else if (new Date(item.expiryDate) < new Date()) {
      status = "Expired";
    }
    
    detailSheet.addRow([
      item.name,
      item.category,
      new Date(item.expiryDate).toLocaleDateString(),
      status,
      new Date(item.createdAt).toLocaleDateString()
    ]);
  });
  
  // Adjust column widths
  detailSheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Set the response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="food_report_${startDate}_to_${endDate}.xlsx"`);
  
  // Write the workbook to the response
  await workbook.xlsx.write(res);
  res.end();
}

async function generatePDFReport(res, user, foodItems, statistics, categoryStats, startDate, endDate) {
  // Create a new PDF document
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  // Set the response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="food_report_${startDate}_to_${endDate}.pdf"`);
  
  // Pipe the PDF to the response
  doc.pipe(res);
  
  // Add title and date range
  doc.fontSize(20).font('Helvetica-Bold').text('Food Usage and Wastage Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).text(`${user.firstName} ${user.lastName}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Oblique').text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
  doc.moveDown(1);
  
  // Add overall statistics
  doc.fontSize(16).font('Helvetica-Bold').text('Overall Statistics');
  doc.moveDown(0.5);
  
  const overallStats = {
    headers: ['Metric', 'Value'],
    rows: [
      ['Total Items', statistics.totalItems.toString()],
      ['Consumed Items', statistics.consumedItems.toString()],
      ['Wasted Items', statistics.wastedItems.toString()],
      ['Wastage Percentage', statistics.totalItems ? `${((statistics.wastedItems / statistics.totalItems) * 100).toFixed(2)}%` : "0%"],
      ['Active Items', statistics.activeItems.toString()],
      ['Expired Items', statistics.expiredItems.toString()]
    ]
  };
  
  await doc.table(overallStats, { 
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
    prepareRow: () => doc.font('Helvetica').fontSize(12)
  });
  
  doc.moveDown(1);
  
  // Add category statistics
  doc.fontSize(16).font('Helvetica-Bold').text('Category Statistics');
  doc.moveDown(0.5);
  
  const categoryRows = Object.entries(categoryStats).map(([category, stats]) => {
    const wastagePercentage = stats.total ? ((stats.wasted / stats.total) * 100).toFixed(2) + "%" : "0%";
    return [category, stats.total.toString(), stats.consumed.toString(), stats.wasted.toString(), wastagePercentage];
  });
  
  const categoryTable = {
    headers: ['Category', 'Total Items', 'Consumed', 'Wasted', 'Wastage %'],
    rows: categoryRows
  };
  
  await doc.table(categoryTable, { 
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
    prepareRow: () => doc.font('Helvetica').fontSize(12)
  });
  
  doc.moveDown(1);
  
  // Add a section for food items
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').text('Food Items');
  doc.moveDown(0.5);
  
  // Prepare food items data
  const foodItemsRows = foodItems.map(item => {
    let status = "Active";
    if (item.isWasted) {
      status = "Wasted";
    } else if (new Date(item.expiryDate) < new Date()) {
      status = "Expired";
    }
    
    return [
      item.name,
      item.category,
      new Date(item.expiryDate).toLocaleDateString(),
      status
    ];
  });
  
  const foodItemsTable = {
    headers: ['Name', 'Category', 'Expiry Date', 'Status'],
    rows: foodItemsRows
  };
  
  await doc.table(foodItemsTable, { 
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
    prepareRow: () => doc.font('Helvetica').fontSize(10)
  });
  
  // Finalize the PDF
  doc.end();
}

module.exports = router; 