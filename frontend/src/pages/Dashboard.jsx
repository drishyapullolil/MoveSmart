import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  // Authentication states initialized directly from session
  const [user] = useState(() => {
    const sessionUser = localStorage.getItem("user");
    return sessionUser ? JSON.parse(sessionUser) : null;
  });
  const [unauthorized] = useState(() => {
    return !localStorage.getItem("user");
  });
  const [countdown, setCountdown] = useState(3);

  // Dashboard interactive states
  const [balance, setBalance] = useState(48.50);
  const [showFundAlert, setShowFundAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Countdown timer for redirection if unauthorized
  useEffect(() => {
    if (!unauthorized) return;

    if (countdown <= 0) {
      // Save info message in localStorage so login page can display it
      localStorage.setItem("moveSmart_loginWarning", "Access Denied. Please authenticate to view your dashboard.");
      navigate("/login");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [unauthorized, countdown, navigate]);

  // Logout action
  const handleLogout = () => {
    localStorage.removeItem("user");
    // Set success toast message in localStorage
    localStorage.setItem("moveSmart_loginSuccess", "You have logged out successfully.");
    navigate("/login");
  };

  // Add Funds simulated action
  const handleAddFunds = () => {
    setBalance((prev) => prev + 10.00);
    setShowFundAlert(true);
    setTimeout(() => {
      setShowFundAlert(false);
    }, 3000);
  };

  // Render unauthorized guard screen
  if (unauthorized) {
    return (
      <div className="auth-page-wrapper">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="alert alert-error" style={{ justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Access Denied</h3>
          </div>
          <p style={{ color: "var(--text-main)", fontSize: "15px", marginTop: "15px", lineHeight: "1.5" }}>
            You must be signed in to view your dashboard.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "10px" }}>
            Redirecting to Login Page in <strong>{countdown}</strong> seconds...
          </p>
          <button 
            className="btn-primary" 
            onClick={() => navigate("/login")}
            style={{ marginTop: "24px" }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Render loading state if user session exists but state is not set yet
  if (!user) {
    return (
      <div className="auth-page-wrapper">
        <div className="spinner" style={{ width: "30px", height: "30px", borderTopColor: "var(--primary)" }}></div>
      </div>
    );
  }

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="dashboard-layout">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
              <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
              <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
            </svg>
            MoveSmart
          </div>
          
          <nav className="sidebar-menu">
            <a 
              href="#dashboard" 
              className={`sidebar-menu-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Overview
            </a>
            
            <a 
              href="#tickets" 
              className={`sidebar-menu-item ${activeTab === "tickets" ? "active" : ""}`}
              onClick={() => setActiveTab("tickets")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              My Smart Cards
            </a>

            <a 
              href="#routes" 
              className={`sidebar-menu-item ${activeTab === "routes" ? "active" : ""}`}
              onClick={() => setActiveTab("routes")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Transit Tracker
            </a>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Overview</h1>
            <p>Welcome back, {user.name}! Let's optimize your commute today. 🚍</p>
          </div>
          
          <div className="user-profile-badge">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-name">{user.name}</div>
          </div>
        </header>

        {/* Live dynamic notifications inside dashboard */}
        {showFundAlert && (
          <div className="alert alert-success" style={{ marginBottom: "25px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Successfully added $10.00 to your Transit wallet balance!</span>
          </div>
        )}

        {/* Stats Grid Widget */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <h3>Smart Wallet Balance</h3>
              <div className="stat-value">${balance.toFixed(2)}</div>
              <button className="stat-action-btn" onClick={handleAddFunds}>
                + Add $10.00 Funds
              </button>
            </div>
            <div className="stat-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>Monthly Eco-Trips</h3>
              <div className="stat-value">28 Rides</div>
              <div className="stat-desc" style={{ color: "var(--success)" }}>
                🌱 Saved 42kg CO₂ emissions
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(5, 150, 105, 0.1)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>Active Route Status</h3>
              <div className="stat-value" style={{ fontSize: "18px", marginTop: "14px" }}>Line 42 (North Bus)</div>
              <div className="stat-desc" style={{ color: "#d97706", fontWeight: "600", marginTop: "6px" }}>
                ⚠️ Minor delay (3 min)
              </div>
            </div>
            <div className="stat-icon-wrapper" style={{ color: "#d97706", background: "rgba(217, 119, 6, 0.1)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
                <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
                <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
          </div>
        </section>

        {/* Bookings / Transaction list card */}
        <section className="bookings-card">
          <div className="card-header">
            <h3>Recent Ride History</h3>
            <span style={{ fontSize: "13px", color: "var(--primary)", fontWeight: "600", cursor: "pointer" }}>
              View All History &rarr;
            </span>
          </div>

          <div className="table-wrapper">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Line ID</th>
                  <th>Fare paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Today, 08:14 AM</td>
                  <td>Zone B (North Heights)</td>
                  <td>Zone A (Downtown Terminal)</td>
                  <td>Line 42 (Bus)</td>
                  <td>$4.00</td>
                  <td>
                    <span className="status-badge active">In Progress</span>
                  </td>
                </tr>
                <tr>
                  <td>Yesterday, 06:30 PM</td>
                  <td>Zone C (West Tech Plaza)</td>
                  <td>Zone B (North Heights)</td>
                  <td>Line 10 (Shuttle)</td>
                  <td>$4.00</td>
                  <td>
                    <span className="status-badge completed">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td>10 July, 09:05 AM</td>
                  <td>Zone A (Downtown Terminal)</td>
                  <td>Zone C (West Tech Plaza)</td>
                  <td>Line 10 (Shuttle)</td>
                  <td>$5.50</td>
                  <td>
                    <span className="status-badge completed">Completed</span>
                  </td>
                </tr>
                <tr>
                  <td>08 July, 04:22 PM</td>
                  <td>Zone B (North Heights)</td>
                  <td>Zone D (East Harbor District)</td>
                  <td>Line 42 (Bus)</td>
                  <td>$5.50</td>
                  <td>
                    <span className="status-badge completed">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
