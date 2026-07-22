const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RfidCard",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  tapInStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stop",
    required: true
  },
  tapInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  tapOutStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stop",
    default: null
  },
  tapOutTime: {
    type: Date,
    default: null
  },
  distanceKm: {
    type: Number,
    default: 0
  },
  fare: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["In-Progress", "Completed", "Expired"],
    default: "In-Progress"
  }
}, { timestamps: true });

module.exports = mongoose.model("Journey", journeySchema);
