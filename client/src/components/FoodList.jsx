import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaHandHoldingHeart } from "react-icons/fa";
import "../App.css";

function FoodList() {
  const [foodItems, setFoodItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [highlightedItem, setHighlightedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDonationInfo, setShowDonationInfo] = useState(false);
  const [donationItem, setDonationItem] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const highlightedRef = useRef(null);

  const CATEGORIES = [
    "Fruits",
    "Vegetables",
    "Dairy Products",
    "Meat & Poultry",
    "Seafood",
    "Grains & Cereals",
    "Beverages",
    "Snacks",
    "Frozen Foods",
    "Canned & Jarred Foods",
    "Condiments & Spices",
    "Baking & Cooking Ingredients",
    "Ready-to-Eat / Prepared Foods"
  ];

  const DONATION_SERVICES = [
    {
      name: "Food Bank Network",
      website: "https://www.feedingamerica.org/find-your-local-foodbank",
      description: "Find your nearest food bank to donate items"
    },
    {
      name: "No Food Waste",
      website: "https://www.nofoodwaste.org/",
      description: "Organization dedicated to redistributing excess food"
    },
    {
      name: "Food Rescue US",
      website: "https://foodrescue.us/",
      description: "Direct transfer of fresh food from businesses to hunger relief organizations"
    }
  ];

  const fetchFoodItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/food", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const updatedItems = res.data.map((item) => {
        const today = new Date();
        const expiryDate = new Date(item.expiryDate);
        const daysRemaining = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );
        
        // Add status field based on days remaining
        let status = "fresh";
        if (item.isWasted) {
          status = "wasted";
        } else if (daysRemaining <= 0) {
          status = "expired";
        } else if (daysRemaining <= 3) {
          status = "expiring";
        }
        
        return { ...item, daysRemaining, status };
      });

      setFoodItems(updatedItems);
      applyFilters(updatedItems, searchTerm, filterCategory, filterStatus);
      
      // Check if we need to highlight an item from notification
      if (location.state?.highlightItemId) {
        setHighlightedItem(location.state.highlightItemId);
        // Clear the state so refreshing doesn't rehighlight
        window.history.replaceState({}, document.title);
      }
    } catch (err) {
      console.error("Error fetching food items:", err);
    }
  };

  useEffect(() => {
    fetchFoodItems();

    if (location.state?.added) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Apply filters when search or filter criteria change
  useEffect(() => {
    applyFilters(foodItems, searchTerm, filterCategory, filterStatus);
  }, [searchTerm, filterCategory, filterStatus]);
  
  // Function to apply filters and search
  const applyFilters = (items, search, category, status) => {
    let result = [...items];
    
    // Apply search filter
    if (search) {
      search = search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(search) || 
        item.category.toLowerCase().includes(search)
      );
    }
    
    // Apply category filter
    if (category !== "all") {
      result = result.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Apply status filter
    if (status !== "all") {
      result = result.filter(item => item.status === status);
    }
    
    setFilteredItems(result);
  };
  
  // Scroll to highlighted item
  useEffect(() => {
    if (highlightedItem && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Remove highlight after 5 seconds
      const timer = setTimeout(() => {
        setHighlightedItem(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightedItem, filteredItems]);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/food/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFoodItems((prev) => prev.filter((item) => item._id !== id));
      setFilteredItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Error deleting food item:", err);
    }
  };

  const handleMarkAsWasted = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5000/wastage/mark-wasted/${id}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Update local state to mark the item as wasted but keep it in the list
      const updatedItems = foodItems.map(item => {
        if (item._id === id) {
          return { ...item, isWasted: true, wastedAt: new Date(), status: "wasted" };
        }
        return item;
      });
      
      setFoodItems(updatedItems);
      applyFilters(updatedItems, searchTerm, filterCategory, filterStatus);
      
      // Show success message
      alert("Item marked as wasted and will appear in wastage statistics.");
    } catch (err) {
      console.error("Error marking item as wasted:", err);
      alert("Failed to mark item as wasted. Please try again.");
    }
  };
  
  const handleDonationClick = (item) => {
    setDonationItem(item);
    setShowDonationInfo(true);
  };
  
  const closeDonationModal = () => {
    setShowDonationInfo(false);
    setDonationItem(null);
  };

  // Group items by category for display
  const groupedByCategory = {};
  
  CATEGORIES.forEach(category => {
    const items = filteredItems.filter(item => 
      item.category.toLowerCase() === category.toLowerCase()
    ).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    if (items.length > 0) {
      groupedByCategory[category] = items;
    }
  });
  
  // Function to determine item style based on status
  const getItemStyle = (food) => {
    const baseStyle = {
      marginBottom: "12px",
      padding: "12px",
      borderRadius: "8px",
      transition: "all 0.3s ease",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    };
    
    // Style based on status
    if (food.status === "wasted") {
      baseStyle.backgroundColor = "#FFCDD2"; // Light red
      baseStyle.borderLeft = "5px solid #E53935"; // Dark red
    } else if (food.status === "expired") {
      baseStyle.backgroundColor = "#FFCDD2"; // Light red
      baseStyle.borderLeft = "5px solid #E53935"; // Dark red
    } else if (food.status === "expiring") {
      baseStyle.backgroundColor = "#FFF9C4"; // Light yellow
      baseStyle.borderLeft = "5px solid #FFC107"; // Yellow
    } else {
      baseStyle.backgroundColor = "#DCEDC8"; // Light green
      baseStyle.borderLeft = "5px solid #7CB342"; // Green
    }
    
    // If this is the highlighted item from a notification
    if (highlightedItem === food._id) {
      return {
        ...baseStyle,
        boxShadow: "0 0 12px rgba(76, 175, 80, 0.6)",
        transform: "scale(1.02)",
      };
    }
    
    return baseStyle;
  };
  
  // Get status label and style
  const getStatusLabel = (status) => {
    switch (status) {
      case "fresh":
        return { text: "FRESH", style: { backgroundColor: "#66BB6A", color: "white" } };
      case "expiring":
        return { text: "EXPIRING SOON", style: { backgroundColor: "#FFA726", color: "white" } };
      case "expired":
        return { text: "EXPIRED", style: { backgroundColor: "#EF5350", color: "white" } };
      case "wasted":
        return { text: "WASTED", style: { backgroundColor: "#EF5350", color: "white" } };
      default:
        return { text: status.toUpperCase(), style: { backgroundColor: "#90A4AE", color: "white" } };
    }
  };

  return (
    <div className="food-list-container">
      {/* Removed h1 or h2 with Food Shelf Life Tracker title from here. The logo is now only in the navbar. */}

      {/* Search and filter section */}
      <div className="search-filter-container">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-container">
          <div className="filter-group">
            <label htmlFor="category-filter">
              <FaFilter className="filter-icon" /> Category:
            </label>
            <select
              id="category-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="fresh">Fresh</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="wasted">Wasted</option>
            </select>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="no-items-message">
          <p>No food items found matching your search criteria.</p>
          <Link to="/home" className="btn add-item-btn">Add New Food Item</Link>
        </div>
      ) : (
        <>
          <div className="items-count">
            <span>{filteredItems.length} items found</span>
          </div>
          
          <div className="food-items-grid horizontal-scroll">
            {Object.entries(groupedByCategory).map(([category, items]) => (
              <div key={category} className="category-container">
                <h3 className="category-title">{category.toUpperCase()}</h3>
                <div className="food-items-list">
                  {items.map((food) => (
                    <div
                      key={food._id}
                      ref={highlightedItem === food._id ? highlightedRef : null}
                      className="food-item-card"
                      style={getItemStyle(food)}
                    >
                      <div className="food-item-header">
                        <h4 className="food-item-name">{food.name}</h4>
                        <span 
                          className="status-badge"
                          style={getStatusLabel(food.status).style}
                        >
                          {getStatusLabel(food.status).text}
                        </span>
                      </div>
                      
                      <div className="food-item-details">
                        <p><strong>Expiry Date:</strong> {new Date(food.expiryDate).toLocaleDateString()}</p>
                        <p>
                          <strong>Days Remaining:</strong>{" "}
                          {food.daysRemaining > 0 ? (
                            food.daysRemaining
                          ) : (
                            <span className="expired-text">Expired</span>
                          )}
                        </p>
                      </div>
                      
                      {/* Donation alert for items nearing expiry */}
                      {food.status === "expiring" && !food.isWasted && (
                        <div className="donation-alert">
                          <FaHandHoldingHeart className="donation-icon" />
                          <p>This item will expire soon. Consider donating!</p>
                          <button 
                            className="donation-info-btn"
                            onClick={() => handleDonationClick(food)}
                          >
                            Find donation centers
                          </button>
                        </div>
                      )}
                      
                      <div className="food-item-actions">
                        {!food.isWasted && food.daysRemaining > 0 && (
                          <button
                            className="waste-btn btn"
                            onClick={() => handleMarkAsWasted(food._id)}
                          >
                            Mark as Wasted
                          </button>
                        )}
                        <button
                          className="delete-btn btn"
                          onClick={() => handleDelete(food._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="food-list-actions">
            <Link to="/home" className="btn add-item-btn">
              Add New Food Item
            </Link>

            <button
              className="btn graph-btn"
              onClick={() => navigate("/wastage")}
            >
              📊 View Wastage Graph
            </button>
          </div>
        </>
      )}
      
      {/* Donation Information Modal */}
      {showDonationInfo && donationItem && (
        <div className="donation-modal-overlay">
          <div className="donation-modal">
            <h3>Donation Information</h3>
            
            <div className="donation-item-info">
              <p><strong>Item:</strong> {donationItem.name}</p>
              <p><strong>Expires in:</strong> {donationItem.daysRemaining} days</p>
            </div>
            
            <p className="donation-message">
              Your {donationItem.name} will expire soon. Donating it can help reduce food waste and 
              support those in need. Below are some services that accept food donations:
            </p>
            
            <div className="donation-services">
              {DONATION_SERVICES.map((service, index) => (
                <div key={index} className="donation-service">
                  <h4>{service.name}</h4>
                  <p>{service.description}</p>
                  <a 
                    href={service.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="donation-link"
                  >
                    Visit Website
                  </a>
                </div>
              ))}
            </div>
            
            <div className="donation-tips">
              <h4>Tips for Food Donation</h4>
              <ul>
                <li>Check that food is still safe to consume</li>
                <li>Package items securely</li>
                <li>Call ahead to confirm the donation center accepts your item</li>
                <li>Fresh produce and protein items are especially valuable</li>
              </ul>
            </div>
            
            <button className="close-modal-btn" onClick={closeDonationModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodList;
