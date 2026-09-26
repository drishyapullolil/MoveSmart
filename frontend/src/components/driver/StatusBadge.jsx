import React from "react";

export default function StatusBadge({
  status = "active",
  label,
  pulse = false,
  size = "md",
  className = "",
  style = {},
}) {
  const norm = String(status || "").toLowerCase().replace(/[\s-_]/g, "");

  let type = "neutral";
  let displayLabel = label;

  if (["connected", "active", "online", "success", "approved", "normal", "live", "ontime", "completed", "accepted"].includes(norm)) {
    type = "success";
    if (!displayLabel) displayLabel = norm === "live" ? "LIVE" : norm === "connected" ? "CONNECTED" : "ACTIVE";
  } else if (["pending", "standby", "warning", "attention", "paused", "delayed", "connecting"].includes(norm)) {
    type = "warning";
    if (!displayLabel) displayLabel = norm === "paused" ? "PAUSED" : norm === "standby" ? "STANDBY" : "PENDING";
  } else if (["offline", "failed", "critical", "rejected", "error", "absent", "drowsy"].includes(norm)) {
    type = "danger";
    if (!displayLabel) displayLabel = norm === "offline" ? "OFFLINE" : "FAILED";
  } else if (["hardware", "rfid", "esp32", "iot"].includes(norm)) {
    type = "blue";
    if (!displayLabel) displayLabel = "ONLINE";
  } else {
    type = "neutral";
    if (!displayLabel) displayLabel = "NOT STARTED";
  }

  return (
    <span
      className={`driver-status-badge ${type} ${size} ${className}`}
      style={style}
    >
      <span className={`driver-badge-dot ${pulse || type === "success" ? "pulse" : ""}`}></span>
      <span>{label || displayLabel}</span>
    </span>
  );
}
