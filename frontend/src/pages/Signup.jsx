import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithGoogleFirebase, checkFirebaseRedirectResult } from "../firebase";
import { setStoredUser, setStoredToken } from "../utils/session";

function Signup() {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // UI status states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ message: "", type: "" }); // success | error
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // ===== Validators =====

  const validateName = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return "Full name is required";
    if (trimmed.length < 2) return "Name must be at least 2 characters";
    if (trimmed.length > 50) return "Name must be under 50 characters";
    if (!/^[A-Za-z\s'-]+$/.test(trimmed)) {
      return "Name can only contain letters, spaces, hyphens and apostrophes";
    }
    return "";
  };

  const validateEmailFormat = (val) => {
    const trimmed = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!trimmed) return "Email is required";
    if (/\s/.test(val)) return "Email cannot contain spaces";
    if (!emailRegex.test(trimmed)) return "Please enter a valid email address";
    if (/\.\.@|@\.|\.@/.test(trimmed)) return "Please enter a valid email address";
    return "";
  };

  const validatePasswordFormat = (val) => {
    if (!val) return "Password is required";
    if (val.length < 6) return "Password must be at least 6 characters";
    if (val.length > 72) return "Password is too long";
    return "";
  };

  // Calculate password strength (separate from validity — password can be
  // valid at 6 chars but still "weak")
  const checkPasswordStrength = (val) => {
    if (!val) return { label: "", score: 0, className: "" };

    let score = 0;
    if (val.length >= 6) score += 1;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    if (score <= 2) {
      return { label: "Weak password", score, className: "weak" };
    } else if (score <= 4) {
      return { label: "Medium strength", score, className: "medium" };
    } else {
      return { label: "Strong password! Secure.", score, className: "strong" };
    }
  };

  const strength = checkPasswordStrength(password);

  // ===== Field handlers (validate on every keystroke) =====

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setNameError(validateName(val));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailError(validateEmailFormat(val));
    if (otpSent) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp("");
      setOtpError("");
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordError(validatePasswordFormat(val));
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    setOtpError("");
  };

  const handleSendOtp = async () => {
    setAlertInfo({ message: "", type: "" });

    const nameValErr = validateName(name);
    const emailValErr = validateEmailFormat(email);
    const passValErr = validatePasswordFormat(password);

    setNameError(nameValErr);
    setEmailError(emailValErr);
    setPasswordError(passValErr);

    if (nameValErr || emailValErr || passValErr) {
      return;
    }

    setLoading(true);

    try {
      await axios.post("/api/auth/send-otp", { email: email.trim() });
      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      setOtpError("");
      setResendTimer(60);
      setAlertInfo({
        message: `Verification code sent to ${email.trim()}. Please check your inbox or spam folder.`,
        type: "success",
      });
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to send OTP. Please try again.";
      const detailedMessage = errMsg.includes("SMTP")
        ? "Email delivery is not configured. Set a valid SMTP app password in the backend environment and restart the server."
        : errMsg;
      setAlertInfo({ message: detailedMessage, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    setAlertInfo({ message: "", type: "" });

    const nameValErr = validateName(name);
    const emailValErr = validateEmailFormat(email);
    const passValErr = validatePasswordFormat(password);

    setNameError(nameValErr);
    setEmailError(emailValErr);
    setPasswordError(passValErr);

    if (nameValErr || emailValErr || passValErr) {
      return;
    }

    if (!otpSent) {
      handleSendOtp();
      return;
    }

    if (!otpVerified) {
      if (!otp.trim()) {
        setOtpError("Please enter the OTP sent to your email");
        return;
      }

      setLoading(true);
      try {
        await axios.post("/api/auth/verify-otp", {
          email: email.trim(),
          otp: otp.trim(),
        });
        setOtpVerified(true);
        setAlertInfo({ message: "Email verified successfully. Creating your account...", type: "success" });
      } catch (error) {
        const errMsg = error.response?.data?.message || "Invalid OTP. Please try again.";
        setOtpError(errMsg);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "/api/auth/signup",
        { name: name.trim(), email: email.trim(), password }
      );

      setAlertInfo({
        message: response.data.message || "Account created successfully!",
        type: "success",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error(error);
      const errMsg =
        error.response?.data?.message || "Registration failed. Please try again.";
      setAlertInfo({
        message: errMsg,
        type: "error",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkRedirect = async () => {
      const redirectRes = await checkFirebaseRedirectResult();
      if (redirectRes.success && redirectRes.user) {
        await processGoogleUser(redirectRes.user);
      }
    };
    checkRedirect();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAlertInfo({ message: "", type: "" });

    try {
      const firebaseRes = await signInWithGoogleFirebase();

      if (firebaseRes.redirecting) {
        setAlertInfo({
          message: "Redirecting to Google Sign-In...",
          type: "success",
        });
        return;
      }

      if (firebaseRes.success && firebaseRes.user) {
        await processGoogleUser(firebaseRes.user);
        return;
      }

      setAlertInfo({
        message: firebaseRes.error || "Google Sign-In failed",
        type: "error",
      });
      setLoading(false);
    } catch (err) {
      console.error("Google Auth error:", err);
      setAlertInfo({
        message: err.message || "Google Sign-In failed",
        type: "error",
      });
      setLoading(false);
    }
  };

  const processGoogleUser = async (googleUser) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/google-login", googleUser);

      setAlertInfo({
        message: response.data.message || "Google Sign-In successful!",
        type: "success",
      });

      const loggedInUser = response.data.user;
      const authToken = response.data.token || "google_firebase_authenticated_token";
      setStoredUser(loggedInUser, true);
      setStoredToken(authToken, true);

      setTimeout(() => {
        const role = loggedInUser?.role?.toLowerCase();
        const targetPath = role === "admin" ? "/admin" : role === "driver" ? "/dashboard/driver" : "/dashboard";
        navigate(targetPath);
      }, 1000);
    } catch (error) {
      setAlertInfo({
        message: error.response?.data?.message || "Google Sign-In failed",
        type: "error",
      });
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      <div className="container">
        {/* Brand Header */}
        <div className="brand-header" style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <img src="/logo.png" alt="MoveSmart Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: "26px", fontWeight: "800", background: "linear-gradient(135deg, #38a169, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MoveSmart
            </span>
          </div>
          <h2 style={{ margin: "4px 0 0" }}>Create Account</h2>
          <p className="brand-subtitle">Join MoveSmart Transit Platform</p>
        </div>

        {/* Inline Alerts */}
        {alertInfo.message && (
          <div className={`alert alert-${alertInfo.type}`} role="status">
            {alertInfo.type === "error" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            <span>{alertInfo.message}</span>
          </div>
        )}

        <form onSubmit={handleSignup} noValidate>
          {/* Name input */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="signup-name"
                type="text"
                name="name"
                value={name}
                placeholder="John Doe"
                autoComplete="name"
                onChange={handleNameChange}
                className={nameError ? "error-state" : ""}
                disabled={loading}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
                required
              />
            </div>
            {nameError && (
              <div className="error-msg" id="name-error">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {nameError}
              </div>
            )}
          </div>

          {/* Email input */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={email}
                placeholder="name@example.com"
                autoComplete="email"
                onChange={handleEmailChange}
                className={emailError ? "error-state" : ""}
                disabled={loading}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                required
              />
            </div>
            {emailError && (
              <div className="error-msg" id="email-error">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {emailError}
              </div>
            )}
          </div>

          {/* OTP input */}
          {otpSent && (
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" htmlFor="signup-otp" style={{ margin: 0 }}>Email Verification Code</label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || resendTimer > 0 || otpVerified}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendTimer > 0 || otpVerified ? "#94a3b8" : "#2563eb",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: resendTimer > 0 || otpVerified ? "default" : "pointer",
                    padding: 0,
                    textDecoration: "underline"
                  }}
                >
                  {otpVerified ? "Verified ✅" : resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                </button>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M7 9h10" />
                    <path d="M7 13h6" />
                  </svg>
                </span>
                <input
                  id="signup-otp"
                  type="text"
                  name="otp"
                  value={otp}
                  placeholder="Enter 6-digit code"
                  onChange={handleOtpChange}
                  className={otpError ? "error-state" : ""}
                  disabled={loading || otpVerified}
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? "otp-error" : undefined}
                  required
                />
              </div>
              {otpError && (
                <div className="error-msg" id="otp-error">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {otpError}
                </div>
              )}
            </div>
          )}

          {/* Password input */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                onChange={handlePasswordChange}
                className={passwordError ? "error-state" : ""}
                disabled={loading}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
                style={{ paddingRight: "44px" }}
                required
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                }}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <div className="error-msg" id="password-error">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {passwordError}
              </div>
            )}

            {/* Password strength indicators */}
            {password && !passwordError && (
              <div className="password-strength-container">
                <div className="strength-bar-wrapper">
                  <div className={`strength-bar ${strength.score >= 1 ? strength.className : ""}`} />
                  <div className={`strength-bar ${strength.score >= 3 ? strength.className : ""}`} />
                  <div className={`strength-bar ${strength.score >= 5 ? strength.className : ""}`} />
                </div>
                <span className={`strength-label ${strength.className}`}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button type="submit" style={{ marginTop: "24px" }} disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Creating Account...</span>
              </>
            ) : otpSent && !otpVerified ? (
              <span>Verify OTP</span>
            ) : otpVerified ? (
              <span>Create Account</span>
            ) : (
              <span>Send OTP</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "20px 0 16px", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-color, #e2e8f0)" }}></div>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-color, #e2e8f0)" }}></div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#1e293b",
            fontWeight: "700",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
          </svg>
          Sign Up with Google
        </button>

        <p className="nav-link">
          Already registered?
          <span onClick={() => !loading && navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Signup;