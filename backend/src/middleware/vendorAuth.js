import jwt from "jsonwebtoken";

export const authenticateVendor = (req, res, next) => {
  try {
    let token;

    // 1. Check Cookie
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // 2. Check Authorization Header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Attach user to request (use id for controllers that expect req.user.id)
    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id,
    };

    // 3. Check Role is VENDOR
    if (req.user.role !== "VENDOR") {
      return res.status(403).json({ message: "Access denied. Vendors only." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};