const mongoose = require("mongoose");

const busDailySeatSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      index: true,
    },
    travelDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    seat: {
      type: String, // e.g. "1A", "1B"
      required: true,
      trim: true,
      uppercase: true,
    },
    bookingId: {
      type: String,
      default: "",
    },
    userId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound unique index ensuring no duplicate seat reservation on the same bus on the same date
busDailySeatSchema.index({ busId: 1, travelDate: 1, seat: 1 }, { unique: true });

module.exports = mongoose.model("BusDailySeat", busDailySeatSchema);
