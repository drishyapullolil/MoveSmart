const mongoose = require("mongoose");

const driverLeaveSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverEmail: {
      type: String,
      required: true,
    },
    leaveDate: {
      type: String, // e.g. "2026-08-01"
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["Full Day", "Half Day"],
      required: true,
    },
    halfDaySlot: {
      type: String,
      enum: ["Forenoon (AM)", "Afternoon (PM)", "N/A"],
      default: "N/A",
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    adminComment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverLeave", driverLeaveSchema);
