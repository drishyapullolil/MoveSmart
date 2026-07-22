const mongoose = require("mongoose");

const rfidCardSchema = new mongoose.Schema({
  cardNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  rfidTag: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null // Can be unassigned initially
  },
  balance: {
    type: Number,
    required: true,
    default: 0.0,
    min: -50.0 // Allow slight overdraft for last trip, like actual Nol/Oyster cards
  },
  cardType: {
    type: String,
    enum: ["Silver", "Gold", "Blue"],
    default: "Silver"
  },
  status: {
    type: String,
    enum: ["Active", "Suspended"],
    default: "Active"
  }
}, { timestamps: true });

module.exports = mongoose.model("RfidCard", rfidCardSchema);
