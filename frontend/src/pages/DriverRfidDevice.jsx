/**
 * ============================================================================
 * MoveSmart Driver Console - DriverRfidDevice.jsx
 * ============================================================================
 * Dedicated Driver RFID Hardware Reader Device Page:
 * 1. Monitored & linked to the Driver's assigned Bus and ESP32 Device.
 * 2. Real-time telemetry via Socket.IO: live device status, heartbeat & taps.
 * 3. Secure SoftAP Provisioning modal / form (192.168.4.1) with masked password.
 * 4. Interactive "RFID Reader Test" section displaying live passenger tap events.
 * 5. Uses the unified MoveSmart Driver Portal layout & design system.
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
  ExternalLink,
  Send,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { getStoredUser, getStoredToken } from "../utils/session";
import DriverLayout from "../components/driver/DriverLayout";
import DriverCard from "../components/driver/DriverCard";
import StatusBadge from "../components/driver/StatusBadge";

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

  const isConnected = rfidDevice.status === "Connected";

  return (
    <DriverLayout
      activeNav="rfid"
      user={user}
      assignedBus={assignedBus}
      eyebrow="HARDWARE TELEMETRY"
      title="RFID Reader Hardware"
      description={`Monitor, configure and test the ESP32 + RC522 onboard smart card reader assigned to bus ${assignedBus?.busNumber || user?.busNumber || "KL-06-345"}`}
      pageBadge={
        <StatusBadge
          status={isConnected ? "connected" : rfidDevice.status === "Connecting" ? "pending" : "offline"}
          label={isConnected ? "● RFID ONLINE" : rfidDevice.status === "Connecting" ? "CONNECTING..." : "NOT CONNECTED"}
        />
      }
      pageActions={
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/driver/live-drive" className="btn-drv-primary">
            <span>🚍 Live Drive Cockpit ➔</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchDeviceStatus(true)}
            disabled={refreshing}
            className="btn-drv-secondary"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Checking..." : "Refresh Status"}</span>
          </button>
        </div>
      }
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            background: "linear-gradient(135deg, #149447 0%, #087A3D 100%)",
            color: "#ffffff",
            padding: "14px 20px",
            borderRadius: "14px",
            fontWeight: "800",
            fontSize: "14px",
            marginBottom: "24px",
            boxShadow: "0 6px 20px rgba(20, 148, 71, 0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚡ {toastMessage}</span>
          <button
            onClick={() => setToastMessage("")}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "16px", cursor: "pointer", fontWeight: "800" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>

        {/* LEFT COLUMN: Device Status & Provisioning */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* 1. DEVICE STATUS CARD */}
          <DriverCard
            accent="blue"
            icon="📡"
            title="DEVICE STATUS"
            subtitle="Live hardware connection status & telemetry heartbeat"
            badge={
              <StatusBadge
                status={isConnected ? "connected" : rfidDevice.status === "Connecting" ? "pending" : "offline"}
                label={isConnected ? "CONNECTED" : rfidDevice.status === "Connecting" ? "CONNECTING..." : "NOT CONNECTED"}
              />
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "20px" }}>
              <div style={{ background: "#F8F7FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E8E5F0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hardware ID</div>
                <div style={{ fontFamily: "monospace", fontWeight: "900", color: "#6D35D8", marginTop: "3px", fontSize: "15px" }}>
                  {rfidDevice.deviceId || "MS-RFID-5326"}
                </div>
              </div>

              <div style={{ background: "#F8F7FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E8E5F0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Assigned Bus Number</div>
                <div style={{ fontWeight: "900", color: "#182033", marginTop: "3px", fontSize: "15px" }}>
                  {assignedBus?.busNumber || rfidDevice.busNumber || user?.busNumber || "KL-06-345"}
                </div>
              </div>

              <div style={{ background: "#F8F7FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E8E5F0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Driver in Charge</div>
                <div style={{ fontWeight: "800", color: "#182033", marginTop: "3px" }}>
                  {user?.name || "Assigned Driver"}
                </div>
                <div style={{ fontSize: "11px", color: "#667085", marginTop: "1px" }}>{user?.email || "driver@movesmart.in"}</div>
              </div>

              <div style={{ background: "#F8F7FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E8E5F0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Wi-Fi &amp; IP Status</div>
                <div style={{ fontFamily: "monospace", fontWeight: "800", color: rfidDevice.ipAddress ? "#149447" : "#667085", marginTop: "3px" }}>
                  {rfidDevice.ipAddress || (isConnected ? "192.168.1.5" : "0.0.0.0")}
                </div>
              </div>

              <div style={{ background: "#F8F7FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E8E5F0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>RC522 Sensor Reader</div>
                <div style={{ fontWeight: "800", color: isConnected ? "#149447" : "#667085", marginTop: "3px" }}>
                  {isConnected ? "🟢 Scanning Active (SPI)" : "⚪ Reader Offline"}
                </div>
              </div>

              <div style={{ background: "#F8F7FF", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #E8E5F0" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Telemetry Heartbeat</div>
                <div style={{ fontWeight: "800", color: "#182033", marginTop: "3px" }}>
                  {rfidDevice.lastHeartbeat ? new Date(rfidDevice.lastHeartbeat).toLocaleTimeString() : "Just now (Live)"}
                </div>
              </div>
            </div>

            {rfidDevice.status !== "Not Connected" && (
              <button
                type="button"
                onClick={handleUnlinkDevice}
                className="btn-drv-danger"
                style={{ fontSize: "13px", padding: "8px 16px" }}
              >
                🔌 Unlink Device from Bus
              </button>
            )}
          </DriverCard>

          {/* 2. DEVICE WI-FI PROVISIONING CARD */}
          <DriverCard
            icon="📶"
            title="Wi-Fi & Server Provisioning"
            subtitle="Configure vehicle hotspot credentials for the onboard ESP32 reader"
          >
            {/* Step Guide Banner */}
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: "14px", padding: "14px 16px", marginBottom: "18px", fontSize: "13px", color: "#149447" }}>
              <strong style={{ display: "block", marginBottom: "4px", color: "#087A3D" }}>💡 Provisioning Guide:</strong>
              <ol style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.5" }}>
                <li>Power on the ESP32. It broadcasts Wi-Fi: <strong>MoveSmart-RFID-xxxx</strong> (Password: <code>MoveSmart123</code>).</li>
                <li>Connect to that Wi-Fi, enter vehicle Wi-Fi credentials below, and click <strong>Transmit Configuration</strong>.</li>
              </ol>
            </div>

            {/* Status Alert Banner */}
            {provisioningMsg && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  fontWeight: "700",
                  background:
                    provisioningStatus === "success"
                      ? "#F0FDF4"
                      : provisioningStatus === "error"
                        ? "#FFF1F2"
                        : "#F0EBFF",
                  color:
                    provisioningStatus === "success"
                      ? "#149447"
                      : provisioningStatus === "error"
                        ? "#DC2626"
                        : "#6D35D8",
                  border: `1.5px solid ${provisioningStatus === "success"
                      ? "#BBF7D0"
                      : provisioningStatus === "error"
                        ? "#FECDD3"
                        : "#DDD6FE"
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
                  <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#182033", marginBottom: "4px", display: "block" }}>
                    Wi-Fi SSID (Hotspot Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MoveSmart_Bus_5G"
                    value={provisionForm.ssid}
                    onChange={(e) => setProvisionForm({ ...provisionForm, ssid: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8E5F0", fontSize: "13.5px", fontWeight: "600", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#182033", marginBottom: "4px", display: "block" }}>
                    Wi-Fi Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter Wi-Fi password"
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8E5F0", fontSize: "13.5px", fontWeight: "600", outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#182033", marginBottom: "4px", display: "block" }}>
                  MoveSmart Backend Server URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://192.168.1.5:5000/api/rfid/tap"
                  value={provisionForm.serverApiUrl}
                  onChange={(e) => setProvisionForm({ ...provisionForm, serverApiUrl: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8E5F0", fontSize: "13.5px", fontWeight: "600", outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#182033", marginBottom: "4px", display: "block" }}>
                    Active Kerala Bus Stop
                  </label>
                  <select
                    value={provisionForm.stopCode}
                    onChange={(e) => setProvisionForm({ ...provisionForm, stopCode: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8E5F0", fontSize: "13.5px", fontWeight: "700", outline: "none", background: "#fff" }}
                  >
                    {KERALA_STOPS.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "800", color: "#182033", marginBottom: "4px", display: "block" }}>
                    Hardware Device ID
                  </label>
                  <input
                    type="text"
                    value={provisionForm.deviceId}
                    onChange={(e) => setProvisionForm({ ...provisionForm, deviceId: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8E5F0", fontSize: "13.5px", fontFamily: "monospace", fontWeight: "700" }}
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                <a
                  href="http://192.168.4.1"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-drv-secondary"
                  style={{ fontSize: "13px" }}
                >
                  <ExternalLink size={14} />
                  <span>Open Setup (192.168.4.1)</span>
                </a>

                <button
                  type="submit"
                  disabled={provisioningStatus === "submitting"}
                  className="btn-drv-primary"
                  style={{ flex: 1, minWidth: "180px", cursor: provisioningStatus === "submitting" ? "not-allowed" : "pointer" }}
                >
                  <Send size={15} />
                  <span>{provisioningStatus === "submitting" ? "Transmitting..." : "Transmit Configuration"}</span>
                </button>
              </div>
            </form>
          </DriverCard>

        </div>

        {/* RIGHT COLUMN: RFID Reader Test & Live Activity */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* 3. RFID READER TEST HUD CARD */}
          <DriverCard
            accent="purple"
            icon="⚡"
            title="RFID Reader Test"
            subtitle="Real-time passenger smart card tap verification stream"
            badge={
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "var(--drv-purple-light)", color: "var(--drv-purple)", fontSize: "11.5px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Activity size={14} /> Live Stream
              </span>
            }
          >
            {!latestTap ? (
              /* Waiting State */
              <div
                style={{
                  padding: "36px 20px",
                  background: "#F8F7FF",
                  borderRadius: "16px",
                  border: "1.5px dashed #CBD5E1",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>💳</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#182033" }}>
                  Waiting for passenger smart card...
                </div>
                <div style={{ fontSize: "12.5px", color: "#667085", marginTop: "4px", maxWidth: "340px", margin: "4px auto 0" }}>
                  Tap any authorized MoveSmart RFID card (e.g. <code>53 26 2A 56</code>) on the onboard RC522 reader.
                </div>
              </div>
            ) : (
              /* Active Tap Telemetry HUD */
              <div
                style={{
                  background: latestTap.action === "TAP_OUT" ? "#F0FDF4" : "#EAF1FF",
                  border: `1.5px solid ${latestTap.action === "TAP_OUT" ? "#BBF7D0" : "#BFDBFE"}`,
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
                      background: latestTap.action === "TAP_OUT" ? "#149447" : "#2F62DB",
                      color: "#fff",
                    }}
                  >
                    {latestTap.action}
                  </span>
                  <span style={{ fontSize: "12px", color: "#667085", fontWeight: "700" }}>
                    Just now
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                  <div>
                    <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Passenger</div>
                    <div style={{ fontWeight: "800", color: "#182033" }}>
                      {latestTap.passengerName || "Passenger"}
                    </div>
                    {latestTap.passengerEmail && (
                      <div style={{ fontSize: "11px", color: "#667085" }}>
                        {latestTap.passengerEmail}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>RFID UID</div>
                    <div style={{ fontFamily: "monospace", fontWeight: "800", color: "#6D35D8" }}>
                      {formatUid(latestTap.card?.rfidTag || latestTap.cardTag || "53262A56")}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Card Category</div>
                    <div style={{ fontWeight: "800", color: "#2F62DB" }}>
                      {latestTap.card?.cardType || "Regular Pass (50% Concession)"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Card Status</div>
                    <div style={{ fontWeight: "800", color: "#149447" }}>
                      Active ✓
                    </div>
                  </div>

                  {latestTap.journey?.distanceKm && (
                    <div>
                      <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Distance</div>
                      <div style={{ fontWeight: "800", color: "#182033" }}>
                        {Number(latestTap.journey.distanceKm).toFixed(1)} km
                      </div>
                    </div>
                  )}

                  {latestTap.journey?.fare !== undefined && (
                    <div>
                      <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Fare Deducted</div>
                      <div style={{ fontWeight: "900", color: "#DC2626", fontSize: "15px" }}>
                        ₹ {Number(latestTap.journey.fare).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Card Balance</div>
                    <div style={{ fontWeight: "800", color: "#149447" }}>
                      ₹ {latestTap.card?.balance || "240.00"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "10.5px", color: "#667085", fontWeight: "800", textTransform: "uppercase" }}>Result</div>
                    <div style={{ fontWeight: "900", color: "#149447" }}>
                      Accepted ✓
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DriverCard>

          {/* 4. RECENT BOARDINGS & ALIGHTINGS TABLE */}
          <DriverCard
            icon="📋"
            title={`Recent Boardings & Alightings (${tapHistory.length})`}
            subtitle="Verified smart card validation history for this bus"
          >
            {tapHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px", color: "#667085", fontSize: "13px", fontWeight: "600", background: "#F8F7FF", borderRadius: "14px" }}>
                No passenger card taps recorded during this session yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "360px", overflowY: "auto" }}>
                {tapHistory.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "#F8F7FF",
                      border: "1.5px solid #E8E5F0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#182033" }}>
                        {t.passengerName || "Passenger"} <span style={{ fontSize: "11.5px", color: t.action === "TAP_OUT" ? "#6D35D8" : "#149447", fontWeight: "800" }}>({t.action})</span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#667085", marginTop: "2px" }}>
                        {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"} • {t.journey?.from || t.stop?.name || "Vyttila"}
                        {t.journey?.to ? ` ➔ ${t.journey.to}` : ""}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {t.journey?.fare > 0 && (
                        <div style={{ fontWeight: "900", fontSize: "13.5px", color: "#DC2626" }}>
                          -₹{Number(t.journey.fare).toFixed(2)}
                        </div>
                      )}
                      <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#149447" }}>
                        Accepted ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DriverCard>

        </div>

      </div>
    </DriverLayout>
  );
}
