const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();


// Middleware
app.use(cors());
app.use(express.json());


// MongoDB Atlas Connection
mongoose.connect(
    "mongodb+srv://drishyajose2027_db_user:Drishya%402003@cluster0.bdjk1sz.mongodb.net/movesmart?appName=Cluster0"
)
.then(() => {
    console.log("MongoDB connected ✅");
})
.catch((error) => {
    console.log("MongoDB Error:", error);
});


// Authentication Routes
app.use("/api/auth", require("./routes/authRoutes"));


// Test Route
app.get("/", (req, res) => {
    res.send("Backend running 🚀");
});


// Start Server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});