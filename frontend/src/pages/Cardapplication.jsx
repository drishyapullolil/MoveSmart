import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { processRazorpayPayment } from "../utils/razorpay";
import { getStoredUser } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { COUNTRY_CODES, getCountryByCode } from "../utils/countryPhoneData";
import { validatePhoneNumber } from "../utils/phoneValidator";
import { validateName } from "../utils/nameValidator";
import {
  validateEmail,
  validateDob,
  validatePincode,
  validateLocationName,
  validateInstitutionName,
  validateIdNumber,
  validateStreet,
} from "../utils/formValidators";
import { INDIA_LOCATION_DATA, STATES_LIST } from "../utils/indiaLocationData";

const API_BASE = "/api/rfid";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(status) {
  switch (status) {
    case "Approved":
      return { bg: "rgba(34, 197, 94, 0.12)", text: "#15803d", border: "rgba(34, 197, 94, 0.3)", icon: "✅ Approved" };
    case "Rejected":
      return { bg: "rgba(225, 29, 72, 0.12)", text: "#be123c", border: "rgba(225, 29, 72, 0.3)", icon: "❌ Rejected" };
    case "Correction Needed":
      return { bg: "rgba(245, 158, 11, 0.15)", text: "#b45309", border: "rgba(245, 158, 11, 0.35)", icon: "🔄 Correction Needed" };
    default:
      return { bg: "rgba(139, 92, 246, 0.12)", text: "#6d28d9", border: "rgba(139, 92, 246, 0.3)", icon: "⏳ Pending Review" };
  }
}

const INITIAL_FORM = {
  // 1. Personal Information
  fullName: "",
  dob: "",
  gender: "Male",
  countryCode: "+91",
  phone: "",
  email: "",
  phoneVerified: false,

  // 2. Address Details
  street: "",
  city: "Kochi",
  district: "Ernakulam",
  state: "Kerala",
  pincode: "",

  // 3. Identification Details
  idType: "Aadhaar",
  idNumber: "",
  idProofName: "",
  cardCategory: "Regular", // Regular / Student / Senior Citizen
  institutionName: "",
  studentIdName: "",

  // 4. Emergency Contact
  frequentSource: "N/A",
  frequentDestination: "N/A",
  preferredTime: "Morning",
  emergencyName: "",
  emergencyRelation: "",
  emergencyCountryCode: "+91",
  emergencyPhone: "",

  // 5. Wallet & Safety
  initialRecharge: "20",
  paymentMethod: "Razorpay",
  enableSos: true,
  shareLocation: false,
  termsAccepted: false,
};

