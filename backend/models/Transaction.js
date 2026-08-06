const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  razorpayOrderId: {
    type: String,
    default: "",
  },
  razorpayPaymentId: {
    type: String,
    default: "",
  },
  razorpaySignature: {
    type: String,
    default: "",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  cardNumber: {
    type: String,
    default: "",
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["Recharge", "Travel", "Card Application", "Bus Booking"],
    default: "Recharge",
  },
  isDebit: {
    type: Boolean,
    default: false, // false = +Recharge, true = -Travel/-Application/-Booking
  },
  status: {
    type: String,
    enum: ["Success", "Failed", "Pending"],
    default: "Success",
  },
  paymentMethod: {
    type: String,
    default: "Razorpay",
  },
  description: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);

