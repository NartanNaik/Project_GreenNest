import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function AddFood() {
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [mDate, setMDate] = useState("");
  const navigate = useNavigate();

  const handleAddFoodItem = async (e) => {
    e.preventDefault(); // Prevent default form submission

    if (!foodName || !category || !shelfLife || !mDate) {
      alert("Please fill out all fields.");
      return;
    }

    const parsedShelfLife = parseInt(shelfLife);
    if (isNaN(parsedShelfLife) || parsedShelfLife <= 0) {
      alert("Shelf Life must be a positive number.");
      return;
    }

    const manufactureDate = new Date(mDate);
    if (isNaN(manufactureDate.getTime())) {
      alert("Please enter a valid manufacturing date.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to add food.");
        return;
      }

      const res = await axios.post(
        "http://localhost:5000/food/add",
        {
          name: foodName,
          category,
          shelfLife: parsedShelfLife,
          mDate: manufactureDate.toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Food added:", res.data);

      setFoodName("");
      setCategory("");
      setShelfLife("");
      setMDate("");

      navigate("/inventory", { state: { added: true } });
    } catch (err) {
      console.error("Error adding food:", err.response?.data || err.message);
      alert(
        `Error adding food item: ${
          err.response?.data?.message || "Server error"
        }`
      );
    }
  };

  return (
    <div className="add-food-container">
      <h2>Add Food Item</h2>
      <form className="food-form" onSubmit={handleAddFoodItem}>
        <input
          type="text"
          placeholder="Food Name"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>
          <option value="Fruits">Fruits</option>
          <option value="Vegetables">Vegetables</option>
          <option value="Dairy Products">Dairy Products</option>
          <option value="Meat & Poultry">Meat & Poultry</option>
          <option value="Seafood">Seafood</option>
          <option value="Grains & Cereals">Grains & Cereals</option>
          <option value="Beverages">Beverages</option>
          <option value="Snacks">Snacks</option>
          <option value="Frozen Foods">Frozen Foods</option>
          <option value="Canned & Jarred Foods">Canned & Jarred Foods</option>
          <option value="Condiments & Spices">Condiments & Spices</option>
          <option value="Baking & Cooking Ingredients">Baking & Cooking Ingredients</option>
          <option value="Ready-to-Eat / Prepared Foods">Ready-to-Eat / Prepared Foods</option>
        </select>

        <label>
          Manufacturing Date:
          <input
            type="date"
            value={mDate}
            onChange={(e) => setMDate(e.target.value)}
          />
        </label>

        <input
          type="number"
          placeholder="Shelf Life (days)"
          value={shelfLife}
          onChange={(e) => setShelfLife(e.target.value)}
        />

        <button className="btn add-btn" type="submit">
          Add Food Item
        </button>
      </form>

      <br />
     <div style={{ textAlign: "center", marginTop: "2rem" }}>
  <Link to="/inventory" className="btn go-btn">
    Go to Food List
  </Link>
</div>

    </div>
  );
}

export default AddFood;