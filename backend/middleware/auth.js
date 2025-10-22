const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../utils/errors");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "m+5c3lHjzF70C3+AM6qQB4EgIi1T2ixSCviE8ywNv/9K3jZLxMLbR9UFn9+TdK7Ko0AqyL9xHqH0NPyJThvKzA==";

const verifyAuthToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("⛔ No auth token provided");
    return next(new UnauthorizedError("No authentication token provided."));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);

    req.user = { userId: decodedToken.userId };

    console.log("✅ Authenticated request:", {
      userId: req.user.userId,
      path: req.originalUrl,
      method: req.method,
    });

    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Authentication token has expired."));
    }
    return next(new UnauthorizedError("Invalid authentication token."));
  }
};

// Optional authentication - doesn't reject if no token provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("ℹ️ No auth token provided - proceeding as guest");
    req.user = null; // Set user to null for guest access
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    req.user = { userId: decodedToken.userId };

    console.log("✅ Authenticated request:", {
      userId: req.user.userId,
      path: req.originalUrl,
      method: req.method,
    });

    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    
    // For optional auth, proceed as guest instead of rejecting
    console.log("ℹ️ Invalid token - proceeding as guest");
    req.user = null;
    next();
  }
};

module.exports = { verifyAuthToken, optionalAuth };
