import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithGoogleFirebase, checkFirebaseRedirectResult } from "../firebase";
import { getStoredUser, getStoredToken, setStoredUser, setStoredToken } from "../utils/session";
function Login() {
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("moveSmart_rememberedEmail") || "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("moveSmart_rememberMe") !== "false";
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState(() => {
    const warning = localStorage.getItem("moveSmart_loginWarning");
    if (warning) {
      localStorage.removeItem("moveSmart_loginWarning");
      return { message: warning, type: "error" };
    }
    const success = localStorage.getItem("moveSmart_loginSuccess");
    if (success) {
      localStorage.removeItem("moveSmart_loginSuccess");
      return { message: success, type: "success" };
    }
    return { message: "", type: "" };
  });
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const checkRedirect = async () => {
      const redirectRes = await checkFirebaseRedirectResult();
      if (redirectRes.success && redirectRes.user) {
        await processGoogleUser(redirectRes.user);
        return;
      }

      const savedUser = getStoredUser();
      const savedToken = getStoredToken();
      if (savedUser || savedToken) {
        const role = savedUser?.role?.toLowerCase();
        const targetPath = role === "admin" ? "/admin" : role === "driver" ? "/dashboard/driver" : "/dashboard";
        navigate(targetPath);
      }
    };
    checkRedirect();
  }, [navigate]);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email/Send OTP, 2: Enter OTP & New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotOtpError, setForgotOtpError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotAlert, setForgotAlert] = useState({ message: "", type: "" });

  // ===== Validators =====

  const validateEmailFormat = (val) => {
    const trimmed = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!trimmed) return "Email address is required";
    if (/\s/.test(val)) return "Email cannot contain spaces";
    if (!emailRegex.test(trimmed)) return "Please enter a valid email address";
    return "";
  };

  const validatePasswordFormat = (val) => {
    if (!val.trim()) return "Password is required";
    return "";
  };

  // ===== Field handlers =====

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailError(validateEmailFormat(val));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordError(validatePasswordFormat(val));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Clear alerts
    setAlertInfo({ message: "", type: "" });

    const emailValErr = validateEmailFormat(email);
    const passValErr = validatePasswordFormat(password);

    setEmailError(emailValErr);
    setPasswordError(passValErr);

    if (emailValErr || passValErr) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "/api/auth/login",
        { email: email.trim(), password }
      );

      // Success feedback
      setAlertInfo({
        message: response.data.message || "Login successful!",
        type: "success",
      });

      const loggedInUser = response.data.user;
      const authToken = response.data.token || response.data.accessToken || "authenticated";

      if (rememberMe) {
        localStorage.setItem("moveSmart_rememberedEmail", email.trim());
        localStorage.setItem("moveSmart_rememberMe", "true");
      } else {
        localStorage.removeItem("moveSmart_rememberedEmail");
        localStorage.setItem("moveSmart_rememberMe", "false");
      }
      setStoredUser(loggedInUser, rememberMe);
      setStoredToken(authToken, rememberMe);

      // Navigate to the correct dashboard after short delay for animation
      setTimeout(() => {
        const role = loggedInUser?.role?.toLowerCase();
        const targetPath = role === "admin" ? "/admin" : role === "driver" ? "/dashboard/driver" : "/dashboard";
        navigate(targetPath);
      }, 1000);
    } catch (error) {
      console.error(error);
      const errMsg =
        error.response?.data?.message || "Something went wrong. Please try again.";
      setAlertInfo({
        message: errMsg,
        type: "error",
      });
      setLoading(false);
    }
  };

  // ===== Forgot Password Handlers =====

  const openForgotModal = () => {
    setShowForgotModal(true);
    setForgotStep(1);
    setForgotEmail(email || "");
    setForgotEmailError("");
    setForgotOtp("");
    setForgotOtpError("");
    setNewPassword("");
    setNewPasswordError("");
    setConfirmPassword("");
    setConfirmPasswordError("");
    setForgotAlert({ message: "", type: "" });
  };

  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    const err = validateEmailFormat(forgotEmail);
    if (err) {
      setForgotEmailError(err);
      return;
    }
    setForgotEmailError("");
    setForgotLoading(true);
    setForgotAlert({ message: "", type: "" });

    try {
      const response = await axios.post("/api/auth/forgot-password", {
        email: forgotEmail.trim(),
      });
      setForgotAlert({
        message: response.data.message || "OTP code sent to your email!",
        type: "success",
      });
      setForgotStep(2);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send reset code. Please try again.";
      setForgotAlert({ message: msg, type: "error" });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotAlert({ message: "", type: "" });
    setForgotOtpError("");
    setNewPasswordError("");
    setConfirmPasswordError("");

    let hasErr = false;

    if (!forgotOtp.trim()) {
      setForgotOtpError("OTP code is required");
      hasErr = true;
    }
    if (!newPassword) {
      setNewPasswordError("New password is required");
      hasErr = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError("Password must be at least 6 characters");
      hasErr = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      hasErr = true;
    }

    if (hasErr) return;

    setForgotLoading(true);
    try {
      const response = await axios.post("/api/auth/reset-password", {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: newPassword,
      });

      setForgotAlert({
        message: response.data.message || "Password reset successful!",
        type: "success",
      });

      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotEmail("");
        setForgotOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setForgotAlert({ message: "", type: "" });
        setAlertInfo({
          message: "Password reset successful! You can now log in with your new password.",
          type: "success",
        });
      }, 1500);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password. Please verify your OTP.";
      setForgotAlert({ message: msg, type: "error" });
    } finally {
      setForgotLoading(false);
    }
  };

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
      {/* Hides the browser's own built-in reveal/clear icon */}
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
        <div className="brand-header" style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <img src="/logo.png" alt="MoveSmart Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: "26px", fontWeight: "800", background: "linear-gradient(135deg, #38a169, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MoveSmart
            </span>
          </div>
          <p className="brand-subtitle" style={{ margin: 0 }}>Smart Travel • Safe Journeys</p>
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

        <form onSubmit={handleLogin} noValidate>
          {/* Email field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="login-email"
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

          {/* Password field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                placeholder="Enter password"
                autoComplete="current-password"
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
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="forgot-password"
              onClick={openForgotModal}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
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
          Continue with Google
        </button>

        <p className="nav-link">
          New to MoveSmart?
          <span onClick={() => !loading && navigate("/signup")}>Create account</span>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => !forgotLoading && setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px", width: "90%" }}>
            <h3 className="modal-title">
              {forgotStep === 1 ? "Reset Password" : "Set New Password"}
            </h3>
            <p className="modal-desc" style={{ marginBottom: "16px", color: "#64748b", fontSize: "14px" }}>
              {forgotStep === 1
                ? "Enter your email address to receive a 6-digit OTP code to reset your password."
                : `Enter the 6-digit OTP sent to ${forgotEmail} along with your new password.`}
            </p>

            {forgotAlert.message && (
              <div className={`alert alert-${forgotAlert.type}`} role="status" style={{ marginBottom: "16px" }}>
                {forgotAlert.type === "error" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                <span>{forgotAlert.message}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleSendForgotOtp} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setForgotEmailError(validateEmailFormat(e.target.value));
                    }}
                    placeholder="name@example.com"
                    className={forgotEmailError ? "error-state" : ""}
                    disabled={forgotLoading}
                    required
                  />
                  {forgotEmailError && (
                    <div className="error-msg">{forgotEmailError}</div>
                  )}
                </div>
                <div className="modal-buttons" style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={forgotLoading}
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #38a169, #8b5cf6)", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                  >
                    {forgotLoading ? "Sending OTP..." : "Send Reset OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} noValidate>
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" htmlFor="forgot-otp">6-Digit OTP Code</label>
                  <input
                    id="forgot-otp"
                    type="text"
                    maxLength="6"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    className={forgotOtpError ? "error-state" : ""}
                    style={{ letterSpacing: "4px", fontSize: "18px", fontWeight: "700", textAlign: "center" }}
                    disabled={forgotLoading}
                    required
                  />
                  {forgotOtpError && <div className="error-msg">{forgotOtpError}</div>}
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" htmlFor="new-password">New Password</label>
                  <div className="input-wrapper" style={{ position: "relative" }}>
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter at least 6 characters"
                      className={newPasswordError ? "error-state" : ""}
                      disabled={forgotLoading}
                      style={{ paddingRight: "54px" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b",
                        fontWeight: "600",
                        fontSize: "12px"
                      }}
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {newPasswordError && <div className="error-msg">{newPasswordError}</div>}
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                  <input
                    id="confirm-password"
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={confirmPasswordError ? "error-state" : ""}
                    disabled={forgotLoading}
                    required
                  />
                  {confirmPasswordError && <div className="error-msg">{confirmPasswordError}</div>}
                </div>

                <div className="modal-buttons" style={{ display: "flex", gap: "10px", justifyContent: "space-between", marginTop: "20px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setForgotStep(1)}
                    disabled={forgotLoading}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={forgotLoading}
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #38a169, #8b5cf6)", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                  >
                    {forgotLoading ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;