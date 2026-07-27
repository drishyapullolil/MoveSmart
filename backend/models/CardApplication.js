const mongoose = require("mongoose");

const cardApplicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // 1. Personal Information
  fullName: { type: String, required: true },
  dob: { type: String },
  gender: { type: String },
  phone: { type: String },
  email: { type: String },
  phoneVerified: { type: Boolean, default: false },

  // 2. Address Details
  street: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String, default: "Kerala" },
  pincode: { type: String },

  // 3. Identification Details
  idType: { type: String, default: "Aadhaar" },
  idNumber: { type: String, required: true },
  idProofUrl: { type: String },
  cardCategory: { type: String, enum: ["Regular", "Student", "Senior Citizen"], default: "Regular" },
  institutionName: { type: String },
  studentIdUrl: { type: String },

  // 4. Travel Preferences & Emergency
  frequentSource: { type: String },
  frequentDestination: { type: String },
  preferredTime: { type: String, enum: ["Morning", "Afternoon", "Evening"], default: "Morning" },
  emergencyName: { type: String },
  emergencyRelation: { type: String },
  emergencyPhone: { type: String },

  // 5. Wallet & Safety
  initialRecharge: { type: Number, default: 20 },
  paymentMethod: { type: String, enum: ["Razorpay", "UPI", "Card", "Cash"], default: "Razorpay" },
  enableSos: { type: Boolean, default: true },
  shareLocation: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, default: true },

  // Admin & Approval Workflow
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Correction Needed"],
    default: "Pending",
  },
  rejectionReason: { type: String },
  correctionNote: { type: String },
  assignedCardNumber: { type: String },
  assignedRfidTag: { type: String },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("CardApplication", cardApplicationSchema, "cardapplications");
