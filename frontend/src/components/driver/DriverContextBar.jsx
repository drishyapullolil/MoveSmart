import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser } from "../../utils/session";

export default function DriverContextBar({
  user: propUser,
  assignedBus,
  isOnline = true,
  tripStatus = "not_started",
  attendanceMarked: propAttendanceMarked,
  attendanceTime: propAttendanceTime,
  onMarkAttendance,
  rightAction,
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => propUser || getStoredUser() || {});
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceTime, setAttendanceTime] = useState("");

  useEffect(() => {
    if (propUser) setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    if (propAttendanceMarked !== undefined) {
      setAttendanceMarked(propAttendanceMarked);
      setAttendanceTime(propAttendanceTime || "");
    } else {
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem("moveSmart_driverAttendanceDate");
      const savedTime = localStorage.getItem("moveSmart_driverAttendanceTime");
      if (savedDate === today) {
        setAttendanceMarked(true);
        setAttendanceTime(savedTime || "Today");
      }
    }
  }, [propAttendanceMarked, propAttendanceTime]);

  const handleMarkAttendanceClick = () => {
    if (onMarkAttendance) {
      onMarkAttendance();
    } else {
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const today = new Date().toDateString();
      setAttendanceMarked(true);
      setAttendanceTime(nowTime);
      localStorage.setItem("moveSmart_driverAttendanceDate", today);
      localStorage.setItem("moveSmart_driverAttendanceTime", nowTime);
      window.dispatchEvent(new Event("storage"));
    }
  };

  const driverName = user?.name || "Driver";
  const driverId = user?.driverId || (user?._id ? `ID: DRV-${user._id.slice(-5).toUpperCase()}` : "ID: DRV-AUTHORIZED");
  const busNumber = assignedBus?.busNumber || user?.busNumber || "KL-06-345";
  const busName = assignedBus?.busName || "Assigned Bus";
  const routeName = assignedBus?.routeName || (assignedBus ? `${assignedBus.fromLocation} ➔ ${assignedBus.toLocation}` : "Kanjirappally ➔ Erattupetta");

  const isTripActive = tripStatus === "in_progress" || tripStatus === "ACTIVE";

  return (
    <div className="driver-context-bar-wrap">
      <div className="driver-context-bar-inner">

        {/* Context Items Grid */}
        <div className="driver-context-items-list">

          {/* 1. Driver Name */}
          <div className="driver-context-chip" title={`Driver: ${driverName}`}>
            <span className="driver-context-icon">👤</span>
            <div className="driver-context-text">
              <span className="driver-context-label">DRIVER</span>
              <strong className="driver-context-val">{driverName}</strong>
            </div>
            <span className="driver-context-sub-badge">{driverId}</span>
          </div>

          {/* 2. Assigned Bus */}
          <div className="driver-context-chip" title={`Assigned Bus: ${busNumber} (${busName})`}>
            <span className="driver-context-icon" style={{ color: "#2F62DB" }}>🚌</span>
            <div className="driver-context-text">
              <span className="driver-context-label">ASSIGNED BUS</span>
              <strong className="driver-context-val">{busNumber}</strong>
            </div>
            <span className="driver-context-sub-badge" style={{ background: "#EAF1FF", color: "#2F62DB", borderColor: "#BFDBFE" }}>
              {busName}
            </span>
          </div>

          {/* 3. Active Route */}
          <div className="driver-context-chip" title={`Route: ${routeName}`}>
            <span className="driver-context-icon" style={{ color: "#6D35D8" }}>📍</span>
            <div className="driver-context-text">
              <span className="driver-context-label">TRANSIT ROUTE</span>
              <strong className="driver-context-val">{routeName}</strong>
            </div>
          </div>

          {/* 4. Duty & Trip Status */}
          <div className="driver-context-chip">
            <span className={`driver-duty-dot ${isOnline ? "pulsing" : "offline"}`}></span>
            <div className="driver-context-text">
              <span className="driver-context-label">DUTY STATUS</span>
              <strong className="driver-context-val" style={{ color: isTripActive ? "#149447" : isOnline ? "#149447" : "#DC2626" }}>
                {isTripActive ? "TRIP IN PROGRESS" : isOnline ? "ON DUTY (READY)" : "OFF DUTY"}
              </strong>
            </div>
          </div>

        </div>

        {/* Right Quick Action / Attendance Indicator */}
        <div className="driver-context-right-actions">
          {rightAction ? (
            rightAction
          ) : !attendanceMarked ? (
            <button
              type="button"
              onClick={handleMarkAttendanceClick}
              className="driver-context-action-btn primary"
              title="Mark your attendance for today's duty"
            >
              <span>✓</span>
              <span>Mark Today's Attendance</span>
            </button>
          ) : (
            <div className="driver-attendance-done-chip" title="Attendance recorded for today">
              <span>✓</span>
              <span>Attendance: <strong>{attendanceTime || "Today"}</strong></span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
