// src/components/WastageGraph.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import ReactECharts from "echarts-for-react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { FaBell, FaUser, FaSearch } from "react-icons/fa";

const WastageGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [date, setDate] = useState(dayjs());
  const [mode, setMode] = useState("day"); // 'day' | 'month' | 'year'
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    totalFood: 0,
    wastedFood: 0,
    remainingFood: 0
  });

  // Fetch wastage data with useCallback to avoid recreation on every render
  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const formatted =
      mode === "day"
        ? date.format("YYYY-MM-DD")
        : mode === "month"
        ? date.format("YYYY-MM")
        : date.format("YYYY");

    try {
      // Fetch wastage data
      const res = await axios.get(
        `http://localhost:5000/wastage/chart?mode=${mode}&date=${formatted}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { data } = res;
      console.log("Chart data received:", data);
      setChartData(data.categories || []);
      setTotalCount(data.total || 0);
      
      // Fetch summary stats
      try {
        console.log("Fetching summary stats...");
        const summaryRes = await axios.get(
          `http://localhost:5000/food/summary?mode=${mode}&date=${formatted}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );        
        
        if (summaryRes.data) {
          console.log("Summary data received:", summaryRes.data);
          setSummaryStats({
            totalFood: summaryRes.data.totalFood || 0,
            wastedFood: summaryRes.data.wastedFood || 0,
            remainingFood: summaryRes.data.remainingFood || 0
          });
        }
      } catch (summaryErr) {
        console.error("Failed to load summary stats", summaryErr);
        // Use zero values instead of mock data when summary endpoint fails
        setSummaryStats({
          totalFood: 0,
          wastedFood: 0,
          remainingFood: 0
        });
      }
      
      setError(null);
    } catch (err) {
      console.error("Failed to load chart data", err);
      setChartData([]);
      setTotalCount(0);
      setSummaryStats({
        totalFood: 0,
        wastedFood: 0,
        remainingFood: 0
      });
      setError("Failed to load chart data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [date, mode]);

  // Refresh data manually
  const handleRefresh = () => {
    fetchData();
  };

  const clearGraphData = async () => {
    const token = localStorage.getItem("token");
    
    // Ask for confirmation with reset options
    const resetOption = window.confirm(
      "Choose how to reset wastage data:\n\n" +
      "• Click OK to reset data for the CURRENT VIEW ONLY\n" +
      "• Click CANCEL to show more options"
    );

    if (resetOption) {
      // User chose to reset current view only
      try {
        setLoading(true);
        
        const response = await axios.post(
          `http://localhost:5000/wastage/reset`,
          { mode, date: date.format("YYYY-MM-DD") },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Reset local state completely
        setChartData([]);
        setTotalCount(0);
        setSummaryStats(prev => ({
          ...prev,
          wastedFood: 0,
          remainingFood: prev.totalFood
        }));
        
        // Show confirmation with the number of affected items
        alert(`${response.data.affected} items have been permanently unmarked as wasted.`);
        
        // Refresh data
        fetchData();
      } catch (err) {
        console.error("Error clearing graph data:", err);
        alert("Failed to clear graph data. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Show more options dialog
      const fullResetConfirm = window.confirm(
        "WARNING: Choose a reset option:\n\n" +
        "• Click OK to PERMANENTLY RESET ALL WASTAGE DATA (all time)\n" +
        "• Click CANCEL to cancel the operation"
      );
      
      if (fullResetConfirm) {
        try {
          setLoading(true);
          
          const response = await axios.post(
            `http://localhost:5000/wastage/reset`,
            { mode: "all", date: date.format("YYYY-MM-DD") },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Reset local state completely
          setChartData([]);
          setTotalCount(0);
          setSummaryStats(prev => ({
            ...prev,
            wastedFood: 0,
            remainingFood: prev.totalFood
          }));
          
          // Show confirmation with the number of affected items
          alert(`PERMANENT RESET COMPLETE: ${response.data.affected} items have been unmarked as wasted across all time periods.`);
          
          // Refresh data
          fetchData();
        } catch (err) {
          console.error("Error performing full reset:", err);
          alert("Failed to perform full reset. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Fetch data when component mounts, date or mode changes
  useEffect(() => {
    fetchData();
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePrev = () => {
    setDate(
      mode === "day"
        ? date.subtract(1, "day")
        : mode === "month"
        ? date.subtract(1, "month")
        : date.subtract(1, "year")
    );
  };

  const handleNext = () => {
    if (!isNextDisabled()) {
      setDate(
        mode === "day"
          ? date.add(1, "day")
          : mode === "month"
          ? date.add(1, "month")
          : date.add(1, "year")
      );
    }
  };

  const isNextDisabled = () => {
    const now = dayjs();
    if (mode === "day") {
      return date.isSame(now, "day");
    }
    if (mode === "month") {
      return date.isSame(now, "month");
    }
    if (mode === "year") {
      return date.isSame(now, "year");
    }
    return false;
  };

  // Get color based on category
  const getColorForCategory = (category) => {
    const colorMap = {
      'Fruits': '#5470c6',
      'Vegetables': '#91cc75',
      'Dairy Products': '#fac858',
      'Meat & Poultry': '#ee6666',
      'Seafood': '#73c0de',
      'Grains & Cereals': '#3ba272',
      'Beverages': '#9a60b4',
      'Snacks': '#ea7ccc',
      'Frozen Foods': '#48b3bd',
      'Canned & Jarred Foods': '#f4e001',
      'Condiments & Spices': '#ff9f7f',
      'Baking & Cooking Ingredients': '#c23531',
      'Ready-to-Eat / Prepared Foods': '#2f4554'
    };
    return colorMap[category] || '#999';
  };
  
  // Get options for the wastage pie chart
  const getChartOption = () => {
    // Determine if we're in dark mode
    const isDarkMode = document.body.classList.contains('dark');
    
    return {
      backgroundColor: isDarkMode ? '#1e2130' : 'transparent',
      title: {
        text: `Wastage by Category (${date.format(
          mode === "day"
            ? "DD MMM, YYYY"
            : mode === "month"
            ? "MMM YYYY"
            : "YYYY"
        )})`,
        subtext: `Total: ${totalCount}`,
        left: "center",
        top: 10,
        textStyle: {
          color: isDarkMode ? "#fff" : "#333",
          fontSize: 18,
          fontWeight: "bold",
        },
        subtextStyle: {
          color: isDarkMode ? "#ccc" : "#666",
          fontSize: 14,
        }
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
        textStyle: { fontSize: 14 },
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
        borderColor: isDarkMode ? '#555' : '#ddd',
        textStyle: {
          color: isDarkMode ? '#fff' : '#333'
        },
        borderWidth: 1,
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 10,
        textStyle: { 
          color: isDarkMode ? "#fff" : "#333", 
          fontSize: 12 
        },
        pageIconColor: isDarkMode ? '#fff' : '#333',
        pageTextStyle: { color: isDarkMode ? '#fff' : '#333' },
      },
      series: [
        {
          name: "Wastage",
          type: "pie",
          radius: ["30%", "70%"], // Donut chart for better visualization
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDarkMode ? '#1e2130' : '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "outside",
            color: isDarkMode ? "#fff" : "#333",
            formatter: "{b}: {d}%",
            fontSize: 14,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            length: 15,
            length2: 10,
            smooth: true,
          },
          data: chartData.length > 0 ? chartData : [],
        },
      ],
    };
  };

  return (
    <div className="wastage-graph-container">
      <h2>Food Wastage Analysis</h2>
      
      {/* Summary Stats Cards */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: "15px", 
        marginBottom: "20px",
        flexWrap: "wrap"
      }}>
        <div style={{ 
          background: "rgba(84, 112, 198, 0.2)", 
          padding: "12px 20px", 
          borderRadius: "10px", 
          minWidth: "120px",
          border: "1px solid rgba(84, 112, 198, 0.5)"
        }}>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>TOTAL FOOD</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>{summaryStats.totalFood}</div>
        </div>
        
        <div style={{ 
          background: "rgba(238, 102, 102, 0.2)", 
          padding: "12px 20px", 
          borderRadius: "10px", 
          minWidth: "120px",
          border: "1px solid rgba(238, 102, 102, 0.5)"
        }}>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>WASTED</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>{summaryStats.wastedFood}</div>
        </div>
        
        <div style={{ 
          background: "rgba(105, 219, 124, 0.2)", 
          padding: "12px 20px", 
          borderRadius: "10px", 
          minWidth: "120px",
          border: "1px solid rgba(105, 219, 124, 0.5)"
        }}>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>REMAINING</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>{summaryStats.remainingFood}</div>
        </div>
      </div>

      <div style={{ 
        marginBottom: "1.5rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <button 
          onClick={handlePrev}
          style={{
            background: "#2d3748",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            padding: "8px 15px",
            fontSize: "16px",
            cursor: "pointer",
            transition: "background 0.3s",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
        >
          &lt;
        </button>
        <span style={{ 
          margin: "0 1rem",
          fontSize: "18px",
          fontWeight: "bold",
          padding: "5px 15px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "5px"
        }}>
          {date.format(
            mode === "day"
              ? "DD MMM, YYYY"
              : mode === "month"
              ? "MMM YYYY"
              : "YYYY"
          )}
        </span>
        <button
          onClick={handleNext}
          disabled={isNextDisabled()}
          style={{
            background: isNextDisabled() ? "#505a6e" : "#2d3748",
            color: isNextDisabled() ? "#aaa" : "#fff",
            border: "none",
            borderRadius: "5px",
            padding: "8px 15px",
            fontSize: "16px",
            cursor: isNextDisabled() ? "not-allowed" : "pointer",
            transition: "background 0.3s",
            boxShadow: isNextDisabled() ? "none" : "0 2px 5px rgba(0,0,0,0.2)",
          }}
        >
          &gt;
        </button>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <div className="mode-buttons">
          {["day", "month", "year"].map((m) => (
            <button
              key={m}
              className={`mode-button ${m === mode ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <button
          style={{
            margin: "20px 8px 0",
            background: "linear-gradient(90deg, #ff4757, #ff6b81)",
            color: "#fff",
            borderRadius: "8px",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            transition: "all 0.3s",
            display: "inline-block"
          }}
          onClick={clearGraphData}
        >
          CLEAR GRAPH DATA
        </button>
        
        <button
          style={{
            margin: "20px 8px 0",
            background: "linear-gradient(90deg, #3498db, #2980b9)",
            color: "#fff",
            borderRadius: "8px",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            transition: "all 0.3s",
            display: "inline-block"
          }}
          onClick={handleRefresh}
        >
          REFRESH DATA
        </button>
      </div>

      {loading ? (
        <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: "16px" }}>Loading data...</div>
        </div>
      ) : error ? (
        <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff6b6b" }}>
          <div>{error}</div>
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontSize: "18px", marginBottom: "20px" }}>No wastage data available for this period</div>
          <div style={{ fontSize: "14px", color: "#aaa" }}>Any new food marked as wasted will appear here</div>
        </div>
      ) : (
        <ReactECharts 
          option={getChartOption()} 
          style={{ 
            height: "500px", 
            width: "100%",
            borderRadius: "10px",
          }}
          className="wastage-chart"
          opts={{ renderer: 'canvas' }}
        />
      )}

      <div style={{ fontSize: "14px", color: "#ccc", marginTop: "20px", textAlign: "center", padding: "0 20px" }}>
        <p>This pie chart visualization shows the proportion of wasted food by category</p>
        <p>Both manually marked waste and expired items are included in these statistics</p>
      </div>

      {/* Add navigation links at the bottom */}
      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <Link to="/home" className="btn go-btn">
          Add New Food Item
        </Link>
        
        <Link to="/inventory" className="btn go-btn">
          View Food Inventory
        </Link>
      </div>
    </div>
  );
};

export default WastageGraph;