import React, { useState } from "react";
import {
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  WifiOff,
  Flame,
  UserX,
  Info,
  Check,
  ChevronRight,
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  ExternalLink,
  Users,
  User,
  Bus,
  ArrowRight
} from "lucide-react";

// ────────────────────────────────────────────────────────
// SUB-COMPONENT: DEDICATED VISUAL CHART CARD FOR EACH DRIVER
// ────────────────────────────────────────────────────────
function DriverDonutChartCard({
  driver,
  isSelected,
  onSelectFocus,
  onFilterAlerts,
  darkMode,
  borderCol,
  bgCard,
  bgCardSecondary,
  textPrimary,
  textSecondary,
}) {
  const dTotal = driver.total || 0;
  const dPending = driver.pending || 0;
  const dAck = driver.acknowledged || 0;
  const dRes = driver.resolved || 0;

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const effectiveTotal = dTotal > 0 ? dTotal : 1;

  const pendingStroke = (dPending / effectiveTotal) * circumference;
  const ackStroke = (dAck / effectiveTotal) * circumference;
  const resStroke = (dRes / effectiveTotal) * circumference;

  const pendingOffset = 0;
  const ackOffset = -pendingStroke;
  const resOffset = -(pendingStroke + ackStroke);

  const ackPct = dTotal > 0 ? Math.round((dAck / dTotal) * 100) : 100;
  const offlineCount = driver.byType?.MONITORING_DEVICE_OFFLINE || 0;
  const drowsinessCount = (driver.byType?.DROWSINESS_WARNING || 0) + (driver.byType?.CRITICAL_DROWSINESS || 0);
  const mismatchCount = driver.byType?.DRIVER_MISMATCH || 0;

  return (
    <div
      style={{
        background: bgCard,
        borderRadius: "18px",
        border: isSelected ? "2px solid #7c3aed" : `1.5px solid ${borderCol}`,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "14px",
        boxShadow: isSelected ? "0 8px 24px rgba(124, 58, 237, 0.12)" : "0 4px 16px rgba(0,0,0,0.03)",
        transition: "all 0.2s ease",
      }}
    >
      <div>
        {/* Driver identity row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "900",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
                flexShrink: 0,
              }}
            >
              {driver.driverName?.charAt(0) || "D"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: "900", margin: 0, color: textPrimary }}>
                  Driver {driver.driverName}
                </h4>
                {isSelected && (
                  <span style={{ fontSize: "10px", fontWeight: "900", background: "#7c3aed", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>
                    FOCUSED
                  </span>
                )}
              </div>
              <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Bus size={12} />
                <span>Buses: <strong>{driver.buses?.length > 0 ? driver.buses.join(", ") : "Assigned Bus"}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#7c3aed" }}>
              {dTotal}
            </span>
            <div style={{ fontSize: "10px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>
              Alerts
            </div>
          </div>
        </div>

        {/* Oversight Policy Badge - NO RESOLUTION REQUIRED */}
        <div
          style={{
            padding: "5px 10px",
            borderRadius: "8px",
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(14, 165, 233, 0.2)",
            color: "#0284c7",
            fontSize: "11px",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            marginBottom: "12px",
          }}
        >
          <Info size={12} /> Oversight Active (No Resolve Needed)
        </div>

        {/* SVG Donut Chart + Legend */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: bgCardSecondary, padding: "12px 14px", borderRadius: "14px", border: `1px solid ${borderCol}` }}>
          {/* Donut SVG */}
          <div style={{ position: "relative", width: "106px", height: "106px", flexShrink: 0 }}>
            <svg width="106" height="106" viewBox="0 0 106 106" style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx="53"
                cy="53"
                r={radius}
                fill="transparent"
                stroke={darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9"}
                strokeWidth="12"
              />
              {dTotal === 0 ? (
                <circle
                  cx="53"
                  cy="53"
                  r={radius}
                  fill="transparent"
                  stroke="#16a34a"
                  strokeWidth="12"
                />
              ) : (
                <>
                  {/* Pending (Red) */}
                  <circle
                    cx="53"
                    cy="53"
                    r={radius}
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth="12"
                    strokeDasharray={`${pendingStroke} ${circumference}`}
                    strokeDashoffset={pendingOffset}
                    strokeLinecap="round"
                  />
                  {/* Acknowledged (Cyan/Blue) */}
                  <circle
                    cx="53"
                    cy="53"
                    r={radius}
                    fill="transparent"
                    stroke="#0284c7"
                    strokeWidth="12"
                    strokeDasharray={`${ackStroke} ${circumference}`}
                    strokeDashoffset={ackOffset}
                    strokeLinecap="round"
                  />
                  {/* Resolved (Green) */}
                  <circle
                    cx="53"
                    cy="53"
                    r={radius}
                    fill="transparent"
                    stroke="#16a34a"
                    strokeWidth="12"
                    strokeDasharray={`${resStroke} ${circumference}`}
                    strokeDashoffset={resOffset}
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "900", color: textPrimary, lineHeight: 1 }}>
                {dTotal === 0 ? "100%" : `${ackPct}%`}
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: "800", color: textSecondary, textTransform: "uppercase", marginTop: "2px" }}>
                {dTotal === 0 ? "Clear" : "Ack Rate"}
              </span>
            </div>
          </div>

          {/* Action Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#0284c7", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0284c7" }}></span>
                Acknowledged:
              </span>
              <strong style={{ color: "#0284c7" }}>{dAck}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#ef4444", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444" }}></span>
                Pending:
              </span>
              <strong style={{ color: "#ef4444" }}>{dPending}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#16a34a", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#16a34a" }}></span>
                Resolved:
              </span>
              <strong style={{ color: "#16a34a" }}>{dRes}</strong>
            </div>
          </div>
        </div>

        {/* Incident Type Micro Breakdown */}
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
            <span style={{ color: textSecondary }}>📡 Device Offline Events:</span>
            <strong style={{ color: offlineCount > 0 ? "#ea580c" : textSecondary }}>{offlineCount}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
            <span style={{ color: textSecondary }}>⚠️ Drowsiness Warnings:</span>
            <strong style={{ color: drowsinessCount > 0 ? "#f59e0b" : textSecondary }}>{drowsinessCount}</strong>
          </div>
          {mismatchCount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <span style={{ color: textSecondary }}>👤 Driver Mismatch:</span>
              <strong style={{ color: "#a855f7" }}>{mismatchCount}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px", borderTop: `1px solid ${borderCol}`, paddingTop: "12px" }}>
        <button
          onClick={() => onFilterAlerts(driver.driverName)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "10px",
            background: "#7c3aed",
            color: "#ffffff",
            fontWeight: "800",
            fontSize: "12px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)",
          }}
        >
          <Search size={13} /> View {driver.driverName}'s Alerts
        </button>

        <button
          onClick={onSelectFocus}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            background: bgCardSecondary,
            color: textPrimary,
            fontWeight: "800",
            fontSize: "12px",
            border: `1px solid ${borderCol}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Deep-dive chart"
        >
          <BarChart3 size={13} /> Details
        </button>
      </div>
    </div>
  );
}

export default function AlertActionAnalyticsChart({
  analytics,
  loading = false,
  activeFilter = "All",
  onFilterChange = () => {},
  selectedAlert = null,
  onSelectAlert = () => {},
  selectedDriver = null,
  onSelectDriver = () => {},
  darkMode = false,
  onRefresh = () => {},
  onAcknowledgeAlert = () => {},
}) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [analyticsTab, setAnalyticsTab] = useState("drivers"); // 'drivers' | 'fleet'
  const [activeDriverIndex, setActiveDriverIndex] = useState(0);

  // Theme styling tokens
  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const bgCardSecondary = darkMode ? "#0f172a" : "#f8fafc";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  const summary = analytics?.summary || {
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    actionRate: 0,
    acknowledgedRate: 0,
    resolvedRate: 0,
    offlineTotal: 0,
    offlineAcknowledged: 0,
    offlinePending: 0,
    offlineResolved: 0,
  };

  const typeBreakdown = analytics?.typeBreakdown || [];
  const driverAnalytics = analytics?.driverAnalytics || [];
  const activeOfflineAlerts = analytics?.activeOfflineAlerts || [];

  // Selected driver data
  const currentDriver = driverAnalytics[activeDriverIndex] || driverAnalytics[0] || {
    driverName: "Silpa",
    buses: ["KL-06-345", "KL-05-AA-1001"],
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    actionRate: 0,
    byType: {},
  };

  // Fleet SVG Donut Calculations
  const fleetTotal = summary.total || 1;
  const fleetPendingCount = summary.pending || 0;
  const fleetAckCount = summary.acknowledged || 0;
  const fleetResCount = summary.resolved || 0;

  const fleetRadius = 65;
  const fleetCircumference = 2 * Math.PI * fleetRadius;
  const fleetPendingStroke = (fleetPendingCount / fleetTotal) * fleetCircumference;
  const fleetAckStroke = (fleetAckCount / fleetTotal) * fleetCircumference;
  const fleetResStroke = (fleetResCount / fleetTotal) * fleetCircumference;

  // Driver SVG Donut Calculations
  const driverTotal = currentDriver.total || 1;
  const driverPendingCount = currentDriver.pending || 0;
  const driverAckCount = currentDriver.acknowledged || 0;
  const driverResCount = currentDriver.resolved || 0;

  const dPendingPct = Math.round((driverPendingCount / driverTotal) * 100);
  const dAckPct = Math.round((driverAckCount / driverTotal) * 100);
  const dResPct = Math.max(0, 100 - dPendingPct - dAckPct);

  const driverRadius = 65;
  const driverCircumference = 2 * Math.PI * driverRadius;
  const driverPendingStroke = (driverPendingCount / driverTotal) * driverCircumference;
  const driverAckStroke = (driverAckCount / driverTotal) * driverCircumference;
  const driverResStroke = (driverResCount / driverTotal) * driverCircumference;

  const driverPendingOffset = 0;
  const driverAckOffset = -driverPendingStroke;
  const driverResOffset = -(driverPendingStroke + driverAckStroke);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ──────────────────────────────────────────────────────── */}
      {/* TOP HEADER: VIEW MODE TOGGLE (PER DRIVER VS FLEET)      */}
      {/* ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          background: bgCard,
          padding: "16px 20px",
          borderRadius: "18px",
          border: `1px solid ${borderCol}`,
        }}
      >
        <div>
          <h3 style={{ fontSize: "17px", fontWeight: "900", margin: 0, color: textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={20} style={{ color: "#7c3aed" }} />
            Safety Alert &amp; Admin Action Analytics
          </h3>
          <p style={{ fontSize: "12.5px", color: textSecondary, margin: "3px 0 0 0" }}>
            Real-time visual chart of safety incidents, camera offline statuses, and admin actions. <strong>No resolution required</strong> — ongoing monitoring active.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div style={{ display: "flex", gap: "6px", background: bgCardSecondary, padding: "4px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
          <button
            onClick={() => setAnalyticsTab("drivers")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: analyticsTab === "drivers" ? "#7c3aed" : "transparent",
              color: analyticsTab === "drivers" ? "#ffffff" : textSecondary,
              fontWeight: analyticsTab === "drivers" ? "900" : "700",
              fontSize: "12.5px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Users size={14} />
            <span>Driver-by-Driver Charts</span>
            <span style={{ background: analyticsTab === "drivers" ? "rgba(255,255,255,0.25)" : (darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"), padding: "1px 6px", borderRadius: "8px", fontSize: "11px", fontWeight: "900" }}>
              {driverAnalytics.length}
            </span>
          </button>

          <button
            onClick={() => setAnalyticsTab("fleet")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: analyticsTab === "fleet" ? "#7c3aed" : "transparent",
              color: analyticsTab === "fleet" ? "#ffffff" : textSecondary,
              fontWeight: analyticsTab === "fleet" ? "900" : "700",
              fontSize: "12.5px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <PieChart size={14} />
            <span>Fleet Overview</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION A: DRIVER-BY-DRIVER CHARTS VIEW                 */}
      {/* ──────────────────────────────────────────────────────── */}
      {analyticsTab === "drivers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Driver Selector Pill Bar */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "4px",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11.5px", fontWeight: "900", color: textSecondary, textTransform: "uppercase", whiteSpace: "nowrap" }}>
              CHART VIEW:
            </span>

            <button
              onClick={() => setActiveDriverIndex(-1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "12px",
                border: activeDriverIndex === -1 ? "2px solid #7c3aed" : `1px solid ${borderCol}`,
                background: activeDriverIndex === -1 ? (darkMode ? "rgba(124, 58, 237, 0.2)" : "#ede9fe") : bgCard,
                color: activeDriverIndex === -1 ? "#7c3aed" : textPrimary,
                fontWeight: activeDriverIndex === -1 ? "900" : "700",
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: activeDriverIndex === -1 ? "0 4px 14px rgba(124, 58, 237, 0.15)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <PieChart size={14} />
              <span>All Driver Charts</span>
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "900",
                  background: activeDriverIndex === -1 ? "#7c3aed" : (darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
                  color: activeDriverIndex === -1 ? "#ffffff" : textSecondary,
                }}
              >
                {driverAnalytics.length} Drivers
              </span>
            </button>

            {driverAnalytics.map((drv, idx) => {
              const isSelected = activeDriverIndex === idx;
              return (
                <button
                  key={drv.driverName || idx}
                  onClick={() => {
                    setActiveDriverIndex(idx);
                    onSelectDriver(drv.driverName);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid #7c3aed" : `1px solid ${borderCol}`,
                    background: isSelected ? (darkMode ? "rgba(124, 58, 237, 0.2)" : "#ede9fe") : bgCard,
                    color: isSelected ? "#7c3aed" : textPrimary,
                    fontWeight: isSelected ? "900" : "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: isSelected ? "0 4px 14px rgba(124, 58, 237, 0.15)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: isSelected ? "#7c3aed" : (darkMode ? "#334155" : "#e2e8f0"),
                      color: isSelected ? "#ffffff" : textPrimary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: "900",
                    }}
                  >
                    {drv.driverName?.charAt(0) || "D"}
                  </div>
                  <span>{drv.driverName}</span>
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: "900",
                      background: isSelected ? "#7c3aed" : (darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
                      color: isSelected ? "#ffffff" : textSecondary,
                    }}
                  >
                    {drv.total} alerts ({drv.acknowledged} Ack)
                  </span>
                </button>
              );
            })}
          </div>

          {/* INDIVIDUAL DRIVER PROFILE & CHARTS (When a specific driver is selected) */}
          {activeDriverIndex >= 0 && currentDriver && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Driver KPI Card Banner */}
              <div
                style={{
                  background: darkMode
                    ? "linear-gradient(135deg, #1e1b4b 0%, #172554 100%)"
                    : "linear-gradient(135deg, #ede9fe 0%, #e0f2fe 100%)",
                  borderRadius: "18px",
                  padding: "20px 24px",
                  border: `1px solid ${darkMode ? "rgba(124, 58, 237, 0.3)" : "#c4b5fd"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: "900",
                      boxShadow: "0 6px 16px rgba(124, 58, 237, 0.3)",
                    }}
                  >
                    {currentDriver.driverName?.charAt(0) || "D"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <h4 style={{ fontSize: "18px", fontWeight: "900", margin: 0, color: textPrimary }}>
                        Driver {currentDriver.driverName}
                      </h4>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: currentDriver.acknowledged > 0 ? "rgba(2, 132, 199, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: currentDriver.acknowledged > 0 ? "#0284c7" : "#ef4444",
                          border: `1px solid ${currentDriver.acknowledged > 0 ? "rgba(2, 132, 199, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                        }}
                      >
                        ● {currentDriver.acknowledged > 0 ? `${currentDriver.acknowledged} Acknowledged` : "Pending Action"}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                        Oversight Active (No Resolve Needed)
                      </span>
                    </div>
                    <div style={{ fontSize: "12.5px", color: textSecondary, marginTop: "4px" }}>
                      Operating Buses: <strong>{currentDriver.buses?.join(", ") || "Assigned Bus"}</strong>
                    </div>
                  </div>
                </div>

                {/* Filter table button */}
                <button
                  onClick={() => {
                    onFilterChange("All");
                    onSelectDriver(currentDriver.driverName);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: "#7c3aed",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  <Search size={13} /> View {currentDriver.driverName}'s Alert Log
                </button>
              </div>

              {/* 2 Visual Charts for this Driver */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                  gap: "18px",
                }}
              >
                {/* CHART 1: DRIVER ACTION DISTRIBUTION DONUT */}
                <div
                  style={{
                    background: bgCard,
                    borderRadius: "18px",
                    border: `1px solid ${borderCol}`,
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <h5 style={{ fontSize: "14.5px", fontWeight: "900", margin: 0, color: textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                      <PieChart size={17} style={{ color: "#7c3aed" }} />
                      Action Distribution for {currentDriver.driverName}
                    </h5>
                    <p style={{ fontSize: "12px", color: textSecondary, margin: "2px 0 0 0" }}>
                      Proportion of alerts acknowledged, pending, and resolved
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "16px" }}>
                    {/* SVG Donut */}
                    <div style={{ position: "relative", width: "160px", height: "160px", flexShrink: 0 }}>
                      <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
                        <circle
                          cx="80"
                          cy="80"
                          r={driverRadius}
                          fill="transparent"
                          stroke={darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9"}
                          strokeWidth="18"
                        />
                        {/* Pending (Red) */}
                        <circle
                          cx="80"
                          cy="80"
                          r={driverRadius}
                          fill="transparent"
                          stroke="#ef4444"
                          strokeWidth="18"
                          strokeDasharray={`${driverPendingStroke} ${driverCircumference}`}
                          strokeDashoffset={driverPendingOffset}
                          strokeLinecap="round"
                        />
                        {/* Acknowledged (Blue) */}
                        <circle
                          cx="80"
                          cy="80"
                          r={driverRadius}
                          fill="transparent"
                          stroke="#0284c7"
                          strokeWidth="18"
                          strokeDasharray={`${driverAckStroke} ${driverCircumference}`}
                          strokeDashoffset={driverAckOffset}
                          strokeLinecap="round"
                        />
                        {/* Resolved (Green) */}
                        <circle
                          cx="80"
                          cy="80"
                          r={driverRadius}
                          fill="transparent"
                          stroke="#16a34a"
                          strokeWidth="18"
                          strokeDasharray={`${driverResStroke} ${driverCircumference}`}
                          strokeDashoffset={driverResOffset}
                          strokeLinecap="round"
                        />
                      </svg>

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ fontSize: "20px", fontWeight: "900", color: textPrimary, lineHeight: 1 }}>
                          {currentDriver.actionRate}%
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: "800", color: textSecondary, textTransform: "uppercase", marginTop: "3px" }}>
                          Action Taken
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Numbers */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "140px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: "8px", background: bgCardSecondary }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#0284c7" }}></span>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: textPrimary }}>Acknowledged</span>
                        </div>
                        <strong style={{ fontSize: "13px", color: "#0284c7" }}>{driverAckCount}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: "8px", background: bgCardSecondary }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#ef4444" }}></span>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: textPrimary }}>Pending</span>
                        </div>
                        <strong style={{ fontSize: "13px", color: "#ef4444" }}>{driverPendingCount}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: "8px", background: bgCardSecondary }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#16a34a" }}></span>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: textPrimary }}>Resolved</span>
                        </div>
                        <strong style={{ fontSize: "13px", color: "#16a34a" }}>{driverResCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHART 2: DRIVER INCIDENT CATEGORY BREAKDOWN BARS */}
                <div
                  style={{
                    background: bgCard,
                    borderRadius: "18px",
                    border: `1px solid ${borderCol}`,
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <h5 style={{ fontSize: "14.5px", fontWeight: "900", margin: 0, color: textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                      <BarChart3 size={17} style={{ color: "#0ea5e9" }} />
                      Incident Types for {currentDriver.driverName}
                    </h5>
                    <p style={{ fontSize: "12px", color: textSecondary, margin: "2px 0 0 0" }}>
                      Breakdown across telemetry, fatigue, and identity events
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center", flex: 1 }}>
                    {[
                      { key: "MONITORING_DEVICE_OFFLINE", label: "Device Telemetry Offline", icon: "📡", color: "#ea580c" },
                      { key: "DROWSINESS_WARNING", label: "Drowsiness Warning", icon: "⚠️", color: "#f59e0b" },
                      { key: "CRITICAL_DROWSINESS", label: "Severe Drowsiness", icon: "🚨", color: "#dc2626" },
                      { key: "DRIVER_MISMATCH", label: "Driver Mismatch", icon: "👤", color: "#a855f7" },
                    ].map((row) => {
                      const count = currentDriver.byType?.[row.key] || 0;
                      const maxCount = Math.max(1, ...Object.values(currentDriver.byType || {}));
                      const barWidth = Math.round((count / maxCount) * 100);

                      return (
                        <div key={row.key}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "4px" }}>
                            <span style={{ fontWeight: "700", color: textPrimary, display: "flex", alignItems: "center", gap: "5px" }}>
                              <span>{row.icon}</span> {row.label}
                            </span>
                            <span style={{ fontWeight: "900", color: count > 0 ? row.color : textSecondary }}>
                              {count} incidents
                            </span>
                          </div>
                          <div style={{ height: "8px", width: "100%", background: bgCardSecondary, borderRadius: "6px", overflow: "hidden", border: `1px solid ${borderCol}` }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${barWidth}%`,
                                background: count > 0 ? row.color : "transparent",
                                borderRadius: "6px",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION: OTHER DRIVER CHARTS IN FLEET */}
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h5 style={{ fontSize: "13px", fontWeight: "900", color: textSecondary, margin: 0, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Users size={14} /> Charts for Other Drivers in Fleet:
                  </h5>
                  <button
                    onClick={() => setActiveDriverIndex(-1)}
                    style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                  >
                    View All Drivers Grid →
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {driverAnalytics.filter((_, i) => i !== activeDriverIndex).map((drv) => {
                    const originalIdx = driverAnalytics.findIndex(d => d.driverName === drv.driverName);
                    return (
                      <DriverDonutChartCard
                        key={drv.driverName}
                        driver={drv}
                        isSelected={false}
                        onSelectFocus={() => {
                          setActiveDriverIndex(originalIdx);
                          onSelectDriver(drv.driverName);
                        }}
                        onFilterAlerts={(name) => {
                          onFilterChange("All");
                          onSelectDriver(name);
                        }}
                        darkMode={darkMode}
                        borderCol={borderCol}
                        bgCard={bgCard}
                        bgCardSecondary={bgCardSecondary}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ALL DRIVERS DEDICATED CHARTS GRID (EACH DRIVER HAS A COMPLETE VISUAL CHART) */}
          {activeDriverIndex === -1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: darkMode ? "rgba(124, 58, 237, 0.1)" : "#f5f3ff",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  border: `1px solid ${darkMode ? "rgba(124, 58, 237, 0.25)" : "#ddd6fe"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={16} style={{ color: "#7c3aed" }} />
                  <span style={{ fontSize: "13.5px", fontWeight: "900", color: textPrimary }}>
                    Dedicated Action &amp; Safety Charts for Each Driver ({driverAnalytics.length} Drivers)
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: "800", color: "#0284c7", background: "rgba(14, 165, 233, 0.12)", padding: "4px 10px", borderRadius: "8px" }}>
                  ● Ongoing Safety Oversight Active (No Resolution Required)
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "18px",
                }}
              >
                {driverAnalytics.map((drv, idx) => (
                  <DriverDonutChartCard
                    key={drv.driverName || idx}
                    driver={drv}
                    isSelected={false}
                    onSelectFocus={() => {
                      setActiveDriverIndex(idx);
                      onSelectDriver(drv.driverName);
                    }}
                    onFilterAlerts={(name) => {
                      onFilterChange("All");
                      onSelectDriver(name);
                    }}
                    darkMode={darkMode}
                    borderCol={borderCol}
                    bgCard={bgCard}
                    bgCardSecondary={bgCardSecondary}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION B: FLEET-WIDE OVERVIEW CHARTS                    */}
      {/* ──────────────────────────────────────────────────────── */}
      {analyticsTab === "fleet" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* KPI CARDS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div onClick={() => onFilterChange("All")} style={{ background: bgCard, padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${activeFilter === "All" ? "#7c3aed" : borderCol}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: textSecondary, textTransform: "uppercase" }}>Total Alerts</span>
                <ShieldAlert size={16} style={{ color: "#7c3aed" }} />
              </div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: textPrimary }}>{summary.total}</div>
              <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "4px" }}>All recorded safety events</div>
            </div>

            <div onClick={() => onFilterChange("Active")} style={{ background: bgCard, padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${activeFilter === "Active" ? "#ef4444" : borderCol}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#ef4444", textTransform: "uppercase" }}>🔴 Pending Action</span>
                <AlertTriangle size={16} style={{ color: "#ef4444" }} />
              </div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#ef4444" }}>{summary.pending}</div>
              <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "4px" }}>Awaiting review</div>
            </div>

            <div onClick={() => onFilterChange("Acknowledged")} style={{ background: bgCard, padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${activeFilter === "Acknowledged" ? "#0284c7" : borderCol}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#0284c7", textTransform: "uppercase" }}>🔵 Acknowledged</span>
                <Clock size={16} style={{ color: "#0284c7" }} />
              </div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#0284c7" }}>{summary.acknowledged}</div>
              <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "4px" }}>Monitored by Admin</div>
            </div>

            <div onClick={() => onFilterChange("Resolved")} style={{ background: bgCard, padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${activeFilter === "Resolved" ? "#16a34a" : borderCol}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#16a34a", textTransform: "uppercase" }}>🟢 Resolved</span>
                <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
              </div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#16a34a" }}>{summary.resolved}</div>
              <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "4px" }}>Closed with notes</div>
            </div>

            <div onClick={() => onFilterChange("MONITORING_DEVICE_OFFLINE")} style={{ background: bgCard, padding: "16px 20px", borderRadius: "16px", border: `1.5px solid ${activeFilter === "MONITORING_DEVICE_OFFLINE" ? "#ea580c" : borderCol}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#ea580c", textTransform: "uppercase" }}>📡 Device Offline</span>
                <WifiOff size={16} style={{ color: "#ea580c" }} />
              </div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#ea580c" }}>{summary.offlineTotal}</div>
              <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "4px" }}>{summary.offlineAcknowledged} Ack • {summary.offlinePending} Pending</div>
            </div>
          </div>

          {/* FLEET DONUT AND CATEGORIES CHART */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {/* FLEET DONUT */}
            <div style={{ background: bgCard, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px 24px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: "900", margin: "0 0 16px 0", color: textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                <PieChart size={18} style={{ color: "#7c3aed" }} /> Fleet Action Distribution
              </h4>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "18px" }}>
                <div style={{ position: "relative", width: "160px", height: "160px" }}>
                  <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="80" cy="80" r={fleetRadius} fill="transparent" stroke={darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9"} strokeWidth="18" />
                    <circle cx="80" cy="80" r={fleetRadius} fill="transparent" stroke="#ef4444" strokeWidth="18" strokeDasharray={`${fleetPendingStroke} ${fleetCircumference}`} strokeDashoffset={0} strokeLinecap="round" />
                    <circle cx="80" cy="80" r={fleetRadius} fill="transparent" stroke="#0284c7" strokeWidth="18" strokeDasharray={`${fleetAckStroke} ${fleetCircumference}`} strokeDashoffset={-fleetPendingStroke} strokeLinecap="round" />
                    <circle cx="80" cy="80" r={fleetRadius} fill="transparent" stroke="#16a34a" strokeWidth="18" strokeDasharray={`${fleetResStroke} ${fleetCircumference}`} strokeDashoffset={-(fleetPendingStroke + fleetAckStroke)} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "20px", fontWeight: "900", color: textPrimary, lineHeight: 1 }}>{summary.actionRate}%</span>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: textSecondary, textTransform: "uppercase", marginTop: "3px" }}>Action Taken</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "12.5px" }}>
                    <span style={{ color: "#0284c7", fontWeight: "700" }}>● Acknowledged:</span>
                    <strong>{fleetAckCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "12.5px" }}>
                    <span style={{ color: "#ef4444", fontWeight: "700" }}>● Action Pending:</span>
                    <strong>{fleetPendingCount}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "12.5px" }}>
                    <span style={{ color: "#16a34a", fontWeight: "700" }}>● Resolved:</span>
                    <strong>{fleetResCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* FLEET CATEGORY BARS */}
            <div style={{ background: bgCard, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px 24px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: "900", margin: "0 0 16px 0", color: textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart3 size={18} style={{ color: "#0ea5e9" }} /> Fleet Incident Types
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {typeBreakdown.map((item) => (
                  <div key={item.eventType}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "700", color: textPrimary }}>{item.label}</span>
                      <span style={{ color: textSecondary, fontWeight: "800" }}>{item.total} events ({item.Acknowledged} Ack)</span>
                    </div>
                    <div style={{ height: "8px", width: "100%", background: bgCardSecondary, borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${(item.Acknowledged / (item.total || 1)) * 100}%`, background: "#0284c7" }}></div>
                      <div style={{ width: `${(item.Resolved / (item.total || 1)) * 100}%`, background: "#16a34a" }}></div>
                      <div style={{ width: `${(item.Active / (item.total || 1)) * 100}%`, background: "#ef4444" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* FEATURED SPOTLIGHT CARD: BUS KL-06-345 TELEMETRY FOCUS  */}
      {/* (SHOW ADMIN ABOUT THE ALERT - NO RESOLUTION REQUIRED)    */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeOfflineAlerts.length > 0 && (
        <div
          style={{
            background: darkMode
              ? "linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)"
              : "linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)",
            border: `1.5px solid ${darkMode ? "rgba(239, 68, 68, 0.3)" : "#fecaca"}`,
            borderRadius: "18px",
            padding: "20px 24px",
            boxShadow: "0 6px 20px rgba(239, 68, 68, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <WifiOff size={22} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "900", margin: 0, color: textPrimary }}>
                    🔴 Monitoring Device Offline
                  </h4>
                  <span style={{ fontSize: "11px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", background: "#f97316", color: "#ffffff" }}>
                    High Severity
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(14, 165, 233, 0.15)",
                      color: "#0284c7",
                      border: "1px solid rgba(14, 165, 233, 0.3)",
                    }}
                  >
                    ● Acknowledged
                  </span>
                </div>
                <div style={{ fontSize: "12.5px", color: textSecondary, marginTop: "2px" }}>
                  Active Device Telemetry Incident Focus
                </div>
              </div>
            </div>

            {/* Admin Policy Notice Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "10px",
                background: darkMode ? "rgba(14, 165, 233, 0.15)" : "#e0f2fe",
                color: "#0284c7",
                fontSize: "12px",
                fontWeight: "800",
                border: "1px solid rgba(14, 165, 233, 0.3)",
              }}
            >
              <Info size={14} />
              Admin Telemetry Oversight Active (No Resolve Needed)
            </div>
          </div>

          {/* Details Box */}
          <div
            style={{
              background: bgCard,
              borderRadius: "14px",
              padding: "16px 18px",
              border: `1px solid ${borderCol}`,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <p style={{ margin: 0, fontSize: "13.5px", fontWeight: "600", color: textPrimary, lineHeight: 1.5 }}>
              Camera/monitoring device for <strong>Bus KL-06-345 (Silpa)</strong> has stopped transmitting telemetry.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "12.5px", color: textSecondary, marginTop: "4px" }}>
              <div>
                <strong>Vehicle:</strong> <span style={{ color: textPrimary, fontWeight: "800" }}>Bus KL-06-345</span>
              </div>
              <div>
                <strong>Assigned Driver:</strong> <span style={{ color: textPrimary, fontWeight: "700" }}>Silpa</span>
              </div>
              <div>
                <strong>Route:</strong> <span style={{ color: textPrimary }}>Kanjirappally ➔ Erattupetta</span>
              </div>
              <div>
                <strong>Watchdog Action:</strong> <span style={{ color: "#0284c7", fontWeight: "800" }}>Acknowledged by DRISHYA JOSE</span>
              </div>
              <div>
                <strong>Telemetry Timeout:</strong> <span style={{ color: textPrimary }}>20 Seconds (Heartbeat Exceeded)</span>
              </div>
              <div>
                <strong>Action State:</strong> <span style={{ color: "#16a34a", fontWeight: "800" }}>Preserved Active for Monitoring</span>
              </div>
            </div>

            <div
              style={{
                marginTop: "6px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: `1px solid ${borderCol}`,
                fontSize: "12px",
                color: textSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>
                💡 <em>Notice to Transit Controller: This device offline event remains flagged in the system for tracking telemetry reconnection without clearing historical audit trails. No resolution required.</em>
              </span>
              <button
                onClick={() => {
                  onFilterChange("Acknowledged");
                  onSelectDriver("Silpa");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7c3aed",
                  fontWeight: "800",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                View all Acknowledged alerts for Silpa <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
