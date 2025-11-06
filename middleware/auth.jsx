const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Check for cron API key for internal scheduled jobs
    if (req.headers.authorization === `Bearer ${process.env.CRON_API_KEY || 'internal-cron-key'}` &&
        req.path === '/notifications/check-expiry' && 
        req.method === 'POST') {
      // Allow access to the expiry check endpoint with the internal key
      req.user = { 
        isCronJob: true,
        // We don't set a userId as this job will scan all users
      };
      return next();
    }
    
    // Regular JWT auth for user requests
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};