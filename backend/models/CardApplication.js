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
  firstName: {
    type: String,
    trim: true,
  },
  secondName: {
    type: String,
    trim: true,
  },
  fullName: {
    type: String,
    required: [true, "Full Name is required"],
    trim: true,
    minlength: [2, "Full Name must be at least 2 characters long"],
  },
  dob: { type: String, required: [true, "Date of Birth is required"] },
  gender: { type: String, required: [true, "Gender is required"] },
  phone: { type: String, required: [true, "Phone Number is required"] },
  email: { type: String, required: [true, "Email Address is required"] },
  phoneVerified: { type: Boolean, default: false },

  // 2. Address Details
  street: { type: String, required: [true, "Street / House Name is required"] },
  city: { type: String, required: [true, "City is required"] },
  district: { type: String, required: [true, "District is required"] },
  state: { type: String, required: [true, "State is required"], default: "Kerala" },
  pincode: { type: String, required: [true, "PIN Code is required"] },

  // 3. Identification Details
  idType: { type: String, required: true, default: "Aadhaar" },
  idNumber: { type: String, required: [true, "ID Number is required"] },
  idProofUrl: { type: String },
  cardCategory: { type: String, required: true, default: "Regular" },
  institutionName: { type: String },
  studentIdUrl: { type: String },

  // 4. Emergency Contact
  frequentSource: { type: String, required: false, default: "N/A" },
  frequentDestination: { type: String, required: false, default: "N/A" },
  preferredTime: { type: String, required: false, default: "Morning" },
  emergencyFirstName: { type: String, trim: true },
  emergencySecondName: { type: String, trim: true },
  emergencyName: { type: String, required: [true, "Emergency Contact Name is required"] },
  emergencyRelation: { type: String, required: [true, "Emergency Contact Relation is required"] },
  emergencyPhone: { type: String, required: [true, "Emergency Phone is required"] },

  // 5. Wallet & Safety
  initialRecharge: { type: Number, required: true, default: 20 },
  paymentMethod: { type: String, required: false, default: "Razorpay" },
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
