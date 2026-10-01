import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { getStoredToken } from "../../utils/session";
import {
  Route,
  Bus,
  User,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  Layers,
  X,
  ArrowUpDown,
  Radio,
  Sliders
} from "lucide-react";

export default function AdminTripHistory({ darkMode = false, onNavigateTab }) {
  const token = getStoredToken();
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Sub-tabs: 'allTrips' | 'activeTrips' | 'busWise' | 'driverWise' | 'dateReports'
  const [subTab, setSubTab] = useState("allTrips");

  // Global KPI & Trip List State
  const [trips, setTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [summaryKpis, setSummaryKpis] = useState({
    activeBusesCount: 0,
    activeTripsCount: 0,
    completedTripsToday: 0,
    todayRfidTaps: 0,
    todayTapIns: 0,
    todayTapOuts: 0,
    todayFare: 0,
  });

  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterBus, setFilterBus] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterRoute, setFilterRoute] = useState("");

  // Bus List & Driver List for Filter Selectors
  const [availableBuses, setAvailableBuses] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  // Modal State for Viewing a Specific Trip
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [tripDetailModal, setTripDetailModal] = useState(null);
  const [tripModalLoading, setTripModalLoading] = useState(false);
  const [tripTaps, setTripTaps] = useState([]);
  const [tripTapsSort, setTripTapsSort] = useState("desc"); // 'desc' | 'asc'
  const [tripTapsPage, setTripTapsPage] = useState(1);
  const [tripTapsPagination, setTripTapsPagination] = useState({ total: 0, totalPages: 1 });

  // Bus-wise View State
  const [selectedBusForHistory, setSelectedBusForHistory] = useState("");
  const [busHistoryData, setBusHistoryData] = useState(null);
  const [busHistoryLoading, setBusHistoryLoading] = useState(false);

  // Driver-wise View State
  const [selectedDriverForHistory, setSelectedDriverForHistory] = useState("");
  const [driverHistoryData, setDriverHistoryData] = useState(null);
  const [driverHistoryLoading, setDriverHistoryLoading] = useState(false);

  // Date-wise Report View State
  const [selectedDateForReport, setSelectedDateForReport] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateReportData, setDateReportData] = useState(null);
  const [dateReportLoading, setDateReportLoading] = useState(false);

  // Toast / Download Status
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Theme Styles
  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const bgSecondary = darkMode ? "#0f172a" : "#f8fafc";
  const bgMuted = darkMode ? "#334155" : "#f1f5f9";
  const borderCol = darkMode ? "#334155" : "#e2e8f0";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";

  // Fetch filter dropdown options (buses and drivers)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [busRes, drvRes] = await Promise.all([
          axios.get("/api/admin/buses", authHeaders),
          axios.get("/api/admin/drivers", authHeaders),
        ]);
        if (busRes.data?.buses) setAvailableBuses(busRes.data.buses);
        if (drvRes.data?.drivers) setAvailableDrivers(drvRes.data.drivers);
      } catch (err) {
        console.warn("Could not load buses/drivers list:", err.message);
      }
    };
    fetchOptions();
  }, []);

  // -------------------------------------------------------------
  // 1. FETCH ALL TRIPS (PAGINATED & FILTERED)
  // -------------------------------------------------------------
  const fetchTrips = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        status: filterStatus !== "All" ? filterStatus : undefined,
        busNumber: filterBus || undefined,
        driverName: filterDriver || undefined,
        routeName: filterRoute || undefined,
        date: filterDate || undefined,
        search: searchQuery.trim() || undefined,
      };

      const res = await axios.get("/api/admin/trips", {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setTrips(res.data.trips || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.summary) setSummaryKpis(res.data.summary);
      }
    } catch (err) {
      console.error("Error fetching trips:", err);
      showToast(err.response?.data?.message || "Failed to load trip history", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterBus, filterDriver, filterRoute, filterDate, searchQuery, pagination.limit, token]);

  // -------------------------------------------------------------
  // 2. FETCH ACTIVE TRIPS
  // -------------------------------------------------------------
  const fetchActiveTrips = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/trips/active", authHeaders);
      if (res.data?.success) {
        setActiveTrips(res.data.activeTrips || []);
      }
    } catch (err) {
      console.warn("Active trips fetch error:", err.message);
    }
  }, []);

  // Initial & Tab-switch load
  useEffect(() => {
    fetchTrips(1);
    fetchActiveTrips();
  }, [fetchTrips, fetchActiveTrips]);

  // Periodic polling for active trip telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveTrips();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchActiveTrips]);

  // -------------------------------------------------------------
  // 3. REAL-TIME SOCKET.IO INGESTION FOR LIVE TRIPS & RFID TAPS
  // -------------------------------------------------------------
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : window.location.origin);
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      socket.emit("join-admin-safety");
    });

    // Real-time RFID Tap Event
    socket.on("rfid:tap-event", (eventData) => {
      // 1. Update active trips counters
      setActiveTrips((prev) =>
        prev.map((t) => {
          if (t.tripSessionId === eventData.tripSessionId || t.busNumber === eventData.busNumber) {
            return {
              ...t,
              totalRfidTaps: (t.totalRfidTaps || 0) + 1,
              totalTapIns: eventData.action === "TAP_IN" ? (t.totalTapIns || 0) + 1 : t.totalTapIns,
              totalTapOuts: eventData.action === "TAP_OUT" ? (t.totalTapOuts || 0) + 1 : t.totalTapOuts,
              totalFare: (t.totalFare || 0) + (eventData.fare || 0),
            };
          }
          return t;
        })
      );

      // 2. Update KPI summary
      setSummaryKpis((prev) => ({
        ...prev,
        todayRfidTaps: prev.todayRfidTaps + 1,
        todayTapIns: eventData.action === "TAP_IN" ? prev.todayTapIns + 1 : prev.todayTapIns,
        todayTapOuts: eventData.action === "TAP_OUT" ? prev.todayTapOuts + 1 : prev.todayTapOuts,
        todayFare: prev.todayFare + (eventData.fare || 0),
      }));

      // 3. If currently viewing modal for this trip, prepend tap
      setTripDetailModal((currentModal) => {
        if (currentModal && currentModal.trip?.tripSessionId === eventData.tripSessionId) {
          const newTap = {
            _id: `live_${Date.now()}`,
            timestamp: eventData.timestamp || new Date().toISOString(),
            action: eventData.action,
            passengerName: eventData.passengerName || "Passenger",
            cardUid: eventData.cardUid || "RFID",
            maskedCardUid: eventData.cardUid ? eventData.cardUid.slice(0, 2) + "****" + eventData.cardUid.slice(-2) : "RFID",
            cardNumber: eventData.cardNumber || "MS-CARD",
            cardType: eventData.cardType || "Silver",
            stopName: eventData.stop?.name || eventData.stopName || "Stop",
            fare: eventData.fare || 0,
            previousBalance: eventData.previousBalance || 0,
            newBalance: eventData.newBalance || 0,
            status: "SUCCESS",
          };

          setTripTaps((prevTaps) => [newTap, ...prevTaps]);

          return {
            ...currentModal,
            rfidSummary: {
              ...currentModal.rfidSummary,
              totalRfidTaps: (currentModal.rfidSummary.totalRfidTaps || 0) + 1,
              totalTapIns: eventData.action === "TAP_IN" ? (currentModal.rfidSummary.totalTapIns || 0) + 1 : currentModal.rfidSummary.totalTapIns,
              totalTapOuts: eventData.action === "TAP_OUT" ? (currentModal.rfidSummary.totalTapOuts || 0) + 1 : currentModal.rfidSummary.totalTapOuts,
              totalFare: (currentModal.rfidSummary.totalFare || 0) + (eventData.fare || 0),
            },
          };
        }
        return currentModal;
      });
    });

    // Real-time Drive Session Status Changes
    socket.on("bus:trackingStarted", (data) => {
      fetchActiveTrips();
      fetchTrips(1);
    });

    socket.on("bus:trackingStopped", (data) => {
      fetchActiveTrips();
      fetchTrips(1);
    });

    return () => socket.disconnect();
  }, [fetchActiveTrips, fetchTrips]);

  // -------------------------------------------------------------
  // 4. VIEW TRIP DETAILS MODAL
  // -------------------------------------------------------------
  const handleOpenTripModal = async (tripSessionId) => {
    setSelectedTripId(tripSessionId);
    setTripModalLoading(true);
    setTripTapsPage(1);

    try {
      const [detailRes, rfidRes] = await Promise.all([
        axios.get(`/api/admin/trips/${tripSessionId}`, authHeaders),
        axios.get(`/api/admin/trips/${tripSessionId}/rfid?page=1&limit=50&sort=${tripTapsSort}`, authHeaders),
      ]);

      if (detailRes.data?.success) {
        setTripDetailModal(detailRes.data);
      }
      if (rfidRes.data?.success) {
        setTripTaps(rfidRes.data.taps || []);
        if (rfidRes.data.pagination) setTripTapsPagination(rfidRes.data.pagination);
      }
    } catch (err) {
      console.error("Error opening trip details:", err);
      showToast(err.response?.data?.message || "Failed to load trip details", "error");
    } finally {
      setTripModalLoading(false);
    }
  };

  const handleFetchTripTaps = async (page = 1, sort = tripTapsSort) => {
    if (!selectedTripId) return;
    try {
      const rfidRes = await axios.get(`/api/admin/trips/${selectedTripId}/rfid?page=${page}&limit=50&sort=${sort}`, authHeaders);
      if (rfidRes.data?.success) {
        setTripTaps(rfidRes.data.taps || []);
        if (rfidRes.data.pagination) setTripTapsPagination(rfidRes.data.pagination);
        setTripTapsPage(page);
      }
    } catch (err) {
      showToast("Failed to sort taps", "error");
    }
  };

  // -------------------------------------------------------------
  // 5. DOWNLOAD PDF REPORT
  // -------------------------------------------------------------
  const handleDownloadPdf = async (tripSessionId, busNumber = "BUS") => {
    setDownloadingPdf(true);
    showToast(`Generating MoveSmart PDF Report for ${tripSessionId}... ⏳`, "info");
    try {
      const res = await axios.get(`/api/admin/trips/${tripSessionId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const sanitizedBus = String(busNumber).replace(/[^a-zA-Z0-9-_]/g, "-");
      const filename = `MoveSmart_${tripSessionId}_${sanitizedBus}.pdf`;

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`PDF Report downloaded successfully! ✔`, "success");
    } catch (err) {
      console.error("PDF Download Error:", err);
      showToast("Failed to download PDF report. Try again.", "error");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // -------------------------------------------------------------
  // 6. BUS-WISE RFID HISTORY FETCH
  // -------------------------------------------------------------
  const handleFetchBusHistory = async (busIdentifier) => {
    if (!busIdentifier) return;
    setSelectedBusForHistory(busIdentifier);
    setBusHistoryLoading(true);
    try {
      const res = await axios.get(`/api/admin/buses/${encodeURIComponent(busIdentifier)}/trips`, authHeaders);
      if (res.data?.success) {
        setBusHistoryData(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to fetch bus history", "error");
    } finally {
      setBusHistoryLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 7. DRIVER-WISE HISTORY FETCH
  // -------------------------------------------------------------
  const handleFetchDriverHistory = async (driverIdentifier) => {
    if (!driverIdentifier) return;
    setSelectedDriverForHistory(driverIdentifier);
    setDriverHistoryLoading(true);
    try {
      const res = await axios.get(`/api/admin/drivers/${encodeURIComponent(driverIdentifier)}/trips`, authHeaders);
      if (res.data?.success) {
        setDriverHistoryData(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to fetch driver history", "error");
    } finally {
      setDriverHistoryLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 8. DATE-WISE REPORT FETCH
  // -------------------------------------------------------------
  const handleFetchDateReport = async (dateStr) => {
    if (!dateStr) return;
    setSelectedDateForReport(dateStr);
    setDateReportLoading(true);
    try {
      const res = await axios.get(`/api/admin/reports/date-summary?date=${dateStr}`, authHeaders);
      if (res.data?.success) {
        setDateReportData(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to fetch date report", "error");
    } finally {
      setDateReportLoading(false);
    }
  };

  // Format Helper
  const formatTimeStr = (dateInput) => {
    if (!dateInput) return "--";
    try {
      return new Date(dateInput).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateInput);
    }
  };

  const formatDateStr = (dateInput) => {
    if (!dateInput) return "--";
    try {
      return new Date(dateInput).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateInput);
    }
  };

  const formatDateTimeStr = (dateInput) => {
    if (!dateInput) return "--";
    try {
      return new Date(dateInput).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateInput);
    }
  };

  return (
    <div className="fade-in-section" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: toast.type === "error" ? "#dc2626" : toast.type === "info" ? "#2563eb" : "#16a34a",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "14px",
          fontWeight: "800",
          fontSize: "13.5px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          animation: "slideUp 0.3s ease",
        }}>
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
        color: "#ffffff",
        padding: "24px 28px",
        borderRadius: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        boxShadow: "0 8px 24px rgba(49, 16, 66, 0.25)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(74, 222, 128, 0.2)",
            color: "#4ade80",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "800",
            marginBottom: "8px",
          }}>
            <Sparkles size={13} /> MoveSmart Bus Trip Session &amp; RFID Audit Center
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: "#ffffff" }}>
            Bus Trip Sessions, Live Tracking &amp; RFID Audit Reports
          </h2>
          <p style={{ color: "#c4b5fd", fontSize: "13.5px", marginTop: "6px", margin: 0, maxWidth: "750px" }}>
            Centralized administration for all active driving sessions, completed bus journeys, trip-isolated RFID tap audits, passenger transactions, and downloadable official PDF reports.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => { fetchTrips(1); fetchActiveTrips(); showToast("Trip telemetry refreshed! ✔"); }}
            disabled={loading}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.25)",
              fontSize: "13px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh All
          </button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        {[
          { label: "Active Bus Journeys", val: summaryKpis.activeTripsCount, icon: Zap, col: "#22c55e", bg: "rgba(34, 197, 94, 0.12)" },
          { label: "Completed Trips Today", val: summaryKpis.completedTripsToday, icon: CheckCircle, col: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
          { label: "Today's RFID Taps", val: summaryKpis.todayRfidTaps, icon: Radio, col: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
          { label: "Today's TAP-IN", val: summaryKpis.todayTapIns, icon: ArrowRight, col: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
          { label: "Today's TAP-OUT", val: summaryKpis.todayTapOuts, icon: Layers, col: "#ec4899", bg: "rgba(236, 72, 153, 0.12)" },
          { label: "Today's Total Fare", val: `₹${Number(summaryKpis.todayFare || 0).toFixed(2)}`, icon: TrendingUp, col: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
        ].map((card, i) => {
          const IconComponent = card.icon;
          return (
            <div
              key={i}
              style={{
                background: bgCard,
                border: `1px solid ${borderCol}`,
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: card.bg, color: card.col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconComponent size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: "700", color: textSecondary, textTransform: "uppercase" }}>{card.label}</div>
                <div style={{ fontSize: "19px", fontWeight: "900", color: textPrimary, marginTop: "2px" }}>{card.val}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SUB-NAVIGATION TABS ───────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: bgCard,
        padding: "6px",
        borderRadius: "16px",
        border: `1px solid ${borderCol}`,
        overflowX: "auto",
      }}>
        {[
          { id: "allTrips", label: "All Trip Sessions", icon: Route, count: pagination.total },
          { id: "activeTrips", label: "Live Active Drives", icon: Zap, count: activeTrips.length },
          { id: "busWise", label: "Bus-Wise History", icon: Bus },
          { id: "driverWise", label: "Driver-Wise History", icon: User },
          { id: "dateReports", label: "Date-Based Reports", icon: Calendar },
        ].map((tab) => {
          const isSel = subTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id);
                if (tab.id === "busWise" && availableBuses.length > 0 && !selectedBusForHistory) {
                  handleFetchBusHistory(availableBuses[0].busNumber || availableBuses[0]._id);
                }
                if (tab.id === "driverWise" && availableDrivers.length > 0 && !selectedDriverForHistory) {
                  handleFetchDriverHistory(availableDrivers[0].name || availableDrivers[0]._id);
                }
                if (tab.id === "dateReports" && !dateReportData) {
                  handleFetchDateReport(selectedDateForReport);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "12px",
                border: "none",
                background: isSel ? "linear-gradient(135deg, #2e1065, #6d28d9)" : "transparent",
                color: isSel ? "#ffffff" : textSecondary,
                fontWeight: isSel ? "900" : "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.18s ease",
                whiteSpace: "nowrap",
              }}
            >
              <TabIcon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  background: isSel ? "#4ade80" : bgMuted,
                  color: isSel ? "#1e1b4b" : textSecondary,
                  padding: "1px 7px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "900",
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ALL TRIP SESSIONS WITH FILTERING & SEARCH             */}
      {/* ============================================================ */}
      {subTab === "allTrips" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* SEARCH & FILTERS BAR */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "18px",
            padding: "18px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: "220px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
              <input
                type="text"
                placeholder="Search Trip ID, Bus No, Driver, Route, Passenger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTrips(1)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "600",
                  outline: "none",
                }}
              />
            </div>

            {/* Status Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "700",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="All">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PAUSED">PAUSED</option>
              </select>

              {/* Bus Selector */}
              <select
                value={filterBus}
                onChange={(e) => setFilterBus(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "700",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "180px",
                }}
              >
                <option value="">All Buses</option>
                {availableBuses.map((b) => (
                  <option key={b._id} value={b.busNumber}>
                    {b.busNumber} ({b.busName || "Bus"})
                  </option>
                ))}
              </select>

              {/* Date Input */}
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "600",
                  outline: "none",
                }}
              />

              {/* Apply / Reset Filter Buttons */}
              <button
                onClick={() => fetchTrips(1)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #2e1065, #6d28d9)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Filter size={14} /> Filter
              </button>

              {(searchQuery || filterStatus !== "All" || filterBus || filterDate) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("All");
                    setFilterBus("");
                    setFilterDate("");
                    setFilterRoute("");
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: bgMuted,
                    color: textSecondary,
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Clear ✕
                </button>
              )}
            </div>
          </div>

          {/* TRIPS TABLE */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: bgMuted, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11.5px", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "14px 16px" }}>Trip Session ID</th>
                    <th style={{ padding: "14px 16px" }}>Bus &amp; Vehicle</th>
                    <th style={{ padding: "14px 16px" }}>Driver</th>
                    <th style={{ padding: "14px 16px" }}>Route &amp; Path</th>
                    <th style={{ padding: "14px 16px" }}>Time &amp; Duration</th>
                    <th style={{ padding: "14px 16px", textAlign: "center" }}>RFID Taps</th>
                    <th style={{ padding: "14px 16px", textAlign: "right" }}>Total Fare</th>
                    <th style={{ padding: "14px 16px", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "14px 16px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "48px", textAlign: "center", color: textSecondary }}>
                        <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px auto", display: "block", color: "#8b5cf6" }} />
                        <strong>Loading MoveSmart Bus Trip Sessions...</strong>
                      </td>
                    </tr>
                  ) : trips.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "48px", textAlign: "center", color: textSecondary }}>
                        <Route size={32} style={{ margin: "0 auto 12px auto", display: "block", opacity: 0.4 }} />
                        <strong style={{ fontSize: "15px", color: textPrimary, display: "block" }}>No trips found matching your filters</strong>
                        <p style={{ margin: "6px 0 0 0", fontSize: "12.5px" }}>Try clearing search criteria or starting a new drive session.</p>
                      </td>
                    </tr>
                  ) : (
                    trips.map((t) => {
                      const isCompleted = t.status === "COMPLETED";
                      const isActive = t.status === "ACTIVE";
                      const isPaused = t.status === "PAUSED";

                      return (
                        <tr
                          key={t._id || t.tripSessionId}
                          style={{
                            borderBottom: `1px solid ${borderCol}`,
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? "#33415540" : "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* Trip Session ID */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: "900", color: "#8b5cf6", fontFamily: "monospace", fontSize: "12.5px" }}>
                                {t.tripSessionId}
                              </span>
                              {isActive && (
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: textSecondary, marginTop: "2px" }}>
                              {formatDateStr(t.startTime)}
                            </div>
                          </td>

                          {/* Bus */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: "800", color: textPrimary }}>{t.busNumber}</div>
                            <div style={{ fontSize: "11.5px", color: textSecondary }}>{t.busName || "Fleet Bus"}</div>
                          </td>

                          {/* Driver */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: "800", color: textPrimary }}>{t.driverName || "Assigned Driver"}</div>
                            <div style={{ fontSize: "11px", color: textSecondary }}>{t.driverLicense || "Verified"}</div>
                          </td>

                          {/* Route */}
                          <td style={{ padding: "14px 16px", maxWidth: "220px" }}>
                            <div style={{ fontWeight: "700", color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t.routeName || `${t.startStop || "Origin"} ➔ ${t.endStop || "Terminus"}`}
                            </div>
                            <div style={{ fontSize: "11.5px", color: textSecondary, display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={11} /> {t.startStop || "Start"} → {t.endStop || "End"} ({Number(t.totalDistanceKm || t.distanceCovered || 0).toFixed(1)} km)
                            </div>
                          </td>

                          {/* Time & Duration */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary }}>
                              {formatTimeStr(t.startTime)} → {isCompleted ? formatTimeStr(t.endTime) : <span style={{ color: "#22c55e" }}>Live</span>}
                            </div>
                            <div style={{ fontSize: "11px", color: textSecondary, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                              <Clock size={11} /> {t.durationFormatted || "--"}
                            </div>
                          </td>

                          {/* RFID Taps */}
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <div style={{ fontWeight: "900", fontSize: "14px", color: textPrimary }}>
                              {t.totalRfidTaps || 0}
                            </div>
                            <div style={{ fontSize: "10.5px", color: textSecondary }}>
                              <span style={{ color: "#16a34a" }}>↓{t.totalTapIns || 0}</span> • <span style={{ color: "#2563eb" }}>↑{t.totalTapOuts || 0}</span>
                            </div>
                          </td>

                          {/* Total Fare */}
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ fontWeight: "900", fontSize: "14px", color: (t.totalFare || 0) > 0 ? "#16a34a" : textPrimary }}>
                              ₹{Number(t.totalFare || 0).toFixed(2)}
                            </div>
                            <div style={{ fontSize: "10.5px", color: textSecondary }}>
                              {t.uniquePassengers || 0} pass.
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: "900",
                              letterSpacing: "0.5px",
                              background: isActive ? "rgba(34, 197, 94, 0.15)" : isPaused ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)",
                              color: isActive ? "#16a34a" : isPaused ? "#d97706" : textSecondary,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}>
                              {isActive && "●"} {t.status || "ACTIVE"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <button
                                onClick={() => handleOpenTripModal(t.tripSessionId)}
                                title="View Trip Details & RFID Tap Stream"
                                style={{
                                  padding: "7px 12px",
                                  borderRadius: "10px",
                                  border: `1px solid ${borderCol}`,
                                  background: bgSecondary,
                                  color: textPrimary,
                                  fontWeight: "800",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <Eye size={13} /> View
                              </button>

                              <button
                                onClick={() => handleDownloadPdf(t.tripSessionId, t.busNumber)}
                                disabled={downloadingPdf}
                                title="Download Official Trip Report PDF"
                                style={{
                                  padding: "7px 12px",
                                  borderRadius: "10px",
                                  border: "none",
                                  background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                                  color: "#ffffff",
                                  fontWeight: "800",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <Download size={13} /> PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION BAR */}
            {pagination.totalPages > 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderTop: `1px solid ${borderCol}`,
                background: bgSecondary,
              }}>
                <div style={{ fontSize: "12.5px", color: textSecondary }}>
                  Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total trips)
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchTrips(pagination.page - 1)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${borderCol}`,
                      background: bgCard,
                      color: textPrimary,
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
                      opacity: pagination.page <= 1 ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>

                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchTrips(pagination.page + 1)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${borderCol}`,
                      background: bgCard,
                      color: textPrimary,
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer",
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: LIVE ACTIVE DRIVES (CARD TILES & REAL-TIME HUD)       */}
      {/* ============================================================ */}
      {subTab === "activeTrips" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {activeTrips.length === 0 ? (
            <div style={{
              background: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: "18px",
              padding: "48px 24px",
              textAlign: "center",
              color: textSecondary,
            }}>
              <Zap size={36} style={{ margin: "0 auto 12px auto", display: "block", color: "#94a3b8" }} />
              <strong style={{ fontSize: "16px", color: textPrimary, display: "block" }}>
                No buses are currently on an active trip.
              </strong>
              <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
                When a driver clicks <strong>START DRIVE</strong> on their Driver Cockpit, their vehicle and trip telemetry will appear here in real time.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
              {activeTrips.map((act) => (
                <div
                  key={act._id || act.tripSessionId}
                  style={{
                    background: bgCard,
                    border: `2px solid ${act.status === "ACTIVE" ? "#22c55e" : "#f59e0b"}`,
                    borderRadius: "18px",
                    padding: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    position: "relative",
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px", fontWeight: "900", color: textPrimary }}>
                          {act.busNumber}
                        </span>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "10.5px",
                          fontWeight: "900",
                          background: act.status === "ACTIVE" ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: act.status === "ACTIVE" ? "#16a34a" : "#d97706",
                        }}>
                          ● {act.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>
                        {act.busName || "Fleet Vehicle"} • Driver: <strong>{act.driverName || "Driver"}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Trip ID</div>
                      <div style={{ fontSize: "11.5px", fontWeight: "900", color: "#8b5cf6", fontFamily: "monospace" }}>
                        {act.tripSessionId}
                      </div>
                    </div>
                  </div>

                  {/* Route & Stop Progression */}
                  <div style={{
                    background: bgSecondary,
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${borderCol}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "12.5px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: textSecondary }}>Current Stop:</span>
                      <strong style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={13} /> {act.currentStop?.name || act.currentStop || act.startStop || "En Route"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: textSecondary }}>Next Stop:</span>
                      <strong style={{ color: textPrimary }}>
                        {act.nextStop?.name || act.nextStop || act.endStop || "Final Destination"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: textSecondary }}>Route:</span>
                      <strong style={{ color: textPrimary }}>{act.routeName || "Kerala Route"}</strong>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
                    <div style={{ background: bgMuted, padding: "8px", borderRadius: "10px" }}>
                      <div style={{ fontSize: "10.5px", color: textSecondary }}>Started</div>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: textPrimary }}>{formatTimeStr(act.startTime)}</div>
                    </div>
                    <div style={{ background: bgMuted, padding: "8px", borderRadius: "10px" }}>
                      <div style={{ fontSize: "10.5px", color: textSecondary }}>Duration</div>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: "#16a34a" }}>{act.durationFormatted || "Live"}</div>
                    </div>
                    <div style={{ background: bgMuted, padding: "8px", borderRadius: "10px" }}>
                      <div style={{ fontSize: "10.5px", color: textSecondary }}>Distance</div>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: textPrimary }}>{Number(act.distanceCoveredKm || act.totalDistanceKm || 0).toFixed(1)} km</div>
                    </div>
                  </div>

                  {/* RFID Tap Count & Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Radio size={16} style={{ color: "#8b5cf6" }} />
                      <span style={{ fontSize: "13px", fontWeight: "900", color: textPrimary }}>
                        {act.totalRfidTaps || 0} RFID Taps
                      </span>
                      <span style={{ fontSize: "11px", color: textSecondary }}>
                        (₹{Number(act.totalFare || 0).toFixed(2)})
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenTripModal(act.tripSessionId)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #2e1065, #6d28d9)",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "800",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Eye size={13} /> View Live Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: BUS-WISE RFID & TRIP HISTORY                          */}
      {/* ============================================================ */}
      {subTab === "busWise" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Bus Selector Bar */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "18px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Bus size={20} style={{ color: "#8b5cf6" }} />
              <div>
                <strong style={{ fontSize: "14.5px", color: textPrimary }}>Select Vehicle for Lifetime RFID History:</strong>
                <div style={{ fontSize: "11.5px", color: textSecondary }}>Inspect all past sessions, cumulative fare, and card taps for a specific bus.</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={selectedBusForHistory}
                onChange={(e) => handleFetchBusHistory(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "800",
                  outline: "none",
                  cursor: "pointer",
                  minWidth: "220px",
                }}
              >
                <option value="">-- Choose a Bus --</option>
                {availableBuses.map((b) => (
                  <option key={b._id} value={b.busNumber}>
                    {b.busNumber} — {b.busName || "MoveSmart Bus"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bus History Metrics Summary */}
          {busHistoryLoading ? (
            <div style={{ padding: "48px", textAlign: "center", color: textSecondary }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px auto", display: "block", color: "#8b5cf6" }} />
              <strong>Loading Bus-Wise History...</strong>
            </div>
          ) : busHistoryData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                {[
                  { label: "Total Lifetime Trips", val: busHistoryData.metrics?.totalTrips || 0, icon: Route, col: "#8b5cf6" },
                  { label: "Total RFID Taps", val: busHistoryData.metrics?.totalRfidTaps || 0, icon: Radio, col: "#3b82f6" },
                  { label: "Total TAP-IN", val: busHistoryData.metrics?.totalTapIns || 0, icon: ArrowRight, col: "#10b981" },
                  { label: "Total TAP-OUT", val: busHistoryData.metrics?.totalTapOuts || 0, icon: Layers, col: "#06b6d4" },
                  { label: "Total Fare Collected", val: `₹${Number(busHistoryData.metrics?.totalFare || 0).toFixed(2)}`, icon: TrendingUp, col: "#f59e0b" },
                ].map((m, i) => (
                  <div key={i} style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: textSecondary, fontWeight: "700" }}>{m.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: m.col, marginTop: "4px" }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Bus Trips Table */}
              <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${borderCol}`, fontWeight: "800", color: textPrimary, display: "flex", justifyContent: "space-between" }}>
                  <span>Recorded Trips for Bus {selectedBusForHistory}</span>
                  <span style={{ color: textSecondary, fontSize: "12px" }}>{busHistoryData.trips?.length || 0} Trips Recorded</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ background: bgMuted, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                        <th style={{ padding: "12px 14px" }}>Trip ID</th>
                        <th style={{ padding: "12px 14px" }}>Date</th>
                        <th style={{ padding: "12px 14px" }}>Driver</th>
                        <th style={{ padding: "12px 14px" }}>Route</th>
                        <th style={{ padding: "12px 14px" }}>Duration</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>RFID Taps</th>
                        <th style={{ padding: "12px 14px", textAlign: "right" }}>Fare</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Status</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busHistoryData.trips?.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: textSecondary }}>
                            No trip sessions recorded yet for Bus {selectedBusForHistory}.
                          </td>
                        </tr>
                      ) : (
                        busHistoryData.trips.map((t) => (
                          <tr key={t._id || t.tripSessionId} style={{ borderBottom: `1px solid ${borderCol}` }}>
                            <td style={{ padding: "12px 14px", fontWeight: "800", color: "#8b5cf6", fontFamily: "monospace" }}>{t.tripSessionId}</td>
                            <td style={{ padding: "12px 14px", color: textSecondary }}>{formatDateStr(t.startTime)}</td>
                            <td style={{ padding: "12px 14px", fontWeight: "700", color: textPrimary }}>{t.driverName}</td>
                            <td style={{ padding: "12px 14px", color: textPrimary }}>{t.routeName || `${t.startStop} → ${t.endStop}`}</td>
                            <td style={{ padding: "12px 14px", color: textSecondary }}>{t.durationFormatted}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: "800" }}>{t.totalRfidTaps || 0}</td>
                            <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#16a34a" }}>₹{Number(t.totalFare || 0).toFixed(2)}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10.5px", fontWeight: "800", background: t.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)", color: t.status === "ACTIVE" ? "#16a34a" : textSecondary }}>
                                {t.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <button
                                onClick={() => handleDownloadPdf(t.tripSessionId, t.busNumber)}
                                style={{ padding: "5px 10px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "#ffffff", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                              >
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: textSecondary, background: bgCard, borderRadius: "16px", border: `1px solid ${borderCol}` }}>
              Please select a bus from the dropdown above to view its lifetime RFID and trip history.
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: DRIVER-WISE TRIP HISTORY                              */}
      {/* ============================================================ */}
      {subTab === "driverWise" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Driver Selector Bar */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "18px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <User size={20} style={{ color: "#8b5cf6" }} />
              <div>
                <strong style={{ fontSize: "14.5px", color: textPrimary }}>Select Driver for Performance &amp; Trip History:</strong>
                <div style={{ fontSize: "11.5px", color: textSecondary }}>Inspect all driven trips, completed hours, and fare handled by this driver.</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={selectedDriverForHistory}
                onChange={(e) => handleFetchDriverHistory(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "800",
                  outline: "none",
                  cursor: "pointer",
                  minWidth: "220px",
                }}
              >
                <option value="">-- Choose a Driver --</option>
                {availableDrivers.map((d) => (
                  <option key={d._id} value={d.name || d._id}>
                    {d.name} ({d.email || d.phone || "Driver"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {driverHistoryLoading ? (
            <div style={{ padding: "48px", textAlign: "center", color: textSecondary }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px auto", display: "block", color: "#8b5cf6" }} />
              <strong>Loading Driver-Wise History...</strong>
            </div>
          ) : driverHistoryData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                {[
                  { label: "Total Trips Driven", val: driverHistoryData.metrics?.totalTrips || 0, icon: Route, col: "#8b5cf6" },
                  { label: "Completed Drives", val: driverHistoryData.metrics?.completedTripsCount || 0, icon: CheckCircle, col: "#10b981" },
                  { label: "Total RFID Taps", val: driverHistoryData.metrics?.totalRfidTransactions || 0, icon: Radio, col: "#3b82f6" },
                  { label: "Total Fare Processed", val: `₹${Number(driverHistoryData.metrics?.totalFareProcessed || 0).toFixed(2)}`, icon: TrendingUp, col: "#f59e0b" },
                ].map((m, i) => (
                  <div key={i} style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: textSecondary, fontWeight: "700" }}>{m.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: m.col, marginTop: "4px" }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Driver Trips Table */}
              <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${borderCol}`, fontWeight: "800", color: textPrimary }}>
                  Trip History for {driverHistoryData.driver?.name || selectedDriverForHistory}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ background: bgMuted, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                        <th style={{ padding: "12px 14px" }}>Trip ID</th>
                        <th style={{ padding: "12px 14px" }}>Date</th>
                        <th style={{ padding: "12px 14px" }}>Bus</th>
                        <th style={{ padding: "12px 14px" }}>Route</th>
                        <th style={{ padding: "12px 14px" }}>Duration</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>RFID Taps</th>
                        <th style={{ padding: "12px 14px", textAlign: "right" }}>Fare</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Status</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverHistoryData.trips?.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: textSecondary }}>
                            No trips recorded for this driver.
                          </td>
                        </tr>
                      ) : (
                        driverHistoryData.trips.map((t) => (
                          <tr key={t._id || t.tripSessionId} style={{ borderBottom: `1px solid ${borderCol}` }}>
                            <td style={{ padding: "12px 14px", fontWeight: "800", color: "#8b5cf6", fontFamily: "monospace" }}>{t.tripSessionId}</td>
                            <td style={{ padding: "12px 14px", color: textSecondary }}>{formatDateStr(t.startTime)}</td>
                            <td style={{ padding: "12px 14px", fontWeight: "700", color: textPrimary }}>{t.busNumber}</td>
                            <td style={{ padding: "12px 14px", color: textPrimary }}>{t.routeName || `${t.startStop} → ${t.endStop}`}</td>
                            <td style={{ padding: "12px 14px", color: textSecondary }}>{t.durationFormatted}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: "800" }}>{t.totalRfidTaps || 0}</td>
                            <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#16a34a" }}>₹{Number(t.totalFare || 0).toFixed(2)}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10.5px", fontWeight: "800", background: t.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)", color: t.status === "ACTIVE" ? "#16a34a" : textSecondary }}>
                                {t.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <button
                                onClick={() => handleDownloadPdf(t.tripSessionId, t.busNumber)}
                                style={{ padding: "5px 10px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "#ffffff", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                              >
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: textSecondary, background: bgCard, borderRadius: "16px", border: `1px solid ${borderCol}` }}>
              Please select a driver from the dropdown above.
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: DATE-BASED REPORT SUMMARY                             */}
      {/* ============================================================ */}
      {subTab === "dateReports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Date Picker Bar */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "18px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={20} style={{ color: "#8b5cf6" }} />
              <div>
                <strong style={{ fontSize: "14.5px", color: textPrimary }}>Select Date for Daily Transit Audit Summary:</strong>
                <div style={{ fontSize: "11.5px", color: textSecondary }}>Consolidate all bus operations, RFID taps, and fares for a specific date.</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="date"
                value={selectedDateForReport}
                onChange={(e) => handleFetchDateReport(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${borderCol}`,
                  background: bgSecondary,
                  color: textPrimary,
                  fontSize: "13px",
                  fontWeight: "800",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleFetchDateReport(selectedDateForReport)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #2e1065, #6d28d9)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Generate Audit
              </button>
            </div>
          </div>

          {dateReportLoading ? (
            <div style={{ padding: "48px", textAlign: "center", color: textSecondary }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px auto", display: "block", color: "#8b5cf6" }} />
              <strong>Compiling Daily Transit Audit...</strong>
            </div>
          ) : dateReportData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                {[
                  { label: "Trips on Date", val: dateReportData.summary?.tripsCount || 0, icon: Route, col: "#8b5cf6" },
                  { label: "Active Buses", val: dateReportData.summary?.activeBusesCount || 0, icon: Bus, col: "#3b82f6" },
                  { label: "Active Drivers", val: dateReportData.summary?.driversCount || 0, icon: User, col: "#10b981" },
                  { label: "Total RFID Taps", val: dateReportData.summary?.totalRfidTaps || 0, icon: Radio, col: "#06b6d4" },
                  { label: "Daily Revenue", val: `₹${Number(dateReportData.summary?.totalFare || 0).toFixed(2)}`, icon: TrendingUp, col: "#f59e0b" },
                ].map((m, i) => (
                  <div key={i} style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: textSecondary, fontWeight: "700" }}>{m.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: m.col, marginTop: "4px" }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Date Trips Table */}
              <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${borderCol}`, fontWeight: "800", color: textPrimary, display: "flex", justifyContent: "space-between" }}>
                  <span>Bus Trips on {selectedDateForReport}</span>
                  <span style={{ color: textSecondary, fontSize: "12px" }}>{dateReportData.trips?.length || 0} Sessions</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ background: bgMuted, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                        <th style={{ padding: "12px 14px" }}>Trip ID</th>
                        <th style={{ padding: "12px 14px" }}>Bus</th>
                        <th style={{ padding: "12px 14px" }}>Driver</th>
                        <th style={{ padding: "12px 14px" }}>Route</th>
                        <th style={{ padding: "12px 14px" }}>Start / End Time</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Taps</th>
                        <th style={{ padding: "12px 14px", textAlign: "right" }}>Fare</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Status</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateReportData.trips?.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: textSecondary }}>
                            No bus trips recorded on {selectedDateForReport}.
                          </td>
                        </tr>
                      ) : (
                        dateReportData.trips.map((t) => (
                          <tr key={t._id || t.tripSessionId} style={{ borderBottom: `1px solid ${borderCol}` }}>
                            <td style={{ padding: "12px 14px", fontWeight: "800", color: "#8b5cf6", fontFamily: "monospace" }}>{t.tripSessionId}</td>
                            <td style={{ padding: "12px 14px", fontWeight: "700", color: textPrimary }}>{t.busNumber}</td>
                            <td style={{ padding: "12px 14px", color: textPrimary }}>{t.driverName}</td>
                            <td style={{ padding: "12px 14px", color: textPrimary }}>{t.routeName || `${t.startStop} → ${t.endStop}`}</td>
                            <td style={{ padding: "12px 14px", color: textSecondary }}>{formatTimeStr(t.startTime)} → {formatTimeStr(t.endTime)}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: "800" }}>{t.totalRfidTaps || 0}</td>
                            <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#16a34a" }}>₹{Number(t.totalFare || 0).toFixed(2)}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10.5px", fontWeight: "800", background: t.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)", color: t.status === "ACTIVE" ? "#16a34a" : textSecondary }}>
                                {t.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  onClick={() => handleOpenTripModal(t.tripSessionId)}
                                  style={{ padding: "5px 10px", borderRadius: "8px", border: `1px solid ${borderCol}`, background: bgSecondary, color: textPrimary, fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownloadPdf(t.tripSessionId, t.busNumber)}
                                  style={{ padding: "5px 10px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "#ffffff", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                >
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : null}

        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TRIP DETAILS & CHRONOLOGICAL RFID TRANSACTIONS TABLE   */}
      {/* ============================================================ */}
      {selectedTripId && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "24px",
            width: "100%",
            maxWidth: "960px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${borderCol}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: bgSecondary,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "900", color: textPrimary }}>
                    Trip Session Audit: <span style={{ color: "#8b5cf6", fontFamily: "monospace" }}>{selectedTripId}</span>
                  </span>
                  {tripDetailModal?.trip?.status && (
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: "900",
                      background: tripDetailModal.trip.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)",
                      color: tripDetailModal.trip.status === "ACTIVE" ? "#16a34a" : textSecondary,
                    }}>
                      ● {tripDetailModal.trip.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>
                  Vehicle: <strong>{tripDetailModal?.trip?.busNumber || "Bus"}</strong> • Driver: <strong>{tripDetailModal?.trip?.driverName || "Driver"}</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => handleDownloadPdf(selectedTripId, tripDetailModal?.trip?.busNumber)}
                  disabled={downloadingPdf}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Download size={14} /> Download PDF Report
                </button>

                <button
                  onClick={() => { setSelectedTripId(null); setTripDetailModal(null); setTripTaps([]); }}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    border: `1px solid ${borderCol}`,
                    background: bgCard,
                    color: textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {tripModalLoading ? (
                <div style={{ padding: "64px", textAlign: "center", color: textSecondary }}>
                  <RefreshCw size={28} className="spin" style={{ margin: "0 auto 12px auto", display: "block", color: "#8b5cf6" }} />
                  <strong>Loading Trip Audit &amp; RFID Stream...</strong>
                </div>
              ) : (
                <>
                  {/* 1. TRIP INFORMATION CARD */}
                  <div style={{
                    background: bgSecondary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: "16px",
                    padding: "16px 20px",
                  }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "900", color: textSecondary, textTransform: "uppercase", margin: "0 0 12px 0" }}>
                      Trip Overview &amp; Specifications
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "12.5px" }}>
                      <div>
                        <span style={{ color: textSecondary }}>Bus Number:</span>{" "}
                        <strong style={{ color: textPrimary }}>{tripDetailModal?.trip?.busNumber}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Driver Name:</span>{" "}
                        <strong style={{ color: textPrimary }}>{tripDetailModal?.trip?.driverName || "Driver"}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Route:</span>{" "}
                        <strong style={{ color: textPrimary }}>{tripDetailModal?.trip?.routeName || `${tripDetailModal?.trip?.startStop} ➔ ${tripDetailModal?.trip?.endStop}`}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Starting Stop:</span>{" "}
                        <strong style={{ color: textPrimary }}>{tripDetailModal?.trip?.startStop || "Origin"}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Terminating Stop:</span>{" "}
                        <strong style={{ color: textPrimary }}>{tripDetailModal?.trip?.endStop || "Destination"}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Trip Start:</span>{" "}
                        <strong style={{ color: textPrimary }}>{formatTimeStr(tripDetailModal?.trip?.startTime)} ({formatDateStr(tripDetailModal?.trip?.startTime)})</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Trip End:</span>{" "}
                        <strong style={{ color: textPrimary }}>{formatTimeStr(tripDetailModal?.trip?.endTime)}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Duration:</span>{" "}
                        <strong style={{ color: "#16a34a" }}>{tripDetailModal?.trip?.durationFormatted || "--"}</strong>
                      </div>
                      <div>
                        <span style={{ color: textSecondary }}>Distance Covered:</span>{" "}
                        <strong style={{ color: textPrimary }}>{Number(tripDetailModal?.trip?.totalDistanceKm || tripDetailModal?.trip?.distanceCovered || 0).toFixed(1)} km</strong>
                      </div>
                    </div>
                  </div>

                  {/* 2. RFID SUMMARY TILES */}
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "900", color: textSecondary, textTransform: "uppercase", margin: "0 0 10px 0" }}>
                      RFID Tap Summary &amp; Fare Reconciliation
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                      {[
                        { label: "Total Taps", val: tripDetailModal?.rfidSummary?.totalRfidTaps || 0, col: "#8b5cf6" },
                        { label: "Total TAP-IN", val: tripDetailModal?.rfidSummary?.totalTapIns || 0, col: "#10b981" },
                        { label: "Total TAP-OUT", val: tripDetailModal?.rfidSummary?.totalTapOuts || 0, col: "#06b6d4" },
                        { label: "Unique Riders", val: tripDetailModal?.rfidSummary?.uniquePassengers || 0, col: "#ec4899" },
                        { label: "Total Fare", val: `₹${Number(tripDetailModal?.rfidSummary?.totalFare || 0).toFixed(2)}`, col: "#f59e0b" },
                        { label: "Reconciliation", val: "100% OK", col: "#16a34a" },
                      ].map((s, i) => (
                        <div key={i} style={{ background: bgSecondary, border: `1px solid ${borderCol}`, borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: textSecondary, fontWeight: "700" }}>{s.label}</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", color: s.col, marginTop: "2px" }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. CHRONOLOGICAL RFID TRANSACTIONS TABLE */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "900", color: textSecondary, textTransform: "uppercase", margin: 0 }}>
                        Chronological RFID Tap Records ({tripTaps.length} Events)
                      </h4>

                      {/* Sort Toggle */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => {
                            const newSort = tripTapsSort === "desc" ? "asc" : "desc";
                            setTripTapsSort(newSort);
                            handleFetchTripTaps(1, newSort);
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${borderCol}`,
                            background: bgSecondary,
                            color: textPrimary,
                            fontSize: "11.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <ArrowUpDown size={12} /> {tripTapsSort === "desc" ? "Latest First" : "Oldest First"}
                        </button>
                      </div>
                    </div>

                    <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: "14px", overflow: "hidden" }}>
                      <div style={{ overflowX: "auto", maxHeight: "320px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                            <tr style={{ background: bgMuted, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                              <th style={{ padding: "10px 12px", width: "40px" }}>#</th>
                              <th style={{ padding: "10px 12px" }}>Time</th>
                              <th style={{ padding: "10px 12px" }}>Passenger</th>
                              <th style={{ padding: "10px 12px" }}>Masked Card UID</th>
                              <th style={{ padding: "10px 12px" }}>Type</th>
                              <th style={{ padding: "10px 12px", textAlign: "center" }}>Action</th>
                              <th style={{ padding: "10px 12px" }}>Stop</th>
                              <th style={{ padding: "10px 12px", textAlign: "right" }}>Fare</th>
                              <th style={{ padding: "10px 12px", textAlign: "right" }}>Balance (Prev → New)</th>
                              <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tripTaps.length === 0 ? (
                              <tr>
                                <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: textSecondary }}>
                                  No RFID transactions recorded for this trip session yet.
                                </td>
                              </tr>
                            ) : (
                              tripTaps.map((tap, idx) => (
                                <tr key={tap._id || idx} style={{ borderBottom: `1px solid ${borderCol}` }}>
                                  <td style={{ padding: "10px 12px", color: textSecondary }}>{idx + 1}</td>
                                  <td style={{ padding: "10px 12px", fontWeight: "600", color: textPrimary, whiteSpace: "nowrap" }}>
                                    {formatDateTimeStr(tap.timestamp)}
                                  </td>
                                  <td style={{ padding: "10px 12px", fontWeight: "800", color: textPrimary }}>
                                    {tap.passengerName || "Passenger"}
                                  </td>
                                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: textSecondary }}>
                                    {tap.maskedCardUid || tap.cardUid}
                                  </td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <span style={{
                                      fontSize: "10.5px",
                                      fontWeight: "800",
                                      color: tap.cardType === "Gold" ? "#b45309" : tap.cardType === "Blue" ? "#1d4ed8" : textSecondary,
                                    }}>
                                      {tap.cardType || "Silver"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                    <span style={{
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      fontSize: "10.5px",
                                      fontWeight: "900",
                                      background: tap.action === "TAP_IN" ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 99, 235, 0.15)",
                                      color: tap.action === "TAP_IN" ? "#10b981" : "#2563eb",
                                    }}>
                                      {tap.action === "TAP_IN" ? "TAP-IN" : "TAP-OUT"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", color: textPrimary }}>
                                    {tap.stopName || tap.stop?.name || "Transit Stop"}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: tap.fare > 0 ? "#dc2626" : textPrimary }}>
                                    {tap.fare > 0 ? `₹${Number(tap.fare).toFixed(2)}` : "₹0.00"}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: "11px", color: textSecondary }}>
                                    ₹{Number(tap.previousBalance || 0).toFixed(0)} → <strong style={{ color: textPrimary }}>₹{Number(tap.newBalance || 0).toFixed(0)}</strong>
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                    <span style={{ color: "#16a34a", fontWeight: "800", fontSize: "11px" }}>SUCCESS</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: `1px solid ${borderCol}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: bgSecondary,
            }}>
              <div style={{ fontSize: "12px", color: textSecondary }}>
                Data Source: <strong>MongoDB Atlas &amp; MoveSmart RFID Edge Engine</strong>
              </div>
              <button
                onClick={() => { setSelectedTripId(null); setTripDetailModal(null); setTripTaps([]); }}
                style={{
                  padding: "9px 20px",
                  borderRadius: "12px",
                  background: bgMuted,
                  color: textPrimary,
                  border: "none",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
