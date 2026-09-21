/**
 * ============================================================================
 * MoveSmart Driver Console - DriverRfidDevice.jsx
 * ============================================================================
 * Dedicated Driver RFID Hardware Reader Device Page:
 * 1. Monitored & linked to the Driver's assigned Bus and ESP32 Device.
 * 2. Real-time telemetry via Socket.IO: live device status, heartbeat & taps.
 * 3. Secure SoftAP Provisioning modal / form (192.168.4.1) with masked password.
 * 4. Interactive "RFID Reader Test" section displaying live passenger tap events.
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Radio,
  Wifi,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Bus,
  MapPin,
  ExternalLink,
  Send,
  Sliders,
  ChevronRight,
  UserCheck,
  CreditCard,
  Zap,
  Activity,
  Check
} from "lucide-react";
import { getStoredUser, getStoredToken } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";

const KERALA_STOPS = [
  { code: "STOP_VYTTILA", name: "Vyttila Mobility Hub" },
  { code: "STOP_KALOOR", name: "Kaloor Junction" },
  { code: "STOP_EDAPPALLY", name: "Edappally Toll" },
  { code: "STOP_ALUVA", name: "Aluva Bus Stand" },
  { code: "STOP_ANGAMALY", name: "Angamaly Central" },
  { code: "STOP_KAKKANAD", name: "Kakkanad InfoPark" },
];

export default function DriverRfidDevice() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [assignedBus, setAssignedBus] = useState(null);
  const [stopsList, setStopsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // RFID Device State
  const [rfidDevice, setRfidDevice] = useState({
    deviceId: "MS-RFID-5326",
    status: "Not Connected", // "Connected" | "Connecting" | "Not Connected" | "Connection Failed"
    busNumber: "",
    driverName: "",
    driverEmail: "",
    stopCode: "STOP_KANJIRAPPALLY",
    ipAddress: "",
    lastHeartbeat: null,
    readerActive: false,
  });

  // Provisioning Form State
  const [provisionForm, setProvisionForm] = useState({
    ssid: "",
    password: "",
    serverApiUrl: `http://${window.location.hostname || "192.168.1.5"}:5000/api/rfid/tap`,
    stopCode: "STOP_KANJIRAPPALLY",
    busNumber: "",
    deviceId: "MS-RFID-5326",
  });
  const [provisioningStatus, setProvisioningStatus] = useState("idle"); // "idle" | "submitting" | "success" | "error"
  const [provisioningMsg, setProvisioningMsg] = useState("");

  // Live Tap Activity & Test Feed
  const [latestTap, setLatestTap] = useState(null);
  const [tapHistory, setTapHistory] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // 1. Fetch Driver & Assigned Bus Details
  useEffect(() => {
    const token = getStoredToken();
    if (!token && !getStoredUser()) {
      navigate("/login");
      return;
    }

    const currentUser = getStoredUser();
    if (currentUser) {
      setUser(currentUser);
      setProvisionForm((prev) => ({
        ...prev,
        busNumber: currentUser.busNumber || prev.busNumber,
      }));
    }

    // Load assigned bus from backend
    axios.get("/api/driver/buses", { headers: token ? { Authorization: `Bearer ${token}` } : {}, timeout: 4000 })
      .then((res) => {
        const buses = res.data?.buses || [];
        if (buses.length > 0) {
          const myBus = buses[0];
          setAssignedBus(myBus);
          setProvisionForm((prev) => ({
            ...prev,
            busNumber: myBus.busNumber || prev.busNumber,
          }));
        }
      })
      .catch(() => { });
  }, [navigate]);

  // 2. Fetch RFID Device Status from Backend
  const fetchDeviceStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const currentUser = getStoredUser() || user;
    const driverId = currentUser?._id || currentUser?.id || "";
    const busNum = assignedBus?.busNumber || currentUser?.busNumber || "";

    try {
      const res = await axios.get(`/api/rfid/device/status?driverId=${encodeURIComponent(driverId)}&busNumber=${encodeURIComponent(busNum)}`);
      if (res.data?.success && res.data.device) {
        setRfidDevice(res.data.device);
        setProvisionForm((prev) => ({
          ...prev,
          deviceId: res.data.device.deviceId || prev.deviceId,
          busNumber: res.data.device.busNumber || prev.busNumber,
          stopCode: res.data.device.stopCode || prev.stopCode,
        }));
      }
    } catch (err) {
      console.warn("Device status check notice:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, assignedBus]);

  const fetchRecentTaps = useCallback(async () => {
    try {
      const res = await axios.get("/api/rfid/taps/recent?limit=25");
      if (res.data?.taps && res.data.taps.length > 0) {
        setTapHistory(res.data.taps);
        setLatestTap((prev) => prev || res.data.taps[0]);
      }
    } catch (e) {
      console.warn("Could not fetch recent taps:", e.message);
    }
  }, []);

  useEffect(() => {
    fetchDeviceStatus();
    fetchRecentTaps();
  }, [fetchDeviceStatus, fetchRecentTaps]);

  // 3. Real-Time Socket.IO Synchronization
  useEffect(() => {
    const socketUrl = window.location.hostname === "localhost" ? "http://localhost:5000" : window.location.origin;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      const currentUser = getStoredUser() || user;
      if (currentUser?._id) {
        socket.emit("join-driver-room", { driverId: currentUser._id });
      }
    });

    // Real-Time ESP32 Device Status Updates
    socket.on("rfid:device-status", (data) => {
      if (data) {
        setRfidDevice((prev) => ({ ...prev, ...data }));
        if (data.status === "Connected") {
          showToast(`🟢 ESP32 RFID Reader (${data.deviceId}) is ONLINE and active!`);
        }
      }
    });

    // Real-Time Passenger Tap Telemetry
    socket.on("rfid:tap-event", (data) => {
      if (data && data.success !== false) {
        setLatestTap(data);
        setTapHistory((prev) => [
          {
            id: `TAP-${Date.now()}`,
            timestamp: new Date(),
            ...data,
          },
          ...prev.slice(0, 19),
        ]);
        showToast(`⚡ Passenger Card Tapped: ${data.passengerName || "Passenger"} (${data.action})`);
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  // 4. Transmit Wi-Fi Credentials to ESP32 (SoftAP Mode: 192.168.4.1)
  const handleTransmitConfig = async (e) => {
    e.preventDefault();
    if (!provisionForm.ssid || !provisionForm.password) {
      setProvisioningMsg("Please enter your vehicle / hotspot Wi-Fi SSID and Password.");
      setProvisioningStatus("error");
      return;
    }

    setProvisioningStatus("submitting");
    setProvisioningMsg("Sending Wi-Fi credentials to ESP32 (http://192.168.4.1/configure)...");

    const payload = {
      ssid: provisionForm.ssid,
      password: provisionForm.password,
      serverUrl: provisionForm.serverApiUrl,
      stopCode: provisionForm.stopCode,
      deviceId: provisionForm.deviceId || "MS-RFID-5326",
      busNumber: provisionForm.busNumber || assignedBus?.busNumber || "KL-07-MS-1008",
    };

    try {
      await axios.post("http://192.168.4.1/configure", payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });

      setProvisioningStatus("success");
      setProvisioningMsg("✓ Configuration transmitted! The ESP32 is connecting to your Wi-Fi network...");
      setRfidDevice((prev) => ({ ...prev, status: "Connecting" }));
      setTimeout(() => fetchDeviceStatus(true), 4000);
    } catch (err) {
      console.warn("Direct ESP32 AP post failed:", err.message);
      setProvisioningStatus("error");
      setProvisioningMsg(
        "Could not connect to ESP32 at 192.168.4.1. Connect your phone or laptop to the MoveSmart-RFID Wi-Fi created by the ESP32 (Password: MoveSmart123), then try again."
      );
    }
  };

  // 5. Unlink Device
  const handleUnlinkDevice = async () => {
    if (!window.confirm("Are you sure you want to unlink the RFID device from this bus?")) return;
    try {
      const currentUser = getStoredUser() || user;
      await axios.post("/api/rfid/device/unlink", {
        deviceId: rfidDevice.deviceId,
        driverId: currentUser?._id || currentUser?.id,
        busNumber: rfidDevice.busNumber,
      });
      setRfidDevice((prev) => ({ ...prev, status: "Not Connected", ipAddress: "" }));
      showToast("RFID device unlinked successfully.");
    } catch (err) {
      showToast("Failed to unlink RFID device.");
    }
  };

  const formatUid = (uid) => {
    if (!uid) return "53 26 2A 56";
    const clean = String(uid).replace(/[^A-F0-9]/gi, "").toUpperCase();
    return clean.match(/.{1,2}/g)?.join(" ") || clean;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a" }}>
      <Header />

      <main style={{ flex: 1, maxWidth: "1200px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
        
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            style={{
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "14px",
              fontWeight: "700",
              fontSize: "14px",
              marginBottom: "24px",
              boxShadow: "0 6px 20px rgba(22, 163, 74, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage("")}
              style={{ background: "none", border: "none", color: "#fff", fontSize: "16px", cursor: "pointer", fontWeight: "800" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Page Title & Navigation Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px", background: "#ffffff", padding: "20px 24px", borderRadius: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Radio size={20} />
              </div>
              <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                RFID Reader Hardware
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b", fontWeight: "600" }}>
              Configure and test the ESP32 + RC522 RFID reader assigned to bus <strong style={{ color: "#2563eb" }}>{assignedBus?.busNumber || user?.busNumber || "Active Bus"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to="/driver"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "12px",
                background: "#f1f5f9",
                color: "#475569",
                fontWeight: "700",
                fontSize: "13px",
                textDecoration: "none",
                border: "1px solid #e2e8f0"
              }}
            >
              <span>📊 Dashboard</span>
            </Link>

            <Link
              to="/driver/live-drive"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "13px",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)"
              }}
            >
              <Zap size={15} />
              <span>🚍 Live Drive Cockpit ➔</span>
            </Link>

            <button
              onClick={() => fetchDeviceStatus(true)}
              disabled={refreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Checking..." : "Refresh Status"}
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px" }}>
          
          {/* LEFT COLUMN: Device Status & Provisioning */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* DEVICE STATUS CARD */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Hardware Telemetry
                  </span>
                  <h2 style={{ fontSize: "19px", fontWeight: "900", color: "#0f172a", margin: "2px 0 0" }}>
                    DEVICE STATUS
                  </h2>
                </div>

                {/* Real-Time Status Badge */}
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "800",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background:
                      rfidDevice.status === "Connected"
                        ? "#f0fdf4"
                        : rfidDevice.status === "Connecting"
                          ? "#fffbeb"
                          : rfidDevice.status === "Connection Failed"
                            ? "#fef2f2"
                            : "#f1f5f9",
                    color:
                      rfidDevice.status === "Connected"
                        ? "#15803d"
                        : rfidDevice.status === "Connecting"
                          ? "#b45309"
                          : rfidDevice.status === "Connection Failed"
                            ? "#dc2626"
                            : "#64748b",
                    border: `1.5px solid ${
                      rfidDevice.status === "Connected"
                        ? "#bbf7d0"
                        : rfidDevice.status === "Connecting"
                          ? "#fde68a"
                          : rfidDevice.status === "Connection Failed"
                            ? "#fecaca"
                            : "#e2e8f0"
                    }`,
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background:
                        rfidDevice.status === "Connected"
                          ? "#16a34a"
                          : rfidDevice.status === "Connecting"
                            ? "#f59e0b"
                            : rfidDevice.status === "Connection Failed"
                              ? "#ef4444"
                              : "#94a3b8",
                    }}
                  />
                  {rfidDevice.status === "Connected"
                    ? "● CONNECTED"
                    : rfidDevice.status === "Connecting"
                      ? "● CONNECTING..."
                      : rfidDevice.status === "Connection Failed"
                        ? "● CONNECTION FAILED"
                        : "○ NOT CONNECTED"}
                </span>
              </div>

              {/* Status Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "20px" }}>
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Device Hardware ID</div>
                  <div style={{ fontFamily: "monospace", fontWeight: "800", color: "#6d28d9", marginTop: "3px", fontSize: "14px" }}>
                    {rfidDevice.deviceId || "MS-RFID-5326"}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Assigned Bus Number</div>
                  <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "3px", fontSize: "14px" }}>
                    {assignedBus?.busNumber || rfidDevice.busNumber || user?.busNumber || "KL-07-MS-1008"}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Driver in Charge</div>
                  <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "3px" }}>
                    {user?.name || "Assigned Driver"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{user?.email || "driver@movesmart.in"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Wi-Fi &amp; IP Status</div>
                  <div style={{ fontFamily: "monospace", fontWeight: "800", color: rfidDevice.ipAddress ? "#15803d" : "#64748b", marginTop: "3px" }}>
                    {rfidDevice.ipAddress || (rfidDevice.status === "Connected" ? "192.168.1.xxx" : "Awaiting Connection")}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>RC522 Sensor Reader</div>
                  <div style={{ fontWeight: "800", color: rfidDevice.status === "Connected" ? "#16a34a" : "#64748b", marginTop: "3px" }}>
                    {rfidDevice.status === "Connected" ? "🟢 Scanning Active (SPI)" : "⚪ Reader Offline"}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Last Telemetry Heartbeat</div>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginTop: "3px" }}>
                    {rfidDevice.lastHeartbeat ? new Date(rfidDevice.lastHeartbeat).toLocaleTimeString() : "No heartbeat recorded"}
                  </div>
                </div>
              </div>

              {rfidDevice.status !== "Not Connected" && (
                <button
                  type="button"
                  onClick={handleUnlinkDevice}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  🔌 Unlink Device from Bus
                </button>
              )}
            </div>

            {/* DEVICE WI-FI PROVISIONING CARD */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                    Wi-Fi &amp; Server Provisioning
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b", fontWeight: "600" }}>
                    Configure vehicle Wi-Fi credentials for the ESP32 reader.
                  </p>
                </div>
                <Wifi size={22} style={{ color: "#16a34a" }} />
              </div>

              {/* Step Guide Banner */}
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px 16px", marginBottom: "18px", fontSize: "12.5px", color: "#166534" }}>
                <strong style={{ display: "block", marginBottom: "4px" }}>💡 Connection Guide:</strong>
                <ol style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.5" }}>
                  <li>Power on the ESP32. It broadcasts Wi-Fi: <strong>MoveSmart-RFID-xxxx</strong> (Password: <code>MoveSmart123</code>).</li>
                  <li>Connect your device to that Wi-Fi, enter vehicle Wi-Fi credentials below, and click <strong>Transmit Configuration</strong>.</li>
                </ol>
              </div>

              {/* Status Alert Banner */}
              {provisioningMsg && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    fontWeight: "700",
                    background:
                      provisioningStatus === "success"
                        ? "#f0fdf4"
                        : provisioningStatus === "error"
                          ? "#fef2f2"
                          : "#f5f3ff",
                    color:
                      provisioningStatus === "success"
                        ? "#15803d"
                        : provisioningStatus === "error"
                          ? "#dc2626"
                          : "#6d28d9",
                    border: `1.5px solid ${
                      provisioningStatus === "success"
                        ? "#86efac"
                        : provisioningStatus === "error"
                          ? "#fca5a5"
                          : "#ddd6fe"
                    }`,
                  }}
                >
                  {provisioningStatus === "submitting" && "⏳ "}
                  {provisioningStatus === "success" && "✓ "}
                  {provisioningStatus === "error" && "⚠️ "}
                  {provisioningMsg}
                </div>
              )}

              {/* Provisioning Form */}
              <form onSubmit={handleTransmitConfig} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", marginBottom: "4px", display: "block" }}>
                      Wi-Fi SSID (Network Name) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bus_Hotspot_5G"
                      value={provisionForm.ssid}
                      onChange={(e) => setProvisionForm({ ...provisionForm, ssid: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", marginBottom: "4px", display: "block" }}>
                      Wi-Fi Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter Wi-Fi password"
                      value={provisionForm.password}
                      onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", marginBottom: "4px", display: "block" }}>
                    MoveSmart Backend Server URL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="http://192.168.1.5:5000/api/rfid/tap"
                    value={provisionForm.serverApiUrl}
                    onChange={(e) => setProvisionForm({ ...provisionForm, serverApiUrl: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "600", outline: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", marginBottom: "4px", display: "block" }}>
                      Active Kerala Bus Stop
                    </label>
                    <select
                      value={provisionForm.stopCode}
                      onChange={(e) => setProvisionForm({ ...provisionForm, stopCode: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", outline: "none", background: "#fff" }}
                    >
                      {KERALA_STOPS.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.name} ({st.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", marginBottom: "4px", display: "block" }}>
                      Hardware Device ID
                    </label>
                    <input
                      type="text"
                      value={provisionForm.deviceId}
                      onChange={(e) => setProvisionForm({ ...provisionForm, deviceId: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontFamily: "monospace", fontWeight: "700" }}
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                  <a
                    href="http://192.168.4.1"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "10px 16px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      fontWeight: "700",
                      fontSize: "13px",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>Open Device Setup (192.168.4.1)</span>
                  </a>

                  <button
                    type="submit"
                    disabled={provisioningStatus === "submitting"}
                    style={{
                      flex: 1,
                      minWidth: "180px",
                      padding: "10px 20px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #16a34a, #15803d)",
                      color: "#ffffff",
                      fontWeight: "800",
                      fontSize: "13.5px",
                      border: "none",
                      cursor: provisioningStatus === "submitting" ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Send size={15} />
                    <span>{provisioningStatus === "submitting" ? "Transmitting..." : "Transmit Configuration"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: RFID Reader Test & Live Activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* RFID READER TEST HUD */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Live Hardware Verification
                  </span>
                  <h3 style={{ fontSize: "19px", fontWeight: "900", color: "#0f172a", margin: "2px 0 0" }}>
                    RFID Reader Test
                  </h3>
                </div>

                <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(109, 40, 217, 0.1)", color: "#6d28d9", fontSize: "12px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Activity size={14} /> Live Stream
                </span>
              </div>

              {!latestTap ? (
                /* Waiting State */
                <div
                  style={{
                    padding: "36px 20px",
                    background: "rgba(248, 250, 252, 0.9)",
                    borderRadius: "16px",
                    border: "1.5px dashed #cbd5e1",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>💳</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                    Waiting for passenger card...
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px", maxWidth: "340px", margin: "4px auto 0" }}>
                    Tap any physical MoveSmart RFID card (e.g. <code>53 26 2A 56</code>) on the onboard RC522 reader.
                  </div>
                </div>
              ) : (
                /* Active Tap Telemetry HUD */
                <div
                  style={{
                    background: latestTap.action === "TAP_OUT" ? "#f0fdf4" : "#eff6ff",
                    border: `1.5px solid ${latestTap.action === "TAP_OUT" ? "#86efac" : "#bfdbfe"}`,
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontWeight: "900",
                        fontSize: "12px",
                        background: latestTap.action === "TAP_OUT" ? "#16a34a" : "#2563eb",
                        color: "#fff",
                      }}
                    >
                      {latestTap.action}
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                      Just now
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Passenger</div>
                      <div style={{ fontWeight: "800", color: "#0f172a" }}>
                        {latestTap.passengerName || "Passenger"}
                      </div>
                      {latestTap.passengerEmail && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {latestTap.passengerEmail}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>RFID UID</div>
                      <div style={{ fontFamily: "monospace", fontWeight: "800", color: "#6d28d9" }}>
                        {formatUid(latestTap.card?.rfidTag || latestTap.cardTag || "53262A56")}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Card Category</div>
                      <div style={{ fontWeight: "800", color: "#2563eb" }}>
                        {latestTap.card?.cardType || "Student"} (50% Concession)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Card Status</div>
                      <div style={{ fontWeight: "800", color: "#16a34a" }}>
                        Active ✓
                      </div>
                    </div>

                    {latestTap.journey?.distanceKm && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Distance</div>
                        <div style={{ fontWeight: "800", color: "#0f172a" }}>
                          {Number(latestTap.journey.distanceKm).toFixed(1)} km
                        </div>
                      </div>
                    )}

                    {latestTap.journey?.fare !== undefined && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Fare Deducted</div>
                        <div style={{ fontWeight: "900", color: "#dc2626", fontSize: "15px" }}>
                          ₹ {Number(latestTap.journey.fare).toFixed(2)}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Card Balance</div>
                      <div style={{ fontWeight: "800", color: "#15803d" }}>
                        ₹ {latestTap.card?.balance || "86.88"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Result</div>
                      <div style={{ fontWeight: "900", color: "#16a34a" }}>
                        Accepted ✓
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE RFID RECENT ACTIVITY FEED */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a", margin: "0 0 16px" }}>
                Recent Boardings &amp; Alightings ({tapHistory.length})
              </h3>

              {tapHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px", color: "#64748b", fontSize: "13px", fontWeight: "600", background: "#f8fafc", borderRadius: "12px" }}>
                  No passenger card taps recorded during this session.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {tapHistory.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#0f172a" }}>
                          {t.passengerName || "Passenger"} ({t.action})
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                          {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "Just now"} • {t.journey?.from || t.stop?.name || "Vyttila"}
                          {t.journey?.to ? ` ➔ ${t.journey.to}` : ""}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {t.journey?.fare > 0 && (
                          <div style={{ fontWeight: "900", fontSize: "13.5px", color: "#dc2626" }}>
                            -₹{Number(t.journey.fare).toFixed(2)}
                          </div>
                        )}
                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a" }}>
                          Accepted ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
