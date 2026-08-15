import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem("moveSmart_loginWarning");
    window.location.reload();
  };

  handleClearSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "24px", fontFamily: "sans-serif" }}>
          <div style={{ maxWidth: "600px", width: "100%", background: "#ffffff", borderRadius: "20px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)", border: "1px solid #fee2e2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                ⚠️
              </div>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#991b1b", margin: 0 }}>Portal View Notice</h2>
                <span style={{ fontSize: "12px", color: "#64748b" }}>An interface component encountered a recovery state</span>
              </div>
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "14px", color: "#b91c1c", fontSize: "13.5px", fontFamily: "monospace", marginBottom: "20px", wordBreak: "break-word" }}>
              {this.state.error?.toString() || "Unknown rendering exception"}
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{ flex: 1, padding: "12px 20px", borderRadius: "12px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", border: "none", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
              >
                🔄 Refresh Page
              </button>
              <button
                type="button"
                onClick={this.handleClearSession}
                style={{ flex: 1, padding: "12px 20px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
              >
                🔑 Re-Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
