import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    // ✅ Allow preflight OPTIONS requests
    if (req.method === "OPTIONS") return next();

    const authHeader = req.headers.authorization;
    const cronKey = process.env.CRON_API_KEY || "internal-cron-key";

    // ✅ Combine baseUrl and path to match full route
    const fullPath = (req.baseUrl || "") + (req.path || "");

    // ✅ 1️⃣ Allow internal CRON job access
    if (
      authHeader === `Bearer ${cronKey}` &&
      fullPath === "/notifications/check-expiry" &&
      req.method === "POST"
    ) {
      req.user = { isCronJob: true };
      return next();
    }

    // ✅ 2️⃣ Regular JWT-based authentication
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded;

    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth;