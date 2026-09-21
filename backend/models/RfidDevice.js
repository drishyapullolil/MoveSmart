const mongoose = require("mongoose");

const rfidDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    driverName: {
      type: String,
      default: "Unassigned Driver",
    },
    driverEmail: {
      type: String,
      default: "",
    },
    busNumber: {
      type: String,
      default: "KL-07-MS-1008",
    },
    stopCode: {
      type: String,
      default: "STOP_KANJIRAPPALLY",
      uppercase: true,
    },
    ipAddress: {
      type: String,
      default: "0.0.0.0",
    },
    firmwareVersion: {
      type: String,
      default: "v2.0-RC522",
    },
    status: {
      type: String,
      enum: ["Connected", "Connecting", "Not Connected", "Connection Failed"],
      default: "Not Connected",
    },
    readerActive: {
      type: Boolean,
      default: true,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

rfidDeviceSchema.index({ driverId: 1 });
rfidDeviceSchema.index({ busNumber: 1 });

module.exports = mongoose.model("RfidDevice", rfidDeviceSchema);

