const mongoose = require("mongoose");

const driverReplacementSchema = new mongoose.Schema(
  {
    leaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DriverLeave",
      default: null,
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      default: null,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      index: true,
    },
    busNumber: {
      type: String,
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },
    routeName: {
      type: String,
      default: "",
    },
    dutyDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "Night"],
      required: true,
      index: true,
    },
    startDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    endDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    originalDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalDriverName: {
      type: String,
      required: true,
    },
    replacementDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    replacementDriverName: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Replacement Required",
        "Assigned",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      default: "Replacement Required",
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index for querying specific bus/shift duties by date
driverReplacementSchema.index({ busId: 1, dutyDate: 1, shift: 1 });
driverReplacementSchema.index({ replacementDriverId: 1, dutyDate: 1 });

module.exports = mongoose.model("DriverReplacement", driverReplacementSchema);
