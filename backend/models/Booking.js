const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      default: "guest_user",
    },
    passengerName: {
      type: String,
      required: true,
    },
    passengerEmail: {
      type: String,
      required: true,
    },
    passengerPhone: {
      type: String,
      default: "",
    },
    passengers: [
      {
        seat: { type: String },
        name: { type: String },
        age: { type: String, default: "" },
        gender: { type: String, default: "" },
        boarded: { type: Boolean, default: false },
        boardedAt: { type: Date, default: null },
        boardedStation: { type: String, default: "" },
      },
    ],
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    busName: {
      type: String,
      required: true,
    },
    busNumber: {
      type: String,
      default: "",
    },
    fromLocation: {
      type: String,
      required: true,
    },
    toLocation: {
      type: String,
      required: true,
    },
    travelDate: {
      type: String,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
    arrivalTime: {
      type: String,
      default: "",
    },
    selectedSeats: {
      type: [String],
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "rfid",
    },
    driverName: {
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
    status: {
      type: String,
      enum: ["Confirmed", "Cancelled", "Pending"],
      default: "Confirmed",
    },
    boarded: {
      type: Boolean,
      default: false,
    },
    boardedAt: {
      type: Date,
      default: null,
    },
    boardedStation: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
