const mongoose = require("mongoose");
const { inferShiftFromTime } = require("../utils/shiftConflictHelper");

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
    shift: {
      type: String,
      enum: ["Morning", "Evening", "Night"],
      default: "Morning",
    },
    shiftStartTime: {
      type: String,
      default: "",
    },
    shiftEndTime: {
      type: String,
      default: "",
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

// Auto-infer shift from start_time if missing or default
scheduleSchema.pre("save", function () {
  if (this.start_time && (!this.shift || this.isModified("start_time"))) {
    this.shift = inferShiftFromTime(this.start_time);
  }
});

module.exports = mongoose.model("Schedule", scheduleSchema);
