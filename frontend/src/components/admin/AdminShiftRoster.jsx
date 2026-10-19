import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { getStoredToken } from "../../utils/session";
import {
  Sun,
  Sunset,
  Moon,
  Clock,
  Bus,
  User,
  Phone,
  Mail,
  Award,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  UserX,
  UserPlus,
  Filter,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

// Canonical Shift Configurations matching backend constants exactly
const CANONICAL_SHIFTS = Object.freeze({
  morning: {
    key: "morning",
    name: "Morning",
    hoursDisplay: "06:00 – 14:00",
    timeWindow: "06:00 AM – 02:00 PM",
    subtext: "Early morning to afternoon commute",
    Icon: Sun,
    color: "#d97706",
    bgLight: "#fef3c7",
    borderLight: "#fde68a",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  evening: {
    key: "evening",
    name: "Evening",
    hoursDisplay: "14:00 – 22:00",
    timeWindow: "02:00 PM – 10:00 PM",
    subtext: "Afternoon peak to late night commute",
    Icon: Sunset,
    color: "#2563eb",
    bgLight: "#eff6ff",
    borderLight: "#bfdbfe",
    gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  },
  night: {
    key: "night",
    name: "Night",
    hoursDisplay: "22:00 – 06:00 (ends following day)",
    timeWindow: "10:00 PM – 06:00 AM (Next Day)",
    subtext: "Overnight transit crossing midnight",
    Icon: Moon,
    color: "#7c3aed",
    bgLight: "#f5f3ff",
    borderLight: "#ddd6fe",
    gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  },
});

export default function AdminShiftRoster({ darkMode = false, onNavigateTab }) {
  // Theme Tokens
  const bgMain = darkMode ? "#0f172a" : "#f8fafc";
  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const bgCardSecondary = darkMode ? "#0f172a" : "#f8fafc";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";
  const borderCol = darkMode ? "#334155" : "#e2e8f0";

  // Roster Fleet State
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCoverage, setFilterCoverage] = useState("all"); // 'all' | 'full' | 'partial' | 'unassigned'
  const [filterBusType, setFilterBusType] = useState("all"); // 'all' | 'Normal Bus' | 'AC Bus'

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Assign / Change Driver Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activeShiftTarget, setActiveShiftTarget] = useState(null);
  // { busId, busNumber, busName, routeName, shiftKey, shiftConfig, currentDriver }
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [conflictedDrivers, setConflictedDrivers] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibleError, setEligibleError] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [showConflictedSection, setShowConflictedSection] = useState(false);

  // Unassign Confirmation Modal State
  const [unassignModalOpen, setUnassignModalOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState(null);
  // { busId, busNumber, busName, shiftKey, shiftConfig, driverName, driverPhone }
  const [submittingUnassign, setSubmittingUnassign] = useState(false);

  // 1. Fetch Roster from Backend (GET /api/admin/buses/shift-roster)
  const fetchShiftRoster = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get("/api/admin/buses/shift-roster", { headers });
      if (res.data?.success) {
        setBuses(res.data.buses || []);
        if (isRefresh) {
          showToast(`Fleet roster updated (${res.data.count || res.data.buses?.length || 0} buses loaded)`);
        }
      } else {
        setError(res.data?.message || "Failed to load shift roster.");
      }
    } catch (err) {
      console.error("Error fetching shift roster:", err);
      const errMsg = err.response?.data?.message || "Unable to reach server to load shift roster.";
      setError(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchShiftRoster();
  }, [fetchShiftRoster]);

  // 2. Open Driver Assignment Modal (GET /api/admin/buses/:busId/shifts/:shift/eligible-drivers)
  const handleOpenAssignModal = async (bus, shiftKey) => {
    const shiftConfig = CANONICAL_SHIFTS[shiftKey];
    const currentShift = bus.shifts?.[shiftKey];
    const target = {
      busId: bus._id,
      busNumber: bus.busNumber,
      busName: bus.busName,
      routeName: bus.routeName,
      shiftKey,
      shiftConfig,
      currentDriver: currentShift?.driverId
        ? {
            id: currentShift.driverId,
            name: currentShift.driverName,
            email: currentShift.driverEmail,
            phone: currentShift.driverPhone,
          }
        : null,
    };

    setActiveShiftTarget(target);
    setSelectedDriverId(currentShift?.driverId ? String(currentShift.driverId) : "");
    setDriverSearchQuery("");
    setEligibleDrivers([]);
    setConflictedDrivers([]);
    setEligibleError("");
    setShowConflictedSection(false);
    setAssignModalOpen(true);
    setLoadingEligible(true);

    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `/api/admin/buses/${bus._id}/shifts/${shiftKey}/eligible-drivers`,
        { headers }
      );

      if (res.data?.success) {
        setEligibleDrivers(res.data.drivers || []);
        setConflictedDrivers(res.data.conflicted || []);
      } else {
        setEligibleError(res.data?.message || "Failed to load eligible drivers.");
      }
    } catch (err) {
      console.error("Error evaluating eligible shift drivers:", err);
      setEligibleError(err.response?.data?.message || "Failed to evaluate driver eligibility.");
    } finally {
      setLoadingEligible(false);
    }
  };

  // 3. Submit Shift Assignment (PUT /api/admin/buses/:busId/shifts)
  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!activeShiftTarget || !selectedDriverId) {
      setEligibleError("Please select an approved driver from the eligible list.");
      return;
    }

    setSubmittingAssign(true);
    setEligibleError("");

    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        shift: activeShiftTarget.shiftKey,
        driverId: selectedDriverId,
      };

      const res = await axios.put(
        `/api/admin/buses/${activeShiftTarget.busId}/shifts`,
        payload,
        { headers }
      );

      if (res.data?.success) {
        showToast(res.data.message || "Driver assigned to shift successfully! ✅");
        setAssignModalOpen(false);
        setActiveShiftTarget(null);
        // Refresh roster quietly
        fetchShiftRoster();
      } else {
        setEligibleError(res.data?.message || "Assignment was rejected by the server.");
      }
    } catch (err) {
      console.error("Error updating bus shift driver:", err);
      setEligibleError(
        err.response?.data?.message || "Failed to assign driver. Check for schedule/leave conflicts."
      );
    } finally {
      setSubmittingAssign(false);
    }
  };

  // 4. Open Unassign Confirmation Modal
  const handleOpenUnassignModal = (bus, shiftKey) => {
    const shiftConfig = CANONICAL_SHIFTS[shiftKey];
    const currentShift = bus.shifts?.[shiftKey];
    setUnassignTarget({
      busId: bus._id,
      busNumber: bus.busNumber,
      busName: bus.busName,
      shiftKey,
      shiftConfig,
      driverName: currentShift?.driverName || "Assigned Driver",
      driverPhone: currentShift?.driverPhone || "",
    });
    setUnassignModalOpen(true);
  };

  // 5. Confirm Unassign (PUT /api/admin/buses/:busId/shifts with driverId: null)
  const handleConfirmUnassign = async () => {
    if (!unassignTarget) return;

    setSubmittingUnassign(true);
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        shift: unassignTarget.shiftKey,
        driverId: null, // Signals backend to clear ONLY this shift
      };

      const res = await axios.put(
        `/api/admin/buses/${unassignTarget.busId}/shifts`,
        payload,
        { headers }
      );

      if (res.data?.success) {
        showToast(res.data.message || `${unassignTarget.shiftConfig.name} shift unassigned.`);
        setUnassignModalOpen(false);
        setUnassignTarget(null);
        fetchShiftRoster();
      } else {
        showToast(res.data?.message || "Failed to unassign shift driver.", "error");
      }
    } catch (err) {
      console.error("Error unassigning shift driver:", err);
      showToast(err.response?.data?.message || "Failed to unassign shift driver.", "error");
    } finally {
      setSubmittingUnassign(false);
    }
  };

  // Summary Metrics Calculation
  const metrics = useMemo(() => {
    const totalBuses = buses.length;
    let morningAssigned = 0;
    let eveningAssigned = 0;
    let nightAssigned = 0;
    let fullyAssignedBuses = 0;
    let unassignedBuses = 0;

    buses.forEach((b) => {
      const m = !!b.shifts?.morning?.driverId;
      const e = !!b.shifts?.evening?.driverId;
      const n = !!b.shifts?.night?.driverId;

      if (m) morningAssigned++;
      if (e) eveningAssigned++;
      if (n) nightAssigned++;

      const assignedCount = (m ? 1 : 0) + (e ? 1 : 0) + (n ? 1 : 0);
      if (assignedCount === 3) fullyAssignedBuses++;
      if (assignedCount === 0) unassignedBuses++;
    });

    const totalPossibleShifts = totalBuses * 3;
    const totalAssignedShifts = morningAssigned + eveningAssigned + nightAssigned;
    const totalOpenShifts = totalPossibleShifts - totalAssignedShifts;

    return {
      totalBuses,
      morningAssigned,
      eveningAssigned,
      nightAssigned,
      fullyAssignedBuses,
      unassignedBuses,
      totalPossibleShifts,
      totalAssignedShifts,
      totalOpenShifts,
      morningPercent: totalBuses > 0 ? Math.round((morningAssigned / totalBuses) * 100) : 0,
      eveningPercent: totalBuses > 0 ? Math.round((eveningAssigned / totalBuses) * 100) : 0,
      nightPercent: totalBuses > 0 ? Math.round((nightAssigned / totalBuses) * 100) : 0,
    };
  }, [buses]);

  // Filtered Buses List
  const filteredBuses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return buses.filter((bus) => {
      // 1. Text Search Filter
      if (q) {
        const busNum = (bus.busNumber || "").toLowerCase();
        const busName = (bus.busName || "").toLowerCase();
        const routeName = (bus.routeName || "").toLowerCase();
        const morningDriver = (bus.shifts?.morning?.driverName || "").toLowerCase();
        const eveningDriver = (bus.shifts?.evening?.driverName || "").toLowerCase();
        const nightDriver = (bus.shifts?.night?.driverName || "").toLowerCase();

        const match =
          busNum.includes(q) ||
          busName.includes(q) ||
          routeName.includes(q) ||
          morningDriver.includes(q) ||
          eveningDriver.includes(q) ||
          nightDriver.includes(q);

        if (!match) return false;
      }

      // 2. Bus Type Filter
      if (filterBusType !== "all") {
        if ((bus.busType || "").toLowerCase() !== filterBusType.toLowerCase()) {
          return false;
        }
      }

      // 3. Shift Coverage Filter
      const assignedCount =
        (bus.shifts?.morning?.driverId ? 1 : 0) +
        (bus.shifts?.evening?.driverId ? 1 : 0) +
        (bus.shifts?.night?.driverId ? 1 : 0);

      if (filterCoverage === "full" && assignedCount !== 3) return false;
      if (filterCoverage === "partial" && (assignedCount === 0 || assignedCount === 3)) return false;
      if (filterCoverage === "unassigned" && assignedCount !== 0) return false;

      return true;
    });
  }, [buses, searchQuery, filterCoverage, filterBusType]);

  // Modal Driver Search Filter
  const filteredEligibleDrivers = useMemo(() => {
    const q = driverSearchQuery.toLowerCase().trim();
    if (!q) return eligibleDrivers;
    return eligibleDrivers.filter((d) => {
      const name = (d.name || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const license = (d.licenseNumber || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || license.includes(q);
    });
  }, [eligibleDrivers, driverSearchQuery]);

  return (
    <div className="fade-in-section" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 10000,
            background: toast.type === "error" ? "#dc2626" : "#0f172a",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            borderLeft: `4px solid ${toast.type === "error" ? "#ef4444" : "#4ade80"}`,
            fontWeight: "700",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "slideIn 0.25s ease",
          }}
        >
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER & ACTION BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "900",
                background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
                color: "#ffffff",
                padding: "3px 10px",
                borderRadius: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={11} /> MoveSmart Fleet Operations
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: "#16a34a",
                background: darkMode ? "rgba(34, 197, 94, 0.15)" : "#dcfce7",
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              Independent 3-Shift Isolation
            </span>
          </div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "900",
              margin: 0,
              color: textPrimary,
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Clock size={24} style={{ color: "#7c3aed" }} />
            Three-Shift Driver Fleet Roster
          </h2>
          <p style={{ fontSize: "13px", color: textSecondary, margin: "4px 0 0 0", maxWidth: "800px" }}>
            Assign, reassign, or unassign approved drivers across <strong>Morning (06:00–14:00)</strong>,{" "}
            <strong>Evening (14:00–22:00)</strong>, and <strong>Night (22:00–06:00)</strong> shifts.
            Each shift operates independently without altering permanent fleet configurations or legacy drivers.
          </p>
        </div>

        {/* Header Right Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("busFleet")}
              style={{
                padding: "9px 16px",
                borderRadius: "12px",
                background: bgCard,
                color: textSecondary,
                border: `1.5px solid ${borderCol}`,
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
            >
              <Bus size={14} /> Bus Fleet Registry ➔
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchShiftRoster(true)}
            disabled={loading || refreshing}
            style={{
              padding: "9px 18px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #2e1065, #4c1d95)",
              color: "#ffffff",
              border: "none",
              fontWeight: "800",
              fontSize: "13px",
              cursor: loading || refreshing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(76, 29, 149, 0.25)",
              opacity: loading || refreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Syncing Roster..." : "Refresh Roster"}
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            color: "#dc2626",
            padding: "14px 18px",
            borderRadius: "14px",
            fontSize: "13.5px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchShiftRoster(true)}
            style={{
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* KPI ANALYTICS CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
        }}
      >
        {/* Metric 1: Total Fleet Buses */}
        <div
          style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>
              Fleet Buses
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: "rgba(124, 58, 237, 0.12)",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bus size={16} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary, marginTop: "6px" }}>
            {metrics.totalBuses}
          </div>
          <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "3px" }}>
            <strong style={{ color: "#16a34a" }}>{metrics.fullyAssignedBuses}</strong> Fully Covered (3/3 shifts)
          </div>
        </div>

        {/* Metric 2: Morning Shift */}
        <div
          style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: CANONICAL_SHIFTS.morning.gradient,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>
              Morning Shift
            </span>
            <Sun size={18} style={{ color: "#d97706" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary, marginTop: "6px" }}>
            {metrics.morningAssigned}{" "}
            <span style={{ fontSize: "14px", fontWeight: "700", color: textSecondary }}>
              / {metrics.totalBuses}
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "3px" }}>
            <strong>{metrics.morningPercent}%</strong> roster coverage · 06:00–14:00
          </div>
        </div>

        {/* Metric 3: Evening Shift */}
        <div
          style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: CANONICAL_SHIFTS.evening.gradient,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase" }}>
              Evening Shift
            </span>
            <Sunset size={18} style={{ color: "#2563eb" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary, marginTop: "6px" }}>
            {metrics.eveningAssigned}{" "}
            <span style={{ fontSize: "14px", fontWeight: "700", color: textSecondary }}>
              / {metrics.totalBuses}
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "3px" }}>
            <strong>{metrics.eveningPercent}%</strong> roster coverage · 14:00–22:00
          </div>
        </div>

        {/* Metric 4: Night Shift */}
        <div
          style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: CANONICAL_SHIFTS.night.gradient,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: "#7c3aed", textTransform: "uppercase" }}>
              Night Shift
            </span>
            <Moon size={18} style={{ color: "#7c3aed" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary, marginTop: "6px" }}>
            {metrics.nightAssigned}{" "}
            <span style={{ fontSize: "14px", fontWeight: "700", color: textSecondary }}>
              / {metrics.totalBuses}
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "3px" }}>
            <strong>{metrics.nightPercent}%</strong> roster coverage · 22:00–06:00
          </div>
        </div>

        {/* Metric 5: Open Shifts Requiring Assignment */}
        <div
          style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>
              Open Shifts
            </span>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: metrics.totalOpenShifts > 0 ? "#ef4444" : "#16a34a",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "900",
              color: metrics.totalOpenShifts > 0 ? "#dc2626" : "#16a34a",
              marginTop: "6px",
            }}
          >
            {metrics.totalOpenShifts}
          </div>
          <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "3px" }}>
            {metrics.totalOpenShifts === 0
              ? "All bus shifts fully assigned! 🎉"
              : "Shifts currently unassigned"}
          </div>
        </div>
      </div>

      {/* CONTROLS & FILTER BAR */}
      <div
        style={{
          background: bgCard,
          border: `1px solid ${borderCol}`,
          borderRadius: "18px",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: textSecondary,
            }}
          />
          <input
            type="text"
            placeholder="Search buses by plate, route, or assigned driver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: "12px",
              border: `1.5px solid ${borderCol}`,
              background: bgCardSecondary,
              color: textPrimary,
              fontSize: "13px",
              fontWeight: "600",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: textSecondary,
                cursor: "pointer",
                padding: "2px",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={13} /> Coverage:
          </span>
          {[
            { id: "all", label: `All (${buses.length})` },
            { id: "full", label: `Full 3/3 (${metrics.fullyAssignedBuses})` },
            { id: "partial", label: `Needs Drivers (${metrics.totalBuses - metrics.fullyAssignedBuses - metrics.unassignedBuses})` },
            { id: "unassigned", label: `Empty (${metrics.unassignedBuses})` },
          ].map((pill) => {
            const isSel = filterCoverage === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterCoverage(pill.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: isSel ? "800" : "600",
                  border: isSel ? "1.5px solid #7c3aed" : `1px solid ${borderCol}`,
                  background: isSel ? (darkMode ? "#4c1d95" : "#f5f3ff") : "transparent",
                  color: isSel ? (darkMode ? "#ffffff" : "#6d28d9") : textSecondary,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {pill.label}
              </button>
            );
          })}

          {/* Bus Type Selector */}
          <select
            value={filterBusType}
            onChange={(e) => setFilterBusType(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              border: `1.5px solid ${borderCol}`,
              background: bgCardSecondary,
              color: textPrimary,
              fontSize: "12px",
              fontWeight: "700",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Vehicle Types</option>
            <option value="Normal Bus">Normal Bus</option>
            <option value="AC Bus">AC Bus</option>
          </select>
        </div>
      </div>

      {/* FLEET ROSTER BUS LIST */}
      {loading ? (
        <div
          style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: "20px",
            padding: "50px 20px",
            textAlign: "center",
            color: textSecondary,
          }}
        >
          <RefreshCw size={28} className="spin" style={{ color: "#7c3aed", margin: "0 auto 12px auto", display: "block" }} />
          <div style={{ fontSize: "16px", fontWeight: "800", color: textPrimary }}>Loading Fleet Shift Roster...</div>
          <div style={{ fontSize: "12.5px", marginTop: "4px" }}>
            Evaluating buses, route departures, and shift driver assignments.
          </div>
        </div>
      ) : filteredBuses.length === 0 ? (
        <div
          style={{
            background: bgCard,
            border: `1.5px dashed ${borderCol}`,
            borderRadius: "20px",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <Bus size={36} style={{ color: textSecondary, opacity: 0.4, margin: "0 auto 12px auto", display: "block" }} />
          <div style={{ fontSize: "16px", fontWeight: "900", color: textPrimary }}>No Fleet Buses Found</div>
          <div style={{ fontSize: "13px", color: textSecondary, marginTop: "4px", maxWidth: "500px", margin: "4px auto 16px auto" }}>
            {searchQuery || filterCoverage !== "all" || filterBusType !== "all"
              ? "No buses match your search and filter criteria. Try clearing search filters."
              : "No registered fleet buses exist in the database. Register fleet buses in the Bus Fleet Management section first."}
          </div>
          {(searchQuery || filterCoverage !== "all" || filterBusType !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterCoverage("all");
                setFilterBusType("all");
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                color: "#ffffff",
                border: "none",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {filteredBuses.map((bus) => {
            const morningShift = bus.shifts?.morning;
            const eveningShift = bus.shifts?.evening;
            const nightShift = bus.shifts?.night;

            const assignedCount =
              (morningShift?.driverId ? 1 : 0) +
              (eveningShift?.driverId ? 1 : 0) +
              (nightShift?.driverId ? 1 : 0);

            const isFullyAssigned = assignedCount === 3;
            const isUnassigned = assignedCount === 0;

            const coverageBadgeBg = isFullyAssigned
              ? "#dcfce7"
              : isUnassigned
              ? "#fee2e2"
              : "#fef3c7";
            const coverageBadgeColor = isFullyAssigned
              ? "#15803d"
              : isUnassigned
              ? "#b91c1c"
              : "#b45309";

            return (
              <div
                key={bus._id}
                style={{
                  background: bgCard,
                  border: `1.5px solid ${borderCol}`,
                  borderRadius: "20px",
                  padding: "20px 24px",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  transition: "all 0.2s ease",
                }}
              >
                {/* BUS HEADER BAR */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderBottom: `1px solid ${borderCol}`,
                    paddingBottom: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Plate Number */}
                    <div
                      style={{
                        padding: "4px 12px",
                        borderRadius: "8px",
                        background: darkMode ? "#0f172a" : "#f1f5f9",
                        border: `1.5px solid ${borderCol}`,
                        fontFamily: "monospace",
                        fontSize: "14px",
                        fontWeight: "900",
                        color: textPrimary,
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Bus size={15} style={{ color: "#7c3aed" }} />
                      {bus.busNumber}
                    </div>

                    {/* Bus Name */}
                    <span style={{ fontSize: "16px", fontWeight: "900", color: textPrimary }}>
                      {bus.busName || "Fleet Bus"}
                    </span>

                    {/* Bus Type */}
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: bus.busType === "AC Bus" ? "rgba(14, 165, 233, 0.15)" : "rgba(100, 116, 139, 0.15)",
                        color: bus.busType === "AC Bus" ? "#0284c7" : textSecondary,
                      }}
                    >
                      {bus.busType || "Normal Bus"}
                    </span>

                    {/* Route Info */}
                    {bus.routeName && (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: textSecondary,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        🛣️ {bus.routeName}
                      </span>
                    )}

                    {/* Base Departure Time */}
                    {bus.departureTime && (
                      <span style={{ fontSize: "11.5px", color: textSecondary }}>
                        (Dep: <strong>{bus.departureTime}</strong>)
                      </span>
                    )}
                  </div>

                  {/* Coverage Badge & Legacy Driver Pill */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {/* Legacy Root Bus Driver Note (Strict safety boundary - clearly marked untouched) */}
                    {bus.legacyDriver?.driverName && bus.legacyDriver.driverName !== "Not Assigned" && (
                      <span
                        title="Permanent vehicle driver (unchanged legacy field)"
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: textSecondary,
                          background: darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc",
                          border: `1px solid ${borderCol}`,
                          padding: "2px 8px",
                          borderRadius: "8px",
                        }}
                      >
                        Permanent: <strong>{bus.legacyDriver.driverName}</strong>
                      </span>
                    )}

                    {/* Shift Coverage Badge */}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "900",
                        padding: "4px 10px",
                        borderRadius: "10px",
                        background: coverageBadgeBg,
                        color: coverageBadgeColor,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isFullyAssigned && <CheckCircle size={13} />}
                      {assignedCount}/3 Shifts Assigned
                    </span>
                  </div>
                </div>

                {/* 3 INDEPENDENT SHIFT COLUMNS */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {/* SHIFT 1: MORNING (06:00–14:00) */}
                  <ShiftCard
                    shiftKey="morning"
                    shiftConfig={CANONICAL_SHIFTS.morning}
                    shiftData={morningShift}
                    bus={bus}
                    darkMode={darkMode}
                    borderCol={borderCol}
                    bgCardSecondary={bgCardSecondary}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onAssignClick={() => handleOpenAssignModal(bus, "morning")}
                    onUnassignClick={() => handleOpenUnassignModal(bus, "morning")}
                  />

                  {/* SHIFT 2: EVENING (14:00–22:00) */}
                  <ShiftCard
                    shiftKey="evening"
                    shiftConfig={CANONICAL_SHIFTS.evening}
                    shiftData={eveningShift}
                    bus={bus}
                    darkMode={darkMode}
                    borderCol={borderCol}
                    bgCardSecondary={bgCardSecondary}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onAssignClick={() => handleOpenAssignModal(bus, "evening")}
                    onUnassignClick={() => handleOpenUnassignModal(bus, "evening")}
                  />

                  {/* SHIFT 3: NIGHT (22:00–06:00, ends next day) */}
                  <ShiftCard
                    shiftKey="night"
                    shiftConfig={CANONICAL_SHIFTS.night}
                    shiftData={nightShift}
                    bus={bus}
                    darkMode={darkMode}
                    borderCol={borderCol}
                    bgCardSecondary={bgCardSecondary}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onAssignClick={() => handleOpenAssignModal(bus, "night")}
                    onUnassignClick={() => handleOpenUnassignModal(bus, "night")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* 🔄 MODAL: ASSIGN / CHANGE DRIVER FOR SHIFT */}
      {/* ==================================================== */}
      {assignModalOpen && activeShiftTarget && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "600px",
              width: "92%",
              padding: "26px",
              borderRadius: "22px",
              background: bgCard,
              color: textPrimary,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "900",
                      background: activeShiftTarget.shiftConfig.gradient,
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <activeShiftTarget.shiftConfig.Icon size={12} />
                    {activeShiftTarget.shiftConfig.name} Shift
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>
                    {activeShiftTarget.shiftConfig.hoursDisplay}
                  </span>
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "900", margin: 0, color: textPrimary }}>
                  {activeShiftTarget.currentDriver ? "Change Shift Driver" : "Assign Driver to Shift"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: textSecondary,
                  fontWeight: "900",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Target Bus Info Summary Box */}
            <div
              style={{
                background: bgCardSecondary,
                borderRadius: "14px",
                padding: "14px 16px",
                marginBottom: "18px",
                border: `1px solid ${borderCol}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "900", color: textPrimary }}>
                    🚌 {activeShiftTarget.busNumber} {activeShiftTarget.busName ? `• ${activeShiftTarget.busName}` : ""}
                  </div>
                  <div style={{ fontSize: "12px", color: textSecondary, marginTop: "2px" }}>
                    🛣️ Route: <strong>{activeShiftTarget.routeName || "Fleet Transit Route"}</strong>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: textSecondary, fontWeight: "700" }}>Current Status</div>
                  {activeShiftTarget.currentDriver ? (
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#16a34a" }}>
                      ✓ {activeShiftTarget.currentDriver.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#dc2626" }}>
                      🔴 Unassigned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Banner inside Modal */}
            {eligibleError && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#fef2f2",
                  border: "1.5px solid #fecaca",
                  color: "#dc2626",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} />
                <span>{eligibleError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAssign}>
              {/* Driver Search Box inside Modal */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: "800", color: textPrimary }}>
                    Select Approved Unconflicted Driver ({eligibleDrivers.length} Available)
                  </label>
                  {eligibleDrivers.length > 5 && (
                    <span style={{ fontSize: "11px", color: textSecondary }}>
                      Showing {filteredEligibleDrivers.length} of {eligibleDrivers.length}
                    </span>
                  )}
                </div>

                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: textSecondary,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by driver name, phone, license..."
                    value={driverSearchQuery}
                    onChange={(e) => setDriverSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 34px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: bgCardSecondary,
                      color: textPrimary,
                      fontSize: "12px",
                      fontWeight: "600",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {driverSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDriverSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: textSecondary,
                        cursor: "pointer",
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Eligible Drivers List */}
              {loadingEligible ? (
                <div style={{ padding: "30px", textAlign: "center", color: textSecondary }}>
                  <RefreshCw size={22} className="spin" style={{ color: "#7c3aed", margin: "0 auto 8px auto", display: "block" }} />
                  <div style={{ fontSize: "13px", fontWeight: "800" }}>Evaluating driver availability &amp; shift overlaps...</div>
                  <div style={{ fontSize: "11.5px", marginTop: "2px" }}>Checking approved licenses, active bus shifts &amp; approved leaves.</div>
                </div>
              ) : eligibleDrivers.length === 0 ? (
                <div
                  style={{
                    padding: "18px",
                    borderRadius: "14px",
                    background: darkMode ? "#1e293b" : "#fefce8",
                    border: `1.5px solid ${darkMode ? "#334155" : "#fef08a"}`,
                    color: darkMode ? "#fef08a" : "#854d0e",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <AlertTriangle size={15} /> No Unconflicted Drivers Available
                  </div>
                  All registered drivers are currently assigned to overlapping duties on other buses, have approved leave during this shift interval, or are awaiting license verification.
                </div>
              ) : filteredEligibleDrivers.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: textSecondary, fontSize: "12.5px" }}>
                  No eligible drivers match "{driverSearchQuery}".
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    paddingRight: "4px",
                    marginBottom: "16px",
                  }}
                >
                  {filteredEligibleDrivers.map((drv) => {
                    const isSelected = selectedDriverId === String(drv._id);
                    return (
                      <div
                        key={drv._id}
                        onClick={() => setSelectedDriverId(String(drv._id))}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #7c3aed" : `1.5px solid ${borderCol}`,
                          background: isSelected ? (darkMode ? "#2e1065" : "#f5f3ff") : bgCardSecondary,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ fontSize: "13.5px", color: textPrimary }}>{drv.name}</strong>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "800",
                                background: "#dcfce7",
                                color: "#15803d",
                                padding: "1px 6px",
                                borderRadius: "6px",
                              }}
                            >
                              Approved
                            </span>
                            {activeShiftTarget.currentDriver?.id === drv._id && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "800",
                                  background: "#e0e7ff",
                                  color: "#3730a3",
                                  padding: "1px 6px",
                                  borderRadius: "6px",
                                }}
                              >
                                Current Driver
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "2px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {drv.phone && <span>📱 {drv.phone}</span>}
                            {drv.email && <span>📧 {drv.email}</span>}
                            {drv.licenseNumber && <span>🪪 {drv.licenseNumber}</span>}
                          </div>
                        </div>

                        <input
                          type="radio"
                          name="shiftDriverSelection"
                          checked={isSelected}
                          onChange={() => setSelectedDriverId(String(drv._id))}
                          style={{
                            accentColor: "#7c3aed",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            marginLeft: "12px",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CONFLICTED DRIVERS ACCORDION (Transparency for Admin) */}
              {conflictedDrivers.length > 0 && (
                <div
                  style={{
                    marginBottom: "18px",
                    borderRadius: "12px",
                    border: `1px solid ${borderCol}`,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowConflictedSection(!showConflictedSection)}
                    style={{
                      width: "100%",
                      padding: "8px 14px",
                      background: darkMode ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "12px",
                      fontWeight: "800",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      ⚠️ {conflictedDrivers.length} Driver{conflictedDrivers.length > 1 ? "s" : ""} Unavailable for this Shift
                    </span>
                    {showConflictedSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showConflictedSection && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: bgCardSecondary,
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        maxHeight: "160px",
                        overflowY: "auto",
                      }}
                    >
                      {conflictedDrivers.map((c, idx) => (
                        <div
                          key={c.id || idx}
                          style={{
                            fontSize: "11.5px",
                            color: textSecondary,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "8px",
                            borderBottom: idx < conflictedDrivers.length - 1 ? `1px dashed ${borderCol}` : "none",
                            paddingBottom: "4px",
                          }}
                        >
                          <strong style={{ color: textPrimary }}>{c.name}</strong>
                          <span style={{ color: "#dc2626", textAlign: "right" }}>{c.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={submittingAssign || !selectedDriverId || eligibleDrivers.length === 0}
                  style={{
                    flex: 1,
                    padding: "12px 18px",
                    borderRadius: "12px",
                    background:
                      !selectedDriverId || eligibleDrivers.length === 0
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #7c3aed, #4c1d95)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "900",
                    fontSize: "13.5px",
                    cursor: !selectedDriverId || eligibleDrivers.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: !selectedDriverId || eligibleDrivers.length === 0 ? "none" : "0 4px 14px rgba(124, 58, 237, 0.3)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {submittingAssign ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Updating Shift...
                    </>
                  ) : activeShiftTarget.currentDriver ? (
                    "Confirm Shift Reassignment →"
                  ) : (
                    "Confirm Shift Assignment →"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    background: darkMode ? "#334155" : "#f1f5f9",
                    color: textPrimary,
                    border: "none",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ⚠️ MODAL: UNASSIGN DRIVER CONFIRMATION */}
      {/* ==================================================== */}
      {unassignModalOpen && unassignTarget && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "480px",
              width: "90%",
              padding: "26px",
              borderRadius: "20px",
              background: bgCard,
              color: textPrimary,
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UserX size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0, color: textPrimary }}>
                  Unassign Shift Driver
                </h3>
                <span style={{ fontSize: "12px", color: textSecondary }}>
                  Bus {unassignTarget.busNumber} · {unassignTarget.shiftConfig.name} Shift
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: textSecondary, lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Are you sure you want to unassign driver{" "}
              <strong style={{ color: textPrimary }}>{unassignTarget.driverName}</strong> from the{" "}
              <strong>{unassignTarget.shiftConfig.name} shift ({unassignTarget.shiftConfig.hoursDisplay})</strong> on Bus{" "}
              <strong>{unassignTarget.busNumber}</strong>?
            </p>

            <div
              style={{
                background: darkMode ? "#0f172a" : "#f8fafc",
                padding: "12px 14px",
                borderRadius: "10px",
                border: `1px solid ${borderCol}`,
                fontSize: "12px",
                color: textSecondary,
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Info size={15} style={{ color: "#7c3aed", flexShrink: 0 }} />
              <span>
                This will unassign only this shift. Other shifts and permanent bus configurations will remain untouched.
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                disabled={submittingUnassign}
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: "12px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "900",
                  fontSize: "13px",
                  cursor: submittingUnassign ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
                }}
              >
                {submittingUnassign ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Unassigning...
                  </>
                ) : (
                  "Yes, Unassign Driver"
                )}
              </button>

              <button
                type="button"
                onClick={() => setUnassignModalOpen(false)}
                disabled={submittingUnassign}
                style={{
                  padding: "12px 18px",
                  borderRadius: "12px",
                  background: darkMode ? "#334155" : "#f1f5f9",
                  color: textPrimary,
                  border: "none",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Keep Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Component: Individual Shift Card inside each Bus Card
function ShiftCard({
  shiftKey,
  shiftConfig,
  shiftData,
  bus,
  darkMode,
  borderCol,
  bgCardSecondary,
  textPrimary,
  textSecondary,
  onAssignClick,
  onUnassignClick,
}) {
  const isAssigned = !!shiftData?.driverId;
  const ShiftIcon = shiftConfig.Icon;

  return (
    <div
      style={{
        background: bgCardSecondary,
        borderRadius: "14px",
        border: `1.5px solid ${isAssigned ? shiftConfig.borderLight : borderCol}`,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "160px",
        position: "relative",
        transition: "all 0.15s ease",
      }}
    >
      <div>
        {/* Shift Badge & Timing */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ShiftIcon size={16} style={{ color: shiftConfig.color }} />
              <strong style={{ fontSize: "14px", color: textPrimary }}>
                {shiftConfig.name} Shift
              </strong>
            </div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: shiftConfig.color, marginTop: "2px" }}>
              {shiftConfig.hoursDisplay}
            </div>
          </div>

          {/* Status Pill */}
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: "900",
              padding: "2px 8px",
              borderRadius: "8px",
              background: isAssigned ? "#dcfce7" : darkMode ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
              color: isAssigned ? "#15803d" : "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isAssigned ? "✓ Assigned" : "🔴 Unassigned"}
          </span>
        </div>

        {/* Assigned Driver Details OR Empty State */}
        {isAssigned ? (
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={14} style={{ color: "#7c3aed" }} />
              <strong style={{ fontSize: "14px", color: textPrimary }}>
                {shiftData.driverName}
              </strong>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px", fontSize: "11.5px", color: textSecondary }}>
              {shiftData.driverPhone && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Phone size={11} /> {shiftData.driverPhone}
                </span>
              )}
              {shiftData.driverEmail && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={11} /> {shiftData.driverEmail}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "12px", color: textSecondary, fontSize: "12px" }}>
            No regular driver assigned for {shiftConfig.name.toLowerCase()} shift.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "14px",
          paddingTop: "10px",
          borderTop: `1px dashed ${borderCol}`,
        }}
      >
        {isAssigned ? (
          <>
            <button
              type="button"
              onClick={onAssignClick}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "9px",
                background: darkMode ? "#334155" : "#ffffff",
                border: `1.5px solid ${borderCol}`,
                color: textPrimary,
                fontSize: "11.5px",
                fontWeight: "800",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <RefreshCw size={12} /> Change
            </button>

            <button
              type="button"
              onClick={onUnassignClick}
              style={{
                padding: "7px 12px",
                borderRadius: "9px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#dc2626",
                fontSize: "11.5px",
                fontWeight: "800",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                transition: "all 0.15s ease",
              }}
            >
              <UserX size={12} /> Unassign
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAssignClick}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "9px",
              background: shiftConfig.gradient,
              border: "none",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              transition: "all 0.15s ease",
            }}
          >
            <UserPlus size={13} /> Assign Driver →
          </button>
        )}
      </div>
    </div>
  );
}
