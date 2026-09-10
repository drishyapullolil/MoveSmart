const mongoose = require("mongoose");

const lostFoundHandoverSchema = new mongoose.Schema(
  {
    handoverId: {
      type: String,
      unique: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostFoundMatch",
      required: true,
      index: true,
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
    finderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Finder ➔ Admin intake fields
    receivedDate: {
      type: String,
      default: "",
    },
    receivedTime: {
      type: String,
      default: "",
    },
    itemCondition: {
      type: String,
      default: "",
    },
    handoverPhoto: {
      type: String,
      default: "",
    },
    handoverNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Awaiting_Finder_Handover",
        "In_Admin_Custody",
        "Ready_For_Collection",
        "Owner_Collected",
        "Proof_Submitted",
        "Completed",
      ],
      default: "Awaiting_Finder_Handover",
      index: true,
    },
    // Owner collection & proof fields
    receivedItemPhoto: {
      type: String,
      default: "",
    },
    receivingProof: {
      type: String,
      default: "",
    },
    ownerConfirmedReceived: {
      type: Boolean,
      default: false,
    },
    ownerConfirmedAt: {
      type: Date,
      default: null,
    },
    adminVerifiedReturn: {
      type: Boolean,
      default: false,
    },
    adminReturnNotes: {
      type: String,
      default: "",
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate handoverId before saving
lostFoundHandoverSchema.pre("save", async function () {
  if (!this.handoverId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("LostFoundHandover").countDocuments();
    this.handoverId = `HANDOVER-${year}-${String(count + 1).padStart(4, "0")}`;
  }
});

lostFoundHandoverSchema.index({ ownerId: 1 });
lostFoundHandoverSchema.index({ finderId: 1 });

module.exports = mongoose.model("LostFoundHandover", lostFoundHandoverSchema);