export default function CardApplication() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedAppInfo, setSubmittedAppInfo] = useState(null);

  // OTP Simulation States
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  const [user] = useState(() => getStoredUser());

  // Pre-fill user details if available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const fetchApplications = useCallback(async () => {
    try {
      const stored = getStoredUser();
      const params = {};
      if (stored?.id || stored?._id) params.userId = stored.id || stored._id;
      if (stored?.email) params.email = stored.email;

      const res = await axios.get(`${API_BASE}/my-applications`, {
        params,
        withCredentials: true,
      });
      setApplications(res.data || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: file.name,
      }));
    }
  };

  // Dynamic Location Cascading Logic (State -> District -> City Dropdowns)
  const availableDistricts = INDIA_LOCATION_DATA[formData.state]
    ? Object.keys(INDIA_LOCATION_DATA[formData.state])
    : [];

  const availableCities =
    INDIA_LOCATION_DATA[formData.state] && INDIA_LOCATION_DATA[formData.state][formData.district]
      ? INDIA_LOCATION_DATA[formData.state][formData.district]
      : [];

  const handleStateChange = (e) => {
    const selectedState = e.target.value;
    const districts = INDIA_LOCATION_DATA[selectedState]
      ? Object.keys(INDIA_LOCATION_DATA[selectedState])
      : [];
    const firstDistrict = districts[0] || "";
    const cities =
      INDIA_LOCATION_DATA[selectedState] && INDIA_LOCATION_DATA[selectedState][firstDistrict]
        ? INDIA_LOCATION_DATA[selectedState][firstDistrict]
        : [];
    const firstCity = cities[0] || "";

    setFormData((prev) => ({
      ...prev,
      state: selectedState,
      district: firstDistrict,
      city: firstCity,
    }));
  };

  const handleDistrictChange = (e) => {
    const selectedDistrict = e.target.value;
    const cities =
      INDIA_LOCATION_DATA[formData.state] && INDIA_LOCATION_DATA[formData.state][selectedDistrict]
        ? INDIA_LOCATION_DATA[formData.state][selectedDistrict]
        : [];
    const firstCity = cities[0] || "";

    setFormData((prev) => ({
      ...prev,
      district: selectedDistrict,
      city: firstCity,
    }));
  };

  const handleCityChange = (e) => {
    const selectedCity = e.target.value;
    setFormData((prev) => ({
      ...prev,
      city: selectedCity,
    }));
  };

  // Real-time field validations for all form fields
  const nameValidation = validateName(formData.fullName);
  const dobValidation = validateDob(formData.dob);
  const emailValidation = validateEmail(formData.email);
  const phoneValidation = validatePhoneNumber(formData.countryCode || "+91", formData.phone);

  const streetValidation = validateStreet(formData.street);
  const cityValidation = validateLocationName(formData.city, "City");
  const districtValidation = validateLocationName(formData.district, "District");
  const pincodeValidation = validatePincode(formData.pincode);

  const idNumberValidation = validateIdNumber(formData.idNumber, formData.cardCategory);
  const institutionNameValidation = validateInstitutionName(formData.institutionName);

  const frequentSourceValidation = validateLocationName(formData.frequentSource, "Frequent Starting Station");
  const frequentDestinationValidation = validateLocationName(formData.frequentDestination, "Frequent Destination");
  const emergencyNameValidation = validateName(formData.emergencyName);
  const emergencyPhoneValidation = validatePhoneNumber(formData.emergencyCountryCode || "+91", formData.emergencyPhone);

  // OTP Verification Handlers
  const handleSendOtp = () => {
    if (!phoneValidation.valid) {
      setOtpMessage(phoneValidation.message || "Please enter a valid phone number");
      return;
    }
    setOtpSent(true);
    setOtpMessage(`📲 OTP code sent to ${phoneValidation.formatted}! Use simulation code: 4829`);
  };

  const handleVerifyOtp = () => {
    if (enteredOtp === "4829" || enteredOtp.trim() === "1234") {
      setFormData((prev) => ({ ...prev, phoneVerified: true }));
      setOtpMessage("✅ Phone number verified successfully!");
    } else {
      setOtpMessage("❌ Invalid OTP. Try code: 4829");
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setStep(1);
    setOtpSent(false);
    setEnteredOtp("");
    setOtpMessage("");
    setFormError("");
    setSubmittedAppInfo(null);
  };

  const validateStep = (targetStep = step) => {
    setFormError("");
    if (targetStep === 1) {
      if (!nameValidation.valid) return nameValidation.message;
      if (!dobValidation.valid) return dobValidation.message;
      if (!formData.gender) return "Gender selection is required.";
      if (!formData.phone.trim()) return "Phone Number is required.";
      if (!phoneValidation.valid) return phoneValidation.message;
      if (!formData.phoneVerified) return "⚠️ Please verify your phone number via OTP before proceeding to Step 2.";
      if (!emailValidation.valid) return emailValidation.message;
    }
    if (targetStep === 2) {
      if (!streetValidation.valid) return streetValidation.message;
      if (!cityValidation.valid) return cityValidation.message;
      if (!districtValidation.valid) return districtValidation.message;
      if (!formData.state || !formData.state.trim() || formData.state.trim().length < 2) return "State is required.";
      if (!pincodeValidation.valid) return pincodeValidation.message;
    }
    if (targetStep === 3) {
      if (!formData.cardCategory) return "Pass Type selection is required.";

      if (formData.cardCategory === "Student") {
        if (!institutionNameValidation.valid) return institutionNameValidation.message;
        if (!formData.studentIdName) return "⚠️ Please upload required document (Student ID Card).";
      } else if (formData.cardCategory === "Foreigner") {
        if (!idNumberValidation.valid) return idNumberValidation.message;
        if (!formData.idProofName) return "⚠️ Please upload required document (International Passport Copy).";
      } else {
        if (!idNumberValidation.valid) return idNumberValidation.message;
        if (!formData.idProofName) return "⚠️ Please upload required document (Government ID Proof).";
      }
    }
    if (targetStep === 4) {
      if (!formData.emergencyName.trim()) return "Emergency Contact Name is required.";
      if (!emergencyNameValidation.valid) return `Emergency Contact Name error: ${emergencyNameValidation.message}`;
      if (!formData.emergencyRelation || !formData.emergencyRelation.trim() || formData.emergencyRelation.trim().length < 2) {
        return "Emergency Contact Relation is required (e.g. Parent, Spouse).";
      }
      if (!formData.emergencyPhone || !formData.emergencyPhone.trim()) return "Emergency Contact Phone Number is required.";
      if (!emergencyPhoneValidation.valid) return `Emergency Phone error: ${emergencyPhoneValidation.message}`;
      if (phoneValidation.formatted && emergencyPhoneValidation.formatted && phoneValidation.formatted === emergencyPhoneValidation.formatted) {
        return "Emergency phone number cannot be identical to applicant's primary phone number.";
      }
    }
    if (targetStep === 5) {
      if (!formData.initialRecharge) return "Initial Wallet Recharge amount selection is required.";
      if (!formData.termsAccepted) return "You must accept the Terms & Conditions to submit application.";
    }
    return null;
  };

  const validateAllSteps = () => {
    for (let s = 1; s <= 5; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        return err;
      }
    }
    return null;
  };

  const handleNextStep = () => {
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setFormError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateAllSteps();
    if (err) {
      setFormError(err);
      return;
    }

    setSubmitting(true);
    setFormError("");

    const initialAmount = Number(formData.initialRecharge) || 20;

    const executeSubmission = async (paymentId = "") => {
      try {
        const payload = {
          ...formData,
          phone: phoneValidation.formatted || `${formData.countryCode} ${formData.phone}`,
          emergencyPhone: formData.emergencyPhone ? emergencyPhoneValidation.formatted || `${formData.emergencyCountryCode} ${formData.emergencyPhone}` : "",
          paymentId: paymentId || undefined,
          paymentMethod: "Razorpay",
          userId: user?.id || user?._id || null,
          idProofUrl: formData.idProofName ? `uploads/id_${formData.idProofName}` : "",
          studentIdUrl: formData.studentIdName ? `uploads/student_${formData.studentIdName}` : "",
        };

        const res = await axios.post(`${API_BASE}/apply`, payload, {
          withCredentials: true,
        });

        const newApp = res.data.application;
        setSubmittedAppInfo(newApp);
        await fetchApplications();
      } catch (err) {
        const message = err.response?.data?.error || err.response?.data?.message || "Failed to submit application. Please try again.";
        setFormError(message);
      } finally {
        setSubmitting(false);
      }
    };

    processRazorpayPayment({
      amount: initialAmount,
      description: `MoveSmart Nol Card Application (${formData.cardCategory})`,
      userEmail: formData.email || user?.email || "",
      userName: formData.fullName || user?.name || "Card Applicant",
      userPhone: formData.phone || "",
      paymentType: "card_application",
      onSuccess: (data) => {
        executeSubmission(data.paymentId);
      },
      onError: (err) => {
        setSubmitting(false);
        if (!err.message?.includes("cancelled")) {
          setFormError(`Payment error: ${err.message}`);
        }
      },
    });
  };

  return (
    <div className="rta-body-theme" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      {/* Navigation Header */}
      <Header />

      {/* Hero Banner Header */}
      <header className="rta-hero" style={{ background: "linear-gradient(135deg, #132418 0%, #1f1938 100%)", padding: "50px 5% 90px", textAlign: "center", color: "#fff" }}>
        <h1 className="rta-hero-title" style={{ fontSize: "36px", fontWeight: "800" }}>
          MoveSmart <span>RFID Travel Card Application</span>
        </h1>
        <p className="rta-hero-subtitle" style={{ fontSize: "15px", opacity: 0.85, maxWidth: "600px", margin: "10px auto 0" }}>
          Apply for your smart contactless RFID pass for buses, express routes, and seamless transit across Kerala.
        </p>
      </header>

      {/* Main Form Container */}
      <main style={{ maxWidth: "950px", margin: "-50px auto 60px", width: "92%", position: "relative", zIndex: 10 }}>

        {/* Step Progress Bar */}
        <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px 24px", marginBottom: "24px", boxShadow: "var(--rta-shadow)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", overflowX: "auto" }}>
          {[
            { num: 1, title: "Personal" },
            { num: 2, title: "Address" },
            { num: 3, title: "ID & Category" },
            { num: 4, title: "Preferences" },
            { num: 5, title: "Payment & Safety" },
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "13px",
                    background: isCompleted ? "#38a169" : isActive ? "linear-gradient(135deg, #38a169, #8b5cf6)" : "#e2e8f0",
                    color: isCompleted || isActive ? "#ffffff" : "#64748b",
                    boxShadow: isActive ? "0 4px 12px rgba(56, 161, 105, 0.3)" : "none",
                  }}
                >
                  {isCompleted ? "✓" : s.num}
                </div>
                <span style={{ fontSize: "13px", fontWeight: isActive ? "800" : "600", color: isActive ? "var(--primary)" : "#64748b" }}>
                  {s.title}
                </span>
                {s.num < 5 && <div style={{ width: "24px", height: "2px", background: isCompleted ? "#38a169" : "#e2e8f0", margin: "0 6px" }} />}
              </div>
            );
          })}
        </div>

        {/* Main Application Form Box */}
        <div style={{ background: "#ffffff", borderRadius: "24px", padding: "36px", boxShadow: "var(--rta-shadow)", border: "1px solid var(--border-color)" }}>

          {submittedAppInfo ? (
            /* Submission Success Screen */
            <div style={{ textAlign: "center", padding: "20px 10px" }}>
              <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", fontSize: "36px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                ✓
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b", marginBottom: "8px" }}>
                Application Submitted Successfully!
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "500px", margin: "0 auto 20px" }}>
                Your MoveSmart card application is now pending admin review & approval.
              </p>

              <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "20px", maxWidth: "420px", margin: "0 auto 24px", border: "1px solid var(--border-color)", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>APPLICATION ID</span>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--primary)", fontFamily: "monospace" }}>{submittedAppInfo.applicationId}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>APPLICANT</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>{submittedAppInfo.fullName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>STATUS</span>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#6d28d9", background: "rgba(139, 92, 246, 0.12)", padding: "2px 8px", borderRadius: "999px" }}>
                    ⏳ Pending Admin Review
                  </span>
                </div>
              </div>

              {/* Notification Banner Alert */}
              <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(56, 161, 105, 0.1)", border: "1px solid rgba(56, 161, 105, 0.3)", color: "#15803d", fontSize: "13px", fontWeight: "600", maxWidth: "540px", margin: "0 auto 24px" }}>
                📩 <strong>SMS & Email Confirmation Triggered:</strong> A notification has been dispatched to <strong>{submittedAppInfo.phone || submittedAppInfo.email || "your contact"}</strong> with your Application ID.
              </div>

              <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
                <button type="button" onClick={handleReset} className="rta-btn-secondary" style={{ padding: "12px 24px" }}>
                  Apply for Another Card
                </button>
                <Link to="/dashboard" className="btn-primary" style={{ padding: "12px 24px", width: "auto" }}>
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* STEP 1: Personal Information */}
              {step === 1 && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginBottom: "6px" }}>
                    1. Personal Information
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Provide your legal identity details for your MoveSmart travel card.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div>
                      <label htmlFor="fullName" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                        Full Name <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        className="rta-input-field"
                        placeholder="Enter full legal name"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        style={{
                          borderColor: formData.fullName.trim()
                            ? nameValidation.valid
                              ? "rgba(34, 197, 94, 0.5)"
                              : "rgba(225, 29, 72, 0.5)"
                            : undefined,
                        }}
                      />
                      {formData.fullName.trim() && (
                        <div
                          style={{
                            marginTop: "6px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: nameValidation.valid
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(225, 29, 72, 0.1)",
                            color: nameValidation.valid ? "#15803d" : "#be123c",
                            border: nameValidation.valid
                              ? "1px solid rgba(34, 197, 94, 0.3)"
                              : "1px solid rgba(225, 29, 72, 0.3)",
                          }}
                        >
                          <span>{nameValidation.valid ? "✓ Valid Name" : `⚠️ ${nameValidation.message}`}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label htmlFor="dob" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          Date of Birth <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <input
                          id="dob"
                          name="dob"
                          type="date"
                          className="rta-input-field"
                          value={formData.dob}
                          onChange={handleChange}
                          required
                          style={{
                            borderColor: formData.dob
                              ? dobValidation.valid
                                ? "rgba(34, 197, 94, 0.5)"
                                : "rgba(225, 29, 72, 0.5)"
                              : undefined,
                          }}
                        />
                        {formData.dob && !dobValidation.valid && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "#be123c", fontWeight: "700" }}>
                            ⚠️ {dobValidation.message}
                          </div>
                        )}
                      </div>
                      <div>
                        <label htmlFor="gender" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          Gender <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <select id="gender" name="gender" className="rta-input-field" value={formData.gender} onChange={handleChange} required>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                        Phone Number (OTP Verification) <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <select
                          id="countryCode"
                          name="countryCode"
                          className="rta-input-field"
                          value={formData.countryCode || "+91"}
                          onChange={handleChange}
                          style={{ maxWidth: "165px", fontWeight: "700", cursor: "pointer", background: "#f8fafc" }}
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                              {c.flag} {c.code} ({c.dialCode})
                            </option>
                          ))}
                        </select>
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            className="rta-input-field"
                            placeholder={getCountryByCode(formData.countryCode).placeholder || "Enter phone number"}
                            value={formData.phone}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="rta-btn-secondary"
                          style={{ padding: "8px 16px", whiteSpace: "nowrap", fontSize: "13px" }}
                          disabled={formData.phoneVerified}
                        >
                          {formData.phoneVerified ? "✓ Verified" : otpSent ? "Resend OTP" : "Send OTP"}
                        </button>
                      </div>

                      {/* Real-time ("ontime") Validation Badge Indicator */}
                      {formData.phone && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background:
                              phoneValidation.badgeType === "success"
                                ? "rgba(34, 197, 94, 0.1)"
                                : phoneValidation.badgeType === "error"
                                  ? "rgba(225, 29, 72, 0.1)"
                                  : "rgba(245, 158, 11, 0.12)",
                            color:
                              phoneValidation.badgeType === "success"
                                ? "#15803d"
                                : phoneValidation.badgeType === "error"
                                  ? "#be123c"
                                  : "#b45309",
                            border:
                              phoneValidation.badgeType === "success"
                                ? "1px solid rgba(34, 197, 94, 0.3)"
                                : phoneValidation.badgeType === "error"
                                  ? "1px solid rgba(225, 29, 72, 0.3)"
                                  : "1px solid rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          <span>{phoneValidation.message}</span>
                        </div>
                      )}

                      {/* OTP Input Box Simulation */}
                      {otpSent && !formData.phoneVerified && (
                        <div style={{ marginTop: "12px", padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid var(--border-color)", display: "flex", gap: "10px", alignItems: "center" }}>
                          <input
                            type="text"
                            className="rta-input-field"
                            placeholder="Enter 4-digit OTP"
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value)}
                            style={{ maxWidth: "180px" }}
                          />
                          <button type="button" onClick={handleVerifyOtp} className="rta-btn-primary" style={{ padding: "8px 16px", width: "auto", fontSize: "13px" }}>
                            Verify OTP
                          </button>
                        </div>
                      )}

                      {otpMessage && (
                        <div style={{ fontSize: "12px", fontWeight: "600", marginTop: "6px", color: formData.phoneVerified ? "#16a34a" : "#b45309" }}>
                          {otpMessage}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                        Email Address <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className="rta-input-field"
                        placeholder="yourname@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={{
                          borderColor: formData.email.trim()
                            ? emailValidation.valid
                              ? "rgba(34, 197, 94, 0.5)"
                              : "rgba(225, 29, 72, 0.5)"
                            : undefined,
                        }}
                      />
                      {formData.email.trim() && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: emailValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                          {emailValidation.valid ? "✓ Valid Email" : `⚠️ ${emailValidation.message}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Address Details */}
              {step === 2 && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginBottom: "6px" }}>
                    2. Address Details
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Enter your residential address for physical card delivery or verification.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div>
                      <label htmlFor="street" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                        Street / House Name <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <input
                        id="street"
                        name="street"
                        type="text"
                        className="rta-input-field"
                        placeholder="e.g. Green Valley Villa, MG Road"
                        value={formData.street}
                        onChange={handleChange}
                        required
                        style={{
                          borderColor: formData.street.trim()
                            ? streetValidation.valid
                              ? "rgba(34, 197, 94, 0.5)"
                              : "rgba(225, 29, 72, 0.5)"
                            : undefined,
                        }}
                      />
                      {formData.street.trim() && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: streetValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                          {streetValidation.valid ? "✓ Valid Address" : `⚠️ ${streetValidation.message}`}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label htmlFor="state" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          State <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <select
                          id="state"
                          name="state"
                          className="rta-input-field"
                          value={formData.state}
                          onChange={handleStateChange}
                          required
                          style={{ fontWeight: "700", cursor: "pointer", background: "#f8fafc" }}
                        >
                          {STATES_LIST.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                          <option value="Other">Other State...</option>
                        </select>
                        {formData.state === "Other" && (
                          <input
                            type="text"
                            name="customState"
                            placeholder="Enter State Name"
                            className="rta-input-field"
                            style={{ marginTop: "8px" }}
                            onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                            required
                          />
                        )}
                      </div>

                      <div>
                        <label htmlFor="district" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          District <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <select
                          id="district"
                          name="district"
                          className="rta-input-field"
                          value={formData.district}
                          onChange={handleDistrictChange}
                          required
                          style={{ fontWeight: "700", cursor: "pointer", background: "#f8fafc" }}
                        >
                          {availableDistricts.map((dst) => (
                            <option key={dst} value={dst}>
                              {dst}
                            </option>
                          ))}
                          <option value="Other">Other District...</option>
                        </select>
                        {formData.district === "Other" && (
                          <input
                            type="text"
                            name="customDistrict"
                            placeholder="Enter District Name"
                            className="rta-input-field"
                            style={{ marginTop: "8px" }}
                            onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                            required
                          />
                        )}
                        {formData.district.trim() && districtValidation.valid && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "#15803d", fontWeight: "700" }}>
                            ✓ District Selected
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label htmlFor="city" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          City / Town <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <select
                          id="city"
                          name="city"
                          className="rta-input-field"
                          value={formData.city}
                          onChange={handleCityChange}
                          required
                          style={{ fontWeight: "700", cursor: "pointer", background: "#f8fafc" }}
                        >
                          {availableCities.map((ct) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          ))}
                          <option value="Other">Other City / Town...</option>
                        </select>
                        {formData.city === "Other" && (
                          <input
                            type="text"
                            name="customCity"
                            placeholder="Enter City / Town Name"
                            className="rta-input-field"
                            style={{ marginTop: "8px" }}
                            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                            required
                          />
                        )}
                        {formData.city.trim() && cityValidation.valid && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "#15803d", fontWeight: "700" }}>
                            ✓ City Selected
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="pincode" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          PIN Code <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <input
                          id="pincode"
                          name="pincode"
                          type="text"
                          className="rta-input-field"
                          placeholder="e.g. 682001"
                          value={formData.pincode}
                          onChange={handleChange}
                          required
                          style={{
                            borderColor: formData.pincode.trim()
                              ? pincodeValidation.valid
                                ? "rgba(34, 197, 94, 0.5)"
                                : "rgba(225, 29, 72, 0.5)"
                              : undefined,
                          }}
                        />
                        {formData.pincode.trim() && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: pincodeValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                            {pincodeValidation.valid ? "✓ Valid PIN Code" : `⚠️ ${pincodeValidation.message}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Identification & Card Type */}
              {step === 3 && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginBottom: "6px" }}>
                    3. Identification & Card Type
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Select your card category and upload your identification document.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                    {/* Card Category Selection (3 Options) */}
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                        Select Pass Type <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                        {[
                          { id: "Student", label: "🎓 Student Pass", desc: "For school/college students" },
                          { id: "Regular", label: "👤 Regular Pass", desc: "For resident commuters" },
                          { id: "Foreigner", label: "✈️ Foreigner / Tourist", desc: "For international travelers (Passport)" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({
                              ...prev,
                              cardCategory: cat.id,
                              idType: cat.id === "Student" ? "Student ID" : cat.id === "Foreigner" ? "Passport" : "Government ID"
                            }))}
                            style={{
                              padding: "14px 12px",
                              borderRadius: "14px",
                              border: `2px solid ${formData.cardCategory === cat.id ? "#38a169" : "#e2e8f0"}`,
                              background: formData.cardCategory === cat.id ? "rgba(56, 161, 105, 0.08)" : "#f8fafc",
                              fontWeight: "800",
                              fontSize: "13.5px",
                              color: formData.cardCategory === cat.id ? "#276749" : "#334155",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div style={{ fontSize: "14px", marginBottom: "4px" }}>{cat.label}</div>
                            <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>{cat.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: formData.cardCategory === "Student" ? "1fr" : "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          Auto Required ID Type
                        </label>
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            fontWeight: "800",
                            fontSize: "13.5px",
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>🔒</span>
                          <span>
                            {formData.cardCategory === "Student"
                              ? "Student ID Card Verification (Document Upload)"
                              : formData.cardCategory === "Foreigner"
                                ? "International Passport"
                                : "Government ID Proof (Aadhaar/DL)"}
                          </span>
                        </div>
                      </div>

                      {formData.cardCategory !== "Student" && (
                        <div>
                          <label htmlFor="idNumber" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                            {formData.cardCategory === "Foreigner" ? "Passport Number" : "Government ID Number"} <span style={{ color: "#e11d48" }}>*</span>
                          </label>
                          <input
                            id="idNumber"
                            name="idNumber"
                            type="text"
                            className="rta-input-field"
                            placeholder={formData.cardCategory === "Foreigner" ? "e.g. Z1234567 or A9876543" : "Enter numeric Government / Aadhaar ID No (digits only)"}
                            value={formData.idNumber}
                            onChange={handleChange}
                            required
                            style={{
                              borderColor: formData.idNumber.trim()
                                ? idNumberValidation.valid
                                  ? "rgba(34, 197, 94, 0.5)"
                                  : "rgba(225, 29, 72, 0.5)"
                                : undefined,
                            }}
                          />
                          {formData.idNumber.trim() && (
                            <div
                              style={{
                                marginTop: "6px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "600",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: idNumberValidation.valid
                                  ? "rgba(34, 197, 94, 0.1)"
                                  : "rgba(225, 29, 72, 0.1)",
                                color: idNumberValidation.valid ? "#15803d" : "#be123c",
                                border: idNumberValidation.valid
                                  ? "1px solid rgba(34, 197, 94, 0.3)"
                                  : "1px solid rgba(225, 29, 72, 0.3)",
                              }}
                            >
                              <span>{idNumberValidation.valid ? idNumberValidation.message : `⚠️ ${idNumberValidation.message}`}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CONDITIONAL DOCUMENT UPLOAD LOGIC */}
                    {formData.cardCategory === "Student" ? (
                      <div style={{ background: "rgba(139, 92, 246, 0.06)", border: "1px dashed rgba(139, 92, 246, 0.3)", borderRadius: "16px", padding: "20px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#6d28d9", marginBottom: "12px" }}>
                          📘 Upload Student ID Card (Required *)
                        </h4>

                        <div style={{ marginBottom: "14px" }}>
                          <label htmlFor="institutionName" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                            School / College / Institution Name <span style={{ color: "#e11d48" }}>*</span> <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>(Letters only, no numbers)</span>
                          </label>
                          <input
                            id="institutionName"
                            name="institutionName"
                            type="text"
                            className="rta-input-field"
                            placeholder="e.g. Cochin University of Science and Technology"
                            value={formData.institutionName}
                            onChange={handleChange}
                            required
                            style={{
                              borderColor: formData.institutionName.trim()
                                ? institutionNameValidation.valid
                                  ? "rgba(34, 197, 94, 0.5)"
                                  : "rgba(225, 29, 72, 0.5)"
                                : undefined,
                            }}
                          />
                          {formData.institutionName.trim() && (
                            <div style={{ marginTop: "6px", fontSize: "11px", color: institutionNameValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                              {institutionNameValidation.valid ? "✓ Valid Institution Name (No numbers)" : `⚠️ ${institutionNameValidation.message}`}
                            </div>
                          )}
                        </div>

                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                            Upload Student ID Card Photo / Document <span style={{ color: "#e11d48" }}>*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, "studentIdName")}
                            style={{ fontSize: "13px", color: "#64748b" }}
                          />
                          {formData.studentIdName ? (
                            <div style={{ marginTop: "10px", padding: "10px 14px", background: "#ffffff", borderRadius: "10px", border: "1px solid #c084fc", fontSize: "12px", color: "#6d28d9", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>📄 Document Attached:</span>
                              <strong style={{ color: "#4c1d95" }}>{formData.studentIdName}</strong>
                            </div>
                          ) : (
                            <div style={{ marginTop: "6px", fontSize: "11px", color: "#e11d48", fontWeight: "700" }}>
                              ⚠️ Student ID document upload is required to submit application.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : formData.cardCategory === "Foreigner" ? (
                      <div style={{ background: "rgba(37, 99, 235, 0.06)", border: "1px dashed rgba(37, 99, 235, 0.3)", borderRadius: "16px", padding: "20px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#1d4ed8", marginBottom: "12px" }}>
                          ✈️ Upload International Passport (Required *)
                        </h4>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                            Upload Clear Copy of Passport Info Page <span style={{ color: "#e11d48" }}>*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, "idProofName")}
                            style={{ fontSize: "13px", color: "#64748b" }}
                          />
                          {formData.idProofName ? (
                            <div style={{ marginTop: "10px", padding: "10px 14px", background: "#ffffff", borderRadius: "10px", border: "1px solid #93c5fd", fontSize: "12px", color: "#1d4ed8", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>✈️ Passport Attached:</span>
                              <strong style={{ color: "#1e3a8a" }}>{formData.idProofName}</strong>
                            </div>
                          ) : (
                            <div style={{ marginTop: "6px", fontSize: "11px", color: "#e11d48", fontWeight: "700" }}>
                              ⚠️ Passport document upload is required for International / Tourist Pass.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "rgba(56, 161, 105, 0.06)", border: "1px dashed rgba(56, 161, 105, 0.3)", borderRadius: "16px", padding: "20px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#15803d", marginBottom: "12px" }}>
                          🪪 Upload ID Proof (Required *)
                        </h4>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                            Upload Government ID Proof Photo / Document <span style={{ color: "#e11d48" }}>*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, "idProofName")}
                            style={{ fontSize: "13px", color: "#64748b" }}
                          />
                          {formData.idProofName ? (
                            <div style={{ marginTop: "10px", padding: "10px 14px", background: "#ffffff", borderRadius: "10px", border: "1px solid #86efac", fontSize: "12px", color: "#166534", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>📄 Document Attached:</span>
                              <strong style={{ color: "#14532d" }}>{formData.idProofName}</strong>
                            </div>
                          ) : (
                            <div style={{ marginTop: "6px", fontSize: "11px", color: "#e11d48", fontWeight: "700" }}>
                              ⚠️ ID proof document upload is required to submit application.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* STEP 4: Emergency Contact Details */}
              {step === 4 && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginBottom: "6px" }}>
                    4. Emergency Contact Details
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Provide a trusted emergency contact for safety and account notifications.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                      🚨 Emergency Contact Details <span style={{ color: "#e11d48" }}>*</span>
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <div>
                        <label htmlFor="emergencyName" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          Contact Name <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <input
                          id="emergencyName"
                          name="emergencyName"
                          type="text"
                          className="rta-input-field"
                          placeholder="e.g. Parent / Spouse"
                          value={formData.emergencyName}
                          onChange={handleChange}
                          required
                          style={{
                            borderColor: formData.emergencyName.trim()
                              ? emergencyNameValidation.valid
                                ? "rgba(34, 197, 94, 0.5)"
                                : "rgba(225, 29, 72, 0.5)"
                              : undefined,
                          }}
                        />
                        {formData.emergencyName.trim() && (
                          <div style={{ marginTop: "6px", fontSize: "11px", color: emergencyNameValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                            {emergencyNameValidation.valid ? "✓ Valid Name" : `⚠️ ${emergencyNameValidation.message}`}
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="emergencyRelation" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          Relation <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <input
                          id="emergencyRelation"
                          name="emergencyRelation"
                          type="text"
                          className="rta-input-field"
                          placeholder="e.g. Father"
                          value={formData.emergencyRelation}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="emergencyPhone" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                          Emergency Phone <span style={{ color: "#e11d48" }}>*</span>
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <select
                            id="emergencyCountryCode"
                            name="emergencyCountryCode"
                            className="rta-input-field"
                            value={formData.emergencyCountryCode || "+91"}
                            onChange={handleChange}
                            style={{ maxWidth: "115px", padding: "8px", fontWeight: "700", cursor: "pointer", background: "#f8fafc", fontSize: "12px" }}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={`em-${c.code}-${c.dialCode}`} value={c.dialCode}>
                                {c.flag} {c.dialCode}
                              </option>
                            ))}
                          </select>
                          <input
                            id="emergencyPhone"
                            name="emergencyPhone"
                            type="tel"
                            className="rta-input-field"
                            placeholder={getCountryByCode(formData.emergencyCountryCode).placeholder || "Emergency phone"}
                            value={formData.emergencyPhone}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        {formData.emergencyPhone && (
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background:
                                emergencyPhoneValidation.badgeType === "success"
                                  ? "rgba(34, 197, 94, 0.1)"
                                  : emergencyPhoneValidation.badgeType === "error"
                                    ? "rgba(225, 29, 72, 0.1)"
                                    : "rgba(245, 158, 11, 0.12)",
                              color:
                                emergencyPhoneValidation.badgeType === "success"
                                  ? "#15803d"
                                  : emergencyPhoneValidation.badgeType === "error"
                                    ? "#be123c"
                                    : "#b45309",
                            }}
                          >
                            {emergencyPhoneValidation.message}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 5: Wallet Setup, Safety Options & Consent */}
              {step === 5 && (
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginBottom: "6px" }}>
                    5. Wallet Setup, Safety & Consent
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Configure initial recharge balance, safety toggles, and accept terms.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    <div>
                      <label htmlFor="initialRecharge" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                        Initial Wallet Recharge (INR/AED) <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <select id="initialRecharge" name="initialRecharge" className="rta-input-field" value={formData.initialRecharge} onChange={handleChange} required>
                        <option value="20">₹20 (Minimum Balance)</option>
                        <option value="50">₹50</option>
                        <option value="100">₹100</option>
                        <option value="200">₹200</option>
                      </select>
                    </div>

                    {/* Safety Toggles */}
                    <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "18px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "14px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b" }}>
                        🛡️ Safety Options
                      </h4>

                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Enable Instant SOS Feature</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Trigger emergency alert to contact & control room on card tap</div>
                        </div>
                        <input
                          type="checkbox"
                          name="enableSos"
                          checked={formData.enableSos}
                          onChange={handleChange}
                          style={{ width: "20px", height: "20px", accentColor: "#38a169" }}
                        />
                      </label>

                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Share Trip Location</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Share live bus route location with emergency contact</div>
                        </div>
                        <input
                          type="checkbox"
                          name="shareLocation"
                          checked={formData.shareLocation}
                          onChange={handleChange}
                          style={{ width: "20px", height: "20px", accentColor: "#38a169" }}
                        />
                      </label>
                    </div>

                    {/* Terms Consent */}
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", background: "rgba(56, 161, 105, 0.06)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(56, 161, 105, 0.2)" }}>
                      <input
                        type="checkbox"
                        name="termsAccepted"
                        checked={formData.termsAccepted}
                        onChange={handleChange}
                        style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "#38a169" }}
                        required
                      />
                      <span style={{ fontSize: "12.5px", color: "#334155", lineHeight: "1.5" }}>
                        I confirm that the details provided are accurate and I accept MoveSmart's <strong>Terms & Conditions</strong> for RFID card issuance and e-wallet usage. <span style={{ color: "#e11d48" }}>*</span>
                      </span>
                    </label>

                  </div>
                </div>
              )}

              {/* Form Validation Errors */}
              {formError && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(225, 29, 72, 0.08)", border: "1px solid rgba(225, 29, 72, 0.2)", color: "#be123c", fontSize: "13px", fontWeight: "600", marginTop: "20px" }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Navigation Buttons & Action Handlers */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                <div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rta-btn-secondary"
                    style={{ padding: "10px 18px", fontSize: "13px", color: "#64748b" }}
                  >
                    Reset Form
                  </button>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="rta-btn-secondary"
                      style={{ padding: "10px 20px", fontSize: "14px" }}
                    >
                      ← Previous
                    </button>
                  )}

                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="btn-primary"
                      style={{ padding: "12px 24px", width: "auto", fontSize: "14px" }}
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary"
                      style={{
                        padding: "12px 28px",
                        width: "auto",
                        fontSize: "14px",
                        fontWeight: "700",
                        background: "linear-gradient(135deg, #38a169, #8b5cf6)",
                      }}
                    >
                      {submitting ? "Submitting Application..." : "Submit Application ✓"}
                    </button>
                  )}
                </div>
              </div>

            </form>
          )}

        </div>

        {/* User Application History */}
        <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", marginTop: "32px", boxShadow: "var(--rta-shadow)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              My Submitted Applications
            </h3>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", background: "#f1f5f9", padding: "4px 12px", borderRadius: "999px" }}>
              {applications.length} Found
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13.5px" }}>Loading your applications...</div>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: "#64748b", fontSize: "14px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>💳</div>
              <div>No applications submitted yet. Fill out the form above to get your travel pass!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {applications.map((app) => {
                const badge = getStatusBadge(app.status);
                return (
                  <div key={app._id} style={{ padding: "20px", borderRadius: "16px", background: "#f8fafc", border: `1px solid ${badge.border}`, transition: "all 0.2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: "800", fontSize: "15px", color: "#1e293b" }}>
                            {app.fullName} ({app.cardCategory || "Regular"} Pass)
                          </span>
                          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--primary)", fontWeight: "700" }}>
                            {app.applicationId}
                          </span>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                          Submitted on {formatDate(app.createdAt)} · {app.city || "Kerala"}, {app.state || "Kerala"}
                        </div>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: "800", padding: "6px 14px", borderRadius: "999px", background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                        {badge.icon}
                      </span>
                    </div>

                    {/* Assigned Card Info if Approved */}
                    {app.status === "Approved" && app.assignedCardNumber && (
                      <div style={{ background: "rgba(34, 197, 94, 0.08)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(34, 197, 94, 0.2)", fontSize: "13px", color: "#15803d", marginTop: "10px" }}>
                        🎉 <strong>RFID Card Issued:</strong> Card No: <code>{app.assignedCardNumber}</code> | Tag UID: <code>{app.assignedRfidTag}</code>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {app.status === "Rejected" && app.rejectionReason && (
                      <div style={{ background: "rgba(225, 29, 72, 0.08)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(225, 29, 72, 0.2)", fontSize: "13px", color: "#be123c", marginTop: "10px" }}>
                        ❌ <strong>Rejection Reason:</strong> {app.rejectionReason}
                      </div>
                    )}

                    {/* Correction Note */}
                    {app.status === "Correction Needed" && app.correctionNote && (
                      <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.25)", fontSize: "13px", color: "#b45309", marginTop: "10px" }}>
                        🔄 <strong>Action Required:</strong> {app.correctionNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Footer Branding */}
      <Footer />
    </div>
  );
}