import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Radio,
  Wifi,
  WifiOff,
  UserCheck,
  UserX,
  UserMinus,
  Activity,
  Sliders,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Bus,
  ChevronRight,
  Info,
  Maximize2,
  Settings,
  Flame,
  Check,
  HelpCircle,
  FileText
} from "lucide-react";

export default function DriverSafetyMonitoring({ darkMode = false, showToast = () => {} }) {
  // Theme Variables
  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const bgCardSecondary = darkMode ? "#0f172a" : "#f8fafc";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  // State Management
  const [subTab, setSubTab] = useState("live"); // 'live' | 'alerts' | 'history' | 'config'
  const [activeSessions, setActiveSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [liveVideoFrames, setLiveVideoFrames] = useState({});
  const [safetyStats, setSafetyStats] = useState({
    activeTripsMonitored: 0,
    onlineDevicesCount: 0,
    verifiedDriversCount: 0,
    activeAlertsCount: 0,
    criticalAlertsToday: 0,
    totalEventsToday: 0,
  });
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Selected Session for Live Inspector Modal
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionEvents, setSessionEvents] = useState([]);

  // Resolve Alert Modal State
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);

  // History State & Filters
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState("All");
  const [historyFilterSeverity, setHistoryFilterSeverity] = useState("All");
  const [historyFilterStatus, setHistoryFilterStatus] = useState("All");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // Config State
  const [config, setConfig] = useState({
    earThreshold: 0.22,
    earlyWarningDurationSec: 1.5,
    drowsinessDurationSec: 2.5,
    criticalDrowsinessDurationSec: 4.0,
    driverAbsenceGraceSec: 15,
    driverAbsenceCriticalSec: 30,
    faceMatchConfidenceThreshold: 0.75,
    deviceOfflineTimeoutSec: 20,
    heartbeatIntervalSec: 5,
    alertEscalationTimeSec: 60,
    audioAlertsEnabled: true,
    voicePromptsEnabled: true,
    voicePromptTextEarly: "Please stay alert.",
    voicePromptTextDrowsy: "Please stay alert. Consider drinking some water.",
    voicePromptTextCritical: "Critical drowsiness detected. Please pull over safely if needed.",
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Audio Chime Ref for Critical Alerts
  const playAlertChime = useCallback((severity = "Critical") => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (severity === "Critical") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio chime playback notice:", e);
    }
  }, []);

  // ----------------------------------------------------
  // FETCH API DATA
  // ----------------------------------------------------
  const fetchActiveSessions = useCallback(async () => {
    try {
      const res = await axios.get("/api/monitoring/sessions/active");
      setActiveSessions(res.data.sessions || []);
    } catch (err) {
      console.error("Error fetching active monitoring sessions:", err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get("/api/monitoring/alerts?status=All");
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Error fetching safety alerts:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get("/api/monitoring/stats");
      if (res.data?.stats) setSafetyStats(res.data.stats);
    } catch (err) {
      console.error("Error fetching safety stats:", err);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get("/api/monitoring/config");
      if (res.data?.config) setConfig(res.data.config);
    } catch (err) {
      console.error("Error fetching monitoring config:", err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      let url = `/api/monitoring/events/history?limit=100`;
      if (historyFilterType !== "All") url += `&eventType=${historyFilterType}`;
      if (historyFilterSeverity !== "All") url += `&severity=${historyFilterSeverity}`;
      if (historyFilterStatus !== "All") url += `&status=${historyFilterStatus}`;
      const res = await axios.get(url);
      setHistoryEvents(res.data.events || []);
    } catch (err) {
      console.error("Error fetching safety history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilterType, historyFilterSeverity, historyFilterStatus]);

  // Initial Data Load & Polling Fallback
  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetchActiveSessions(),
      fetchAlerts(),
      fetchStats(),
      fetchConfig(),
    ]).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchActiveSessions();
      fetchAlerts();
      fetchStats();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchActiveSessions, fetchAlerts, fetchStats, fetchConfig]);

  useEffect(() => {
    if (subTab === "history") {
      fetchHistory();
    }
  }, [subTab, fetchHistory]);

  // ----------------------------------------------------
  // SOCKET.IO REAL-TIME INTEGRATION
  // ----------------------------------------------------
  useEffect(() => {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join-admin-safety");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Real-time Safety Alert Handler
    socket.on("safety:alert", (alertDoc) => {
      setAlerts((prev) => {
        const filtered = prev.filter((a) => a._id !== alertDoc._id);
        return [alertDoc, ...filtered];
      });

      fetchStats();
      fetchActiveSessions();

      if (alertDoc.severity === "Critical" || alertDoc.severity === "High") {
        playAlertChime(alertDoc.severity);
        showToast(`🚨 ${alertDoc.title} on Bus ${alertDoc.busNumber}!`, "error");
      } else if (alertDoc.status === "Active") {
        playAlertChime("Medium");
      }
    });

    // Real-time Session Status Change
    socket.on("session:status-change", (sessionDoc) => {
      setActiveSessions((prev) => {
        if (sessionDoc.status === "Ended") {
          return prev.filter((s) => s._id !== sessionDoc._id);
        }
        const exists = prev.some((s) => s._id === sessionDoc._id);
        if (exists) {
          return prev.map((s) => (s._id === sessionDoc._id ? sessionDoc : s));
        }
        return [sessionDoc, ...prev];
      });
      fetchStats();
    });

    // Real-time Telemetry updates
    socket.on("telemetry:update", ({ sessionId, ear, faceConfidence, currentDriverStatus, currentAlertness, deviceStatus }) => {
      setActiveSessions((prev) =>
        prev.map((s) => {
          if (s._id === sessionId) {
            return {
              ...s,
              currentDriverStatus: currentDriverStatus || s.currentDriverStatus,
              currentAlertness: currentAlertness || s.currentAlertness,
              deviceStatus: deviceStatus || s.deviceStatus,
              latestTelemetry: {
                ...s.latestTelemetry,
                ear: ear !== undefined ? ear : s.latestTelemetry?.ear,
                faceConfidence: faceConfidence !== undefined ? faceConfidence : s.latestTelemetry?.faceConfidence,
              },
              lastHeartbeat: new Date(),
            };
          }
          return s;
        })
      );
    });

    // Device Status changes
    socket.on("device:status-change", ({ sessionId, status }) => {
      setActiveSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, deviceStatus: status } : s))
      );
      fetchStats();
    });

    // Real-time Live Camera Video Stream from Driver
    socket.on("admin:stream-frame", (data) => {
      if (data?.busNumber || data?.sessionId) {
        const key = data.sessionId || data.busNumber;
        setLiveVideoFrames((prev) => ({
          ...prev,
          [key]: data.frame,
          [data.busNumber]: data.frame,
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchStats, fetchActiveSessions, playAlertChime, showToast]);

  // ----------------------------------------------------
  // ALERT ACTION HANDLERS
  // ----------------------------------------------------
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const res = await axios.put(`/api/monitoring/alerts/${alertId}/acknowledge`);
      showToast(res.data?.message || "Alert acknowledged.");
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, status: "Acknowledged" } : a))
      );
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to acknowledge alert", "error");
    }
  };

  const handleOpenResolveModal = (alert) => {
    setResolvingAlert(alert);
    setResolutionNote("");
  };

  const handleSubmitResolveAlert = async (e) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setSubmittingResolve(true);
    try {
      const res = await axios.put(`/api/monitoring/alerts/${resolvingAlert._id}/resolve`, {
        resolutionNote: resolutionNote.trim(),
      });
      showToast(res.data?.message || "Alert resolved and cleared.");
      setAlerts((prev) =>
        prev.map((a) => (a._id === resolvingAlert._id ? { ...a, status: "Resolved", resolutionNote } : a))
      );
      setResolvingAlert(null);
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to resolve alert", "error");
    } finally {
      setSubmittingResolve(false);
    }
  };

  // ----------------------------------------------------
  // INSPECT SESSION DETAILS & SIMULATION ACTIONS
  // ----------------------------------------------------
  const handleOpenInspector = async (session) => {
    setSelectedSession(session);
    setSessionDetailLoading(true);
    try {
      const res = await axios.get(`/api/monitoring/session/${session._id}`);
      setSelectedSession(res.data.session);
      setSessionEvents(res.data.recentEvents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const handleSimulateEvent = async (eventType, ear = 0.15, absenceSec = 0) => {
    if (!selectedSession) return;
    try {
      await axios.post("/api/monitoring/event", {
        sessionId: selectedSession._id,
        busId: selectedSession.busId?._id || selectedSession.busId,
        busNumber: selectedSession.busNumber,
        eventType,
        ear,
        absenceSeconds: absenceSec,
        faceConfidence: eventType === "DRIVER_MISMATCH" ? 0.35 : 0.95,
      });
      showToast(`Simulated event: ${eventType}`);
      const res = await axios.get(`/api/monitoring/session/${selectedSession._id}`);
      setSelectedSession(res.data.session);
      setSessionEvents(res.data.recentEvents || []);
    } catch (err) {
      showToast("Simulation failed: " + err.message, "error");
    }
  };

  // ----------------------------------------------------
  // SAVE CONFIGURATION
  // ----------------------------------------------------
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await axios.put("/api/monitoring/config", config);
      showToast(res.data?.message || "Safety thresholds updated successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save config", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  // ----------------------------------------------------
  // CSV EXPORT HELPER
  // ----------------------------------------------------
  const handleExportCSV = () => {
    if (!historyEvents.length) {
      showToast("No safety events to export", "error");
      return;
    }
    const headers = ["Timestamp", "BusNumber", "DriverName", "EventType", "Severity", "Status", "Description", "ResolvedBy"];
    const rows = historyEvents.map((ev) => [
      new Date(ev.createdAt).toISOString(),
      ev.busNumber || "",
      ev.driverName || "",
      ev.eventType || "",
      ev.severity || "",
      ev.status || "",
      `"${(ev.description || "").replace(/"/g, '""')}"`,
      ev.resolvedByName || "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MoveSmart_DriverSafety_History_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Safety event history CSV downloaded.");
  };

  // Status Badge Helpers
  const renderDriverStatusBadge = (status) => {
    switch (status) {
      case "DRIVER_VERIFIED":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", padding: "4px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
            <UserCheck size={14} /> Driver Verified
          </span>
        );
      case "DRIVER_MISMATCH":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", padding: "4px 10px", borderRadius: "8px", fontWeight: "900", fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.4)", animation: "pulse 2s infinite" }}>
            <UserX size={14} /> Driver Mismatch
          </span>
        );
      case "DRIVER_NOT_DETECTED":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245, 158, 11, 0.15)", color: "#d97706", padding: "4px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
            <UserMinus size={14} /> Not Detected
          </span>
        );
      case "DRIVER_ABSENT":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", padding: "4px 10px", borderRadius: "8px", fontWeight: "900", fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
            <UserX size={14} /> Driver Absent
          </span>
        );
      default:
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(148, 163, 184, 0.15)", color: textSecondary, padding: "4px 10px", borderRadius: "8px", fontWeight: "700", fontSize: "12px" }}>
            Unknown
          </span>
        );
    }
  };

  const renderAlertnessBadge = (alertness) => {
    switch (alertness) {
      case "NORMAL":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", padding: "4px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
            <CheckCircle size={14} /> Normal (Alert)
          </span>
        );
      case "EARLY_WARNING":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245, 158, 11, 0.15)", color: "#d97706", padding: "4px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
            <AlertTriangle size={14} /> Early Warning
          </span>
        );
      case "DROWSINESS_WARNING":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(249, 115, 22, 0.15)", color: "#ea580c", padding: "4px 10px", borderRadius: "8px", fontWeight: "900", fontSize: "12px", border: "1px solid rgba(249, 115, 22, 0.4)" }}>
            <EyeOff size={14} /> Drowsiness Warning
          </span>
        );
      case "CRITICAL_DROWSINESS":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(239, 68, 68, 0.2)", color: "#b91c1c", padding: "4px 10px", borderRadius: "8px", fontWeight: "900", fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.5)", animation: "pulse 1.5s infinite" }}>
            <Flame size={14} /> Severe Drowsiness
          </span>
        );
      default:
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(148, 163, 184, 0.15)", color: textSecondary, padding: "4px 10px", borderRadius: "8px", fontWeight: "700", fontSize: "12px" }}>
            Unknown
          </span>
        );
    }
  };

  const renderDeviceBadge = (status) => {
    if (status === "ONLINE") {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(14, 165, 233, 0.15)", color: "#0284c7", padding: "4px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", border: "1px solid rgba(14, 165, 233, 0.3)" }}>
          <Wifi size={14} /> Online
        </span>
      );
    }
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", padding: "4px 10px", borderRadius: "8px", fontWeight: "900", fontSize: "12px", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
        <WifiOff size={14} /> Offline
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* HEADER BANNER WITH SOCKET STATUS & STATS */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
          color: "#ffffff",
          padding: "24px 28px",
          borderRadius: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          boxShadow: "0 10px 30px rgba(49, 16, 66, 0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: socketConnected ? "rgba(74, 222, 128, 0.2)" : "rgba(239, 68, 68, 0.2)", color: socketConnected ? "#4ade80" : "#f87171", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "800", marginBottom: "10px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: socketConnected ? "#4ade80" : "#f87171", display: "inline-block", animation: "pulse 2s infinite" }}></span>
            {socketConnected ? "Real-Time Telemetry Socket Active" : "Socket Connecting..."}
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: "#ffffff", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldAlert style={{ color: "#a855f7" }} size={28} />
            Driver Safety &amp; Real-Time AI Monitoring Console
          </h2>
          <p style={{ color: "#c4b5fd", fontSize: "13.5px", marginTop: "6px", margin: 0, maxWidth: "700px" }}>
            Live computer-vision telemetry stream tracking driver presence, facial landmark Eye Aspect Ratio (EAR), fatigue escalation, and edge camera status.
          </p>
        </div>

        {/* Quick Tabs Toggle */}
        <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.08)", padding: "4px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.15)" }}>
          {[
            { id: "live", label: "Live Fleet View", icon: Activity, count: activeSessions.length },
            { id: "alerts", label: "Active Alerts", icon: AlertTriangle, count: alerts.filter((a) => a.status === "Active").length, alert: true },
            { id: "history", label: "Safety Logs", icon: Clock },
            { id: "config", label: "Thresholds & Tools", icon: Sliders },
          ].map((t) => {
            const isSel = subTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: isSel ? "#ffffff" : "transparent",
                  color: isSel ? "#1e1b4b" : "#ffffff",
                  fontWeight: isSel ? "900" : "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={16} style={{ color: isSel ? "#7c3aed" : "inherit" }} />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span style={{ background: t.alert && isSel ? "#ef4444" : (isSel ? "#7c3aed" : "rgba(255,255,255,0.2)"), color: "#ffffff", padding: "2px 7px", borderRadius: "999px", fontSize: "11px", fontWeight: "900" }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div style={{ background: bgCard, padding: "18px 20px", borderRadius: "16px", border: `1px solid ${borderCol}`, boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Monitored Trips</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(109, 40, 217, 0.1)", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bus size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary }}>{safetyStats.activeTripsMonitored}</div>
          <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px" }}>Active trips on road</div>
        </div>

        <div style={{ background: bgCard, padding: "18px 20px", borderRadius: "16px", border: `1px solid ${borderCol}`, boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Verified Drivers</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34, 197, 94, 0.1)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#16a34a" }}>{safetyStats.verifiedDriversCount}</div>
          <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px" }}>Assigned &amp; verified faces</div>
        </div>

        <div style={{ background: bgCard, padding: "18px 20px", borderRadius: "16px", border: `1px solid ${borderCol}`, boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Active Safety Alerts</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: safetyStats.activeAlertsCount > 0 ? "#dc2626" : textPrimary }}>
            {safetyStats.activeAlertsCount}
          </div>
          <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px" }}>Awaiting acknowledgment</div>
        </div>

        <div style={{ background: bgCard, padding: "18px 20px", borderRadius: "16px", border: `1px solid ${borderCol}`, boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Critical Today</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(249, 115, 22, 0.1)", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Flame size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#ea580c" }}>{safetyStats.criticalAlertsToday}</div>
          <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px" }}>High &amp; critical severity</div>
        </div>

        <div style={{ background: bgCard, padding: "18px 20px", borderRadius: "16px", border: `1px solid ${borderCol}`, boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Edge Device Health</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(14, 165, 233, 0.1)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wifi size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0284c7" }}>
            {safetyStats.onlineDevicesCount} / {safetyStats.activeTripsMonitored || 1}
          </div>
          <div style={{ fontSize: "12px", color: textSecondary, marginTop: "4px" }}>Heartbeat signal active</div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUBTAB 1: LIVE FLEET MONITORING VIEW                 */}
      {/* ==================================================== */}
      {subTab === "live" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Active Alerts Banner if any */}
          {alerts.filter((a) => a.status === "Active" && a.severity === "Critical").length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)",
                border: "1.5px solid rgba(239, 68, 68, 0.4)",
                padding: "16px 20px",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Flame size={24} style={{ color: "#ef4444", animation: "pulse 1s infinite" }} />
                <div>
                  <strong style={{ color: "#dc2626", fontSize: "14.5px", display: "block" }}>
                    Critical Safety Alert Active! Immediate Attention Required
                  </strong>
                  <span style={{ fontSize: "12.5px", color: textPrimary }}>
                    {alerts.filter((a) => a.status === "Active" && a.severity === "Critical")[0]?.title} on Bus{" "}
                    {alerts.filter((a) => a.status === "Active" && a.severity === "Critical")[0]?.busNumber} (Driver:{" "}
                    {alerts.filter((a) => a.status === "Active" && a.severity === "Critical")[0]?.driverName})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab("alerts")}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  fontWeight: "800",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Review Active Alerts →
              </button>
            </div>
          )}

          {/* ACTIVE SESSIONS TABLE */}
          <div style={{ background: bgCard, borderRadius: "18px", border: `1px solid ${borderCol}`, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0, color: textPrimary }}>
                  Active Operating Buses &amp; Real-Time Driver Telemetry
                </h3>
                <p style={{ fontSize: "12.5px", color: textSecondary, margin: "3px 0 0 0" }}>
                  Derived dynamically from active trips and assigned drivers. Monitoring starts when trips begin.
                </p>
              </div>
              <button
                onClick={fetchActiveSessions}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: `1px solid ${borderCol}`, padding: "6px 14px", borderRadius: "10px", fontSize: "12.5px", fontWeight: "700", color: textPrimary, cursor: "pointer" }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {activeSessions.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: textSecondary }}>
                <Bus size={48} style={{ opacity: 0.25, margin: "0 auto 12px auto", display: "block" }} />
                <h4 style={{ fontSize: "15px", fontWeight: "800", color: textPrimary, margin: "0 0 4px 0" }}>
                  No Active Bus Trips Currently Operating
                </h4>
                <p style={{ fontSize: "13px", maxWidth: "450px", margin: "0 auto" }}>
                  When a driver starts a journey on the Driver Portal, the vehicle will automatically appear here with live facial landmark telemetry.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: bgCardSecondary, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11.5px", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "14px 20px" }}>Bus &amp; Plate</th>
                      <th style={{ padding: "14px 20px" }}>Assigned Driver</th>
                      <th style={{ padding: "14px 20px" }}>Operating Route</th>
                      <th style={{ padding: "14px 20px" }}>Driver Verification</th>
                      <th style={{ padding: "14px 20px" }}>Alertness Status</th>
                      <th style={{ padding: "14px 20px" }}>Camera / Device</th>
                      <th style={{ padding: "14px 20px" }}>Live EAR</th>
                      <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((session) => (
                      <tr
                        key={session._id}
                        style={{
                          borderBottom: `1px solid ${borderCol}`,
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "16px 20px" }}>
                          <strong style={{ color: textPrimary, fontSize: "14px", display: "block" }}>
                            {session.busNumber}
                          </strong>
                          <span style={{ fontSize: "11.5px", color: textSecondary }}>
                            {session.busName || `Bus ${session.busNumber}`}
                          </span>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #6d28d9, #8b5cf6)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "12px", overflow: "hidden", flexShrink: 0 }}>
                              {session.driverPhoto ? (
                                <img src={session.driverPhoto} alt={session.driverName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                (session.driverName || "D")[0].toUpperCase()
                              )}
                            </div>
                            <div>
                              <strong style={{ color: textPrimary, display: "block" }}>{session.driverName}</strong>
                              <span style={{ fontSize: "11px", color: textSecondary }}>
                                Lic: {session.driverLicense || "Verified"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <span style={{ fontWeight: "700", color: textPrimary }}>{session.routeName}</span>
                          <span style={{ fontSize: "11px", color: textSecondary, display: "block" }}>
                            Started {new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {renderDriverStatusBadge(session.currentDriverStatus)}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {renderAlertnessBadge(session.currentAlertness)}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {renderDeviceBadge(session.deviceStatus)}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "50px", height: "8px", borderRadius: "4px", background: darkMode ? "#334155" : "#e2e8f0", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, ((session.latestTelemetry?.ear || 0.28) / 0.35) * 100))}%`,
                                  height: "100%",
                                  background: (session.latestTelemetry?.ear || 0.28) < 0.22 ? "#ef4444" : "#16a34a",
                                }}
                              ></div>
                            </div>
                            <span style={{ fontWeight: "800", fontSize: "12px", color: textPrimary }}>
                              {(session.latestTelemetry?.ear || 0.28).toFixed(2)}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <button
                            onClick={() => handleOpenInspector(session)}
                            style={{
                              background: "linear-gradient(135deg, #2e1065, #6d28d9)",
                              color: "#ffffff",
                              border: "none",
                              padding: "6px 14px",
                              borderRadius: "10px",
                              fontWeight: "800",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Eye size={13} /> Live Telemetry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 2: REAL-TIME SAFETY ALERTS & RESOLUTION       */}
      {/* ==================================================== */}
      {subTab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: bgCard, borderRadius: "18px", border: `1px solid ${borderCol}`, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0, color: textPrimary }}>
                  Active Driver Safety Alerts &amp; Incidents
                </h3>
                <p style={{ fontSize: "12.5px", color: textSecondary, margin: "3px 0 0 0" }}>
                  Real-time feed of drowsiness, driver absence, identity mismatch, and offline events.
                </p>
              </div>
              <button
                onClick={fetchAlerts}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: `1px solid ${borderCol}`, padding: "6px 14px", borderRadius: "10px", fontSize: "12.5px", fontWeight: "700", color: textPrimary, cursor: "pointer" }}
              >
                <RefreshCw size={13} /> Refresh Alerts
              </button>
            </div>

            {alerts.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: textSecondary }}>
                <CheckCircle size={48} style={{ color: "#16a34a", margin: "0 auto 12px auto", display: "block" }} />
                <h4 style={{ fontSize: "15px", fontWeight: "800", color: textPrimary, margin: "0 0 4px 0" }}>
                  All Clear! No Active Safety Alerts
                </h4>
                <p style={{ fontSize: "13px", maxWidth: "450px", margin: "0 auto" }}>
                  All operating drivers are currently verified, alert, and streaming heartbeat signals normally.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", divideY: `1px solid ${borderCol}` }}>
                {alerts.map((alert) => {
                  const isCritical = alert.severity === "Critical";
                  const isHigh = alert.severity === "High";
                  const isAcknowledged = alert.status === "Acknowledged";
                  const isResolved = alert.status === "Resolved";

                  return (
                    <div
                      key={alert._id}
                      style={{
                        padding: "18px 24px",
                        borderBottom: `1px solid ${borderCol}`,
                        background: isCritical && !isResolved ? "rgba(239, 68, 68, 0.04)" : "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            background: isCritical ? "rgba(239, 68, 68, 0.15)" : (isHigh ? "rgba(249, 115, 22, 0.15)" : "rgba(109, 40, 217, 0.1)"),
                            color: isCritical ? "#dc2626" : (isHigh ? "#ea580c" : "#7c3aed"),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isCritical ? <Flame size={22} /> : (isHigh ? <AlertTriangle size={22} /> : <Info size={22} />)}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ color: textPrimary, fontSize: "14.5px" }}>{alert.title}</strong>
                            <span style={{ fontSize: "11px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", background: isCritical ? "#ef4444" : (isHigh ? "#f97316" : "#6d28d9"), color: "#ffffff" }}>
                              {alert.severity}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "6px", background: isResolved ? "rgba(34, 197, 94, 0.2)" : (isAcknowledged ? "rgba(14, 165, 233, 0.2)" : "rgba(239, 68, 68, 0.2)"), color: isResolved ? "#16a34a" : (isAcknowledged ? "#0284c7" : "#dc2626") }}>
                              ● {alert.status}
                            </span>
                          </div>

                          <p style={{ color: textPrimary, fontSize: "13px", margin: "6px 0 8px 0" }}>
                            {alert.description}
                          </p>

                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: textSecondary }}>
                            <span><strong>Bus:</strong> {alert.busNumber}</span>
                            <span><strong>Driver:</strong> {alert.driverName}</span>
                            {alert.routeName && <span><strong>Route:</strong> {alert.routeName}</span>}
                            <span><strong>Time:</strong> {new Date(alert.createdAt).toLocaleTimeString()} ({new Date(alert.createdAt).toLocaleDateString()})</span>
                            {alert.acknowledgedByName && (
                              <span style={{ color: "#0284c7" }}>
                                <strong>Ack by:</strong> {alert.acknowledgedByName} ({new Date(alert.acknowledgedAt).toLocaleTimeString()})
                              </span>
                            )}
                            {alert.resolvedByName && (
                              <span style={{ color: "#16a34a" }}>
                                <strong>Resolved by:</strong> {alert.resolvedByName}: <em>"{alert.resolutionNote}"</em>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {!isAcknowledged && !isResolved && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert._id)}
                            style={{
                              background: "rgba(14, 165, 233, 0.1)",
                              color: "#0284c7",
                              border: "1px solid rgba(14, 165, 233, 0.3)",
                              padding: "8px 14px",
                              borderRadius: "10px",
                              fontWeight: "800",
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            Acknowledge
                          </button>
                        )}

                        {!isResolved && (
                          <button
                            onClick={() => handleOpenResolveModal(alert)}
                            style={{
                              background: "linear-gradient(135deg, #16a34a, #15803d)",
                              color: "#ffffff",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "10px",
                              fontWeight: "800",
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            Resolve Alert
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 3: SAFETY EVENT HISTORY & AUDIT LOGS          */}
      {/* ==================================================== */}
      {subTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* History Filters & Export Bar */}
          <div style={{ background: bgCard, padding: "18px 24px", borderRadius: "18px", border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", minWidth: "220px" }}>
                <Search size={14} style={{ position: "absolute", left: "12px", top: "11px", color: textSecondary }} />
                <input
                  type="text"
                  placeholder="Search bus, driver..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontSize: "13px" }}
                />
              </div>

              <select
                value={historyFilterType}
                onChange={(e) => setHistoryFilterType(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontSize: "13px", fontWeight: "700" }}
              >
                <option value="All">All Event Types</option>
                <option value="CRITICAL_DROWSINESS">Severe Drowsiness</option>
                <option value="DROWSINESS_WARNING">Drowsiness Warning</option>
                <option value="DRIVER_ABSENT">Driver Absent</option>
                <option value="DRIVER_MISMATCH">Driver Mismatch</option>
                <option value="MONITORING_DEVICE_OFFLINE">Device Offline</option>
                <option value="DRIVER_VERIFIED">Driver Verified</option>
              </select>

              <select
                value={historyFilterSeverity}
                onChange={(e) => setHistoryFilterSeverity(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontSize: "13px", fontWeight: "700" }}
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Info">Info</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Download size={14} /> Export CSV Audit Log
            </button>
          </div>

          {/* History Events Table */}
          <div style={{ background: bgCard, borderRadius: "18px", border: `1px solid ${borderCol}`, overflow: "hidden" }}>
            {historyLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: textSecondary }}>Loading history log...</div>
            ) : historyEvents.length === 0 ? (
              <div style={{ padding: "50px", textAlign: "center", color: textSecondary }}>No historical events found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: bgCardSecondary, borderBottom: `1px solid ${borderCol}`, color: textSecondary, fontSize: "11.5px", textTransform: "uppercase", fontWeight: "800" }}>
                      <th style={{ padding: "14px 20px" }}>Time</th>
                      <th style={{ padding: "14px 20px" }}>Bus</th>
                      <th style={{ padding: "14px 20px" }}>Driver</th>
                      <th style={{ padding: "14px 20px" }}>Event Type</th>
                      <th style={{ padding: "14px 20px" }}>Severity</th>
                      <th style={{ padding: "14px 20px" }}>Status</th>
                      <th style={{ padding: "14px 20px" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEvents
                      .filter((ev) => {
                        const q = historySearchQuery.toLowerCase();
                        if (!q) return true;
                        return (
                          (ev.busNumber || "").toLowerCase().includes(q) ||
                          (ev.driverName || "").toLowerCase().includes(q) ||
                          (ev.description || "").toLowerCase().includes(q)
                        );
                      })
                      .map((ev) => (
                        <tr key={ev._id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                          <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                            {new Date(ev.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: "14px 20px", fontWeight: "800", color: textPrimary }}>
                            {ev.busNumber}
                          </td>
                          <td style={{ padding: "14px 20px", color: textPrimary }}>{ev.driverName}</td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontWeight: "700" }}>{ev.eventType}</span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", background: ev.severity === "Critical" ? "#ef4444" : (ev.severity === "High" ? "#f97316" : "#64748b"), color: "#ffffff" }}>
                              {ev.severity}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: "11.5px", fontWeight: "800", color: ev.status === "Resolved" ? "#16a34a" : (ev.status === "Acknowledged" ? "#0284c7" : "#dc2626") }}>
                              {ev.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", color: textSecondary, maxWidth: "300px" }}>
                            {ev.description}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 4: CONFIGURATION & THRESHOLDS PANEL           */}
      {/* ==================================================== */}
      {subTab === "config" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
          {/* Thresholds Form */}
          <form
            onSubmit={handleSaveConfig}
            style={{ background: bgCard, padding: "28px", borderRadius: "18px", border: `1px solid ${borderCol}`, display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 4px 0", color: textPrimary }}>
                ⚙️ Configurable Safety Thresholds (Stored in DB)
              </h3>
              <p style={{ fontSize: "12.5px", color: textSecondary, margin: 0 }}>
                Control Eye Aspect Ratio (EAR) sensitivity, grace periods, and device offline timeouts for the entire fleet.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary }}>
                Eye Aspect Ratio (EAR) Closure Threshold: {config.earThreshold}
              </label>
              <input
                type="range"
                min="0.10"
                max="0.35"
                step="0.01"
                value={config.earThreshold}
                onChange={(e) => setConfig({ ...config, earThreshold: parseFloat(e.target.value) })}
                style={{ width: "100%", accentColor: "#7c3aed" }}
              />
              <span style={{ fontSize: "11.5px", color: textSecondary }}>
                Values below this threshold are evaluated as closed eyes. Standard baseline is 0.22.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary, display: "block", marginBottom: "4px" }}>
                  Early Warning Time (s)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={config.earlyWarningDurationSec}
                  onChange={(e) => setConfig({ ...config, earlyWarningDurationSec: parseFloat(e.target.value) })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontWeight: "700" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary, display: "block", marginBottom: "4px" }}>
                  Severe Drowsiness (s)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={config.criticalDrowsinessDurationSec}
                  onChange={(e) => setConfig({ ...config, criticalDrowsinessDurationSec: parseFloat(e.target.value) })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontWeight: "700" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary, display: "block", marginBottom: "4px" }}>
                  Driver Absence Grace (s)
                </label>
                <input
                  type="number"
                  value={config.driverAbsenceGraceSec}
                  onChange={(e) => setConfig({ ...config, driverAbsenceGraceSec: parseInt(e.target.value, 10) })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontWeight: "700" }}
                />
                <span style={{ fontSize: "11px", color: textSecondary }}>0–15s grace before warning</span>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary, display: "block", marginBottom: "4px" }}>
                  Device Offline Timeout (s)
                </label>
                <input
                  type="number"
                  value={config.deviceOfflineTimeoutSec}
                  onChange={(e) => setConfig({ ...config, deviceOfflineTimeoutSec: parseInt(e.target.value, 10) })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontWeight: "700" }}
                />
                <span style={{ fontSize: "11px", color: textSecondary }}>Heartbeat missing cutoff</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary }}>Voice Alarm Prompts</label>
              <input
                type="text"
                value={config.voicePromptTextEarly}
                onChange={(e) => setConfig({ ...config, voicePromptTextEarly: e.target.value })}
                placeholder="Early Warning Voice Prompt"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontSize: "13px" }}
              />
              <input
                type="text"
                value={config.voicePromptTextDrowsy}
                onChange={(e) => setConfig({ ...config, voicePromptTextDrowsy: e.target.value })}
                placeholder="Drowsiness Warning Prompt"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontSize: "13px" }}
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              style={{
                marginTop: "10px",
                padding: "12px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2e1065, #6d28d9)",
                color: "#ffffff",
                fontWeight: "900",
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {savingConfig ? "Saving Settings..." : "Save Safety Settings to Database"}
            </button>
          </form>

          {/* Python Edge AI Daemon Integration Guide */}
          <div style={{ background: bgCard, padding: "28px", borderRadius: "18px", border: `1px solid ${borderCol}`, display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "900", margin: 0, color: textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
              <Radio size={20} style={{ color: "#7c3aed" }} />
              External Python / OpenCV Edge AI Daemon
            </h3>
            <p style={{ fontSize: "13px", color: textSecondary, lineHeight: 1.5, margin: 0 }}>
              For in-vehicle edge hardware (Raspberry Pi, Jetson Nano, or Dashcam box), use the provided standalone OpenCV MediaPipe script to stream telemetry directly to MoveSmart.
            </p>

            <div style={{ background: darkMode ? "#0f172a" : "#1e1b4b", color: "#e2e8f0", padding: "16px", borderRadius: "12px", fontFamily: "monospace", fontSize: "12px", overflowX: "auto" }}>
              <div style={{ color: "#4ade80", marginBottom: "8px" }}># 1. Install dependencies:</div>
              <div>pip install opencv-python numpy requests</div>
              <div style={{ color: "#4ade80", margin: "12px 0 8px 0" }}># 2. Run daemon with target bus number:</div>
              <div>python backend/ai_monitoring/ai_monitoring_service.py --bus-number KL-07-MS-1008 --camera 0</div>
            </div>

            <div style={{ fontSize: "12.5px", color: textSecondary }}>
              <strong>API Endpoints Exposed:</strong>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: "20px" }}>
                <li><code>POST /api/monitoring/heartbeat</code> - Keepalive</li>
                <li><code>POST /api/monitoring/event</code> - Ingest EAR &amp; Drowsiness</li>
                <li><code>GET /api/monitoring/config</code> - Dynamic thresholds</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: LIVE DRIVER TELEMETRY INSPECTOR             */}
      {/* ==================================================== */}
      {selectedSession && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: bgCard, width: "100%", maxWidth: "800px", borderRadius: "20px", border: `1px solid ${borderCol}`, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={22} style={{ color: "#7c3aed" }} />
                <h3 style={{ fontSize: "17px", fontWeight: "900", margin: 0, color: textPrimary }}>
                  Live Telemetry: Bus {selectedSession.busNumber} ({selectedSession.driverName})
                </h3>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                style={{ background: "none", border: "none", color: textSecondary, cursor: "pointer", fontSize: "18px", fontWeight: "900" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Telemetry Status Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                <div style={{ background: bgCardSecondary, padding: "12px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                  <span style={{ fontSize: "11px", color: textSecondary, fontWeight: "800", display: "block" }}>DRIVER IDENTITY</span>
                  <div style={{ marginTop: "4px" }}>{renderDriverStatusBadge(selectedSession.currentDriverStatus)}</div>
                </div>
                <div style={{ background: bgCardSecondary, padding: "12px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                  <span style={{ fontSize: "11px", color: textSecondary, fontWeight: "800", display: "block" }}>ALERTNESS STATE</span>
                  <div style={{ marginTop: "4px" }}>{renderAlertnessBadge(selectedSession.currentAlertness)}</div>
                </div>
                <div style={{ background: bgCardSecondary, padding: "12px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                  <span style={{ fontSize: "11px", color: textSecondary, fontWeight: "800", display: "block" }}>CAMERA / DEVICE</span>
                  <div style={{ marginTop: "4px" }}>{renderDeviceBadge(selectedSession.deviceStatus)}</div>
                </div>
                <div style={{ background: bgCardSecondary, padding: "12px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                  <span style={{ fontSize: "11px", color: textSecondary, fontWeight: "800", display: "block" }}>EYE ASPECT RATIO (EAR)</span>
                  <div style={{ fontSize: "18px", fontWeight: "900", color: textPrimary, marginTop: "4px" }}>
                    {(selectedSession.latestTelemetry?.ear || 0.28).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Driver Camera Live Video & AI HUD Preview */}
              <div
                style={{
                  background: "#090d16",
                  borderRadius: "16px",
                  height: "260px",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${selectedSession.currentAlertness === "CRITICAL_DROWSINESS" ? "#ef4444" : (selectedSession.currentAlertness === "DROWSINESS_WARNING" ? "#f97316" : "#334155")}`,
                  overflow: "hidden",
                }}
              >
                {/* Real Live Video Frame Stream from Driver Camera if available */}
                {liveVideoFrames[selectedSession._id] || liveVideoFrames[selectedSession.busNumber] ? (
                  <img
                    src={liveVideoFrames[selectedSession._id] || liveVideoFrames[selectedSession.busNumber]}
                    alt="Driver Live Camera Feed"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)",
                    }}
                  />
                ) : (
                  <>
                    {/* HUD Grid Background Pattern */}
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(124, 58, 237, 0.15) 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>

                    {/* Face Target Graphic */}
                    <div
                      style={{
                        position: "relative",
                        width: "130px",
                        height: "150px",
                        borderRadius: "16px",
                        border: `2px dashed ${selectedSession.currentAlertness === "CRITICAL_DROWSINESS" ? "#ef4444" : (selectedSession.currentDriverStatus === "DRIVER_VERIFIED" ? "#16a34a" : "#dc2626")}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.03)",
                        zIndex: 2,
                      }}
                    >
                      <div style={{ fontSize: "40px" }}>
                        {selectedSession.currentAlertness === "CRITICAL_DROWSINESS" ? "😴" : (selectedSession.currentDriverStatus === "DRIVER_MISMATCH" ? "🕵️" : "👨‍✈️")}
                      </div>
                      <span style={{ fontSize: "11px", color: selectedSession.currentDriverStatus === "DRIVER_VERIFIED" ? "#4ade80" : "#f87171", fontWeight: "900", marginTop: "6px" }}>
                        {selectedSession.currentDriverStatus === "DRIVER_VERIFIED" ? `CONF: ${Math.round((selectedSession.latestTelemetry?.faceConfidence || 0.95) * 100)}%` : "UNVERIFIED"}
                      </span>
                    </div>
                  </>
                )}

                {/* Top Corner Live Status */}
                <div style={{ position: "absolute", top: "12px", left: "16px", background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "8px", color: (liveVideoFrames[selectedSession._id] || liveVideoFrames[selectedSession.busNumber]) ? "#4ade80" : "#38bdf8", fontSize: "11.5px", fontFamily: "monospace", zIndex: 10, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: (liveVideoFrames[selectedSession._id] || liveVideoFrames[selectedSession.busNumber]) ? "#4ade80" : "#38bdf8", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>
                  {(liveVideoFrames[selectedSession._id] || liveVideoFrames[selectedSession.busNumber]) ? "REC ● LIVE VIDEO FEED (ONLINE)" : "TELEMETRY STREAM ● LIVE"}
                </div>

                {/* Bottom Corner Info */}
                <div style={{ position: "absolute", bottom: "12px", right: "16px", color: "#cbd5e1", fontSize: "11.5px", background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "8px", zIndex: 10 }}>
                  BUS: <strong>{selectedSession.busNumber}</strong> | DRIVER: <strong>{selectedSession.driverName}</strong>
                </div>

                <div style={{ position: "absolute", bottom: "12px", left: "16px", color: "#4ade80", fontSize: "11.5px", background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "8px", zIndex: 10 }}>
                  EAR: <strong>{(selectedSession.latestTelemetry?.ear || 0.28).toFixed(2)}</strong> | FPS: <strong>{selectedSession.latestTelemetry?.fps || 30}</strong>
                </div>
              </div>

              {/* Live Test Trigger Simulator */}
              <div style={{ background: bgCardSecondary, padding: "16px", borderRadius: "14px", border: `1px solid ${borderCol}` }}>
                <h4 style={{ fontSize: "13.5px", fontWeight: "900", margin: "0 0 10px 0", color: textPrimary }}>
                  🧪 Live AI Event Trigger Simulator (Test Real-Time Escalation)
                </h4>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleSimulateEvent("DROWSINESS_WARNING", 0.16)}
                    style={{ background: "rgba(249, 115, 22, 0.15)", color: "#ea580c", border: "1px solid rgba(249, 115, 22, 0.3)", padding: "8px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                  >
                    Trigger Drowsiness Warning
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("CRITICAL_DROWSINESS", 0.11)}
                    style={{ background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "8px 12px", borderRadius: "8px", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}
                  >
                    Trigger Critical Drowsiness 🚨
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("DRIVER_ABSENT", 0, 32)}
                    style={{ background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "8px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                  >
                    Trigger Driver Absence (30s+)
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("DRIVER_MISMATCH", 0.28)}
                    style={{ background: "rgba(225, 29, 72, 0.15)", color: "#e11d48", border: "1px solid rgba(225, 29, 72, 0.4)", padding: "8px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                  >
                    Trigger Driver Mismatch
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("DRIVER_VERIFIED", 0.29)}
                    style={{ background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", border: "1px solid rgba(34, 197, 94, 0.3)", padding: "8px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                  >
                    Reset to Normal / Verified
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: RESOLVE ALERT MODAL                         */}
      {/* ==================================================== */}
      {resolvingAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: bgCard, width: "100%", maxWidth: "480px", borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 8px 0", color: textPrimary }}>
              Resolve Safety Alert
            </h3>
            <p style={{ fontSize: "13px", color: textSecondary, margin: "0 0 16px 0" }}>
              Resolving alert for <strong>Bus {resolvingAlert.busNumber}</strong> ({resolvingAlert.title}). Enter resolution notes for the fleet safety audit record.
            </p>

            <form onSubmit={handleSubmitResolveAlert} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <textarea
                rows="3"
                placeholder="e.g. Driver contacted via control desk radio. Driver refreshed and confirmed alert to continue."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: bgCardSecondary, color: textPrimary, fontSize: "13px", resize: "none" }}
              ></textarea>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  style={{ padding: "8px 16px", borderRadius: "10px", border: `1px solid ${borderCol}`, background: "none", color: textPrimary, fontWeight: "700", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolve}
                  style={{ padding: "8px 18px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", fontWeight: "800", cursor: "pointer" }}
                >
                  {submittingResolve ? "Saving..." : "Confirm & Resolve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
