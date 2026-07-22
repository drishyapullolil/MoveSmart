import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
    if (/\s/.test(val)) return "Password cannot contain spaces";
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
      setAlertInfo({
        message: `OTP sent to ${email.trim()}. Please check your inbox.`,
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

  return (
    <div className="auth-page-wrapper">
      {/* Hides the browser's own built-in reveal/clear icon (Edge, some Chrome
          versions) so it doesn't sit on top of our custom eye button */}
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
        input::-webkit-credentials-auto-fill-button,
        input::-webkit-strong-password-auto-fill-button {
          visibility: hidden;
          pointer-events: none;
          position: absolute;
          right: 0;
        }
      `}</style>

      <div className="container">
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
              <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
              <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h2>Create Account</h2>
          <p className="brand-subtitle">Join MoveSmart Transit Platform</p>
        </div>

        {/* Inline Alerts */}
        {alertInfo.message && (
          <div className={`alert alert-${alertInfo.type}`} role="status">
            {alertInfo.type === "error" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
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
                  <line x1="12" y1="8" x2="12" y2="12" />
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
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {emailError}
              </div>
            )}
          </div>

          {/* OTP input */}
          {otpSent && (
            <div className="form-group">
              <label className="form-label" htmlFor="signup-otp">Email Verification Code</label>
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
                  disabled={loading}
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? "otp-error" : undefined}
                  required
                />
              </div>
              {otpError && (
                <div className="error-msg" id="otp-error">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
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
                  <line x1="12" y1="8" x2="12" y2="12" />
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

        <p className="nav-link">
          Already registered?
          <span onClick={() => !loading && navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Signup;