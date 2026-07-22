const mongoose = require("mongoose");

const stopDistanceSchema = new mongoose.Schema({
  fromStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stop",
    required: true
  },
  toStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stop",
    required: true
  },
  distanceKm: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

// Ensure unique pairs in both directions
stopDistanceSchema.index({ fromStop: 1, toStop: 1 }, { unique: true });

module.exports = mongoose.model("StopDistance", stopDistanceSchema);
