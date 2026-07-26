import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithGoogleFirebase, checkFirebaseRedirectResult } from "../firebase";
function Login() {
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("moveSmart_rememberedEmail") || "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem("moveSmart_rememberedEmail");
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

      const hasSession = !!localStorage.getItem("user") || !!localStorage.getItem("authToken");
      if (hasSession) {
        const savedUser = localStorage.getItem("user");
        const parsedUser = savedUser ? JSON.parse(savedUser) : null;
        const role = parsedUser?.role?.toLowerCase();
        const targetPath = role === "admin" ? "/admin" : role === "driver" ? "/dashboard/driver" : "/dashboard";
        navigate(targetPath);
      }
    };
    checkRedirect();
  }, [navigate]);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotModalSuccess, setForgotModalSuccess] = useState(false);

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

  // ===== Field handlers (validate on every keystroke) =====

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

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("moveSmart_rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("moveSmart_rememberedEmail");
      }

      // Save user info
      const loggedInUser = response.data.user;
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      localStorage.setItem("authToken", response.data.token || response.data.accessToken || "authenticated");

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

  const handleForgotEmailChange = (e) => {
    const val = e.target.value;
    setForgotEmail(val);
    setForgotEmailError(validateEmailFormat(val));
  };

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    const err = validateEmailFormat(forgotEmail);
    if (err) {
      setForgotEmailError(err);
      return;
    }
    setForgotEmailError("");

    // Simulate sending email
    setForgotModalSuccess(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotEmail("");
      setForgotEmailError("");
      setForgotModalSuccess(false);
      setAlertInfo({
        message: "Password reset link sent to your email!",
        type: "success",
      });
    }, 2000);
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
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      localStorage.setItem("authToken", "google_firebase_authenticated_token");

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
          <img src="/logo.png" alt="MoveSmart Logo" style={{ height: "64px", width: "auto", objectFit: "contain", marginBottom: "8px" }} />
          <p className="brand-subtitle">Smart Travel • Safe Journeys</p>
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
              onClick={() => setShowForgotModal(true)}
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
        <div className="modal-overlay" onClick={() => !forgotModalSuccess && setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Reset Password</h3>
            <p className="modal-desc">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            {forgotModalSuccess ? (
              <div className="alert alert-success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Reset email sent successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={handleForgotEmailChange}
                    placeholder="name@example.com"
                    className={forgotEmailError ? "error-state" : ""}
                    aria-invalid={!!forgotEmailError}
                    required
                  />
                  {forgotEmailError && (
                    <div className="error-msg">{forgotEmailError}</div>
                  )}
                </div>
                <div className="modal-buttons">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Send Link
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