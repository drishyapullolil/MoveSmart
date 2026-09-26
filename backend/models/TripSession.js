const mongoose = require("mongoose");

const tripSessionSchema = new mongoose.Schema(
  {
    tripSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    busNumber: {
      type: String,
      default: "",
    },
    busName: {
      type: String,
      default: "",
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    driverName: {
      type: String,
      default: "Driver",
    },
    driverEmail: {
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
      default: "",
    },
    fromLocation: {
      type: String,
      default: "",
    },
    toLocation: {
      type: String,
      default: "",
    },
    startStop: {
      type: String,
      default: "",
    },
    endStop: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED"],
      default: "ACTIVE",
    },
    mode: {
      type: String,
      enum: ["manual", "gps"],
      default: "manual",
    },
    currentStopIndex: {
      type: Number,
      default: 0,
    },
    currentStop: {
      name: String,
      code: String,
      latitude: Number,
      longitude: Number,
    },
    nextStop: {
      name: String,
      code: String,
      latitude: Number,
      longitude: Number,
    },
    completedStops: [
      {
        name: String,
        code: String,
        latitude: Number,
        longitude: Number,
        departedAt: Date,
      },
    ],
    upcomingStops: [
      {
        name: String,
        code: String,
        latitude: Number,
        longitude: Number,
      },
    ],
    totalDistanceKm: {
      type: Number,
      default: 0,
    },
    distanceCovered: {
      type: Number,
      default: 0,
    },
    totalRfidTaps: {
      type: Number,
      default: 0,
    },
    totalTapIns: {
      type: Number,
      default: 0,
    },
    totalTapOuts: {
      type: Number,
      default: 0,
    },
    totalFare: {
      type: Number,
      default: 0,
    },
    successfulTransactions: {
      type: Number,
      default: 0,
    },
    failedTransactions: {
      type: Number,
      default: 0,
    },
    ignoredTransactions: {
      type: Number,
      default: 0,
    },
    uniquePassengers: {
      type: Number,
      default: 0,
    },
    reportUrl: {
      type: String,
      default: "",
    },
    reportPdfPath: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripSession", tripSessionSchema);
