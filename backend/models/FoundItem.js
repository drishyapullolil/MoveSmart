const mongoose = require("mongoose");

const foundItemSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
    },
    foundBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // PRIVATE: Accessible only by Admin
    finderPhone: {
      type: String,
      required: true,
      trim: true,
    },
    reporterRole: {
      type: String,
      enum: ["user", "driver", "passenger", "admin"],
      default: "user",
    },
    finderName: {
      type: String,
      default: "",
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
    // Optional / Recommended photo
    photo: {
      type: String,
      default: "",
    },
    foundDate: {
      type: String,
      required: true,
    },
    foundTime: {
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
    // PRIVATE: Details about how/where found used by admin for verification
    foundDetails: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "PENDING_ADMIN_VERIFICATION",
        "FOUND",
        "MATCHED",
        "HANDOVER_TO_ADMIN_PENDING",
        "HANDED_TO_ADMIN",
        "ITEM_IN_ADMIN_CUSTODY",
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
    matchedLostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostItem",
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
foundItemSchema.pre("save", async function () {
  if (!this.reportId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("FoundItem").countDocuments();
    this.reportId = `FOUND-${year}-${String(count + 1).padStart(4, "0")}`;
  }
});

foundItemSchema.index({ category: 1 });
foundItemSchema.index({ busNumber: 1 });

module.exports = mongoose.model("FoundItem", foundItemSchema);
