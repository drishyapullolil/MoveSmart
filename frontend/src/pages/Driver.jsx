import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Driver() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. User / Driver Authentication check
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error(e);
      }
    }
    // Default demo driver for testing
    return {
      name: "Rajesh Kumar",
      email: "rajesh.driver@movesmart.in",
      phone: "+91 98470 12345",
      role: "Driver",
      driverId: "DRV-88219",
      licenseNumber: "KL-07-2018-99210",
      busNumber: "KL-07-CE-4412 (Bus 102)",
      avatarUrl: "",
    };
  });

  // 2. Driver Online/Offline & Duty Shift State
  const [isOnline, setIsOnline] = useState(true);
  const [attendanceMarked, setAttendanceMarked] = useState(true);
  const [attendanceTime, setAttendanceTime] = useState("07:30 AM");

  // 3. Navigation Tab State ('dashboard', 'trips', 'payments', 'report')
  const [activeTab, setActiveTab] = useState("dashboard");

  // 4. Assigned Bus & Current Trip State
  const [tripStatus, setTripStatus] = useState("idle"); // 'idle', 'in_progress', 'completed'
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [gpsActive, setGpsActive] = useState(true);
  const [passengersOnboard, setPassengersOnboard] = useState(32);
  const totalCapacity = 45;

  // 5. Schedules State
  const [todaySchedule, setTodaySchedule] = useState([
    {
      id: "TRIP-101",
      departure: "08:00 AM",
      arrival: "09:15 AM",
      routeName: "Kochi Fort ➔ Aluva Terminal",
      stops: ["Kochi Fort", "M.G. Road", "Kaloor", "Kakkanad", "Aluva"],
      status: "InProgress",
      passengers: 32,
      fareEarned: 1120,
    },
    {
      id: "TRIP-102",
      departure: "10:30 AM",
      arrival: "11:45 AM",
      routeName: "Aluva Terminal ➔ Kochi Fort",
      stops: ["Aluva", "Kakkanad", "Kaloor", "M.G. Road", "Kochi Fort"],
      status: "Upcoming",
      passengers: 0,
      fareEarned: 0,
    },
    {
      id: "TRIP-103",
      departure: "02:00 PM",
      arrival: "03:15 PM",
      routeName: "Kochi Fort ➔ Thrippunithura",
      stops: ["Kochi Fort", "Vytilla Mobility Hub", "Thrippunithura"],
      status: "Upcoming",
      passengers: 0,
      fareEarned: 0,
    },
  ]);

  // 6. Payments & Daily Earnings State
  const [dailyEarnings, setDailyEarnings] = useState(2450.0);
  const [paymentsLog, setPaymentsLog] = useState([
    { id: "PAY-901", trip: "Trip 101 (Kochi Fort)", time: "08:15 AM", amount: "₹ 1,120.00", method: "RFID Card Tap", status: "Paid" },
    { id: "PAY-902", trip: "Trip 101 (Passenger Cash)", time: "08:45 AM", amount: "₹ 430.00", method: "Cash Ticket", status: "Paid" },
    { id: "PAY-903", trip: "Trip 100 (Early Express)", time: "06:30 AM", amount: "₹ 900.00", method: "Online UPI", status: "Paid" },
  ]);

  // 7. Notifications State
  const [alerts, setAlerts] = useState([
    { id: 1, type: "warning", text: "Heavy rain reported near Vytilla Junction. Drive safely.", time: "10 mins ago" },
    { id: 2, type: "info", text: "Maintenance check scheduled at Ernakulam Depot at 5:00 PM.", time: "1 hour ago" },
  ]);

  // 8. Issue Reporting Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState("Engine Problem / Breakdown");
  const [issueNotes, setIssueNotes] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Check Driver Security Role
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role && parsed.role.toLowerCase() !== "driver") {
          // Keep user info but allow demo driver UI view
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [user, navigate]);

  // Handle Start / End Trip
  const handleToggleTrip = () => {
    if (tripStatus === "idle" || tripStatus === "completed") {
      setTripStatus("in_progress");
      showToast("🚀 Trip Started! GPS tracking live broadcasted to passengers.");
    } else {
      setTripStatus("completed");
      showToast("🏁 Trip Ended successfully! Earnings logged.");
      // Update schedule status
      const updated = [...todaySchedule];
      updated[activeTripIndex].status = "Completed";
      setTodaySchedule(updated);
    }
  };

  // Handle Attendance Mark
  const handleMarkAttendance = () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAttendanceMarked(true);
    setAttendanceTime(nowTime);
    showToast(`✓ Attendance marked successfully for today at ${nowTime}!`);
  };

  // Handle Passenger Tap Simulation
  const handleSimulateTap = () => {
    if (passengersOnboard >= totalCapacity) {
      showToast("⚠️ Bus is at full capacity (45/45)!");
      return;
    }
    setPassengersOnboard((prev) => prev + 1);
    setDailyEarnings((prev) => prev + 35.0);
    showToast("💳 Passenger tapped RFID Pass (+₹ 35.00 logged)");
  };

  // Submit Issue Report
  const handleSubmitIssue = (e) => {
    e.preventDefault();
    setShowIssueModal(false);
    showToast("⚠️ Issue reported to MoveSmart Fleet Control Desk!");
    setIssueNotes("");
  };

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of the MoveSmart Driver Portal?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      navigate("/login");
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const currentTripData = todaySchedule[activeTripIndex] || todaySchedule[0];
  const occupancyPercent = Math.round((passengersOnboard / totalCapacity) * 100);

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif;
          background: #f8fafc;
          color: #1e293b;
          margin: 0;
        }

        .driver-nav-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .driver-nav-tab:hover {
          color: #38a169;
          background: rgba(56, 161, 105, 0.08);
        }

        .driver-nav-tab.active {
          background: linear-gradient(135deg, #38a169, #8b5cf6);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(56, 161, 105, 0.25);
        }

        .btn-green-gradient {
          background: linear-gradient(135deg, #38a169, #2f855a);
          color: #ffffff;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(56, 161, 105, 0.3);
          transition: all 0.2s ease;
        }

        .btn-green-gradient:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(56, 161, 105, 0.4);
        }

        .btn-purple-gradient {
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          color: #ffffff;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);
          transition: all 0.2s ease;
        }

        .btn-purple-gradient:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(139, 92, 246, 0.4);
        }

        .btn-red-outline {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-red-outline:hover {
          background: #fee2e2;
          border-color: #ef4444;
        }

        .card-shadow {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          padding: 24px;
        }

        .pulse-online {
          width: 12px;
          height: 12px;
          background-color: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          animation: pulseGreen 2s infinite;
        }

        @keyframes pulseGreen {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        @media (max-width: 768px) {
          .driver-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Top Navbar */}
      <header style={styles.topNavbar}>
        <div style={styles.navContainer}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.png"
              alt="MoveSmart Logo"
              style={{ height: "40px", width: "auto", objectFit: "contain" }}
            />
            <span style={{ fontSize: "20px", fontWeight: "800", background: "linear-gradient(135deg, #38a169, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MoveSmart Driver
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f1f5f9", padding: "6px 14px", borderRadius: "20px" }}>
              <div className={isOnline ? "pulse-online" : ""} style={{ width: "10px", height: "10px", borderRadius: "50%", background: isOnline ? "#22c55e" : "#94a3b8" }} />
              <span style={{ fontSize: "12.5px", fontWeight: "700", color: isOnline ? "#15803d" : "#64748b" }}>
                {isOnline ? "Duty Active" : "Off Duty"}
              </span>
            </div>

            <button onClick={handleLogout} className="btn-red-outline" style={{ padding: "8px 14px", fontSize: "13px" }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainContainer}>
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div style={styles.toastBanner}>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 👤 DRIVER PROFILE HERO BANNER */}
        <section style={styles.heroDriverCard}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {/* Driver Circular Avatar */}
              <div style={styles.avatarWrapper}>
                <div style={styles.avatarInitials}>
                  {user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "DR"}
                </div>
                <div style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: isOnline ? "#22c55e" : "#cbd5e1",
                  border: "3px solid #ffffff",
                  position: "absolute",
                  bottom: "2px",
                  right: "2px"
                }} />
              </div>

              {/* Driver Meta Information */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    {user.name || "Rajesh Kumar"}
                  </h1>
                  <span style={styles.driverIdBadge}>
                    {user.driverId || "DRV-88219"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "18px", marginTop: "8px", flexWrap: "wrap", color: "#64748b", fontSize: "13.5px", fontWeight: "500" }}>
                  <span>📱 {user.phone || "+91 98470 12345"}</span>
                  <span>🪪 License: {user.licenseNumber || "KL-07-2018-99210"}</span>
                  <span>🚌 Bus: <strong>{user.busNumber || "KL-07-CE-4412"}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Actions Header Controls */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {!attendanceMarked ? (
                <button className="btn-green-gradient" onClick={handleMarkAttendance}>
                  ✓ Mark Today's Attendance
                </button>
              ) : (
                <div style={{ background: "#dcfce7", color: "#15803d", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  ✓ Attendance Marked ({attendanceTime})
                </div>
              )}

              <button className="btn-red-outline" onClick={() => setShowIssueModal(true)}>
                ⚠️ Report Issue
              </button>
            </div>
          </div>
        </section>

        {/* 🗂 Navigation Sub-Tabs */}
        <div style={styles.tabsContainer}>
          <button
            className={`driver-nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Driver Dashboard
          </button>

          <button
            className={`driver-nav-tab ${activeTab === "trips" ? "active" : ""}`}
            onClick={() => setActiveTab("trips")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Trips & Schedule ({todaySchedule.length})
          </button>

          <button
            className={`driver-nav-tab ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Earnings & Collections
          </button>
        </div>

        {/* 📊 TAB 1: MAIN DASHBOARD CONTENT */}
        {activeTab === "dashboard" && (
          <div className="driver-grid-layout" style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px" }}>
            {/* Left Column: Assigned Bus & Live Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* 🚌 Assigned Bus & Trip Control Banner */}
              <div className="card-shadow" style={{ background: "linear-gradient(135deg, #ffffff 70%, #f3e8ff 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#8b5cf6" }}>
                      Active Assigned Bus & Route
                    </span>
                    <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "4px 0 0" }}>
                      {currentTripData.routeName}
                    </h2>
                  </div>

                  <span style={{
                    padding: "6px 14px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "800",
                    background: tripStatus === "in_progress" ? "#dcfce7" : "#f1f5f9",
                    color: tripStatus === "in_progress" ? "#16a34a" : "#64748b"
                  }}>
                    {tripStatus === "in_progress" ? "● TRIP LIVE" : "READY FOR DEPARTURE"}
                  </span>
                </div>

                {/* Bus Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", marginBottom: "20px" }}>
                  <div>
                    <div style={styles.metricLabel}>Bus License No</div>
                    <div style={styles.metricVal}>{user.busNumber || "KL-07-CE-4412"}</div>
                  </div>
                  <div>
                    <div style={styles.metricLabel}>Departure Time</div>
                    <div style={styles.metricVal}>{currentTripData.departure}</div>
                  </div>
                  <div>
                    <div style={styles.metricLabel}>Bus Capacity</div>
                    <div style={styles.metricVal}>{totalCapacity} Passengers</div>
                  </div>
                </div>

                {/* Trip Action Button */}
                <div style={{ display: "flex", gap: "14px" }}>
                  {tripStatus !== "in_progress" ? (
                    <button className="btn-green-gradient" onClick={handleToggleTrip} style={{ flex: 1, justifyContent: "center", padding: "14px" }}>
                      🚀 START TRIP NOW
                    </button>
                  ) : (
                    <button className="btn-purple-gradient" onClick={handleToggleTrip} style={{ flex: 1, justifyContent: "center", padding: "14px" }}>
                      🏁 END CURRENT TRIP
                    </button>
                  )}

                  <button
                    onClick={handleSimulateTap}
                    style={{
                      padding: "12px 18px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#334155",
                      cursor: "pointer"
                    }}
                  >
                    💳 Simulate RFID Pass Tap
                  </button>
                </div>
              </div>

              {/* 👥 Passenger Onboard & Capacity Tracker */}
              <div className="card-shadow">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={styles.cardTitle}>Passengers Onboard & Capacity</h3>
                  <span style={{ fontSize: "16px", fontWeight: "800", color: occupancyPercent > 90 ? "#dc2626" : "#16a34a" }}>
                    {passengersOnboard} / {totalCapacity} Seats ({occupancyPercent}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: "100%", height: "12px", borderRadius: "6px", background: "#e2e8f0", overflow: "hidden", marginBottom: "14px" }}>
                  <div style={{
                    width: `${occupancyPercent}%`,
                    height: "100%",
                    background: occupancyPercent > 90 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #38a169, #8b5cf6)",
                    borderRadius: "6px",
                    transition: "width 0.4s ease"
                  }} />
                </div>

                {occupancyPercent >= 100 && (
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                    ⚠️ Bus is at maximum full capacity! Display "BUS FULL" sign.
                  </div>
                )}
              </div>

              {/* 📍 Live GPS Tracking Status */}
              <div className="card-shadow">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={styles.cardTitle}>📍 Live GPS Tracking & Route Status</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                      Real-time telemetry broadcasted to passenger app
                    </p>
                  </div>

                  <button
                    onClick={() => setGpsActive(!gpsActive)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "12px",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: "pointer",
                      background: gpsActive ? "#e6fffa" : "#fef2f2",
                      color: gpsActive ? "#2f855a" : "#dc2626"
                    }}
                  >
                    {gpsActive ? "📡 GPS Active" : "❌ GPS Off"}
                  </button>
                </div>

                {/* Simulated GPS Map Window */}
                <div style={{
                  height: "160px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", top: "12px", left: "14px", fontSize: "11px", color: "#94a3b8", fontWeight: "700" }}>
                    MAP TELEMETRY FEED • SATELLITE LOCK (8 SATS)
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#38a169" }}>
                    42 km/h
                  </div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>
                    Current Location: Near Kaloor Junction, Ernakulam
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Earnings Summary & Admin Notifications */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* 💳 Daily Earnings Card */}
              <div style={styles.earningsCard}>
                <span style={{ fontSize: "11.5px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                  Today's Total Collections
                </span>
                <div style={{ fontSize: "32px", fontWeight: "800", margin: "8px 0 14px" }}>
                  ₹ {dailyEarnings.toFixed(2)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", opacity: 0.9, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "10px" }}>
                  <span>Fare Method:</span>
                  <strong>RFID Tap + Cash</strong>
                </div>
              </div>

              {/* 🔔 Admin Alerts & Notifications */}
              <div className="card-shadow">
                <h3 style={{ ...styles.cardTitle, marginBottom: "14px" }}>🔔 Admin Alerts & Dispatch</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {alerts.map((alt) => (
                    <div key={alt.id} style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: alt.type === "warning" ? "#fffbeb" : "#f0f9ff",
                      border: `1px solid ${alt.type === "warning" ? "#fef3c7" : "#e0f2fe"}`,
                      fontSize: "13px"
                    }}>
                      <div style={{ fontWeight: "700", color: alt.type === "warning" ? "#b45309" : "#0369a1" }}>
                        {alt.text}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                        {alt.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📅 TAB 2: TRIPS & SCHEDULE */}
        {activeTab === "trips" && (
          <div className="card-shadow">
            <h3 style={{ ...styles.cardTitle, marginBottom: "16px" }}>Today's Scheduled Trips</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {todaySchedule.map((tr, idx) => (
                <div key={tr.id} style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  background: idx === activeTripIndex ? "#f3e8ff" : "#f8fafc",
                  border: `1px solid ${idx === activeTripIndex ? "#c4b5fd" : "#e2e8f0"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                        {tr.routeName}
                      </span>
                      {idx === activeTripIndex && (
                        <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#8b5cf6", color: "#ffffff", fontSize: "11px", fontWeight: "800" }}>
                          ACTIVE NOW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      🕒 Departure: <strong>{tr.departure}</strong> | Arrival: <strong>{tr.arrival}</strong>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      Stops: {tr.stops.join(" ➔ ")}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                      ₹ {tr.fareEarned.toFixed(2)}
                    </div>
                    <button
                      className="btn-purple-gradient"
                      onClick={() => {
                        setActiveTripIndex(idx);
                        setActiveTab("dashboard");
                        showToast(`Selected ${tr.routeName} for driving.`);
                      }}
                      style={{ padding: "6px 14px", fontSize: "12px", marginTop: "6px" }}
                    >
                      Select Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💳 TAB 3: PAYMENTS LOG */}
        {activeTab === "payments" && (
          <div className="card-shadow">
            <h3 style={{ ...styles.cardTitle, marginBottom: "16px" }}>Trip Collections & Payments Log</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {paymentsLog.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{p.trip}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{p.time} • Method: {p.method}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a" }}>{p.amount}</div>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a" }}>✓ {p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ⚠️ REPORT ISSUE MODAL */}
      {showIssueModal && (
        <div style={styles.modalOverlay} onClick={() => setShowIssueModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
              Report Bus Issue / Breakdown
            </h3>

            <form onSubmit={handleSubmitIssue} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.formLabel}>Issue Category</label>
                <select
                  style={styles.formInput}
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                >
                  <option value="Engine Problem / Breakdown">Engine Problem / Mechanical Breakdown</option>
                  <option value="Severe Traffic Delay">Severe Route Traffic Delay</option>
                  <option value="Tyre Puncture">Tyre Puncture / Suspension</option>
                  <option value="Medical Emergency">Passenger Medical Emergency</option>
                </select>
              </div>

              <div>
                <label style={styles.formLabel}>Additional Notes / Location</label>
                <textarea
                  rows="3"
                  style={{ ...styles.formInput, resize: "none" }}
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Enter details for control room dispatch..."
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn-red-outline" onClick={() => setShowIssueModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-purple-gradient">
                  Submit Alert to Fleet Control ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎨 Styles Object
const styles = {
  pageWrapper: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
  },
  topNavbar: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "14px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  navContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainContainer: {
    maxWidth: "1100px",
    width: "100%",
    margin: "32px auto 40px auto",
    padding: "0 20px",
    flex: 1,
  },
  toastBanner: {
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "14px",
    marginBottom: "20px",
    boxShadow: "0 4px 14px rgba(56, 161, 105, 0.25)",
    textAlign: "center",
  },
  heroDriverCard: {
    background: "linear-gradient(135deg, #ffffff 60%, #f3e8ff 100%)",
    borderRadius: "20px",
    padding: "28px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(139, 92, 246, 0.08)",
    marginBottom: "24px",
  },
  avatarWrapper: {
    position: "relative",
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    padding: "3px",
  },
  avatarInitials: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#ffffff",
    color: "#38a169",
    fontWeight: "800",
    fontSize: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  driverIdBadge: {
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "800",
    background: "rgba(139, 92, 246, 0.12)",
    color: "#7c3aed",
    border: "1px solid #c4b5fd",
  },
  tabsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "24px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "12px",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#0f172a",
    margin: 0,
  },
  metricLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  metricVal: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "2px",
  },
  earningsCard: {
    background: "linear-gradient(135deg, #38a169, #2f855a)",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 10px 25px rgba(56, 161, 105, 0.25)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  formLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "6px",
    display: "block",
  },
  formInput: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
  },
};

export default Driver;
