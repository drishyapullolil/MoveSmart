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

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026"
            );

            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    } else {
        return res.status(401).json({ message: "Not authorized, no token" });
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

module.exports = { protect, adminOnly, driverOnly, approvedDriverOnly };
