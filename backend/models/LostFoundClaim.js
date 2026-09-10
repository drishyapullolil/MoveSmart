const mongoose = require("mongoose");

const lostFoundClaimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      unique: true,
    },
    lostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostItem",
      required: true,
    },
    foundItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoundItem",
      required: true,
    },
    claimedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimerName: {
      type: String,
      default: "",
    },
    claimerContact: {
      type: String,
      default: "",
    },
    verificationNote: {
      type: String,
      required: true,
    },
    uniqueMarks: {
      type: String,
      default: "",
    },
    lostLocationDetails: {
      type: String,
      default: "",
    },
    proofImageBase64: {
      type: String,
      default: "",
    },
    adminNote: {
      type: String,
      default: "",
    },
    adminVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Returned"],
      default: "Pending",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate claimId before saving
lostFoundClaimSchema.pre("save", async function () {
  if (!this.claimId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("LostFoundClaim").countDocuments();
    this.claimId = `CLAIM-${year}-${String(count + 1).padStart(4, "0")}`;
  }
});

lostFoundClaimSchema.index({ claimedByUserId: 1 });
lostFoundClaimSchema.index({ foundItemId: 1 });
lostFoundClaimSchema.index({ lostItemId: 1 });
lostFoundClaimSchema.index({ status: 1 });

module.exports = mongoose.model("LostFoundClaim", lostFoundClaimSchema);
