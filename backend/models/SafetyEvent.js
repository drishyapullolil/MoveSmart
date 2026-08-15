const mongoose = require("mongoose");

const safetyEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringSession",
      required: true,
      index: true,
    },
    tripId: {
      type: String,
      default: "",
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
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },
    routeName: {
      type: String,
      default: "",
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "DRIVER_VERIFIED",
        "DRIVER_MISMATCH",
        "DRIVER_MISMATCH_CRITICAL",
        "DRIVER_NOT_ENROLLED",
        "DRIVER_NOT_DETECTED",
        "DRIVER_ABSENT",
        "DROWSINESS_EARLY_WARNING",
        "DROWSINESS_WARNING",
        "CRITICAL_DROWSINESS",
        "MONITORING_DEVICE_OFFLINE",
        "MONITORING_DEVICE_ONLINE",
        "SAFETY_ALERT_ACKNOWLEDGED",
        "SAFETY_ALERT_RESOLVED",
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    message: {
      en: { type: String, default: "" },
      ml: { type: String, default: "" },
    },
    severity: {
      type: String,
      enum: ["Info", "Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true,
    },
    confidence: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1.0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["Active", "Acknowledged", "Resolved", "Informational"],
      default: "Active",
      index: true,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acknowledgedByName: {
      type: String,
      default: "",
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedByName: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SafetyEvent", safetyEventSchema);
