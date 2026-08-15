import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { getStoredUser, clearStoredSession, getStoredToken } from "../utils/session";
import AdminHeader from "../components/AdminHeader";
import AdminFooter from "../components/AdminFooter";
import AdminAddBusRoute from "./AdminAddBusRoute";
import DriverSafetyMonitoring from "../components/admin/DriverSafetyMonitoring";
import { addMinutesToTime, formatMinutesToDuration, calculateCumulativeOffsets } from "../utils/timeUtils";
import {
  LayoutDashboard,
  CreditCard,
  UserCheck,
  CalendarX,
  FileCheck,
  Bus,
  Users,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  CheckCircle,
  AlertCircle,
  Search,
  Check,
  X,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  Award,
  Phone,
  FileText,
  DollarSign,
  Route as RouteIcon,
  Zap,
  Navigation,
  Menu,
  Sliders,
  Calendar,
  AlertTriangle
} from "lucide-react";

export default function Admin({ defaultTab = "overview" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === "/admin/bus-routes" || location.pathname === "/admin/add-bus-route") {
      return "busRoutes";
    }
    return defaultTab;
  });

  useEffect(() => {
    if (location.pathname === "/admin/bus-routes" || location.pathname === "/admin/add-bus-route") {
      setActiveTab("busRoutes");
    }
  }, [location.pathname]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Live Emergency Safety Alert Banner State
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Real RFID & Stop States
  const [dbCards, setDbCards] = useState([]);
  const [dbStops, setDbStops] = useState([]);
  const [dbDistances, setDbDistances] = useState([]);

  // Simulation States
  const [simCardTag, setSimCardTag] = useState("");
  const [simStopCode, setSimStopCode] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState("");

  // Stop & Distance Form States
  const [newStopName, setNewStopName] = useState("");
  const [newStopCode, setNewStopCode] = useState("");
  const [distFromStop, setDistFromStop] = useState("");
  const [distToStop, setDistToStop] = useState("");
  const [distKm, setDistKm] = useState("");

  // Card Applications Admin States
  const [adminApplications, setAdminApplications] = useState([]);
  const [adminAppFilter, setAdminAppFilter] = useState("All");
  const [actionApp, setActionApp] = useState(null);
  const [actionType, setActionType] = useState(null); // 'details' | 'approve' | 'reject' | 'correction'
  const [approveRfidTag, setApproveRfidTag] = useState("");
  const [approveCardType, setApproveCardType] = useState("Silver");
  const [rejectReason, setRejectReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");

  // Driver Leaves, Verifications & Bus Requests States
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [leaveFilterStatus, setLeaveFilterStatus] = useState("All");
  const [selectedLeaveModal, setSelectedLeaveModal] = useState(null);
  const [leaveModalStatus, setLeaveModalStatus] = useState("Approved");
  const [leaveModalComment, setLeaveModalComment] = useState("");

  const [adminDrivers, setAdminDrivers] = useState([]);
  const [driverFilterStatus, setDriverFilterStatus] = useState("All");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [selectedDriverForVerify, setSelectedDriverForVerify] = useState(null);
  const [driverVerifyNote, setDriverVerifyNote] = useState("");
  const [zoomImage, setZoomImage] = useState(null);

  const [adminBusRequests, setAdminBusRequests] = useState([]);
  const [selectedBusReqModal, setSelectedBusReqModal] = useState(null);
  const [busReqModalStatus, setBusReqModalStatus] = useState("Approved");
  const [busReqModalComment, setBusReqModalComment] = useState("");

  // Safety Alerts State
  const [safetyAlertsCount, setSafetyAlertsCount] = useState(0);
  const fetchSafetyAlertsCount = useCallback(async () => {
    try {
      const res = await axios.get("/api/monitoring/stats");
      if (res.data?.stats?.activeAlertsCount !== undefined) {
        setSafetyAlertsCount(res.data.stats.activeAlertsCount);
      }
    } catch (err) {
      // Non-blocking
    }
  }, []);

  // Passengers & Wallet Page States
  const [passengerSearchQuery, setPassengerSearchQuery] = useState("");
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [passengerAddMoneyAmt, setPassengerAddMoneyAmt] = useState("");
  const [passengerTxnHistory, setPassengerTxnHistory] = useState([]);

  // Card Balance Adjustments State
  const [adminAdjustAmount, setAdminAdjustAmount] = useState({});

  // Fetch Drivers
  const fetchAdminDrivers = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/drivers", {
        headers: { Authorization: `Bearer ${getStoredToken()}` }
      });
      setAdminDrivers(res.data.drivers || []);
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  }, []);

  // Fetch Bus Requests
  const fetchAdminBusRequests = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/bus-requests", {
        headers: { Authorization: `Bearer ${getStoredToken()}` }
      });
      setAdminBusRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching bus requests:", err);
    }
  }, []);

  // Fetch Driver Leaves
  const fetchAdminLeaves = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/leaves", {
        headers: { Authorization: `Bearer ${getStoredToken()}` }
      });
      setAdminLeaves(res.data.leaves || []);
    } catch (err) {
      console.error("Error fetching driver leaves:", err);
    }
  }, []);

  // Fetch Card Applications
  const fetchAdminApplications = useCallback(async () => {
    try {
      const res = await axios.get("/api/rfid/applications");
      setAdminApplications(res.data || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  }, []);

  // Fetch RFID Cards & Stops
  const fetchAdminRfidData = useCallback(async () => {
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
      console.error("Error fetching RFID data:", err);
    }
  }, []);

  useEffect(() => {
    fetchAdminApplications();
    fetchAdminRfidData();
    fetchAdminLeaves();
    fetchAdminDrivers();
    fetchAdminBusRequests();
    fetchSafetyAlertsCount();
  }, [fetchAdminApplications, fetchAdminRfidData, fetchAdminLeaves, fetchAdminDrivers, fetchAdminBusRequests, fetchSafetyAlertsCount]);

  // Real-Time Socket.IO Safety Alert Ingestion for Global Admin Dashboard
  useEffect(() => {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      socket.emit("join-admin-safety");
    });

    const handleSafetyAlert = (alertDoc) => {
      // Increment unread badge in real time
      setSafetyAlertsCount((prev) => prev + 1);

      // Play alert audio chime
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          if (alertDoc.severity === "Critical") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          } else {
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          }
        }
      } catch (e) {}

      // Show top emergency alert banner on screen
      if (alertDoc.severity === "Critical" || alertDoc.severity === "High") {
        setActiveEmergencyAlert(alertDoc);
        showToast(`🚨 ${alertDoc.title} on Bus ${alertDoc.busNumber || "KL-07-MS-1008"}!`, "error");
      } else if (alertDoc.status === "Active") {
        showToast(`⚠️ ${alertDoc.title} (Bus ${alertDoc.busNumber || "KL-07-MS-1008"})`, "warning");
      }
    };

    socket.on("safety:alert", handleSafetyAlert);
    socket.on("admin:safety-alert", handleSafetyAlert);

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handler: Update Bus Request Status
  const handleUpdateBusRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBusReqModal) return;
    try {
      const res = await axios.put(`/api/admin/bus-request/${selectedBusReqModal._id}/status`, {
        status: busReqModalStatus,
        adminComment: busReqModalComment || (busReqModalStatus === "Approved" ? "Driver bus assignment approved by Admin." : "Driver bus assignment request rejected."),
      }, {
        headers: { Authorization: `Bearer ${getStoredToken()}` }
      });
      showToast(res.data.message || `Bus request ${busReqModalStatus}!`);
      setSelectedBusReqModal(null);
      setBusReqModalComment("");
      fetchAdminBusRequests();
      fetchAdminDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update bus request", "error");
    }
  };

  // Handler: Update Leave Status
  const handleUpdateLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeaveModal) return;
    try {
      await axios.put(`/api/admin/leave/${selectedLeaveModal._id}/status`, {
        status: leaveModalStatus,
        adminComment: leaveModalComment || (leaveModalStatus === "Approved" ? "Leave application approved by Admin." : "Leave application rejected."),
      }, {
        headers: { Authorization: `Bearer ${getStoredToken()}` }
      });
      showToast(`Leave application ${leaveModalStatus} successfully!`);
      setSelectedLeaveModal(null);
      setLeaveModalComment("");
      fetchAdminLeaves();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update leave status", "error");
    }
  };

  // Handler: Driver Verification Update
  const handleUpdateDriverVerification = async (driverId, status, noteInput = null) => {
    try {
      const note = noteInput !== null
        ? noteInput
        : (status === "Approved" ? "Driving license and profile picture verified & approved by Admin." : "Driving license verification rejected.");

      await axios.put(`/api/admin/driver/${driverId}/verification`, {
        status,
        note: note || "",
      }, {
        headers: { Authorization: `Bearer ${getStoredToken()}` }
      });
      showToast(`Driver verification ${status === "Approved" ? "APPROVED ✅" : "REJECTED ❌"}!`);
      setSelectedDriverForVerify(null);
      fetchAdminDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update driver verification", "error");
    }
  };

  // Card Adjustments
  const handleAdminAdjustBalance = async (cardId, type) => {
    const amt = parseFloat(adminAdjustAmount[cardId]);
    if (!amt || amt <= 0) {
      showToast("Please enter a valid balance amount", "error");
      return;
    }
    try {
      await axios.post("/api/rfid/adjust-balance", { cardId, amount: amt, type });
      setAdminAdjustAmount({ ...adminAdjustAmount, [cardId]: "" });
      fetchAdminRfidData();
      showToast(`Card balance ${type === "credit" ? "credited" : "debited"} by ₹${amt}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to adjust balance", "error");
    }
  };

  const handleAdminToggleCardStatus = async (cardId) => {
    try {
      const res = await axios.post("/api/rfid/toggle-status", { cardId });
      fetchAdminRfidData();
      showToast(res.data.message || "Card status toggled successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to toggle card status", "error");
    }
  };

  // Stops & Distances
  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!newStopName || !newStopCode) return;
    try {
      await axios.post("/api/rfid/stops", { name: newStopName, code: newStopCode });
      showToast(`Stop "${newStopName}" added successfully.`);
      setNewStopName("");
      setNewStopCode("");
      fetchAdminRfidData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add stop", "error");
    }
  };

  const handleAddDistance = async (e) => {
    e.preventDefault();
    if (!distFromStop || !distToStop || !distKm) return;
    if (distFromStop === distToStop) {
      showToast("From and To stops must be different", "error");
      return;
    }
    try {
      await axios.post("/api/rfid/distances", {
        fromStopId: distFromStop,
        toStopId: distToStop,
        distanceKm: Number(distKm)
      });
      showToast("Distance saved successfully.");
      setDistKm("");
      fetchAdminRfidData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to set distance", "error");
    }
  };

  const handleReSeed = async () => {
    if (!window.confirm("Clear and re-populate all stops/distances to default values?")) return;
    try {
      await axios.post("/api/rfid/seed");
      showToast("System route data seeded successfully!");
      fetchAdminRfidData();
    } catch (err) {
      showToast("Failed to seed: " + err.message, "error");
    }
  };

  // Simulate RFID Tap
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
      showToast("Simulated RFID Tap executed successfully!");
    } catch (err) {
      setSimError(err.response?.data?.message || "Tap rejected by system.");
      if (err.response?.data) setSimResult(err.response.data);
      fetchAdminRfidData();
    }
  };

  // Card Application Handlers
  const handleApproveAppSubmit = async (e) => {
    e.preventDefault();
    if (!actionApp) return;
    try {
      const res = await axios.post(`/api/rfid/applications/${actionApp._id}/approve`, {
        rfidTag: approveRfidTag,
        cardType: approveCardType,
      });
      showToast(res.data.message || "Application Approved & RFID Card Activated!");
      setActionApp(null);
      setActionType(null);
      setApproveRfidTag("");
      fetchAdminApplications();
      fetchAdminRfidData();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to approve application", "error");
    }
  };

  const handleRejectAppSubmit = async (e) => {
    e.preventDefault();
    if (!actionApp || !rejectReason.trim()) {
      showToast("Rejection reason is required", "error");
      return;
    }
    try {
      const res = await axios.post(`/api/rfid/applications/${actionApp._id}/reject`, {
        reason: rejectReason.trim(),
      });
      showToast(res.data.message || "Application Rejected");
      setActionApp(null);
      setActionType(null);
      setRejectReason("");
      fetchAdminApplications();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to reject application", "error");
    }
  };

  const handleCorrectionAppSubmit = async (e) => {
    e.preventDefault();
    if (!actionApp) return;
    try {
      const res = await axios.post(`/api/rfid/applications/${actionApp._id}/correction`, {
        note: correctionNote.trim(),
      });
      showToast(res.data.message || "Correction Request Sent");
      setActionApp(null);
      setActionType(null);
      setCorrectionNote("");
      fetchAdminApplications();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to send correction note", "error");
    }
  };

  // Passenger Quick Top Up Handler
  const handleAddPassengerMoney = async (cardObj, amountToAdd) => {
    if (!cardObj || !amountToAdd || Number(amountToAdd) <= 0) return;
    try {
      await axios.post("/api/rfid/adjust-balance", { cardId: cardObj._id, amount: Number(amountToAdd), type: "credit" });
      fetchAdminRfidData();
      showToast(`Added ₹${amountToAdd} to ${cardObj.cardNumber}`);
      setPassengerAddMoneyAmt("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add money", "error");
    }
  };

  // CSV Data Export Helper
  const handleExportCSV = (type) => {
    let exportData = [];
    let filename = `MoveSmart_${type}_${new Date().toISOString().split("T")[0]}`;

    if (type === "cards") {
      exportData = dbCards.map(c => ({
        CardNumber: c.cardNumber,
        RFIDTag: c.rfidTag,
        CardType: c.cardType,
        Balance: c.balance,
        Status: c.status,
        UserEmail: c.user?.email || "Unassigned"
      }));
    } else if (type === "applications") {
      exportData = adminApplications.map(a => ({
        ApplicantName: a.fullName,
        Email: a.email,
        CardType: a.requestedCardType,
        IsStudent: a.isStudent ? "Yes" : "No",
        Status: a.status,
        AppliedDate: new Date(a.createdAt).toLocaleDateString()
      }));
    } else if (type === "drivers") {
      exportData = adminDrivers.map(d => ({
        Name: d.name,
        Email: d.email,
        License: d.licenseNumber || "N/A",
        Experience: d.experienceYears || 0,
        Status: d.verificationStatus
      }));
    }

    if (!exportData.length) {
      showToast("No data available to export", "error");
      return;
    }

    const headers = Object.keys(exportData[0]).join(",");
    const rows = exportData.map(obj => Object.values(obj).map(v => `"${v}"`).join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${exportData.length} records to ${filename}.csv`);
  };

  // Filtered Arrays
  const filteredDrivers = adminDrivers.filter((d) => {
    const matchesStatus = driverFilterStatus === "All" || d.verificationStatus === driverFilterStatus;
    const q = driverSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || (d.name && d.name.toLowerCase().includes(q)) || (d.email && d.email.toLowerCase().includes(q)) || (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  const filteredPassengers = dbCards.filter((c) => {
    const q = passengerSearchQuery.toLowerCase().trim();
    return !q || (c.cardNumber && c.cardNumber.toLowerCase().includes(q)) || (c.rfidTag && c.rfidTag.toLowerCase().includes(q)) || (c.user?.email && c.user.email.toLowerCase().includes(q));
  });

  const pendingAppsCount = adminApplications.filter(a => a.status === "Pending").length;
  const pendingBusReqsCount = adminBusRequests.filter(r => r.status === "Pending").length;
  const pendingDriversCount = adminDrivers.filter(d => d.verificationStatus === "Pending").length;
  const totalNotificationCount = pendingAppsCount + pendingBusReqsCount + pendingDriversCount + safetyAlertsCount;

  // Background Theme Colors
  const bgMain = darkMode ? "#0f172a" : "#f8fafc";
  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const textPrimary = darkMode ? "#f8fafc" : "#1e293b";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";
  const borderCol = darkMode ? "#334155" : "#e2e8f0";

  return (
    <div style={{ minHeight: "100vh", background: bgMain, color: textPrimary, fontFamily: "'Inter', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Toast Notification Container */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 10000,
          background: toast.type === "error" ? "#dc2626" : "#0f172a",
          color: "#ffffff",
          padding: "14px 22px",
          borderRadius: "14px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
          borderLeft: `4px solid ${toast.type === "error" ? "#ef4444" : "#4ade80"}`,
          fontWeight: "700",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "slideIn 0.3s ease",
        }}>
          <span>{toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}</span>
          {toast.message}
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header style={{
        height: "70px",
        background: darkMode ? "#1e293b" : "#ffffff",
        borderBottom: `1px solid ${borderCol}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ background: "none", border: "none", cursor: "pointer", color: textPrimary, display: "flex", alignItems: "center" }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                boxShadow: "0 4px 14px rgba(109, 40, 217, 0.15)",
                border: "1.5px solid rgba(139, 92, 246, 0.3)",
                flexShrink: 0,
              }}
            >
              <img src="/logo.png" alt="MoveSmart Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <strong style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "-0.4px", color: textPrimary, display: "block", lineHeight: 1.1 }}>MoveSmart</strong>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#8b5cf6", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "2px", display: "block" }}>Admin Console</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>

          {/* Notifications Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              style={{ background: "none", border: `1px solid ${borderCol}`, width: "40px", height: "40px", borderRadius: "12px", cursor: "pointer", color: textPrimary, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              <Bell size={18} />
              {totalNotificationCount > 0 && (
                <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#ef4444", color: "#ffffff", fontSize: "10.5px", fontWeight: "900", width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {totalNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {notificationOpen && (
              <div style={{ position: "absolute", right: 0, top: "50px", width: "320px", background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "16px", boxShadow: "0 12px 30px rgba(0,0,0,0.15)", padding: "16px", zIndex: 1001 }}>
                <h4 style={{ fontSize: "14.5px", fontWeight: "900", margin: "0 0 12px 0", color: textPrimary, borderBottom: `1px solid ${borderCol}`, paddingBottom: "8px" }}>
                  System Notifications
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                  {safetyAlertsCount > 0 && (
                    <div onClick={() => { setActiveTab("driverSafety"); setNotificationOpen(false); }} style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                      <ShieldAlert size={14} style={{ color: "#ef4444" }} /> <strong>{safetyAlertsCount} Driver Safety Alerts</strong> active
                    </div>
                  )}
                  <div onClick={() => { setActiveTab("applications"); setNotificationOpen(false); }} style={{ padding: "8px 12px", borderRadius: "10px", background: darkMode ? "#334155" : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileCheck size={14} style={{ color: "#0ea5e9" }} /> <strong>{pendingAppsCount} Card Applications</strong> pending
                  </div>
                  <div onClick={() => { setActiveTab("drivers"); setNotificationOpen(false); }} style={{ padding: "8px 12px", borderRadius: "10px", background: darkMode ? "#334155" : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserCheck size={14} style={{ color: "#8b5cf6" }} /> <strong>{pendingDriversCount} Driver Licenses</strong> awaiting review
                  </div>
                  <div onClick={() => { setActiveTab("busRequests"); setNotificationOpen(false); }} style={{ padding: "8px 12px", borderRadius: "10px", background: darkMode ? "#334155" : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Bus size={14} style={{ color: "#10b981" }} /> <strong>{pendingBusReqsCount} Bus Assignment Requests</strong> pending
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{ background: "none", border: `1px solid ${borderCol}`, padding: "8px 14px", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontWeight: "700", color: textPrimary, display: "flex", alignItems: "center", gap: "6px" }}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />} {darkMode ? "Light" : "Dark"}
          </button>

          {/* Admin Profile & Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", borderLeft: `1px solid ${borderCol}`, paddingLeft: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13.5px", fontWeight: "800", color: textPrimary }}>{user?.fullName || user?.name || "System Admin"}</div>
              <div style={{ fontSize: "11px", color: textSecondary }}>{user?.email || "admin@movesmart.com"}</div>
            </div>
            <button
              onClick={() => { clearStoredSession(); setUser(null); navigate("/"); }}
              style={{ background: "rgba(225, 29, 72, 0.1)", color: "#dc2626", border: "1px solid rgba(225, 29, 72, 0.3)", padding: "8px 14px", borderRadius: "10px", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      {/* BODY LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div style={{ display: "flex", flex: 1 }}>

        {/* LEFT SIDEBAR NAVIGATION */}
        <aside style={{
          width: sidebarCollapsed ? "72px" : "260px",
          transition: "all 0.25s ease",
          background: darkMode ? "#1e293b" : "#ffffff",
          borderRight: `1px solid ${borderCol}`,
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          flexShrink: 0
        }}>
          {[
            { id: "overview", label: "Dashboard Overview", Icon: LayoutDashboard },
            { id: "driverSafety", label: "Driver Safety Monitoring", Icon: ShieldAlert, badge: safetyAlertsCount },
            { id: "busRoutes", label: "Bus Routes & Schedules", Icon: Bus },
            { id: "applications", label: "Card Applications", Icon: FileCheck, badge: pendingAppsCount },
            { id: "cards", label: "RFID Card Portal", Icon: CreditCard },
            { id: "passengers", label: "Passengers & Wallet", Icon: Users },
            { id: "drivers", label: "Driver Management", Icon: UserCheck, badge: pendingDriversCount },
            { id: "busRequests", label: "Bus Requests", Icon: Bus, badge: pendingBusReqsCount },
            { id: "transactions", label: "Payments & Logs", Icon: Wallet },
            { id: "leaves", label: "Driver Leaves", Icon: CalendarX },
            { id: "settings", label: "Settings & Tools", Icon: ShieldCheck },
          ].map((item) => {
            const isSel = activeTab === item.id;
            const ItemIcon = item.Icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: sidebarCollapsed ? "center" : "space-between",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "none",
                  background: isSel ? "linear-gradient(135deg, #2e1065, #6d28d9)" : "transparent",
                  color: isSel ? "#ffffff" : textSecondary,
                  fontWeight: isSel ? "900" : "700",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <ItemIcon size={18} style={{ color: isSel ? "#ffffff" : textSecondary }} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>

                {!sidebarCollapsed && item.badge > 0 && (
                  <span style={{ background: isSel ? "#4ade80" : "#ef4444", color: isSel ? "#1e1b4b" : "#ffffff", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "900" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main style={{ flex: 1, padding: "28px", overflowY: "auto" }}>

          {/* CRITICAL LIVE EMERGENCY SAFETY BANNER */}
          {activeEmergencyAlert && (
            <div style={{
              background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
              color: "#ffffff",
              padding: "18px 24px",
              borderRadius: "18px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              boxShadow: "0 10px 30px rgba(220, 38, 38, 0.4)",
              border: "2px solid #ef4444",
              animation: "pulse 2s infinite ease-in-out",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  flexShrink: 0,
                }}>
                  🚨
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ background: "#ef4444", color: "#ffffff", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "900", letterSpacing: "0.5px" }}>
                      LIVE SAFETY ALERT
                    </span>
                    <strong style={{ fontSize: "16.5px" }}>
                      Bus {activeEmergencyAlert.busNumber || "KL-07-MS-1008"} — {activeEmergencyAlert.driverName || "Driver"}
                    </strong>
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#fecaca", marginTop: "4px", fontWeight: "600" }}>
                    {activeEmergencyAlert.title || "AI Drowsiness Warning Detected"} • {activeEmergencyAlert.description}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => {
                    setActiveTab("driverSafety");
                    setActiveEmergencyAlert(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    color: "#991b1b",
                    fontSize: "13px",
                    fontWeight: "900",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  📹 Inspect Live Stream &amp; Driver →
                </button>
                <button
                  onClick={() => setActiveEmergencyAlert(null)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Dismiss ✕
                </button>
              </div>
            </div>
          )}

          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {activeTab === "overview" && (
            <div className="fade-in-section">

              {/* MoveSmart Offset Bus Timing & Schedule Banner */}
              <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", color: "#ffffff", padding: "20px 24px", borderRadius: "20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", boxShadow: "0 8px 24px rgba(49, 16, 66, 0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(74, 222, 128, 0.2)", color: "#4ade80", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>
                    ⚡ MoveSmart Bus Timing Engine Active
                  </div>
                  <h3 style={{ fontSize: "19px", fontWeight: "900", margin: 0, color: "#ffffff" }}>
                    📍 Bus Route Offset Timings &amp; Departure Schedule System
                  </h3>
                  <p style={{ color: "#c4b5fd", fontSize: "13px", marginTop: "4px", margin: 0, maxWidth: "650px" }}>
                    Define incremental travel minutes between stops. Offsets, total duration, and live stop arrival timetables auto-calculate for any departure schedule.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setActiveTab("busRoutes")}
                    style={{
                      padding: "12px 24px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "800",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
                    }}
                  >
                    Manage Bus Routes &amp; Schedules →
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: textPrimary }}>System Executive Summary</h2>
                  <p style={{ fontSize: "13.5px", color: textSecondary, margin: "4px 0 0 0" }}>Live analytics, operational state, and passenger transit grid statistics.</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handleExportCSV("cards")} style={{ padding: "8px 16px", borderRadius: "12px", background: "rgba(109, 40, 217, 0.1)", color: "#6d28d9", border: "1px solid rgba(109, 40, 217, 0.3)", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                    📥 Export Cards CSV
                  </button>
                  <button onClick={() => handleExportCSV("applications")} style={{ padding: "8px 16px", borderRadius: "12px", background: "rgba(34, 197, 94, 0.1)", color: "#16a34a", border: "1px solid rgba(34, 197, 94, 0.3)", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                    📥 Export Applications CSV
                  </button>
                </div>
              </div>

              {/* 5 Summary Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                {[
                  { title: "Total Passengers", val: dbCards.length + adminApplications.length, icon: "👥", color: "#6d28d9", bg: "rgba(109, 40, 217, 0.08)", trend: "+14% this month" },
                  { title: "Active RFID Cards", val: dbCards.filter(c => c.status === "Active").length, icon: "💳", color: "#16a34a", bg: "rgba(22, 163, 74, 0.08)", trend: "Operational" },
                  { title: "Pending Applications", val: pendingAppsCount, icon: "📥", color: "#d97706", bg: "rgba(217, 119, 6, 0.08)", trend: "Action Required" },
                  { title: "Verified Drivers", val: adminDrivers.filter(d => d.verificationStatus === "Approved").length, icon: "🧑✈️", color: "#2563eb", bg: "rgba(37, 99, 235, 0.08)", trend: "On Duty" },
                  { title: "Today's Revenue", val: `₹ ${(dbCards.reduce((acc, c) => acc + (c.balance || 0), 0) * 1.5).toFixed(2)}`, icon: "💰", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.08)", trend: "Live MongoDB" },
                ].map((card, idx) => (
                  <div key={idx} style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}`, boxShadow: "0 8px 20px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>{card.title}</span>
                      <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                        {card.icon}
                      </div>
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary, letterSpacing: "-0.5px" }}>{card.val}</div>
                    <div style={{ fontSize: "11.5px", fontWeight: "800", color: card.color, marginTop: "6px" }}>{card.trend}</div>
                  </div>
                ))}
              </div>

              {/* Analytics & Graphs Section */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px", marginBottom: "32px" }}>

                {/* 1. Daily Transactions Volume Visual Bar */}
                <div style={{ background: bgCard, borderRadius: "24px", padding: "24px", border: `1px solid ${borderCol}` }}>
                  <h3 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 4px 0", color: textPrimary }}>📈 Daily Passenger Tap Volume</h3>
                  <p style={{ fontSize: "12.5px", color: textSecondary, margin: "0 0 20px 0" }}>Weekly breakdown of bus tap-ins across express &amp; feeder routes.</p>

                  <div style={{ display: "flex", alignItems: "flex-end", justifyBetween: "space-between", gap: "14px", height: "180px", paddingTop: "20px" }}>
                    {[
                      { day: "Mon", height: "65%", val: "1,240" },
                      { day: "Tue", height: "80%", val: "1,520" },
                      { day: "Wed", height: "90%", val: "1,840" },
                      { day: "Thu", height: "75%", val: "1,410" },
                      { day: "Fri", height: "95%", val: "1,980" },
                      { day: "Sat", height: "60%", val: "1,150" },
                      { day: "Sun", height: "50%", val: "950" },
                    ].map((b, idx) => (
                      <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10.5px", color: textSecondary, fontWeight: "700" }}>{b.val}</span>
                        <div style={{ width: "100%", height: b.height, borderRadius: "10px", background: "linear-gradient(180deg, #a78bfa 0%, #6d28d9 100%)" }} />
                        <span style={{ fontSize: "11.5px", fontWeight: "800", color: textPrimary }}>{b.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Passenger Growth & Pass Distribution */}
                <div style={{ background: bgCard, borderRadius: "24px", padding: "24px", border: `1px solid ${borderCol}` }}>
                  <h3 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 4px 0", color: textPrimary }}>🎓 Smart Pass Distribution</h3>
                  <p style={{ fontSize: "12.5px", color: textSecondary, margin: "0 0 20px 0" }}>Active RFID smart pass ratio by category.</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[
                      { label: "Silver Regular Pass (Standard Fare)", pct: "58%", color: "#6d28d9" },
                      { label: "Blue Student Pass (0.9x Concession)", pct: "28%", color: "#2563eb" },
                      { label: "Gold Express Pass (1.5x Premium)", pct: "14%", color: "#d97706" },
                    ].map((st, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "800", color: textPrimary, marginBottom: "6px" }}>
                          <span>{st.label}</span>
                          <span style={{ color: st.color }}>{st.pct}</span>
                        </div>
                        <div style={{ width: "100%", height: "10px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{ width: st.pct, height: "100%", background: st.color, borderRadius: "999px" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Recent Activities Log Panel */}
              <div style={{ background: bgCard, borderRadius: "24px", padding: "24px", border: `1px solid ${borderCol}` }}>
                <h3 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 16px 0", color: textPrimary }}>⚡ Live System Activity Stream</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {dbCards.slice(0, 4).map((c, idx) => (
                    <div key={idx} style={{ padding: "12px 16px", borderRadius: "14px", background: darkMode ? "#334155" : "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>💳</span>
                        <div>
                          <strong style={{ fontSize: "13.5px", color: textPrimary, display: "block" }}>Card {c.cardNumber} Updated</strong>
                          <span style={{ fontSize: "11.5px", color: textSecondary }}>Balance: ₹{c.balance.toFixed(2)} • {c.cardType} Nol Pass</span>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", padding: "3px 8px", borderRadius: "6px" }}>Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: CARD APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="fade-in-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: textPrimary }}>📥 Card Applications Management</h2>
                  <p style={{ fontSize: "13px", color: textSecondary, margin: "4px 0 0 0" }}>Review submitted student and regular Nol Smart Card applications.</p>
                </div>
                <button onClick={fetchAdminApplications} style={{ padding: "8px 16px", borderRadius: "12px", background: "#f1f5f9", border: "1px solid #cbd5e1", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                  🔄 Refresh List
                </button>
              </div>

              {/* Status Filters */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
                {["All", "Pending", "Approved", "Rejected", "Correction Needed"].map((st) => {
                  const isSel = adminAppFilter === st;
                  const count = st === "All" ? adminApplications.length : adminApplications.filter(a => a.status === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => setAdminAppFilter(st)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: `1.5px solid ${isSel ? "#6d28d9" : borderCol}`,
                        background: isSel ? "linear-gradient(135deg, #2e1065, #4c1d95)" : bgCard,
                        color: isSel ? "#ffffff" : textSecondary,
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      {st} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Applications Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {adminApplications.filter(a => adminAppFilter === "All" || a.status === adminAppFilter).length === 0 ? (
                  <div style={{ background: bgCard, borderRadius: "20px", padding: "40px", textAlign: "center", border: `1px dashed ${borderCol}`, color: textSecondary }}>
                    No applications found under the "{adminAppFilter}" status filter.
                  </div>
                ) : (
                  adminApplications
                    .filter(a => adminAppFilter === "All" || a.status === adminAppFilter)
                    .map((app) => (
                      <div key={app._id} style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "16px", color: textPrimary }}>{app.fullName}</strong>
                            <span style={{ fontSize: "12px", color: textSecondary }}>({app.email})</span>
                            <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 10px", borderRadius: "999px", background: "rgba(109, 40, 217, 0.1)", color: "#6d28d9" }}>
                              {app.requestedCardType} Pass
                            </span>
                            {app.isStudent && (
                              <span style={{ fontSize: "11px", fontWeight: "900", padding: "3px 10px", borderRadius: "999px", background: "rgba(37, 99, 235, 0.12)", color: "#2563eb", border: "1px solid rgba(37, 99, 235, 0.3)" }}>
                                🎓 Student ID Uploaded
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: "12.5px", color: textSecondary, marginTop: "6px" }}>
                            Applied on: {new Date(app.createdAt).toLocaleDateString()} | Phone: {app.phone || "N/A"}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => { setActionApp(app); setActionType("details"); }}
                            style={{ padding: "8px 14px", borderRadius: "10px", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", border: "1px solid rgba(37, 99, 235, 0.3)", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                          >
                            👁️ View Details
                          </button>

                          {app.status === "Pending" && (
                            <>
                              <button
                                onClick={() => { setActionApp(app); setActionType("approve"); setApproveCardType(app.requestedCardType || "Silver"); }}
                                style={{ padding: "8px 14px", borderRadius: "10px", background: "#16a34a", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                              >
                                ✓ Approve &amp; Activate
                              </button>
                              <button
                                onClick={() => { setActionApp(app); setActionType("reject"); }}
                                style={{ padding: "8px 14px", borderRadius: "10px", background: "rgba(225, 29, 72, 0.1)", color: "#dc2626", border: "1px solid rgba(225, 29, 72, 0.3)", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: RFID CARD MANAGEMENT */}
          {activeTab === "cards" && (
            <div className="fade-in-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: textPrimary }}>💳 RFID Card Directory &amp; Reader Simulator</h2>
                  <p style={{ fontSize: "13px", color: textSecondary, margin: "4px 0 0 0" }}>Manage active cards, credit balances, block cards, and simulate reader taps.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>

                {/* Left: Card Directory */}
                <div>
                  <div style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}` }}>
                    <h3 style={{ fontSize: "16.5px", fontWeight: "900", margin: "0 0 14px 0", color: textPrimary }}>Issued Smart Cards</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {dbCards.map((c) => (
                        <div key={c._id} style={{ padding: "14px", borderRadius: "14px", background: darkMode ? "#334155" : "#f8fafc", border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "14px", color: textPrimary, display: "block" }}>{c.cardNumber}</strong>
                            <span style={{ fontSize: "11.5px", color: textSecondary, fontFamily: "monospace" }}>RFID: {c.rfidTag} • {c.cardType}</span>
                            <div style={{ fontSize: "15px", fontWeight: "900", color: "#16a34a", marginTop: "2px" }}>₹ {c.balance.toFixed(2)}</div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="number"
                              placeholder="Amt"
                              style={{ width: "65px", padding: "6px", borderRadius: "8px", border: `1px solid ${borderCol}`, fontSize: "12px" }}
                              value={adminAdjustAmount[c._id] || ""}
                              onChange={(e) => setAdminAdjustAmount({ ...adminAdjustAmount, [c._id]: e.target.value })}
                            />
                            <button onClick={() => handleAdminAdjustBalance(c._id, "credit")} style={{ padding: "6px 10px", borderRadius: "8px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", fontSize: "11px", cursor: "pointer" }}>+ Add</button>
                            <button onClick={() => handleAdminToggleCardStatus(c._id)} style={{ padding: "6px 10px", borderRadius: "8px", background: c.status === "Active" ? "rgba(225, 29, 72, 0.1)" : "rgba(34, 197, 94, 0.1)", color: c.status === "Active" ? "#dc2626" : "#16a34a", border: "none", fontWeight: "800", fontSize: "11px", cursor: "pointer" }}>
                              {c.status === "Active" ? "Block" : "Activate"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: RFID Tap Simulator */}
                <div>
                  <div style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}` }}>
                    <h3 style={{ fontSize: "16.5px", fontWeight: "900", margin: "0 0 8px 0", color: textPrimary }}>📡 Live RFID Tap Simulator</h3>
                    <p style={{ fontSize: "12.5px", color: textSecondary, marginBottom: "16px" }}>Test physical RFID reader tap-in &amp; tap-out fare calculations.</p>

                    <form onSubmit={handleSimulateTap}>
                      <div className="rta-input-group" style={{ marginBottom: "12px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Select RFID Card</label>
                        <select className="rta-input-field" value={simCardTag} onChange={(e) => setSimCardTag(e.target.value)}>
                          <option value="">-- Choose Card --</option>
                          {dbCards.map(c => <option key={c._id} value={c.rfidTag}>{c.cardNumber} ({c.cardType} - {c.rfidTag})</option>)}
                        </select>
                      </div>

                      <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Select Bus Stop</label>
                        <select className="rta-input-field" value={simStopCode} onChange={(e) => setSimStopCode(e.target.value)}>
                          <option value="">-- Choose Stop --</option>
                          {dbStops.map(s => <option key={s._id} value={s.code}>{s.name} ({s.code})</option>)}
                        </select>
                      </div>

                      <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#fff", border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}>
                        Simulate RFID Reader Tap →
                      </button>

                      {simError && <div style={{ color: "#dc2626", fontSize: "12.5px", marginTop: "12px", fontWeight: "700" }}>⚠️ {simError}</div>}
                    </form>

                    {simResult && (
                      <div style={{ marginTop: "16px", padding: "14px", background: "#1e293b", borderRadius: "14px", color: "#38bdf8", fontFamily: "monospace", fontSize: "12px" }}>
                        <strong style={{ color: "#34d399", display: "block", marginBottom: "4px" }}>Output: {simResult.action}</strong>
                        <div style={{ color: "#ffffff" }}>{simResult.message}</div>
                        {simResult.card && <div style={{ color: "#94a3b8", marginTop: "4px" }}>New Balance: ₹{simResult.card.balance}</div>}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SECTION 4: PASSENGERS & WALLET */}
          {activeTab === "passengers" && (
            <div className="fade-in-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: textPrimary }}>👥 Passengers &amp; Wallet Management</h2>
                  <p style={{ fontSize: "13px", color: textSecondary, margin: "4px 0 0 0" }}>Search registered passengers, view detailed Google Pay style history, and add wallet funds.</p>
                </div>
                <input
                  type="text"
                  className="rta-input-field"
                  placeholder="🔍 Search card, email, tag..."
                  value={passengerSearchQuery}
                  onChange={(e) => setPassengerSearchQuery(e.target.value)}
                  style={{ width: "260px", padding: "8px 14px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {filteredPassengers.map((card) => (
                  <div key={card._id} style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "900", color: "#6d28d9", textTransform: "uppercase" }}>{card.cardType} Nol Pass</span>
                        <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "999px", background: card.status === "Active" ? "rgba(34, 197, 94, 0.12)" : "rgba(225, 29, 72, 0.12)", color: card.status === "Active" ? "#16a34a" : "#dc2626" }}>
                          {card.status}
                        </span>
                      </div>

                      <strong style={{ fontSize: "16px", color: textPrimary, display: "block" }}>Card: {card.cardNumber}</strong>
                      <div style={{ fontSize: "12.5px", color: textSecondary, marginTop: "2px" }}>User: {card.user?.email || "Passenger"}</div>
                      <div style={{ fontSize: "24px", fontWeight: "900", color: textPrimary, margin: "10px 0" }}>₹ {card.balance.toFixed(2)}</div>
                    </div>

                    <button
                      onClick={() => setSelectedPassenger(card)}
                      style={{ width: "100%", padding: "10px", borderRadius: "12px", background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#fff", border: "none", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}
                    >
                      👁️ View Profile &amp; Add Money →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: DRIVER MANAGEMENT */}
          {activeTab === "drivers" && (
            <div className="fade-in-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: textPrimary }}>🧑✈️ Driver Management &amp; Verifications</h2>
                  <p style={{ fontSize: "13px", color: textSecondary, margin: "4px 0 0 0" }}>Inspect driver licenses, verify profile details, and approve driving rights.</p>
                </div>
              </div>

              {/* Driver Filter Tabs */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
                {[
                  { id: "All", label: "All Drivers", count: adminDrivers.length },
                  { id: "Pending", label: "⏳ Pending Verification", count: pendingDriversCount },
                  { id: "Approved", label: "✅ Approved Drivers", count: adminDrivers.filter(d => d.verificationStatus === "Approved").length },
                  { id: "Rejected", label: "❌ Rejected", count: adminDrivers.filter(d => d.verificationStatus === "Rejected").length },
                ].map((flt) => {
                  const isSel = driverFilterStatus === flt.id;
                  return (
                    <button
                      key={flt.id}
                      onClick={() => setDriverFilterStatus(flt.id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: `1.5px solid ${isSel ? "#6d28d9" : borderCol}`,
                        background: isSel ? "linear-gradient(135deg, #2e1065, #4c1d95)" : bgCard,
                        color: isSel ? "#ffffff" : textSecondary,
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      {flt.label} ({flt.count})
                    </button>
                  );
                })}
              </div>

              {/* Drivers Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                {filteredDrivers.map((d) => (
                  <div key={d._id} style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                        <div style={{ width: "56px", height: "56px", borderRadius: "50%", overflow: "hidden", border: "2px solid #6d28d9", background: "#f1f5f9" }}>
                          {d.profilePic ? <img src={d.profilePic} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", color: "#6d28d9" }}>{d.name ? d.name[0] : "D"}</div>}
                        </div>
                        <div>
                          <strong style={{ fontSize: "16px", color: textPrimary, display: "block" }}>{d.name}</strong>
                          <span style={{ fontSize: "12px", color: textSecondary }}>{d.email}</span>
                        </div>
                      </div>

                      <div style={{ background: darkMode ? "#334155" : "#f8fafc", padding: "12px", borderRadius: "12px", fontSize: "12.5px", marginBottom: "14px" }}>
                        <div>🪪 License #: <strong style={{ fontFamily: "monospace", color: "#6d28d9" }}>{d.licenseNumber || "N/A"}</strong></div>
                        <div>⏳ Experience: {d.experienceYears || 5} Years</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => { setSelectedDriverForVerify(d); setDriverVerifyNote(d.verificationNote || ""); }} style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#fff", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                        🔍 Inspect License
                      </button>
                      <button onClick={() => handleUpdateDriverVerification(d._id, "Approved")} style={{ padding: "10px 14px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                        ✓ Accept
                      </button>
                      <button onClick={() => handleUpdateDriverVerification(d._id, "Rejected")} style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(225, 29, 72, 0.1)", color: "#dc2626", border: "1px solid rgba(225, 29, 72, 0.3)", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: BUS REQUESTS */}
          {activeTab === "busRequests" && (
            <div className="fade-in-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: textPrimary }}>🚌 Driver Bus Assignment Requests</h2>
                  <p style={{ fontSize: "13px", color: textSecondary, margin: "4px 0 0 0" }}>Review driver requests to claim and drive scheduled express buses.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {adminBusRequests.map((req) => (
                  <div key={req._id} style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                      <strong style={{ fontSize: "16px", color: textPrimary }}>Driver {req.driverName} ({req.driverEmail})</strong>
                      <div style={{ fontSize: "13px", color: textSecondary, marginTop: "4px" }}>
                        Bus: <strong>{req.busNumber}</strong> ({req.busName}) | Route: {req.routeName} | Departure: {req.departureTime}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", padding: "4px 10px", borderRadius: "999px", background: req.status === "Approved" ? "rgba(34, 197, 94, 0.12)" : "rgba(217, 119, 6, 0.12)", color: req.status === "Approved" ? "#16a34a" : "#d97706" }}>
                        {req.status}
                      </span>
                      {req.status === "Pending" && (
                        <button
                          onClick={() => { setSelectedBusReqModal(req); setBusReqModalStatus("Approved"); }}
                          style={{ padding: "8px 16px", borderRadius: "10px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                        >
                          Review &amp; Approve →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* SECTION: BUS ROUTES, OFFSET TIMINGS & SCHEDULES */}
          {activeTab === "busRoutes" && (
            <div className="fade-in-section">
              <AdminAddBusRoute isEmbedded={true} />
            </div>
          )}

          {/* SECTION 8: PAYMENTS & TRANSACTIONS */}
          {activeTab === "transactions" && (
            <div className="fade-in-section">
              <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 16px 0", color: textPrimary }}>💰 Payments &amp; Global System Logs</h2>
              <div style={{ background: bgCard, borderRadius: "20px", padding: "24px", border: `1px solid ${borderCol}` }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {dbCards.map((c, idx) => (
                    <div key={idx} style={{ padding: "14px 18px", borderRadius: "16px", background: darkMode ? "#334155" : "#f8fafc", border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "14.5px", color: textPrimary, display: "block" }}>Card Top-Up / Balance Log</strong>
                        <span style={{ fontSize: "12px", color: textSecondary }}>Card: {c.cardNumber} ({c.user?.email || "Passenger"})</span>
                      </div>
                      <span style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a" }}>+ ₹ {c.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: DRIVER LEAVES */}
          {activeTab === "leaves" && (
            <div className="fade-in-section">
              <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 16px 0", color: textPrimary }}>📅 Driver Leave Applications</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {adminLeaves.map((l) => (
                  <div key={l._id} style={{ background: bgCard, borderRadius: "20px", padding: "20px", border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                      <strong style={{ fontSize: "16px", color: textPrimary }}>{l.driverName} ({l.driverEmail})</strong>
                      <div style={{ fontSize: "13px", color: "#7c3aed", fontWeight: "800", marginTop: "2px" }}>📅 Date: {l.leaveDate} • Type: {l.leaveType}</div>
                      <div style={{ fontSize: "12.5px", color: textSecondary, marginTop: "2px" }}>Reason: "{l.reason}"</div>
                    </div>
                    {l.status === "Pending" && (
                      <button onClick={() => setSelectedLeaveModal(l)} style={{ padding: "8px 16px", borderRadius: "10px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                        Review Leave Request →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 10: SETTINGS & TOOLS */}
          {activeTab === "settings" && (
            <div className="fade-in-section">
              <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 16px 0", color: textPrimary }}>⚙️ Settings &amp; System Administration</h2>
              <div style={{ background: bgCard, borderRadius: "20px", padding: "24px", border: `1px solid ${borderCol}` }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "8px" }}>Database Operations</h3>
                <p style={{ fontSize: "13px", color: textSecondary, marginBottom: "16px" }}>Re-initialize stops and fare matrices in MongoDB Atlas.</p>
                <button onClick={handleReSeed} style={{ padding: "10px 20px", borderRadius: "12px", background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#fff", border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}>
                  🔄 Re-Seed System Defaults
                </button>
              </div>
            </div>
          )}

          {/* SECTION 11: DRIVER SAFETY MONITORING */}
          {activeTab === "driverSafety" && (
            <div className="fade-in-section">
              <DriverSafetyMonitoring darkMode={darkMode} showToast={showToast} />
            </div>
          )}

        </main>
      </div>

      {/* 🪪 MODAL: DRIVER VERIFICATION */}
      {selectedDriverForVerify && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "780px", width: "95%", borderRadius: "24px", padding: "28px", background: bgCard, color: textPrimary }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "900", margin: 0 }}>🪪 Driver License Inspection</h3>
              <button onClick={() => setSelectedDriverForVerify(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: textSecondary }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <strong style={{ fontSize: "16px", display: "block" }}>{selectedDriverForVerify.name}</strong>
                <span style={{ fontSize: "13px", color: textSecondary }}>{selectedDriverForVerify.email}</span>
                <div style={{ marginTop: "10px", fontSize: "13px" }}>License #: <strong style={{ color: "#6d28d9" }}>{selectedDriverForVerify.licenseNumber || "N/A"}</strong></div>
                <div style={{ fontSize: "13px" }}>Experience: {selectedDriverForVerify.experienceYears || 5} Years</div>
              </div>

              <div>
                {selectedDriverForVerify.licenseImage ? (
                  <img src={selectedDriverForVerify.licenseImage} alt="License" style={{ width: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "12px", border: `1px solid ${borderCol}` }} />
                ) : (
                  <div style={{ padding: "30px", textAlign: "center", color: "#dc2626", background: "rgba(225, 29, 72, 0.05)", borderRadius: "12px" }}>No license photo uploaded</div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, display: "block", marginBottom: "6px" }}>Admin Feedback Note:</label>
              <textarea className="rta-input-field" rows={2} value={driverVerifyNote} onChange={(e) => setDriverVerifyNote(e.target.value)} style={{ width: "100%", resize: "none" }} />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => handleUpdateDriverVerification(selectedDriverForVerify._id, "Approved", driverVerifyNote)} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Accept Driver ✅</button>
              <button onClick={() => handleUpdateDriverVerification(selectedDriverForVerify._id, "Rejected", driverVerifyNote)} style={{ padding: "12px 20px", borderRadius: "12px", background: "rgba(225, 29, 72, 0.1)", color: "#dc2626", border: "1px solid rgba(225, 29, 72, 0.3)", fontWeight: "800", cursor: "pointer" }}>Reject ❌</button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 MODAL: PASSENGER DETAILED PROFILE & WALLET */}
      {selectedPassenger && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "540px", width: "95%", borderRadius: "24px", padding: "28px", background: bgCard, color: textPrimary }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>👥 Passenger Profile &amp; Wallet</h3>
              <button onClick={() => setSelectedPassenger(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: textSecondary }}>×</button>
            </div>

            <div style={{ background: darkMode ? "#334155" : "#f8fafc", padding: "16px", borderRadius: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: textSecondary, textTransform: "uppercase" }}>Current Nol Balance</div>
              <div style={{ fontSize: "32px", fontWeight: "900", color: "#16a34a" }}>₹ {selectedPassenger.balance.toFixed(2)}</div>
              <div style={{ fontSize: "13px", color: textPrimary, marginTop: "4px" }}>Card: {selectedPassenger.cardNumber} • {selectedPassenger.cardType} Nol Pass</div>
              <div style={{ fontSize: "12px", color: textSecondary }}>Email: {selectedPassenger.user?.email || "N/A"}</div>
            </div>

            {/* Quick Preset Buttons */}
            <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, display: "block", marginBottom: "8px" }}>Add Money to Passenger Wallet</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
              {[100, 200, 500].map(amt => (
                <button key={amt} onClick={() => handleAddPassengerMoney(selectedPassenger, amt)} style={{ padding: "10px", borderRadius: "12px", border: "1.5px solid #6d28d9", background: "rgba(109, 40, 217, 0.08)", color: "#6d28d9", fontWeight: "800", cursor: "pointer" }}>+ ₹{amt}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <input type="number" className="rta-input-field" placeholder="Custom Amt (₹)" value={passengerAddMoneyAmt} onChange={(e) => setPassengerAddMoneyAmt(e.target.value)} />
              <button onClick={() => handleAddPassengerMoney(selectedPassenger, passengerAddMoneyAmt)} style={{ padding: "10px 20px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Add →</button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 MODAL: APPLICATION DETAILS & ACTIONS */}
      {actionApp && actionType === "details" && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "760px", width: "95%", borderRadius: "24px", padding: "28px", background: bgCard, color: textPrimary, maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: `1px solid ${borderCol}`, paddingBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "900", margin: 0 }}>
                  📋 Card Application Details
                </h3>
                <span style={{ fontSize: "12.5px", color: textSecondary }}>
                  Application ID: <span style={{ fontFamily: "monospace", fontWeight: "800", color: "#6d28d9" }}>{actionApp.applicationId || actionApp._id}</span>
                </span>
              </div>
              <button onClick={() => { setActionApp(null); setActionType(null); }} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: textSecondary }}>×</button>
            </div>

            {/* Application Overview Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>

              {/* Left Column: Personal & Contact Info */}
              <div style={{ background: darkMode ? "#334155" : "#f8fafc", padding: "18px", borderRadius: "18px", border: `1px solid ${borderCol}` }}>
                <h4 style={{ fontSize: "14px", fontWeight: "900", color: "#6d28d9", margin: "0 0 10px 0", textTransform: "uppercase" }}>👤 Applicant Profile</h4>
                <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div><strong>Full Name:</strong> {actionApp.fullName}</div>
                  <div><strong>Email:</strong> {actionApp.email}</div>
                  <div><strong>Phone:</strong> {actionApp.phone || "N/A"}</div>
                  <div><strong>DOB / Gender:</strong> {actionApp.dob || "N/A"} ({actionApp.gender || "N/A"})</div>
                  <div><strong>Address:</strong> {actionApp.street ? `${actionApp.street}, ${actionApp.city}, ${actionApp.district || ""}, ${actionApp.state || "Kerala"} - ${actionApp.pincode || ""}` : "Kerala, India"}</div>
                </div>

                <hr style={{ border: "none", borderTop: `1px dashed ${borderCol}`, margin: "14px 0" }} />

                <h4 style={{ fontSize: "14px", fontWeight: "900", color: "#6d28d9", margin: "0 0 10px 0", textTransform: "uppercase" }}>🚌 Travel &amp; Emergency</h4>
                <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div><strong>Frequent Route:</strong> {actionApp.frequentSource || "Origin"} ➔ {actionApp.frequentDestination || "Destination"}</div>
                  <div><strong>Preferred Time:</strong> {actionApp.preferredTime || "Morning"}</div>
                  <div><strong>Emergency Contact:</strong> {actionApp.emergencyName || "N/A"} ({actionApp.emergencyRelation || "Relation"}) - {actionApp.emergencyPhone || "N/A"}</div>
                </div>
              </div>

              {/* Right Column: Identification & Document Proofs */}
              <div style={{ background: darkMode ? "#334155" : "#f8fafc", padding: "18px", borderRadius: "18px", border: `1px solid ${borderCol}` }}>
                <h4 style={{ fontSize: "14px", fontWeight: "900", color: "#6d28d9", margin: "0 0 10px 0", textTransform: "uppercase" }}>🪪 Identity &amp; Documents</h4>
                <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                  <div><strong>ID Type &amp; Number:</strong> {actionApp.idType || "Aadhaar"}: <span style={{ fontFamily: "monospace", fontWeight: "800", color: "#6d28d9" }}>{actionApp.idNumber}</span></div>
                  <div><strong>Card Category:</strong> {actionApp.requestedCardType || actionApp.cardCategory} Nol Pass</div>
                  {actionApp.isStudent && (
                    <div style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", padding: "6px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", display: "inline-block", marginTop: "4px" }}>
                      🎓 Student Concession Pass Application (0.9x Fare)
                    </div>
                  )}
                  {actionApp.institutionName && <div><strong>Institution:</strong> {actionApp.institutionName}</div>}
                </div>

                {/* ID Proof Document */}
                {actionApp.idProofUrl && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: textSecondary, textTransform: "uppercase", marginBottom: "4px" }}>Govt ID Document Proof:</div>
                    <div
                      onClick={() => setZoomImage(actionApp.idProofUrl)}
                      style={{ height: "110px", borderRadius: "12px", overflow: "hidden", border: `1.5px solid ${borderCol}`, background: "#000", cursor: "pointer", position: "relative" }}
                    >
                      <img src={actionApp.idProofUrl} alt="Govt ID Proof" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "800", fontSize: "12px" }}>
                        🔍 View Govt ID Fullscreen
                      </div>
                    </div>
                  </div>
                )}

                {/* Student ID Document */}
                {actionApp.studentIdUrl && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", marginBottom: "4px" }}>🎓 Student ID Card Proof:</div>
                    <div
                      onClick={() => setZoomImage(actionApp.studentIdUrl)}
                      style={{ height: "110px", borderRadius: "12px", overflow: "hidden", border: "1.5px solid #93c5fd", background: "#000", cursor: "pointer", position: "relative" }}
                    >
                      <img src={actionApp.studentIdUrl} alt="Student ID Proof" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "800", fontSize: "12px" }}>
                        🔍 View Student ID Fullscreen
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Workflow status notes if any */}
            {actionApp.rejectionReason && (
              <div style={{ background: "rgba(225, 29, 72, 0.08)", color: "#dc2626", padding: "12px", borderRadius: "12px", border: "1px solid rgba(225, 29, 72, 0.2)", fontSize: "13px", marginBottom: "16px" }}>
                ❌ <strong>Rejection Reason:</strong> {actionApp.rejectionReason}
              </div>
            )}
            {actionApp.correctionNote && (
              <div style={{ background: "rgba(217, 119, 6, 0.08)", color: "#d97706", padding: "12px", borderRadius: "12px", border: "1px solid rgba(217, 119, 6, 0.2)", fontSize: "13px", marginBottom: "16px" }}>
                ⚠️ <strong>Correction Note:</strong> {actionApp.correctionNote}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", borderTop: `1px solid ${borderCol}`, paddingTop: "16px" }}>
              {actionApp.status === "Pending" && (
                <>
                  <button
                    onClick={() => { setActionType("approve"); setApproveCardType(actionApp.requestedCardType || "Silver"); }}
                    style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                  >
                    ✓ Approve &amp; Activate Card
                  </button>
                  <button
                    onClick={() => setActionType("reject")}
                    style={{ padding: "12px 18px", borderRadius: "12px", background: "rgba(225, 29, 72, 0.1)", color: "#dc2626", border: "1px solid rgba(225, 29, 72, 0.3)", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                  >
                    ❌ Reject
                  </button>
                  <button
                    onClick={() => setActionType("correction")}
                    style={{ padding: "12px 18px", borderRadius: "12px", background: "rgba(217, 119, 6, 0.1)", color: "#d97706", border: "1px solid rgba(217, 119, 6, 0.3)", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                  >
                    ✏️ Request Correction
                  </button>
                </>
              )}
              <button onClick={() => { setActionApp(null); setActionType(null); }} style={{ padding: "12px 18px", borderRadius: "12px", background: darkMode ? "#334155" : "#f1f5f9", color: textPrimary, border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📥 MODAL: APPROVE APPLICATION */}
      {actionApp && actionType === "approve" && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "480px", width: "90%", padding: "28px", borderRadius: "24px", background: bgCard, color: textPrimary }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 16px 0" }}>Approve &amp; Activate Smart Card</h3>
            <form onSubmit={handleApproveAppSubmit}>
              <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Applicant</label>
                <input type="text" className="rta-input-field" value={`${actionApp.fullName} (${actionApp.email})`} disabled />
              </div>
              <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Assign RFID Tag UID</label>
                <input type="text" className="rta-input-field" value={approveRfidTag} onChange={(e) => setApproveRfidTag(e.target.value.toUpperCase())} required placeholder="e.g. 4A:2B:3C:4D" />
              </div>
              <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Card Class</label>
                <select className="rta-input-field" value={approveCardType} onChange={(e) => setApproveCardType(e.target.value)}>
                  <option value="Silver">Silver Card (Standard)</option>
                  <option value="Gold">Gold Card (Express)</option>
                  <option value="Blue">Blue Card (Student Concession)</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Approve &amp; Activate →</button>
                <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} style={{ padding: "12px 18px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 MODAL: REJECT APPLICATION */}
      {actionApp && actionType === "reject" && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "480px", width: "90%", padding: "28px", borderRadius: "24px", background: bgCard, color: textPrimary }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 16px 0", color: "#dc2626" }}>Reject Application</h3>
            <form onSubmit={handleRejectAppSubmit}>
              <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Rejection Reason (Required)</label>
                <textarea className="rta-input-field" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required placeholder="e.g. Uploaded Aadhaar photo is illegible or document name mismatch." style={{ width: "100%", resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#dc2626", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Confirm Rejection ❌</button>
                <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} style={{ padding: "12px 18px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 MODAL: REQUEST CORRECTION */}
      {actionApp && actionType === "correction" && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "480px", width: "90%", padding: "28px", borderRadius: "24px", background: bgCard, color: textPrimary }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 16px 0", color: "#d97706" }}>Request Correction</h3>
            <form onSubmit={handleCorrectionAppSubmit}>
              <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Correction Instructions for Applicant</label>
                <textarea className="rta-input-field" rows={3} value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} required placeholder="e.g. Please re-upload a clearer scan of your Student ID card." style={{ width: "100%", resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#d97706", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Send Correction Note ✏️</button>
                <button type="button" onClick={() => { setActionApp(null); setActionType(null); }} style={{ padding: "12px 18px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚌 MODAL: BUS REQUEST APPROVAL */}
      {selectedBusReqModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "480px", width: "90%", padding: "28px", borderRadius: "24px", background: bgCard, color: textPrimary }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 16px 0" }}>Review Bus Assignment Request</h3>
            <form onSubmit={handleUpdateBusRequestSubmit}>
              <div style={{ marginBottom: "14px", fontSize: "13px" }}>
                <div>Driver: <strong>{selectedBusReqModal.driverName}</strong></div>
                <div>Bus: <strong>{selectedBusReqModal.busNumber}</strong> ({selectedBusReqModal.busName})</div>
              </div>
              <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Review Decision</label>
                <select className="rta-input-field" value={busReqModalStatus} onChange={(e) => setBusReqModalStatus(e.target.value)}>
                  <option value="Approved">Approve &amp; Assign Driver</option>
                  <option value="Rejected">Reject Request</option>
                </select>
              </div>
              <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Review Comment</label>
                <input type="text" className="rta-input-field" value={busReqModalComment} onChange={(e) => setBusReqModalComment(e.target.value)} placeholder="e.g. Bus assigned successfully." />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Submit Review →</button>
                <button type="button" onClick={() => setSelectedBusReqModal(null)} style={{ padding: "12px 18px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📅 MODAL: DRIVER LEAVE APPROVAL */}
      {selectedLeaveModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "480px", width: "90%", padding: "28px", borderRadius: "24px", background: bgCard, color: textPrimary }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 16px 0" }}>Review Leave Application</h3>
            <form onSubmit={handleUpdateLeaveSubmit}>
              <div style={{ marginBottom: "14px", fontSize: "13px" }}>
                <div>Driver: <strong>{selectedLeaveModal.driverName}</strong></div>
                <div>Date: <strong>{selectedLeaveModal.leaveDate}</strong> ({selectedLeaveModal.leaveType})</div>
              </div>
              <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Decision</label>
                <select className="rta-input-field" value={leaveModalStatus} onChange={(e) => setLeaveModalStatus(e.target.value)}>
                  <option value="Approved">Accept &amp; Approve</option>
                  <option value="Rejected">Reject Application</option>
                </select>
              </div>
              <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>Admin Feedback Note</label>
                <input type="text" className="rta-input-field" value={leaveModalComment} onChange={(e) => setLeaveModalComment(e.target.value)} placeholder="e.g. Approved by admin." />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>Submit Approval →</button>
                <button type="button" onClick={() => setSelectedLeaveModal(null)} style={{ padding: "12px 18px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖼️ IMAGE LIGHTBOX MODAL */}
      {zoomImage && (
        <div className="modal-overlay" style={{ zIndex: 10000, background: "rgba(0, 0, 0, 0.85)" }} onClick={() => setZoomImage(null)}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomImage(null)} style={{ position: "absolute", top: "-40px", right: "0", background: "none", border: "none", color: "#ffffff", fontSize: "32px", cursor: "pointer", fontWeight: "900" }}>×</button>
            <img src={zoomImage} alt="Document Zoom" style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", border: "2px solid #ffffff" }} />
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}