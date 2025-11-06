const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter for Gmail - reusing from OTP service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Generate food usage suggestions based on category
 * @param {string} category - Food category
 * @returns {Array} Array of suggestions
 */
function generateSuggestions(category, name) {
  const generalSuggestions = [
    `Freeze ${name} to extend its shelf life`,
    `Consider donating ${name} if you can't use it soon`,
    `Share ${name} with friends, family, or neighbors`
  ];
  
  const categorySuggestions = {
    "Fruits": [
      `Make a smoothie with ${name}`,
      `Use ${name} in a fruit salad`,
      `Make jam or preserves with ${name}`,
      `Use overripe ${name} for baking`
    ],
    "Vegetables": [
      `Add ${name} to a soup or stew`,
      `Roast ${name} as a side dish`,
      `Make a vegetable stock with ${name}`,
      `Pickle ${name} to extend shelf life`
    ],
    "Dairy Products": [
      `Use ${name} in baking recipes`,
      `Make a sauce or dip with ${name}`,
      `Add ${name} to scrambled eggs`,
      `Make a smoothie with ${name}`
    ],
    "Meat & Poultry": [
      `Cook and freeze ${name} in portions`,
      `Use ${name} in a stir-fry`,
      `Add ${name} to a casserole`,
      `Make a stew with ${name}`
    ],
    "Seafood": [
      `Cook and freeze ${name} in portions`,
      `Make a seafood pasta with ${name}`,
      `Add ${name} to a soup`,
      `Make a seafood salad with ${name}`
    ],
    "Grains & Cereals": [
      `Make a grain bowl with ${name}`,
      `Use ${name} in a soup`,
      `Make a breakfast porridge with ${name}`,
      `Add ${name} to a salad`
    ],
    "Beverages": [
      `Use ${name} in a cocktail`,
      `Make a smoothie with ${name}`,
      `Add ${name} to a dessert`,
      `Use ${name} in cooking`
    ],
    "Snacks": [
      `Share ${name} with friends`,
      `Use ${name} in a trail mix`,
      `Add ${name} to a dessert`,
      `Use ${name} in a snack mix`
    ],
    "Frozen Foods": [
      `Cook ${name} in a new recipe`,
      `Add ${name} to a stir-fry`,
      `Use ${name} in a casserole`,
      `Make a quick meal with ${name}`
    ],
    "Canned & Jarred Foods": [
      `Use ${name} in a soup`,
      `Add ${name} to a pasta dish`,
      `Make a quick meal with ${name}`,
      `Use ${name} in a salad`
    ],
    "Condiments & Spices": [
      `Use ${name} in a marinade`,
      `Add ${name} to a sauce`,
      `Use ${name} in a new recipe`,
      `Experiment with ${name} in cooking`
    ],
    "Baking & Cooking Ingredients": [
      `Use ${name} in a new recipe`,
      `Make a dessert with ${name}`,
      `Add ${name} to a sauce`,
      `Experiment with ${name} in baking`
    ],
    "Ready-to-Eat / Prepared Foods": [
      `Enhance ${name} with additional ingredients`,
      `Use ${name} as a base for a new dish`,
      `Add ${name} to a salad`,
      `Use ${name} in a quick meal`
    ]
  };
  
  // Get category-specific suggestions or empty array if category not found
  const specificSuggestions = categorySuggestions[category] || [];
  
  // Combine and return unique suggestions (up to 5)
  return [...specificSuggestions, ...generalSuggestions].slice(0, 5);
}

/**
 * Send expiry notification email
 * @param {string} to - Email address
 * @param {Object} foodItem - Food item object
 * @param {number} daysUntilExpiry - Days until expiry
 * @returns {Object} Success status and message
 */
async function sendExpiryNotification(to, foodItem, daysUntilExpiry) {
  if (!to || !foodItem) {
    console.error("Missing required parameters: email or food item");
    return { success: false, error: "Missing required parameters" };
  }
  
  const isExpired = daysUntilExpiry <= 0;
  const suggestions = generateSuggestions(foodItem.category, foodItem.name);
  
  const mailOptions = {
    from: `"Food Shelf Life" <${process.env.EMAIL_USER}>`,
    to,
    subject: isExpired 
      ? `🔴 ${foodItem.name} has expired!` 
      : `⚠️ ${foodItem.name} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: ${isExpired ? '#D32F2F' : '#FFA000'};">Food Shelf Life Alert</h2>
        
        <div style="background-color: ${isExpired ? '#FFEBEE' : '#FFF8E1'}; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="font-weight: bold; font-size: 18px;">
            ${isExpired 
              ? `${foodItem.name} has expired!` 
              : `${foodItem.name} will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}!`}
          </p>
          <p>Category: ${foodItem.category}</p>
          <p>Expiry Date: ${new Date(foodItem.expiryDate).toLocaleDateString()}</p>
        </div>
        
        <div style="margin-top: 20px;">
          <h3 style="color: #388E3C;">Ideas to use it:</h3>
          <ul>
            ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #757575;">
          You received this email because you enabled expiry notifications in Food Shelf Life Tracker.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent for ${foodItem.name}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Failed to send expiry notification:", err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendExpiryNotification,
  generateSuggestions
}; 