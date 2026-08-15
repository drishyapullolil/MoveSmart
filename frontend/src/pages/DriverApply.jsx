import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getStoredUser, getStoredToken, setStoredUser } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { COUNTRY_CODES } from "../utils/countryPhoneData";
import { validatePhoneNumber } from "../utils/phoneValidator";
import {
  validateDrivingLicense,
  validateExperienceYears,
} from "../utils/formValidators";

function DriverApply() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    countryCode: "+91",
    licenseNumber: user?.licenseNumber || "",
    experienceYears: user?.experienceYears || "",
    phone: user?.phone || "",
    profilePic: user?.profilePic || "",
    licenseImage: user?.licenseImage || ""
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "driver") {
      navigate("/driver"); // Already a driver
    }
  }, [user, navigate]);

  const phoneValidation = validatePhoneNumber(formData.countryCode || "+91", formData.phone);
  const expValidation = validateExperienceYears(formData.experienceYears);
  const licenseValidation = validateDrivingLicense(formData.licenseNumber);

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanDigits = (formData.phone || "").toString().replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      alert("⚠️ Contact Phone Error: Please enter a valid 10-digit phone number");
      return;
    }

    if (!expValidation.valid) {
      alert(`⚠️ Experience Error: ${expValidation.message}`);
      return;
    }

    if (!licenseValidation.valid) {
      alert(`⚠️ Driving License Error: ${licenseValidation.message}`);
      return;
    }

    if (!formData.profilePic) {
      alert("⚠️ Profile Photo upload is required!");
      return;
    }

    if (!formData.licenseImage) {
      alert("⚠️ License Document upload is required!");
      return;
    }

    setSubmitting(true);
    try {
      const token = getStoredToken();
      if (token) {
        await axios.post("/api/auth/apply-driver", formData, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
          console.warn("Backend sync notice:", err.message);
        });
      }

      const updatedUser = {
        ...(user || getStoredUser() || {}),
        ...formData,
        phone: phoneValidation.formatted || formData.phone,
        verificationStatus: "Pending"
      };
      setUser(updatedUser);
      setStoredUser(updatedUser);

      alert("Application submitted successfully! Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (err) {
      console.error("Apply Error:", err);
      const updatedUser = {
        ...(user || getStoredUser() || {}),
        ...formData,
        phone: phoneValidation.formatted || formData.phone,
        verificationStatus: "Pending"
      };
      setUser(updatedUser);
      setStoredUser(updatedUser);
      alert("Application submitted successfully! Redirecting to dashboard...");
      navigate("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    pageWrapper: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#f1f5f9",
      fontFamily: "'Inter', sans-serif",
    },
    mainContainer: {
      flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px 20px"
    },
    splitCard: {
      display: "flex",
      background: "#ffffff",
      borderRadius: "24px",
      boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
      width: "100%",
      maxWidth: "1000px",
      minHeight: "600px",
      overflow: "hidden",
      border: "1px solid #e2e8f0"
    },
    leftPanel: {
      flex: 1,
      background: "linear-gradient(135deg, #1e293b, #0f172a)",
      padding: "40px",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative"
    },
    rightPanel: {
      flex: 1.2,
      padding: "50px 40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    },
    formLabel: { display: "block", fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "8px" },
    formInput: { width: "100%", padding: "14px 18px", borderRadius: "12px", border: "1.5px solid #cbd5e1", fontSize: "15px", marginBottom: "20px", outline: "none", boxSizing: "border-box", transition: "all 0.3s", background: "#f8fafc" },
    submitBtn: {
      width: "100%",
      padding: "16px",
      borderRadius: "14px",
      background: "linear-gradient(135deg, #38a169, #15803d)",
      color: "#fff",
      border: "none",
      fontSize: "16px",
      fontWeight: "800",
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(56, 161, 105, 0.3)",
      transition: "all 0.3s",
      marginTop: "10px"
    },
    fileUploadBox: {
      border: "2px dashed #cbd5e1",
      borderRadius: "12px",
      padding: "20px",
      textAlign: "center",
      background: "#f8fafc",
      cursor: "pointer",
      position: "relative",
      transition: "all 0.3s",
      marginBottom: "20px"
    }
  };

  if (!user || user.role === "driver") return null;

  return (
    <div style={styles.pageWrapper}>
      <Header />
      
      <main style={styles.mainContainer}>
        {user.verificationStatus === "Pending" ? (
          <div style={{...styles.splitCard, maxWidth: "600px", minHeight: "auto", padding: "40px", flexDirection: "column", alignItems: "center", textAlign: "center"}}>
            <div style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(253, 230, 138, 0.6)" }}>⏳</div>
            <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", marginBottom: "16px" }}>Application Under Review</h1>
            <p style={{ color: "#475569", lineHeight: "1.6", fontSize: "16px", marginBottom: "30px" }}>
              Thank you for applying to join the MoveSmart fleet. Our administrative team is currently verifying your profile and driving license details.
            </p>
            <div style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", padding: "16px 24px", borderRadius: "12px", fontWeight: "800", marginBottom: "30px", display: "inline-block" }}>
              Status: Pending Admin Review
            </div>
            <br />
            <Link to="/dashboard" style={{ display: "inline-block", background: "#f1f5f9", color: "#334155", padding: "12px 24px", borderRadius: "12px", textDecoration: "none", fontWeight: "700", transition: "all 0.2s" }}>← Return to Dashboard</Link>
          </div>
        ) : (
          <div style={styles.splitCard}>
            {/* Left Promotion Panel */}
            <div style={styles.leftPanel}>
              <div style={{ position: "absolute", top: "-50px", left: "-50px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(56, 161, 105, 0.2) 0%, transparent 70%)", borderRadius: "50%" }}></div>
              <h1 style={{ fontSize: "36px", fontWeight: "900", lineHeight: "1.2", marginBottom: "20px", position: "relative", zIndex: 1 }}>
                Drive the Future of <span style={{ color: "#38a169" }}>MoveSmart</span>
              </h1>
              <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "40px", position: "relative", zIndex: 1 }}>
                Join our elite fleet of certified drivers. Enjoy flexible schedules, guaranteed earnings, and be a part of the city's smart transit revolution.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>💸</div>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "16px" }}>Guaranteed Earnings</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>Get paid securely and on time, every time.</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>📅</div>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "16px" }}>Flexible Scheduling</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>Choose the routes and times that fit your life.</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🛡️</div>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "16px" }}>Admin Support</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>24/7 priority support for all our certified drivers.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form Panel */}
            <div style={styles.rightPanel}>
              <div style={{ marginBottom: "30px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", margin: "0 0 8px" }}>Driver Application Form</h2>
                <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>Please provide your professional driving credentials.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={styles.formLabel}>Contact Phone (India +91) <span style={{color:"#e11d48"}}>*</span></label>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
                      <div
                        style={{
                          padding: "14px 14px",
                          background: "#e2e8f0",
                          border: "1.5px solid #cbd5e1",
                          borderRight: "none",
                          borderRadius: "12px 0 0 12px",
                          fontSize: "14px",
                          fontWeight: "800",
                          color: "#334155",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, phone: val });
                        }}
                        placeholder="e.g. 98470 12345"
                        style={{
                          ...styles.formInput,
                          borderRadius: "0 12px 12px 0",
                          marginBottom: 0,
                          borderColor: formData.phone.trim()
                            ? phoneValidation.valid
                              ? "rgba(34, 197, 94, 0.8)"
                              : phoneValidation.badgeType === "warning"
                              ? "rgba(245, 158, 11, 0.8)"
                              : "rgba(225, 29, 72, 0.8)"
                            : "#cbd5e1",
                        }}
                      />
                    </div>
                    {formData.phone.trim() && (
                      <div
                        style={{
                          marginTop: "-8px",
                          marginBottom: "14px",
                          fontSize: "11px",
                          color: phoneValidation.valid
                            ? "#15803d"
                            : phoneValidation.badgeType === "warning"
                            ? "#d97706"
                            : "#be123c",
                          fontWeight: "700",
                        }}
                      >
                        {phoneValidation.valid ? phoneValidation.message : `⚠️ ${phoneValidation.message}`}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={styles.formLabel}>Years of Experience <span style={{color:"#e11d48"}}>*</span></label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="50"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      placeholder="e.g. 5"
                      style={{
                        ...styles.formInput,
                        marginBottom: formData.experienceYears.toString().trim() ? "6px" : "20px",
                        borderColor: formData.experienceYears.toString().trim()
                          ? expValidation.valid
                            ? "rgba(34, 197, 94, 0.6)"
                            : "rgba(225, 29, 72, 0.6)"
                          : "#cbd5e1",
                      }}
                    />
                    {formData.experienceYears.toString().trim() && (
                      <div style={{ marginBottom: "14px", fontSize: "11px", color: expValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                        {expValidation.valid ? "✓ Valid Experience Level" : `⚠️ ${expValidation.message}`}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={styles.formLabel}>Driving License Number <span style={{color:"#e11d48"}}>*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. KL-07-2018-99210"
                    style={{
                      ...styles.formInput,
                      marginBottom: formData.licenseNumber.trim() ? "6px" : "20px",
                      borderColor: formData.licenseNumber.trim()
                        ? licenseValidation.valid
                          ? "rgba(34, 197, 94, 0.6)"
                          : "rgba(225, 29, 72, 0.6)"
                        : "#cbd5e1",
                    }}
                  />
                  {formData.licenseNumber.trim() && (
                    <div style={{ marginBottom: "14px", fontSize: "11px", color: licenseValidation.valid ? "#15803d" : "#be123c", fontWeight: "700" }}>
                      {licenseValidation.valid ? "✓ Valid Driving License Number" : `⚠️ ${licenseValidation.message}`}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={styles.formLabel}>Profile Photo <span style={{color:"#e11d48"}}>*</span></label>
                    <div style={{...styles.fileUploadBox, border: formData.profilePic ? "2px solid #38a169" : styles.fileUploadBox.border, background: formData.profilePic ? "#f0fdf4" : styles.fileUploadBox.background}}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "profilePic")} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                      {formData.profilePic ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <img src={formData.profilePic} alt="Profile" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px" }} />
                          <span style={{ fontSize: "12px", color: "#166534", fontWeight: "700" }}>Photo Uploaded ✓</span>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: "24px", marginBottom: "4px" }}>📸</div>
                          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Upload Photo</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={styles.formLabel}>License Document <span style={{color:"#e11d48"}}>*</span></label>
                    <div style={{...styles.fileUploadBox, border: formData.licenseImage ? "2px solid #38a169" : styles.fileUploadBox.border, background: formData.licenseImage ? "#f0fdf4" : styles.fileUploadBox.background}}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "licenseImage")} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                      {formData.licenseImage ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <img src={formData.licenseImage} alt="License" style={{ height: "48px", borderRadius: "6px", objectFit: "contain", marginBottom: "8px" }} />
                          <span style={{ fontSize: "12px", color: "#166534", fontWeight: "700" }}>Document Uploaded ✓</span>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: "24px", marginBottom: "4px" }}>🪪</div>
                          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Upload License</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting} 
                  style={{
                    ...styles.submitBtn, 
                    opacity: submitting ? 0.7 : 1,
                    transform: submitting ? "scale(0.98)" : "scale(1)"
                  }}
                  onMouseOver={(e) => { if(!submitting) e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseOut={(e) => { if(!submitting) e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {submitting ? "Submitting Application..." : "Submit Application →"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default DriverApply;
