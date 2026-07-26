import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const MOCK_ROUTES = [
  { id: "C01", name: "Al Ghubaiba ➜ Gold Souq", stops: 5, distance: "8.2 km" },
  { id: "8", name: "Ibn Battuta ➜ Gold Souq", stops: 6, distance: "22.4 km" },
  { id: "F11", name: "Rowdah ➜ Financial Centre", stops: 4, distance: "6.1 km" },
  { id: "E101", name: "Al Ghubaiba ➜ Abu Dhabi Central", stops: 3, distance: "130 km" },
];

function formatTime(date) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Driver() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [activeShift, setActiveShift] = useState(null);

  useEffect(() => {
    const isDriver = user?.role?.toLowerCase() === "driver";

    if (!user || !isDriver) {
      localStorage.setItem("moveSmart_loginWarning", "Access Denied: Driver login required.");
      navigate("/login");
    }
  }, [user, navigate]);
  const [selectedRoute, setSelectedRoute] = useState(MOCK_ROUTES[0].id);
  const [tripActive, setTripActive] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripLog, setTripLog] = useState([]);
  const [passengerCount, setPassengerCount] = useState(0);
  const [showStartConfirm, setShowStartConfirm] = useState(false);

  // Simulated stats
  const todayStats = {
    tripsCompleted: tripLog.length,
    totalPassengers: tripLog.reduce((sum, t) => sum + t.passengers, 0),
    totalDistance: tripLog.reduce((sum, t) => sum + parseFloat(t.distance), 0).toFixed(1),
    hoursOnDuty: activeShift
      ? ((Date.now() - new Date(activeShift.startTime).getTime()) / 3600000).toFixed(1)
      : "0.0",
  };

  const handleStartShift = () => {
    setActiveShift({
      startTime: new Date().toISOString(),
      route: MOCK_ROUTES.find((r) => r.id === selectedRoute),
    });
  };

  const handleEndShift = () => {
    if (tripActive) {
      alert("Please end your current trip before ending your shift.");
      return;
    }
    setActiveShift(null);
    setTripLog([]);
  };

  const handleStartTrip = () => {
    setShowStartConfirm(false);
    setTripActive(true);
    setPassengerCount(0);
    setCurrentTrip({
      startTime: new Date().toISOString(),
      route: activeShift.route,
    });
  };

  const handleEndTrip = () => {
    const trip = {
      id: Date.now(),
      route: currentTrip.route.id,
      routeName: currentTrip.route.name,
      startTime: currentTrip.startTime,
      endTime: new Date().toISOString(),
      passengers: passengerCount,
      distance: currentTrip.route.distance.replace(" km", ""),
      status: "Completed",
    };
    setTripLog((prev) => [trip, ...prev]);
    setTripActive(false);
    setCurrentTrip(null);
    setPassengerCount(0);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setUser(null);
    navigate("/");
  };

  /* ─── Light-theme inline styles ─── */
  const s = {
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "14px",
      marginBottom: "28px",
    },
    statCard: {
      padding: "20px 14px",
      borderRadius: "14px",
      background: "#FFFFFF",
      border: "1px solid var(--rta-gray-border)",
      textAlign: "center",
      boxShadow: "var(--rta-shadow)",
    },
    statValue: {
      fontSize: "26px",
      fontWeight: "800",
      marginBottom: "4px",
    },
    statLabel: {
      fontSize: "11px",
      color: "#717B87",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    cardTitle: {
      fontSize: "17px",
      fontWeight: "700",
      color: "#1F2226",
      marginBottom: "4px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    cardDesc: {
      fontSize: "13px",
      color: "#717B87",
      marginBottom: "20px",
      lineHeight: "1.5",
    },
    select: {
      width: "100%",
      padding: "14px 16px",
      borderRadius: "12px",
      border: "1px solid var(--rta-gray-border)",
      background: "#FFFFFF",
      color: "#1F2226",
      fontSize: "14px",
      fontWeight: "500",
      outline: "none",
      cursor: "pointer",
      appearance: "none",
      marginBottom: "16px",
    },
    liveIndicator: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    liveActive: {
      background: "rgba(34, 197, 94, 0.12)",
      color: "#16a34a",
      border: "1px solid rgba(34, 197, 94, 0.3)",
    },
    pulseDot: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: "#16a34a",
      animation: "pulse 1.5s ease-in-out infinite",
    },
    routeInfoBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 18px",
      borderRadius: "12px",
      background: "rgba(99, 102, 241, 0.06)",
      border: "1px solid rgba(99, 102, 241, 0.12)",
      marginBottom: "16px",
    },
    tripItem: {
      padding: "14px 16px",
      borderRadius: "12px",
      background: "var(--rta-gray-light)",
      border: "1px solid var(--rta-gray-border)",
      marginBottom: "10px",
    },
    tripRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    counterBox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "20px",
      padding: "20px",
      borderRadius: "14px",
      background: "var(--rta-gray-light)",
      border: "1px solid var(--rta-gray-border)",
      marginBottom: "16px",
    },
    counterBtn: {
      width: "44px",
      height: "44px",
      borderRadius: "12px",
      border: "1px solid var(--rta-gray-border)",
      background: "#FFFFFF",
      color: "#1F2226",
      fontSize: "20px",
      fontWeight: "700",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    counterValue: {
      fontSize: "36px",
      fontWeight: "800",
      color: "#1F2226",
      minWidth: "60px",
      textAlign: "center",
    },
    emptyState: {
      textAlign: "center",
      padding: "24px",
      color: "#A1AAB3",
      fontSize: "13px",
    },
    confirmOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999,
    },
    confirmBox: {
      background: "#FFFFFF",
      border: "1px solid var(--rta-gray-border)",
      borderRadius: "18px",
      padding: "32px",
      maxWidth: "380px",
      width: "90%",
      textAlign: "center",
      color: "#1F2226",
      boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
    },
  };

  return (
    <div className="rta-body-theme">
      {/* Pulse animation keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .driver-fade { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* MoveSmart Header Navigation */}
      <nav className="rta-nav">
        <Link to="/" className="rta-logo" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <img 
            src="/logo.png" 
            alt="MoveSmart Logo" 
            style={{ 
              height: "72px", 
              width: "auto", 
              objectFit: "contain",
              filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.06))"
            }} 
          />
        </Link>

        <div className="rta-nav-menu">
          <Link to="/dashboard" className="rta-nav-link">Bus Services</Link>
          <Link to="/dashboard" className="rta-nav-link">Nol Portal</Link>
          <Link to="/dashboard" className="rta-nav-link">Schedules</Link>
          <Link to="/dashboard/card-application" className="rta-nav-link">Card Application</Link>
          <Link to="/dashboard/driver" className={`rta-nav-link ${location.pathname === "/dashboard/driver" ? "active" : ""}`}>Driver Panel</Link>
          {user ? (
            <>
              <Link
                to="/profile"
                className={`rta-nav-link ${location.pathname === "/profile" ? "active" : ""}`}
              >
                Profile ({user.name})
              </Link>
              <button onClick={handleLogout} className="rta-btn-secondary" style={{ padding: "8px 16px" }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rta-nav-link">Sign In</Link>
              <Link to="/signup" className="rta-btn-primary">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="rta-hero">
        <h1 className="rta-hero-title">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: "8px", opacity: 0.6 }}>
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="6.5" cy="14.5" r="1.5" />
            <circle cx="17.5" cy="14.5" r="1.5" />
            <path d="M6 6V4M18 6V4" />
          </svg>
          Driver <span>Panel</span>
        </h1>
        <p className="rta-hero-subtitle">Manage your shift, track trips, and log passengers.</p>
      </header>

      {/* Main Content */}
      <main className="rta-section" style={{ marginTop: "0" }}>
        <div className="rta-planner-card" style={{ maxWidth: "780px" }}>
          {/* Today's Stats */}
          <div style={s.statsGrid} className="driver-fade">
            {[
              { value: todayStats.tripsCompleted, label: "Trips", color: "#6366f1" },
              { value: todayStats.totalPassengers, label: "Passengers", color: "#16a34a" },
              { value: `${todayStats.totalDistance}`, label: "Km Covered", color: "#d97706" },
              { value: todayStats.hoursOnDuty, label: "Hours", color: "#db2777" },
            ].map((stat, idx) => (
              <div key={idx} style={s.statCard}>
                <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Shift Management */}
          {!activeShift ? (
            <div style={{
              background: "var(--rta-gray-light)",
              border: "1px solid var(--rta-gray-border)",
              borderRadius: "16px",
              padding: "28px",
              marginBottom: "20px",
            }} className="driver-fade">
              <div style={s.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Start Your Shift
              </div>
              <p style={s.cardDesc}>
                Select your assigned route and start your shift to begin logging trips.
              </p>

              <label style={{ fontSize: "12px", color: "#717B87", fontWeight: "600", marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Assigned Route
              </label>
              <select
                style={s.select}
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                {MOCK_ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    Route {r.id} — {r.name} ({r.distance})
                  </option>
                ))}
              </select>

              <button
                className="rta-btn-primary"
                style={{ width: "100%", padding: "15px", borderRadius: "12px", fontSize: "14px" }}
                onClick={handleStartShift}
              >
                Start Shift
              </button>
            </div>
          ) : (
            <>
              {/* Active Shift Info */}
              <div style={{
                background: "var(--rta-gray-light)",
                border: "1px solid var(--rta-gray-border)",
                borderRadius: "16px",
                padding: "28px",
                marginBottom: "20px",
              }} className="driver-fade">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={s.cardTitle}>
                    <span style={{ ...s.liveIndicator, ...s.liveActive }}>
                      <span style={s.pulseDot}></span>
                      On Duty
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#717B87" }}>
                    Since {formatTime(activeShift.startTime)}
                  </div>
                </div>

                {/* Route Info */}
                <div style={s.routeInfoBar}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#717B87", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                      Route {activeShift.route.id}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1F2226" }}>
                      {activeShift.route.name}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#6366f1" }}>
                      {activeShift.route.distance}
                    </div>
                    <div style={{ fontSize: "11px", color: "#717B87" }}>
                      {activeShift.route.stops} stops
                    </div>
                  </div>
                </div>

                {/* Trip Controls */}
                {!tripActive ? (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="rta-btn-primary"
                      style={{ flex: 2, padding: "15px", borderRadius: "12px", fontSize: "14px" }}
                      onClick={() => setShowStartConfirm(true)}
                    >
                      Start Trip
                    </button>
                    <button
                      className="rta-btn-secondary"
                      style={{ flex: 1, padding: "15px", borderRadius: "12px", fontSize: "14px" }}
                      onClick={handleEndShift}
                    >
                      End Shift
                    </button>
                  </div>
                ) : (
                  <div className="driver-fade">
                    {/* Passenger Counter */}
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#717B87", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", textAlign: "center" }}>
                        Passenger Count
                      </div>
                      <div style={s.counterBox}>
                        <button
                          style={s.counterBtn}
                          onClick={() => setPassengerCount(Math.max(0, passengerCount - 1))}
                        >
                          −
                        </button>
                        <div style={s.counterValue}>{passengerCount}</div>
                        <button
                          style={s.counterBtn}
                          onClick={() => setPassengerCount(passengerCount + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
                      <span style={{ ...s.liveIndicator, ...s.liveActive }}>
                        <span style={s.pulseDot}></span>
                        Trip in Progress
                      </span>
                      <span style={{ fontSize: "12px", color: "#717B87" }}>
                        Started at {formatTime(currentTrip.startTime)}
                      </span>
                    </div>

                    <button
                      className="rta-btn-primary"
                      style={{
                        width: "100%",
                        padding: "15px",
                        borderRadius: "12px",
                        fontSize: "14px",
                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      }}
                      onClick={handleEndTrip}
                    >
                      End Trip
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Trip Log */}
          <div style={{
            background: "var(--rta-gray-light)",
            border: "1px solid var(--rta-gray-border)",
            borderRadius: "16px",
            padding: "28px",
          }} className="driver-fade">
            <div style={s.cardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#717B87" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Today's Trip Log
            </div>
            <p style={{ ...s.cardDesc, marginBottom: "16px" }}>
              {tripLog.length === 0
                ? "No trips recorded yet today."
                : `${tripLog.length} trip${tripLog.length > 1 ? "s" : ""} completed.`}
            </p>

            {tripLog.length === 0 ? (
              <div style={s.emptyState}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: "10px" }}>
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="6.5" cy="14.5" r="1.5" />
                  <circle cx="17.5" cy="14.5" r="1.5" />
                </svg>
                <div>Start a shift and complete a trip to see it here.</div>
              </div>
            ) : (
              <div>
                {tripLog.map((trip) => (
                  <div key={trip.id} style={s.tripItem}>
                    <div style={s.tripRow}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1F2226" }}>
                          Route {trip.route}
                        </div>
                        <div style={{ fontSize: "12px", color: "#717B87", marginTop: "2px" }}>
                          {trip.routeName}
                        </div>
                      </div>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "700",
                        background: "rgba(34, 197, 94, 0.1)",
                        color: "#16a34a",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                      }}>
                        Completed
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12px", color: "#717B87" }}>
                      <span>🕐 {formatTime(trip.startTime)} – {formatTime(trip.endTime)}</span>
                      <span>👥 {trip.passengers}</span>
                      <span>📏 {trip.distance} km</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Start Trip Confirmation Modal */}
      {showStartConfirm && (
        <div style={s.confirmOverlay} onClick={() => setShowStartConfirm(false)}>
          <div style={s.confirmBox} onClick={(e) => e.stopPropagation()}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: "14px" }}>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="6.5" cy="14.5" r="1.5" />
              <circle cx="17.5" cy="14.5" r="1.5" />
              <path d="M6 6V4M18 6V4" />
            </svg>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px", color: "#1F2226" }}>Start a New Trip?</h3>
            <p style={{ fontSize: "13px", color: "#717B87", marginBottom: "24px", lineHeight: "1.5" }}>
              Route <strong>{activeShift.route.id}</strong> — {activeShift.route.name}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="rta-btn-secondary"
                style={{ flex: 1, padding: "12px", borderRadius: "12px" }}
                onClick={() => setShowStartConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="rta-btn-primary"
                style={{ flex: 1, padding: "12px", borderRadius: "12px" }}
                onClick={handleStartTrip}
              >
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "40px 5%", borderTop: "3px solid var(--primary)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "30px" }}>
          <div>
            <div className="rta-logo" style={{ color: "#FFFFFF", marginBottom: "15px" }}>
              <div className="brand-icon" style={{ display: "inline-flex", background: "var(--primary)", color: "#fff", padding: "6px", borderRadius: "8px", marginRight: "4px" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
                  <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
                  <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span style={{ color: "#fff" }}>MoveSmart</span>
            </div>
            <p style={{ fontSize: "13px", maxWidth: "320px", lineHeight: "1.6", color: "#b7aed6" }}>
              Smart Urban Transit &amp; Logistics portal companion. Optimized route scheduling, Nol wallet tracking, and carbon-footprint reduction diagnostics.
            </p>
          </div>
          <div style={{ display: "flex", gap: "40px" }}>
            <div>
              <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Transit Services</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><Link to="/dashboard" style={{ color: "#b7aed6", textDecoration: "none" }}>Dubai Bus Routes</Link></li>
                <li><Link to="/dashboard" style={{ color: "#b7aed6", textDecoration: "none" }}>Nol Card System</Link></li>
                <li><Link to="/dashboard" style={{ color: "#b7aed6", textDecoration: "none" }}>Intercity Coaches</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Support</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><Link to="/dashboard" style={{ color: "#b7aed6", textDecoration: "none" }}>Chat with Mahboub</Link></li>
                <li><span style={{ color: "#b7aed6" }}>Call Center 800 9090</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "30px", paddingTop: "20px", textAlign: "center", fontSize: "12px", color: "#717B87" }}>
          © {new Date().getFullYear()} MoveSmart. Every trip counted. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
