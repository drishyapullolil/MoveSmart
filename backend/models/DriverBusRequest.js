const mongoose = require("mongoose");

const driverBusRequestSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    busNumber: {
      type: String,
      required: true,
    },
    busName: {
      type: String,
      required: true,
    },
    routeName: {
      type: String,
      default: "",
    },
    departureTime: {
      type: String,
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    driverName: {
      type: String,
      required: true,
    },
    driverEmail: {
      type: String,
      required: true,
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

module.exports = mongoose.model("DriverBusRequest", driverBusRequestSchema);
