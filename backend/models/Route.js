const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    fromLocation: {
      type: String,
      required: true,
      trim: true,
    },
    toLocation: {
      type: String,
      required: true,
      trim: true,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: String,
      default: "4h 30m",
    },
    frequency: {
      type: String,
      default: "Every 30 mins",
    },
    stops: {
      type: [String],
      default: [],
    },
    fare: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("Route", routeSchema);
