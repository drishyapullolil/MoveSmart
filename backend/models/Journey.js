const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RfidCard",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  tapInStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stop",
    required: true
  },
  tapInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  tapOutStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stop",
    default: null
  },
  tapOutTime: {
    type: Date,
    default: null
  },
  distanceKm: {
    type: Number,
    default: 0
  },
  fare: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["In-Progress", "Completed", "Expired"],
    default: "In-Progress"
  },
  busNumber: {
    type: String,
    default: ""
  },
  busName: {
    type: String,
    default: ""
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bus",
    default: null
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  driverEmail: {
    type: String,
    default: ""
  },
  tripSessionId: {
    type: String,
    default: "",
    index: true
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    default: null
  },
  routeName: {
    type: String,
    default: ""
  },
  cardUid: {
    type: String,
    default: ""
  },
  passengerName: {
    type: String,
    default: ""
  },
  cardType: {
    type: String,
    default: "Silver"
  },
  tapInPrevBalance: {
    type: Number,
    default: 0
  },
  tapInNewBalance: {
    type: Number,
    default: 0
  },
  tapOutPrevBalance: {
    type: Number,
    default: 0
  },
  tapOutNewBalance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Journey", journeySchema);
