require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();


// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


// MongoDB Atlas Connection
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
.then(() => {
    console.log("MongoDB connected ✅");
})
.catch((error) => {
    console.error("MongoDB Error ❌:", error);
});


// Middleware to check database connection status
app.use((req, res, next) => {
    // 1 = connected
    if (mongoose.connection.readyState !== 1) {
        // Allow public GET endpoints to serve fallback/seed data safely when DB is offline
        if (
            req.method === "GET" &&
            (req.path === "/api/buses" ||
             req.path.startsWith("/api/buses/") ||
             req.path === "/api/locations" ||
             req.path === "/api/routes" ||
             req.path === "/api/public-routes")
        ) {
            return next();
        }
        return res.status(503).json({
            message: "Database connection is offline. Please check your network connection, firewalls, and MongoDB Atlas IP Access List."
        });
    }
    next();
});


// Authentication Routes
app.use("/api/auth", require("./routes/authRoutes"));

// RFID Transit Routes
app.use("/api/rfid", require("./routes/rfidRoutes"));

// Bus Search & Booking Routes
app.use("/api", require("./routes/bookingRoutes"));

// Driver & Leave Management Routes
app.use("/api", require("./routes/driverRoutes"));




// Test Route
app.get("/", (req, res) => {
    res.send("Backend running 🚀");
});


const printRoutes = () => {
    const routes = app._router?.stack
        ?.filter((layer) => layer.route)
        .map((layer) => Object.keys(layer.route.methods).filter(Boolean).join(",") + " " + layer.route.path);

    if (routes?.length) {
        console.log("Registered routes:", routes);
    }
};


// Start Server
if (require.main === module) {
    app.listen(5000, "0.0.0.0", () => {
        printRoutes();
        console.log("Server running on port 5000");
    });
}

module.exports = app;