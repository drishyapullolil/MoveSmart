require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// CORS Configuration with Credentials & Custom Authorization Header Support
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman) or any local dev origin
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

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
                req.path === "/api/public-routes" ||
                req.path === "/api/admin/drivers" ||
                req.path.startsWith("/api/monitoring/"))
        ) {
            return next();
        }
        return res.status(503).json({
            message: "Database connection is offline. Please check your network connection, firewalls, and MongoDB Atlas IP Access List."
        });
    }
    next();
});

const http = require("http");
const { initSocketService } = require("./services/socketService");

const server = http.createServer(app);
initSocketService(server);

// Driver Safety & Real-Time Monitoring Routes
app.use("/api/monitoring", require("./routes/monitoringRoutes"));

// Authentication Routes
app.use("/api/auth", require("./routes/authRoutes"));

// RFID Transit Routes
app.use("/api/rfid", require("./routes/rfidRoutes"));

// Wallet & Payment Routes
app.use("/api/wallet", require("./routes/walletRoutes"));

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
    server.listen(5000, "0.0.0.0", () => {
        printRoutes();
        console.log("Server running with Socket.IO on port 5000 🚀");
    });
}

module.exports = { app, server };
module.exports = { app, server };