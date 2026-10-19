const mongoose = require("mongoose");

const driverLeaveSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      index: true,
    },
    leaveEndDate: {
      type: String, // Optional: e.g. "2026-08-05" for multi-day leaves
      default: "",
    },
    leaveType: {
      type: String,
      enum: ["Full Day", "Half Day", "Shift Leave"],
      default: "Full Day",
      required: true,
    },
    halfDaySlot: {
      type: String,
      enum: ["Forenoon (AM)", "Afternoon (PM)", "N/A"],
      default: "N/A",
    },
    shiftSlot: {
      type: String,
      enum: ["Full Day", "Morning", "Evening", "Night", "N/A"],
      default: "Full Day",
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
      index: true,
    },
    adminComment: {
      type: String,
      default: "",
    },
    replacementGenerated: {
      type: Boolean,
      default: false,
    },
    affectedDutiesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverLeave", driverLeaveSchema);
