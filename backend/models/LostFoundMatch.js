const mongoose = require("mongoose");

const lostFoundMatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      unique: true,
    },
    lostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostItem",
      required: true,
      index: true,
    },
    foundItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoundItem",
      required: true,
      index: true,
    },
    matchedBy: {
      type: String,
      enum: ["admin", "owner_request", "system_suggestion", "finder_direct"],
      default: "admin",
    },
    adminStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Unmatched"],
      default: "Pending",
    },
    ownerConfirmation: {
      type: String,
      enum: ["Pending", "Confirmed", "Declined"],
      default: "Pending",
    },
    ownerRequestNote: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Auto-generate matchId before saving
lostFoundMatchSchema.pre("save", async function () {
  if (!this.matchId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("LostFoundMatch").countDocuments();
    this.matchId = `MATCH-${year}-${String(count + 1).padStart(4, "0")}`;
  }
});

lostFoundMatchSchema.index({ lostItemId: 1, foundItemId: 1 });
lostFoundMatchSchema.index({ adminStatus: 1 });

module.exports = mongoose.model("LostFoundMatch", lostFoundMatchSchema);
