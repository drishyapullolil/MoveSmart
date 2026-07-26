import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeTab, setActiveTab] = useState("overview");

  // ---------------- Real RFID & Stop States ----------------
  const [dbCards, setDbCards] = useState([]);
  const [dbStops, setDbStops] = useState([]);
  const [dbDistances, setDbDistances] = useState([]);
  
  // Simulation States
  const [simCardTag, setSimCardTag] = useState("");
  const [simStopCode, setSimStopCode] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState("");
  
  // Stop & Distance management Form States
  const [newStopName, setNewStopName] = useState("");
  const [newStopCode, setNewStopCode] = useState("");
  const [stopMessage, setStopMessage] = useState("");
  
  const [distFromStop, setDistFromStop] = useState("");
  const [distToStop, setDistToStop] = useState("");
  const [distKm, setDistKm] = useState("");
  const [distanceMessage, setDistanceMessage] = useState("");
  
  // ---------------- Card Applications Admin States ----------------
  const [adminApplications, setAdminApplications] = useState([]);
  const [adminAppFilter, setAdminAppFilter] = useState("All");
  const [actionApp, setActionApp] = useState(null);
  const [actionType, setActionType] = useState(null); // 'details' | 'approve' | 'reject' | 'correction'
  const [approveRfidTag, setApproveRfidTag] = useState("");
  const [approveCardType, setApproveCardType] = useState("Silver");
  const [rejectReason, setRejectReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [adminActionMessage, setAdminActionMessage] = useState("");

  const fetchAdminApplications = async () => {
    try {
      const res = await axios.get("/api/rfid/applications");
      setAdminApplications(res.data || []);
    } catch (err) {
      console.error("Error fetching admin applications:", err);
    }
  };

  const fetchAdminRfidData = async () => {
    try {
      const cardsRes = await axios.get("/api/rfid/cards");
      setDbCards(cardsRes.data.cards || []);

      const stopsRes = await axios.get("/api/rfid/stops");
      const stops = stopsRes.data.stops || [];
      setDbStops(stops);
      if (stops.length > 0) {
        setDistFromStop(stops[0]._id);
        setDistToStop(stops.length > 1 ? stops[1]._id : stops[0]._id);
      }

      const distancesRes = await axios.get("/api/rfid/distances");
      setDbDistances(distancesRes.data.distances || []);
    } catch (err) {
      console.error("Error fetching RFID admin data:", err);
    }
  };

  const handleAdminAdjustBalance = async (cardId, type) => {
    const amt = parseFloat(adminAdjustAmount[cardId]);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      await axios.post("/api/rfid/adjust-balance", { cardId, amount: amt, type });
      setAdminAdjustAmount({ ...adminAdjustAmount, [cardId]: "" });
      fetchAdminRfidData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to adjust balance");
    }
  };

  const handleAdminToggleCardStatus = async (cardId) => {
    try {
      await axios.post("/api/rfid/toggle-status", { cardId });
      fetchAdminRfidData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle card status");
    }
  };

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!newStopName || !newStopCode) return;
    try {
      await axios.post("/api/rfid/stops", { name: newStopName, code: newStopCode });
      setStopMessage(`Stop "${newStopName}" added successfully.`);
      setNewStopName("");
      setNewStopCode("");
      fetchAdminRfidData();
      setTimeout(() => setStopMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add stop");
    }
  };

  const handleAddDistance = async (e) => {
    e.preventDefault();
    if (!distFromStop || !distToStop || !distKm) return;
    if (distFromStop === distToStop) {
      alert("Stops must be different");
      return;
    }
    try {
      await axios.post("/api/rfid/distances", {
        fromStopId: distFromStop,
        toStopId: distToStop,
        distanceKm: Number(distKm)
      });
      setDistanceMessage("Distance saved successfully.");
      setDistKm("");
      fetchAdminRfidData();
      setTimeout(() => setDistanceMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to set distance");
    }
  };

  const handleReSeed = async () => {
    if (!window.confirm("This will clear and re-populate all stops and distances to default values. Proceed?")) return;
    try {
      await axios.post("/api/rfid/seed");
      alert("Data seeded successfully!");
      fetchAdminRfidData();
    } catch (err) {
      alert("Failed to seed: " + err.message);
    }
  };

  const handleSimulateTap = async (e) => {
    e.preventDefault();
    setSimError("");
    setSimResult(null);
    if (!simCardTag || !simStopCode) {
      setSimError("Please select a Card and a Stop first.");
      return;
    }
    try {
      const res = await axios.post("/api/rfid/tap", {
        rfidTag: simCardTag,
        stopCode: simStopCode
      });
      setSimResult(res.data);
      fetchAdminRfidData();
    } catch (err) {
      setSimError(err.response?.data?.message || "Tap rejected by system.");
      if (err.response?.data) {
        setSimResult(err.response.data);
      }
      fetchAdminRfidData();
    }
  };

  // ---------------- Card Applications Admin Handlers ----------------
  const handleApproveAppSubmit = async (e) => {
    e.preventDefault();
    if (!actionApp) return;
    try {
      const res = await axios.post(`/api/rfid/applications/${actionApp._id}/approve`, {
        rfidTag: approveRfidTag,
        cardType: approveCardType,
      });
      setAdminActionMessage(`🎉 ${res.data.message || "Application Approved & RFID Card Activated!"}`);
      setActionApp(null);
      setActionType(null);
      setApproveRfidTag("");
      fetchAdminApplications();
      fetchAdminRfidData();
      setTimeout(() => setAdminActionMessage(""), 6000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to approve application");
    }
  };

  const handleRejectAppSubmit = async (e) => {
    e.preventDefault();
    if (!actionApp || !rejectReason.trim()) {
      alert("Rejection reason is required.");
      return;
    }
    try {
      const res = await axios.post(`/api/rfid/applications/${actionApp._id}/reject`, {
        reason: rejectReason.trim(),
      });
      setAdminActionMessage(`❌ ${res.data.message || "Application Rejected"}`);
      setActionApp(null);
      setActionType(null);
      setRejectReason("");
      fetchAdminApplications();
      setTimeout(() => setAdminActionMessage(""), 6000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reject application");
    }
  };

  const handleCorrectionAppSubmit = async (e) => {
    e.preventDefault();
    if (!actionApp) return;
    try {
      const res = await axios.post(`/api/rfid/applications/${actionApp._id}/correction`, {
        note: correctionNote.trim(),
      });
      setAdminActionMessage(`🔄 ${res.data.message || "Correction Requested"}`);
      setActionApp(null);
      setActionType(null);
      setCorrectionNote("");
      fetchAdminApplications();
      setTimeout(() => setAdminActionMessage(""), 6000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to request correction");
    }
  };

  // ---------------- Routes management ----------------
  const [routes, setRoutes] = useState([
    {
      id: "C01",
      name: "Al Ghubaiba Bus Station ➜ Gold Souq Bus Station",
      frequency: "Every 8 mins",
      stops: 5,
      status: "Active"
    },
    {
      id: "8",
      name: "Ibn Battuta Metro Station ➜ Gold Souq Bus Station",
      frequency: "Every 15 mins",
      stops: 6,
      status: "Active"
    },
    {
      id: "F11",
      name: "Rowdah Stop ➜ Financial Centre Metro Station",
      frequency: "Every 12 mins",
      stops: 4,
      status: "Active"
    }
  ]);
  const [routeForm, setRouteForm] = useState({ id: "", name: "", frequency: "", stops: "" });
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [routeMessage, setRouteMessage] = useState("");

  const resetRouteForm = () => {
    setRouteForm({ id: "", name: "", frequency: "", stops: "" });
    setEditingRouteId(null);
  };

  const handleRouteSubmit = (e) => {
    e.preventDefault();
    if (!routeForm.id || !routeForm.name || !routeForm.frequency || !routeForm.stops) return;

    if (editingRouteId) {
      setRoutes(routes.map(r => r.id === editingRouteId
        ? { ...r, name: routeForm.name, frequency: routeForm.frequency, stops: Number(routeForm.stops) }
        : r
      ));
      setRouteMessage(`Route ${editingRouteId} updated.`);
    } else {
      if (routes.some(r => r.id.toUpperCase() === routeForm.id.toUpperCase())) {
        alert("A route with this ID already exists.");
        return;
      }
      setRoutes([...routes, {
        id: routeForm.id.toUpperCase(),
        name: routeForm.name,
        frequency: routeForm.frequency,
        stops: Number(routeForm.stops),
        status: "Active"
      }]);
      setRouteMessage(`Route ${routeForm.id.toUpperCase()} added.`);
    }

    resetRouteForm();
    setTimeout(() => setRouteMessage(""), 4000);
  };

  const handleEditRoute = (route) => {
    setEditingRouteId(route.id);
    setRouteForm({ id: route.id, name: route.name, frequency: route.frequency, stops: String(route.stops) });
  };

  const handleDeleteRoute = (id) => {
    if (!window.confirm(`Delete route ${id}? This cannot be undone.`)) return;
    setRoutes(routes.filter(r => r.id !== id));
    if (editingRouteId === id) resetRouteForm();
  };

  const handleToggleRouteStatus = (id) => {
    setRoutes(routes.map(r => r.id === id
      ? { ...r, status: r.status === "Active" ? "Suspended" : "Active" }
      : r
    ));
  };

  // ---------------- Users management ----------------
  const [users, setUsers] = useState([
    { id: "u1", name: "Ahmed Al Farsi", email: "ahmed.farsi@example.com", role: "admin", status: "Active", joined: "02 Jan 2026" },
    { id: "u2", name: "Sarah Thompson", email: "sarah.t@example.com", role: "user", status: "Active", joined: "14 Feb 2026" },
    { id: "u3", name: "Rahul Menon", email: "rahul.menon@example.com", role: "user", status: "Active", joined: "28 Mar 2026" },
    { id: "u4", name: "Fatima Al Suwaidi", email: "fatima.s@example.com", role: "user", status: "Suspended", joined: "09 Apr 2026" },
    { id: "u5", name: "James Okafor", email: "james.okafor@example.com", role: "user", status: "Active", joined: "22 May 2026" }
  ]);
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleToggleUserStatus = (id) => {
    setUsers(users.map(u => u.id === id
      ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" }
      : u
    ));
  };

  // ---------------- Nol cards oversight ----------------
  const [nolCards, setNolCards] = useState([
    { id: "3028374829", owner: "Sarah Thompson", type: "Silver", balance: 42.50, status: "Active" },
    { id: "5081726354", owner: "Sarah Thompson", type: "Gold", balance: 120.00, status: "Active" },
    { id: "3092817465", owner: "Rahul Menon", type: "Blue", balance: 8.25, status: "Active" },
    { id: "5019283746", owner: "Fatima Al Suwaidi", type: "Gold", balance: 0.00, status: "Blocked" },
    { id: "3011223344", owner: "James Okafor", type: "Silver", balance: 63.75, status: "Active" }
  ]);
  const [cardSearch, setCardSearch] = useState("");
  const [adjustAmount, setAdjustAmount] = useState({});

  const filteredCards = nolCards.filter(c =>
    c.id.includes(cardSearch) || c.owner.toLowerCase().includes(cardSearch.toLowerCase())
  );

  const handleAdjustBalance = (id, direction) => {
    const amt = parseFloat(adjustAmount[id]);
    if (!amt || amt <= 0) {
      alert("Enter a valid amount to adjust.");
      return;
    }
    setNolCards(nolCards.map(c => {
      if (c.id !== id) return c;
      const newBalance = direction === "credit" ? c.balance + amt : Math.max(0, c.balance - amt);
      return { ...c, balance: newBalance };
    }));
    setAdjustAmount({ ...adjustAmount, [id]: "" });
  };

  const handleToggleCardStatus = (id) => {
    setNolCards(nolCards.map(c => c.id === id
      ? { ...c, status: c.status === "Active" ? "Blocked" : "Active" }
      : c
    ));
  };

  // ---------------- Intercity bookings ----------------
  const [bookings, setBookings] = useState([
    { id: "BK1029", passenger: "Sarah Thompson", from: "Dubai (Al Ghubaiba)", to: "Abu Dhabi (Central Station)", date: "24 Jul 2026", seats: 2, status: "Confirmed" },
    { id: "BK1030", passenger: "Rahul Menon", from: "Dubai (Ibn Battuta)", to: "Sharjah (Al Jubail Station)", date: "23 Jul 2026", seats: 1, status: "Confirmed" },
    { id: "BK1031", passenger: "James Okafor", from: "Dubai (Al Ghubaiba)", to: "Al Ain (Central Station)", date: "25 Jul 2026", seats: 3, status: "Pending" },
    { id: "BK1032", passenger: "Fatima Al Suwaidi", from: "Sharjah", to: "Abu Dhabi (Central Station)", date: "20 Jul 2026", seats: 1, status: "Cancelled" }
  ]);
  const [bookingFilter, setBookingFilter] = useState("All");

  const filteredBookings = bookings.filter(b => bookingFilter === "All" || b.status === bookingFilter);

  const handleCancelBooking = (id) => {
    if (!window.confirm(`Cancel booking ${id}?`)) return;
    setBookings(bookings.map(b => b.id === id ? { ...b, status: "Cancelled" } : b));
  };

  const handleConfirmBooking = (id) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: "Confirmed" } : b));
  };

  // ---------------- Protected route check ----------------
  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== "admin") {
      localStorage.setItem(
        "moveSmart_loginWarning",
        "Admin access only. Please sign in with an administrator account."
      );
      navigate("/login");
    } else {
      fetchAdminRfidData();
      fetchAdminApplications();
    }
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  if (!user || user.role?.toLowerCase() !== "admin") return null;

  // ---------------- Overview stats ----------------
  const totalRevenueToday = dbCards.reduce((sum, c) => sum + c.balance, 0);
  const activeUsersCount = users.filter(u => u.status === "Active").length;
  const activeRoutesCount = routes.filter(r => r.status === "Active").length;
  const pendingBookingsCount = bookings.filter(b => b.status === "Pending").length;

  return (
    <div className="rta-body-theme" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header Navigation */}
      <nav className="rta-nav">
        <Link to="/" className="rta-logo">
          <div className="brand-icon" style={{ display: "inline-flex", background: "var(--primary)", color: "#fff", padding: "6px", borderRadius: "8px", marginRight: "4px" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
              <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
              <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <span>MoveSmart Portal</span>
        </Link>
        <div className="rta-nav-menu">
          <span className="rta-nav-link active">Admin</span>
          <button onClick={handleLogout} className="rta-btn-secondary" style={{ padding: "8px 16px" }}>Sign Out</button>
        </div>
      </nav>

      {/* Admin Dashboard Layout */}
      <main className="profile-container" style={{ flex: "1" }}>
        {/* Admin Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-avatar">{user.name?.charAt(0).toUpperCase() || "A"}</div>
          <h2 className="profile-name">{user.name}</h2>
          <p className="profile-email">Administrator</p>

          <div className="profile-menu">
            <button
              className={`profile-menu-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              📊 Overview
            </button>
            <button
              className={`profile-menu-item ${activeTab === "applications" ? "active" : ""}`}
              onClick={() => setActiveTab("applications")}
            >
              📝 Card Applications ({adminApplications.filter(a => a.status === "Pending").length})
            </button>
            <button
              className={`profile-menu-item ${activeTab === "routes" ? "active" : ""}`}
              onClick={() => setActiveTab("routes")}
            >
              🚌 Routes &amp; Schedules
            </button>
            <button
              className={`profile-menu-item ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              👥 Users
            </button>
            <button
              className={`profile-menu-item ${activeTab === "cards" ? "active" : ""}`}
              onClick={() => setActiveTab("cards")}
            >
              💳 Nol Cards
            </button>
            <button
              className={`profile-menu-item ${activeTab === "bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("bookings")}
            >
              🚍 Intercity Bookings
            </button>
          </div>
        </aside>

        {/* Admin Details Panel */}
        <section className="profile-main">

          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">System Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginTop: "10px" }}>
                <div className="rta-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "12.5px", color: "#717B87", fontWeight: "700", textTransform: "uppercase" }}>Active Users</div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#1F2226", marginTop: "6px" }}>{activeUsersCount}</div>
                </div>
                <div className="rta-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "12.5px", color: "#717B87", fontWeight: "700", textTransform: "uppercase" }}>Active Routes</div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#1F2226", marginTop: "6px" }}>{activeRoutesCount}</div>
                </div>
                <div className="rta-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "12.5px", color: "#717B87", fontWeight: "700", textTransform: "uppercase" }}>Nol Wallet Total</div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#1F2226", marginTop: "6px" }}>{totalRevenueToday.toFixed(2)} AED</div>
                </div>
                <div className="rta-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "12.5px", color: "#717B87", fontWeight: "700", textTransform: "uppercase" }}>Pending Bookings</div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--rta-red)", marginTop: "6px" }}>{pendingBookingsCount}</div>
                </div>
              </div>

              <div style={{ marginTop: "40px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "15px" }}>Recent Users</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {users.slice(0, 3).map(u => (
                    <div key={u.id} className="rta-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#1F2226" }}>{u.name}</div>
                        <div style={{ fontSize: "12.5px", color: "#717B87" }}>{u.email}</div>
                      </div>
                      <span style={{
                        fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px",
                        color: u.status === "Active" ? "#059669" : "var(--rta-red)",
                        backgroundColor: u.status === "Active" ? "rgba(5, 150, 105, 0.1)" : "rgba(214, 28, 28, 0.1)"
                      }}>
                        {u.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ROUTES & SCHEDULES */}
          {activeTab === "routes" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">Manage Bus Routes</h2>

              {routeMessage && (
                <div style={{ color: "#059669", fontWeight: "700", marginBottom: "15px", fontSize: "13.5px" }}>
                  ✓ {routeMessage}
                </div>
              )}

              <div className="tx-list" style={{ marginBottom: "30px" }}>
                {routes.map(r => (
                  <div key={r.id} className="tx-item" style={{ alignItems: "center" }}>
                    <div className="tx-info">
                      <span className="tx-title">Route {r.id} — {r.name}</span>
                      <span className="tx-meta">{r.frequency} · {r.stops} stops</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px",
                        color: r.status === "Active" ? "#059669" : "var(--rta-red)",
                        backgroundColor: r.status === "Active" ? "rgba(5, 150, 105, 0.1)" : "rgba(214, 28, 28, 0.1)"
                      }}>
                        {r.status}
                      </span>
                      <button onClick={() => handleEditRoute(r)} className="rta-btn-secondary" style={{ padding: "6px 12px", fontSize: "12.5px" }}>Edit</button>
                      <button onClick={() => handleToggleRouteStatus(r.id)} className="rta-btn-secondary" style={{ padding: "6px 12px", fontSize: "12.5px" }}>
                        {r.status === "Active" ? "Suspend" : "Reactivate"}
                      </button>
                      <button onClick={() => handleDeleteRoute(r.id)} className="rta-btn-secondary" style={{ padding: "6px 12px", fontSize: "12.5px", color: "var(--rta-red)", borderColor: "rgba(214, 28, 28, 0.2)" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "2px solid var(--rta-gray-border)", paddingTop: "25px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "15px" }}>
                  {editingRouteId ? `Edit Route ${editingRouteId}` : "Add New Route"}
                </h3>
                <form onSubmit={handleRouteSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr auto", gap: "15px", alignItems: "flex-end" }}>
                  <div className="rta-input-group">
                    <label htmlFor="route-id-input">Route ID</label>
                    <input
                      id="route-id-input"
                      type="text"
                      className="rta-input-field"
                      value={routeForm.id}
                      disabled={!!editingRouteId}
                      onChange={(e) => setRouteForm({ ...routeForm, id: e.target.value })}
                      placeholder="e.g. C02"
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="route-name-input">Route Name</label>
                    <input
                      id="route-name-input"
                      type="text"
                      className="rta-input-field"
                      value={routeForm.name}
                      onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                      placeholder="e.g. Al Barsha ➜ Business Bay"
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="route-freq-input">Frequency</label>
                    <input
                      id="route-freq-input"
                      type="text"
                      className="rta-input-field"
                      value={routeForm.frequency}
                      onChange={(e) => setRouteForm({ ...routeForm, frequency: e.target.value })}
                      placeholder="e.g. Every 10 mins"
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="route-stops-input">Stops</label>
                    <input
                      id="route-stops-input"
                      type="number"
                      min="1"
                      className="rta-input-field"
                      value={routeForm.stops}
                      onChange={(e) => setRouteForm({ ...routeForm, stops: e.target.value })}
                      placeholder="5"
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="submit" className="rta-btn-primary" style={{ height: "46px" }}>
                      {editingRouteId ? "Save" : "Add"}
                    </button>
                    {editingRouteId && (
                      <button type="button" onClick={resetRouteForm} className="rta-btn-secondary" style={{ height: "46px" }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === "users" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">Manage Users</h2>

              <div className="rta-input-group" style={{ maxWidth: "360px", marginBottom: "20px" }}>
                <label htmlFor="user-search-input">Search by name or email</label>
                <input
                  id="user-search-input"
                  type="text"
                  className="rta-input-field"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="e.g. Sarah"
                />
              </div>

              <div className="tx-list">
                {filteredUsers.length === 0 ? (
                  <p style={{ color: "#717B87", fontStyle: "italic" }}>No users match your search.</p>
                ) : filteredUsers.map(u => (
                  <div key={u.id} className="tx-item" style={{ alignItems: "center" }}>
                    <div className="tx-info">
                      <span className="tx-title">{u.name} {u.role?.toLowerCase() === "admin" && "· Admin"}</span>
                      <span className="tx-meta">{u.email} · Joined {u.joined}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px",
                        color: u.status === "Active" ? "#059669" : "var(--rta-red)",
                        backgroundColor: u.status === "Active" ? "rgba(5, 150, 105, 0.1)" : "rgba(214, 28, 28, 0.1)"
                      }}>
                        {u.status}
                      </span>
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        disabled={u.role?.toLowerCase() === "admin"}
                        className="rta-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12.5px", opacity: u.role?.toLowerCase() === "admin" ? 0.5 : 1 }}
                      >
                        {u.status === "Active" ? "Suspend" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOL CARDS */}
          {activeTab === "cards" && (
            <div className="fade-in-section">
              
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "30px", alignItems: "start" }}>
                
                {/* Left side: Oversight List */}
                <div>
                  <h2 className="profile-section-title">Nol Card Oversight</h2>
                  <p style={{ color: "#717B87", fontSize: "13.5px", marginBottom: "20px" }}>
                    Manage and adjust balances for all registered cards in the database.
                  </p>

                  <div className="rta-input-group" style={{ maxWidth: "360px", marginBottom: "20px" }}>
                    <label htmlFor="card-search-input">Search by Card Number, Tag ID, or Owner</label>
                    <input
                      id="card-search-input"
                      type="text"
                      className="rta-input-field"
                      value={cardSearch}
                      onChange={(e) => setCardSearch(e.target.value)}
                      placeholder="e.g. 50283 or AH:2B"
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {dbCards.filter(c => 
                      c.cardNumber.includes(cardSearch) || 
                      c.rfidTag.includes(cardSearch.toUpperCase()) ||
                      (c.user && c.user.name.toLowerCase().includes(cardSearch.toLowerCase()))
                    ).length === 0 ? (
                      <p style={{ color: "#717B87", fontStyle: "italic" }}>No cards match your search.</p>
                    ) : dbCards.filter(c => 
                      c.cardNumber.includes(cardSearch) || 
                      c.rfidTag.includes(cardSearch.toUpperCase()) ||
                      (c.user && c.user.name.toLowerCase().includes(cardSearch.toLowerCase()))
                    ).map(c => (
                      <div key={c._id} className="rta-card" style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "14.5px", color: "#1F2226" }}>
                            {c.cardType} Nol Card · {c.cardNumber}
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#717B87" }}>
                            RFID Tag: <strong style={{ fontFamily: "monospace" }}>{c.rfidTag}</strong>
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#717B87" }}>
                            Owner: {c.user ? `${c.user.name} (${c.user.email})` : "Unassigned"}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--rta-gold)", marginTop: "4px" }}>
                            {c.balance.toFixed(2)} AED
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            className="rta-input-field"
                            style={{ width: "90px" }}
                            placeholder="Amt"
                            value={adminAdjustAmount[c._id] || ""}
                            onChange={(e) => setAdminAdjustAmount({ ...adminAdjustAmount, [c._id]: e.target.value })}
                          />
                          <button onClick={() => handleAdminAdjustBalance(c._id, "credit")} className="rta-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px", borderColor: "#059669", color: "#059669" }}>Credit</button>
                          <button onClick={() => handleAdminAdjustBalance(c._id, "debit")} className="rta-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px", borderColor: "var(--rta-red)", color: "var(--rta-red)" }}>Debit</button>
                          <span style={{
                            fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "8px",
                            color: c.status === "Active" ? "#059669" : "var(--rta-red)",
                            backgroundColor: c.status === "Active" ? "rgba(5, 150, 105, 0.1)" : "rgba(214, 28, 28, 0.1)"
                          }}>
                            {c.status}
                          </span>
                          <button
                            onClick={() => handleAdminToggleCardStatus(c._id)}
                            className="rta-btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            {c.status === "Active" ? "Block" : "Activate"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side: Simulator & Stops/Distances */}
                <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                  
                  {/* Tap Simulator */}
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid var(--rta-gray-border)", borderRadius: "12px", padding: "20px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--rta-blue-navy)", marginBottom: "12px" }}>
                      📡 Live RFID Tap Simulator
                    </h3>
                    <p style={{ color: "#717B87", fontSize: "12.5px", marginBottom: "15px" }}>
                      Simulate a physical bus card tap-in or tap-out to verify fare calculations.
                    </p>

                    <form onSubmit={handleSimulateTap}>
                      <div className="rta-input-group" style={{ marginBottom: "12px" }}>
                        <label htmlFor="sim-card-select">Select RFID Card</label>
                        <select 
                          id="sim-card-select" 
                          className="rta-input-field"
                          value={simCardTag}
                          onChange={(e) => setSimCardTag(e.target.value)}
                        >
                          <option value="">-- Choose Card --</option>
                          {dbCards.map(c => (
                            <option key={c._id} value={c.rfidTag}>
                              {c.cardNumber} ({c.cardType} - {c.rfidTag})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                        <label htmlFor="sim-stop-select">Select Bus Stop</label>
                        <select 
                          id="sim-stop-select" 
                          className="rta-input-field"
                          value={simStopCode}
                          onChange={(e) => setSimStopCode(e.target.value)}
                        >
                          <option value="">-- Choose Stop --</option>
                          {dbStops.map(s => (
                            <option key={s._id} value={s.code}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button type="submit" className="rta-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                        Simulate RFID Tag Tap
                      </button>

                      {simError && (
                        <div style={{ color: "var(--rta-red)", fontSize: "12.5px", marginTop: "10px", fontWeight: "600" }}>
                          {simError}
                        </div>
                      )}
                    </form>

                    {/* Simulation Result Output */}
                    {simResult && (
                      <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#1E293B", borderRadius: "8px", color: "#38BDF8", fontFamily: "monospace", fontSize: "12px" }}>
                        <div style={{ color: "#34D399", fontWeight: "bold", borderBottom: "1px solid #475569", paddingBottom: "6px", marginBottom: "8px" }}>
                          Reader Log Output: {simResult.action}
                        </div>
                        <div style={{ color: "#FFF", marginBottom: "4px" }}>{simResult.message}</div>
                        
                        {simResult.card && (
                          <div style={{ color: "#94A3B8" }}>
                            Card: {simResult.card.cardNumber} ({simResult.card.cardType})<br />
                            New Balance: {simResult.card.balance} AED
                          </div>
                        )}
                        {simResult.journey && (
                          <div style={{ color: "#E2E8F0", marginTop: "6px", borderTop: "1px dashed #475569", paddingTop: "6px" }}>
                            Trip: {simResult.journey.from} ➔ {simResult.journey.to}<br />
                            Distance: {simResult.journey.distanceKm.toFixed(1)} km<br />
                            Charged: {simResult.journey.fare.toFixed(2)} AED
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stops & Distance Configuration */}
                  <div style={{ border: "1px solid var(--rta-gray-border)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--rta-blue-navy)", margin: 0 }}>
                        ⚙️ Stop Distance Settings
                      </h3>
                      <button 
                        onClick={handleReSeed} 
                        className="rta-btn-secondary" 
                        style={{ padding: "4px 8px", fontSize: "11px", borderColor: "var(--rta-gold)", color: "var(--rta-gold)" }}
                      >
                        Re-Seed Defaults
                      </button>
                    </div>

                    {/* Add Stop Form */}
                    <form onSubmit={handleAddStop} style={{ marginBottom: "20px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>Add New Stop</h4>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <input 
                          type="text" 
                          placeholder="Stop Name" 
                          className="rta-input-field" 
                          value={newStopName} 
                          onChange={(e) => setNewStopName(e.target.value)}
                          required
                          style={{ padding: "6px 10px", fontSize: "12.5px" }}
                        />
                        <input 
                          type="text" 
                          placeholder="Code" 
                          className="rta-input-field" 
                          value={newStopCode} 
                          onChange={(e) => setNewStopCode(e.target.value)}
                          required
                          style={{ padding: "6px 10px", fontSize: "12.5px", width: "80px" }}
                        />
                      </div>
                      <button type="submit" className="rta-btn-secondary" style={{ width: "100%", padding: "6px", fontSize: "12.5px" }}>
                        Add Stop
                      </button>
                      {stopMessage && (
                        <div style={{ color: "#059669", fontSize: "12px", marginTop: "6px" }}>{stopMessage}</div>
                      )}
                    </form>

                    {/* Add/Edit Distance Form */}
                    <form onSubmit={handleAddDistance}>
                      <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>Configure Stop Distance (km)</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <label style={{ fontSize: "10px", color: "#717B87" }}>From Stop</label>
                          <select 
                            className="rta-input-field" 
                            value={distFromStop} 
                            onChange={(e) => setDistFromStop(e.target.value)}
                            style={{ padding: "4px", fontSize: "12px" }}
                          >
                            {dbStops.map(s => (
                              <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "10px", color: "#717B87" }}>To Stop</label>
                          <select 
                            className="rta-input-field" 
                            value={distToStop} 
                            onChange={(e) => setDistToStop(e.target.value)}
                            style={{ padding: "4px", fontSize: "12px" }}
                          >
                            {dbStops.map(s => (
                              <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="rta-input-group" style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "11px" }}>Distance (kilometers)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0.1" 
                          placeholder="e.g. 5.6" 
                          className="rta-input-field" 
                          value={distKm} 
                          onChange={(e) => setDistKm(e.target.value)}
                          required
                          style={{ padding: "6px 10px", fontSize: "12.5px" }}
                        />
                      </div>
                      <button type="submit" className="rta-btn-secondary" style={{ width: "100%", padding: "6px", fontSize: "12.5px" }}>
                        Save Distance
                      </button>
                      {distanceMessage && (
                        <div style={{ color: "#059669", fontSize: "12px", marginTop: "6px" }}>{distanceMessage}</div>
                      )}
                    </form>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB: INTERCITY BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">Intercity Bookings</h2>

              <div className="rta-input-group" style={{ maxWidth: "260px", marginBottom: "20px" }}>
                <label htmlFor="booking-filter-select">Filter by status</label>
                <select
                  id="booking-filter-select"
                  className="rta-input-field"
                  value={bookingFilter}
                  onChange={(e) => setBookingFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="tx-list">
                {filteredBookings.length === 0 ? (
                  <p style={{ color: "#717B87", fontStyle: "italic" }}>No bookings match this filter.</p>
                ) : filteredBookings.map(b => (
                  <div key={b.id} className="tx-item" style={{ alignItems: "center" }}>
                    <div className="tx-info">
                      <span className="tx-title">{b.id} — {b.passenger}</span>
                      <span className="tx-meta">{b.from} ➜ {b.to} · {b.date} · {b.seats} seat(s)</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px",
                        color: b.status === "Confirmed" ? "#059669" : b.status === "Pending" ? "var(--rta-gold)" : "var(--rta-red)",
                        backgroundColor: b.status === "Confirmed" ? "rgba(5, 150, 105, 0.1)" : b.status === "Pending" ? "rgba(192, 153, 77, 0.1)" : "rgba(214, 28, 28, 0.1)"
                      }}>
                        {b.status}
                      </span>
                      {b.status === "Pending" && (
                        <button onClick={() => handleConfirmBooking(b.id)} className="rta-btn-secondary" style={{ padding: "6px 12px", fontSize: "12.5px" }}>Confirm</button>
                      )}
                      {b.status !== "Cancelled" && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="rta-btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "12.5px", color: "var(--rta-red)", borderColor: "rgba(214, 28, 28, 0.2)" }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CARD APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="fade-in-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Card Applications Management</h2>
                <button onClick={fetchAdminApplications} className="rta-btn-secondary" style={{ padding: "6px 14px", fontSize: "12.5px" }}>
                  🔄 Refresh List
                </button>
              </div>

              {adminActionMessage && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#15803d", fontWeight: "700", marginBottom: "20px", fontSize: "13.5px" }}>
                  {adminActionMessage}
                </div>
              )}

              {/* Status Filters */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {["All", "Pending", "Approved", "Rejected", "Correction Needed"].map((st) => {
                  const isSelected = adminAppFilter === st;
                  const count = st === "All" ? adminApplications.length : adminApplications.filter(a => a.status === st).length;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAdminAppFilter(st)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--rta-gray-border)"}`,
                        background: isSelected ? "var(--primary)" : "#ffffff",
                        color: isSelected ? "#ffffff" : "#475569",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {st} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Applications List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {adminApplications.filter(a => adminAppFilter === "All" || a.status === adminAppFilter).length === 0 ? (
                  <div className="rta-card" style={{ padding: "30px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                    No applications found under the "{adminAppFilter}" status filter.
                  </div>
                ) : (
                  adminApplications
                    .filter(a => adminAppFilter === "All" || a.status === adminAppFilter)
                    .map((app) => {
                      const badge = app.status === "Approved"
                        ? { bg: "rgba(34, 197, 94, 0.12)", text: "#15803d", border: "rgba(34, 197, 94, 0.3)" }
                        : app.status === "Rejected"
                        ? { bg: "rgba(225, 29, 72, 0.12)", text: "#be123c", border: "rgba(225, 29, 72, 0.3)" }
                        : app.status === "Correction Needed"
                        ? { bg: "rgba(245, 158, 11, 0.15)", text: "#b45309", border: "rgba(245, 158, 11, 0.35)" }
                        : { bg: "rgba(139, 92, 246, 0.12)", text: "#6d28d9", border: "rgba(139, 92, 246, 0.3)" };

                      return (
                        <div key={app._id} className="rta-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontWeight: "800", fontSize: "16px", color: "#1e293b" }}>{app.fullName}</span>
                              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--primary)", fontWeight: "700" }}>{app.applicationId}</span>
                              <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 10px", borderRadius: "999px", background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                                {app.status}
                              </span>
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                              {app.cardCategory || "Regular"} Pass · ID: {app.idType} ({app.idNumber}) · Phone: {app.phone || "N/A"} · {app.city || "Kerala"}, {app.state || "Kerala"}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              onClick={() => { setActionApp(app); setActionType("details"); }}
                              className="rta-btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "12.5px" }}
                            >
                              👁️ View Details
                            </button>

                            {app.status === "Pending" || app.status === "Correction Needed" ? (
                              <>
                                <button
                                  onClick={() => { setActionApp(app); setActionType("approve"); setApproveRfidTag(""); setApproveCardType(app.cardCategory === "Student" ? "Blue" : "Silver"); }}
                                  className="rta-btn-primary"
                                  style={{ padding: "6px 14px", fontSize: "12.5px", background: "#16a34a" }}
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  onClick={() => { setActionApp(app); setActionType("correction"); setCorrectionNote(""); }}
                                  className="rta-btn-secondary"
                                  style={{ padding: "6px 12px", fontSize: "12.5px", color: "#d97706", borderColor: "rgba(245, 158, 11, 0.4)" }}
                                >
                                  🔄 Correction
                                </button>
                                <button
                                  onClick={() => { setActionApp(app); setActionType("reject"); setRejectReason(""); }}
                                  className="rta-btn-secondary"
                                  style={{ padding: "6px 12px", fontSize: "12.5px", color: "#dc2626", borderColor: "rgba(220, 38, 38, 0.4)" }}
                                >
                                  ❌ Reject
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ACTION MODALS */}
          {actionApp && actionType && (
            <div className="modal-overlay" style={{ zIndex: 200 }}>
              <div className="modal-content" style={{ maxWidth: "560px", width: "92%", padding: "28px" }}>
                
                {/* 1. DETAILS MODAL */}
                {actionType === "details" && (
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "4px" }}>
                      Application Details: {actionApp.applicationId}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                      Review complete applicant submission and uploaded documents.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", maxHeight: "360px", overflowY: "auto", paddingRight: "6px" }}>
                      
                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: "800", color: "var(--primary)", marginBottom: "4px" }}>👤 Personal Information</div>
                        <div><strong>Name:</strong> {actionApp.fullName}</div>
                        <div><strong>DOB:</strong> {actionApp.dob || "N/A"} · <strong>Gender:</strong> {actionApp.gender || "N/A"}</div>
                        <div>
                          <strong>Phone:</strong> {actionApp.phone || "N/A"}{" "}
                          <span style={{ fontSize: "11px", fontWeight: "700", color: actionApp.phoneVerified ? "#16a34a" : "#dc2626" }}>
                            ({actionApp.phoneVerified ? "✓ Verified" : "⚠️ Unverified Phone"})
                          </span>
                        </div>
                        <div><strong>Email:</strong> {actionApp.email || "N/A"}</div>
                      </div>

                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: "800", color: "var(--primary)", marginBottom: "4px" }}>📍 Address Details</div>
                        <div>{actionApp.street ? `${actionApp.street}, ` : ""}{actionApp.city}, {actionApp.district}, {actionApp.state || "Kerala"} - {actionApp.pincode}</div>
                      </div>

                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: "800", color: "var(--primary)", marginBottom: "4px" }}>🪪 Identification & Category</div>
                        <div><strong>Category:</strong> {actionApp.cardCategory || "Regular"}</div>
                        <div><strong>ID Type:</strong> {actionApp.idType} (<strong>No:</strong> {actionApp.idNumber})</div>
                        {actionApp.idProofUrl && <div><strong>Uploaded ID Proof:</strong> 📄 <code>{actionApp.idProofUrl}</code></div>}
                        
                        {actionApp.cardCategory === "Student" && (
                          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #cbd5e1" }}>
                            <div><strong>Institution:</strong> {actionApp.institutionName || "N/A"}</div>
                            {actionApp.studentIdUrl && <div><strong>Student ID Proof:</strong> 📄 <code>{actionApp.studentIdUrl}</code></div>}
                          </div>
                        )}
                      </div>

                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: "800", color: "var(--primary)", marginBottom: "4px" }}>🚌 Travel & Emergency Contact</div>
                        <div><strong>Frequent Route:</strong> {actionApp.frequentSource || "Any"} ➔ {actionApp.frequentDestination || "Any"}</div>
                        <div><strong>Preferred Time:</strong> {actionApp.preferredTime || "Morning"}</div>
                        <div><strong>Emergency Contact:</strong> {actionApp.emergencyName || "N/A"} ({actionApp.emergencyRelation || "Relative"}) - {actionApp.emergencyPhone || "N/A"}</div>
                      </div>

                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: "800", color: "var(--primary)", marginBottom: "4px" }}>💳 Wallet & Safety Settings</div>
                        <div><strong>Initial Wallet Balance:</strong> {actionApp.initialRecharge} AED/INR (Paid via {actionApp.paymentMethod})</div>
                        <div><strong>SOS Feature:</strong> {actionApp.enableSos ? "ENABLED ✅" : "DISABLED"} · <strong>Location Sharing:</strong> {actionApp.shareLocation ? "ENABLED ✅" : "DISABLED"}</div>
                      </div>

                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                      <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} className="rta-btn-secondary">
                        Close Details
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. APPROVAL MODAL */}
                {actionType === "approve" && (
                  <form onSubmit={handleApproveAppSubmit}>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#16a34a", marginBottom: "4px" }}>
                      ✅ Approve Application & Issue Card
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                      Assign an RFID/NFC Tag UID for applicant <strong>{actionApp.fullName}</strong> ({actionApp.applicationId}).
                    </p>

                    <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                      <label>Select Card Class / Tier</label>
                      <select className="rta-input-field" value={approveCardType} onChange={(e) => setApproveCardType(e.target.value)}>
                        <option value="Silver">Silver Card (Standard Rate)</option>
                        <option value="Gold">Gold Card (Premium Class)</option>
                        <option value="Blue">Blue Card (Student / Concession Pass)</option>
                      </select>
                    </div>

                    <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                      <label>RFID / NFC Hardware Tag UID (Hex or Tag Serial)</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          className="rta-input-field"
                          placeholder="e.g. 4A:2B:3C:4D or 047A221980"
                          value={approveRfidTag}
                          onChange={(e) => setApproveRfidTag(e.target.value.toUpperCase())}
                        />
                        <button
                          type="button"
                          className="rta-btn-secondary"
                          style={{ fontSize: "12px", whiteSpace: "nowrap" }}
                          onClick={() => {
                            const bytes = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0'));
                            setApproveRfidTag(bytes.join(":"));
                          }}
                        >
                          Gen Tag
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                      <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} className="rta-btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="rta-btn-primary" style={{ background: "#16a34a", width: "auto" }}>
                        Confirm Approval & Activate Card
                      </button>
                    </div>
                  </form>
                )}

                {/* 3. REJECTION MODAL */}
                {actionType === "reject" && (
                  <form onSubmit={handleRejectAppSubmit}>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#dc2626", marginBottom: "4px" }}>
                      ❌ Reject Application
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                      Enter the mandatory rejection reason to notify <strong>{actionApp.fullName}</strong>.
                    </p>

                    <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                      <label>Rejection Reason <span style={{ color: "#dc2626" }}>*</span></label>
                      <textarea
                        className="rta-input-field"
                        rows="3"
                        placeholder="e.g. Invalid ID proof provided or unreadable document image."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        required
                        style={{ fontFamily: "inherit" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                      <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} className="rta-btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="rta-btn-primary" style={{ background: "#dc2626", width: "auto" }}>
                        Confirm Rejection & Send SMS
                      </button>
                    </div>
                  </form>
                )}

                {/* 4. CORRECTION REQUEST MODAL */}
                {actionType === "correction" && (
                  <form onSubmit={handleCorrectionAppSubmit}>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#d97706", marginBottom: "4px" }}>
                      🔄 Request Application Correction
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                      Notify <strong>{actionApp.fullName}</strong> to update missing or invalid details.
                    </p>

                    <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                      <label>Correction Details / Instructions</label>
                      <textarea
                        className="rta-input-field"
                        rows="3"
                        placeholder="e.g. Please upload a valid Student ID card with current academic year."
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        style={{ fontFamily: "inherit" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                      <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} className="rta-btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="rta-btn-primary" style={{ background: "#d97706", width: "auto" }}>
                        Send Correction Request
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          )}

        </section>
      </main>

      {/* Footer Branding */}
      <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "40px 5%", borderTop: "3px solid var(--primary)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center", fontSize: "12px", color: "#717B87" }}>
          © {new Date().getFullYear()} MoveSmart Admin Console. Internal use only.
        </div>
      </footer>
    </div>
  );
}

export default Admin;