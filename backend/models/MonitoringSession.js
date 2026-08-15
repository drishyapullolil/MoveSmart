const mongoose = require("mongoose");

const monitoringSessionSchema = new mongoose.Schema(
  {
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
    busName: {
      type: String,
      default: "",
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
    driverEmail: {
      type: String,
      default: "",
    },
    driverPhone: {
      type: String,
      default: "",
    },
    driverLicense: {
      type: String,
      default: "",
    },
    driverPhoto: {
      type: String,
      default: "",
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },
    routeName: {
      type: String,
      default: "Active Transit Route",
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      default: null,
    },
    tripId: {
      type: String,
      default: function () {
        return `TRIP-${Date.now().toString().slice(-6)}`;
      },
    },
    status: {
      type: String,
      enum: ["Active", "Paused", "Ended"],
      default: "Active",
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    currentDriverStatus: {
      type: String,
      enum: [
        "DRIVER_VERIFIED",
        "DRIVER_MISMATCH",
        "DRIVER_NOT_DETECTED",
        "DRIVER_ABSENT",
        "UNKNOWN",
      ],
      default: "DRIVER_VERIFIED",
    },
    currentAlertness: {
      type: String,
      enum: [
        "NORMAL",
        "EARLY_WARNING",
        "DROWSINESS_WARNING",
        "CRITICAL_DROWSINESS",
        "UNKNOWN",
      ],
      default: "NORMAL",
    },
    deviceStatus: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "UNAVAILABLE"],
      default: "ONLINE",
    },
    latestTelemetry: {
      ear: { type: Number, default: 0.28 },
      faceDetected: { type: Boolean, default: true },
      faceConfidence: { type: Number, default: 0.95 },
      blinkRatePerMin: { type: Number, default: 18 },
      headPosePitch: { type: Number, default: 0 },
      absenceSeconds: { type: Number, default: 0 },
      fps: { type: Number, default: 24 },
      timestamp: { type: Date, default: Date.now },
    },
    metricsSummary: {
      earlyWarningCount: { type: Number, default: 0 },
      drowsinessWarningCount: { type: Number, default: 0 },
      criticalDrowsinessCount: { type: Number, default: 0 },
      driverAbsentCount: { type: Number, default: 0 },
      driverMismatchCount: { type: Number, default: 0 },
      deviceOfflineCount: { type: Number, default: 0 },
      totalSafetyAlerts: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MonitoringSession", monitoringSessionSchema);
