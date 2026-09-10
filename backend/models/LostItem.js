const mongoose = require("mongoose");

const lostItemSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // PRIVATE: Accessible only by Admin
    ownerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Mobile Phone",
        "Wallet/Purse",
        "ID Card",
        "Bag",
        "Keys",
        "Documents",
        "Electronics",
        "Clothing",
        "Other",
      ],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional photo
    photo: {
      type: String,
      default: "",
    },
    // Optional details
    brand: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
    // PRIVATE: Hidden identifying details used by admin to verify ownership
    serialNumber: {
      type: String,
      default: "",
    },
    identifyingDetails: {
      type: String,
      default: "",
    },
    lostDate: {
      type: String,
      required: true,
    },
    lostTime: {
      type: String,
      default: "",
    },
    busNumber: {
      type: String,
      default: "",
    },
    route: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING_ADMIN_VERIFICATION",
        "LOST",
        "MATCHED",
        "OWNER_CONFIRMED",
        "ADMIN_APPROVED",
        "HANDOVER_TO_ADMIN_PENDING",
        "ITEM_IN_ADMIN_CUSTODY",
        "READY_FOR_OWNER_COLLECTION",
        "OWNER_COLLECTED",
        "RECEIVING_PROOF_SUBMITTED",
        "RETURNED",
        "CLOSED",
        "REJECTED",
      ],
      default: "PENDING_ADMIN_VERIFICATION",
      index: true,
    },
    adminVerificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    matchedFoundItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoundItem",
      default: null,
    },
    matchedMatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostFoundMatch",
      default: null,
    },
    matchedHandoverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostFoundHandover",
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate reportId before saving
lostItemSchema.pre("save", async function () {
  if (!this.reportId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("LostItem").countDocuments();
    this.reportId = `LOST-${year}-${String(count + 1).padStart(4, "0")}`;
  }
});

lostItemSchema.index({ category: 1 });
lostItemSchema.index({ busNumber: 1 });

module.exports = mongoose.model("LostItem", lostItemSchema);
