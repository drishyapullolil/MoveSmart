const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({ message: "Not authorized, no token provided", code: "NO_TOKEN" });
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026"
            );

            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found", code: "USER_NOT_FOUND" });
            }

            next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                console.warn(`⚠️ [Auth] Expired token received for ${req.method} ${req.originalUrl || req.url} (expired at ${error.expiredAt?.toISOString?.() || error.expiredAt})`);
                return res.status(401).json({
                    message: "Session expired. Please log in again.",
                    code: "TOKEN_EXPIRED",
                    expiredAt: error.expiredAt
                });
            }

            if (error.name === "JsonWebTokenError") {
                console.warn(`⚠️ [Auth] Invalid token received for ${req.method} ${req.originalUrl || req.url}: ${error.message}`);
                return res.status(401).json({
                    message: "Invalid authentication token. Please log in again.",
                    code: "INVALID_TOKEN"
                });
            }

            console.error("Auth Middleware Error:", error.message || error);
            return res.status(401).json({ message: "Not authorized, token failed", code: "TOKEN_FAILED" });
        }
    } else {
        return res.status(401).json({ message: "Not authorized, no token", code: "NO_TOKEN" });
    }
};

// Admin only
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Not authorized as an admin" });
    }
};

// Driver only
const driverOnly = (req, res, next) => {
    if (req.user && req.user.role === "driver") {
        next();
    } else {
        return res.status(403).json({ message: "Not authorized as a driver" });
    }
};

// Approved Driver only
const approvedDriverOnly = (req, res, next) => {
    if (req.user && req.user.role === "driver") {
        next();
    } else {
        return res.status(403).json({ message: "Not authorized as a driver" });
    }
};

// Optional auth - populates req.user if valid token provided, but doesn't block unauthenticated queries
const optionalProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026"
            );

            req.user = await User.findById(decoded.id).select("-password");
        } catch (error) {
            // Token invalid or expired, continue without req.user
        }
    }
    next();
};

module.exports = { protect, optionalProtect, adminOnly, driverOnly, approvedDriverOnly };

