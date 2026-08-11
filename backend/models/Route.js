const mongoose = require("mongoose");

const routeStopSchema = new mongoose.Schema({
  stop_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stop" },
  name: { type: String, required: true },
  order: { type: Number, required: true },
  travel_time_from_prev: { type: Number, default: 0 }, // Travel time in minutes from previous stop
  offset_minutes: { type: Number, default: 0 }, // Cumulative offset in minutes from source stop
}, { _id: false });

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
    total_duration_minutes: {
      type: Number,
      default: 270,
    },
    base_start_time: {
      type: String,
      default: "08:00 AM",
    },
    frequency: {
      type: String,
      default: "Every 30 mins",
    },
    // Array of string names for backwards compatibility
    legacyStops: {
      type: [String],
      default: [],
    },
    // MoveSmart Offset-based structured stops
    stops: {
      type: [routeStopSchema],
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
