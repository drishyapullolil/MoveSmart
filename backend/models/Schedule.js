const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    routeName: {
      type: String,
    },
    start_time: {
      type: String,
      required: true, // e.g. "08:00 AM", "10:30 AM", "14:00"
    },
    bus_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },
    busNumber: {
      type: String,
    },
    driver_id: {
      type: String,
      default: null,
    },
    driverName: {
      type: String,
    },
    delay_buffer_minutes: {
      type: Number,
      default: 0, // Traffic factor adjustment in minutes
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
