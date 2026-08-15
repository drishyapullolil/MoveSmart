const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
    },
    busName: {
      type: String,
      required: true,
    },
    busType: {
      type: String,
      required: true,
      default: "AC Seater / Sleeper (2+2)",
    },
    operator: {
      type: String,
      default: "MoveSmart Transit Ops",
    },
    fromLocation: {
      type: String,
      required: true,
      index: true,
    },
    toLocation: {
      type: String,
      required: true,
      index: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
    arrivalTime: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      default: "4h 30m",
    },
    totalSeats: {
      type: Number,
      default: 32,
    },
    availableSeats: {
      type: Number,
      default: 32,
    },
    price: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    amenities: {
      type: [String],
      default: ["Wi-Fi", "Charging Port", "Live Tracking", "Water Bottle"],
    },
    bookedSeats: {
      type: [String],
      default: [],
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    driverName: {
      type: String,
      default: "Not Assigned",
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
    driverVerified: {
      type: Boolean,
      default: false,
    },
    driverExperience: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("Bus", busSchema);
