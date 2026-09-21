/**
 * ============================================================================
 * MoveSmart Driver Portal - DriverLiveDrive.jsx
 * ============================================================================
 * Redesigned Driver-First UI/UX:
 * - Extremely clear visual hierarchy for fast, safe bus-cockpit operation.
 * - Prominent "START DRIVE" and massive "MOVE TO NEXT STOP" primary actions.
 * - High-contrast Current Stop & Next Stop display.
 * - Clean visual route progress stepper (Completed ✓, Current ●, Upcoming ○).
 * - Clear Leaflet OpenStreetMap presentation.
 * - Live passenger RFID tap activity card.
 * - Preserves 100% of underlying API calls, Socket.IO events, state & handlers.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Navigation,
  Bus,
  MapPin,
  Play,
  Pause,
  Square,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Compass,
  CreditCard,
  UserCheck,
  ChevronRight,
  Gauge,
  Sliders,
  Check,
  Map,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { getStoredUser, getStoredToken } from "../utils/session";
import Footer from "../components/Footer";

// Custom Leaflet Animated Bus Marker
function createLiveBusIcon(heading = 0, isLive = true) {
  const html = `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.35);
        animation: pulseRing 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%);
        border: 2.5px solid #60a5fa;
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 20px;
        transform: rotate(${heading || 0}deg);
        transition: transform 0.3s ease;
      ">
        🚌
      </div>
      <div style="
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #16a34a;
        border: 2px solid #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      "></div>
    </div>
  `;
  return L.divIcon({
    className: "custom-live-bus-marker",
    html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Custom Leaflet Transit Stop Marker
function createStopMarkerIcon(isCurrent = false, isCompleted = false, index = 1) {
  const bg = isCurrent ? "#2563eb" : isCompleted ? "#16a34a" : "#64748b";
  const border = isCurrent ? "#93c5fd" : isCompleted ? "#86efac" : "#cbd5e1";
  const label = isCompleted ? "✓" : index;

  const html = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${bg};
      border: 2.5px solid ${border};
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
    ">
      ${label}
    </div>
  `;
  return L.divIcon({
    className: "custom-stop-marker",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export default function DriverLiveDrive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [driverBuses, setDriverBuses] = useState([]);
  const [assignedBus, setAssignedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Drive Lifecycle States: NOT STARTED | ACTIVE | PAUSED | COMPLETED
  const [driveStatus, setDriveStatus] = useState("NOT STARTED");
  const [locationMode, setLocationMode] = useState("manual"); // manual | gps
  const [activeTrip, setActiveTrip] = useState(null);

  // Route & Stops Data
  const [stops, setStops] = useState([]);
  const [distances, setDistances] = useState([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [selectedNextStopCode, setSelectedNextStopCode] = useState("");
  const [lastSegmentDistance, setLastSegmentDistance] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);

  // Real-Time Passenger RFID Activity Feed
  const [recentRfidTaps, setRecentRfidTaps] = useState([]);
  const [latestRfidTap, setLatestRfidTap] = useState(null);

  // End Drive Summary Modal & Change Trip Modal
  const [showEndModal, setShowEndModal] = useState(false);
  const [endSummary, setEndSummary] = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [allAvailableBuses, setAllAvailableBuses] = useState([]);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const polylineRef = useRef(null);
  const socketRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // 1. Initial Load: Driver Profile, Assigned Bus from Database, Stops & Distance Data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    const token = getStoredToken();
    const currentUser = getStoredUser();
    if (!currentUser && !token) {
      navigate("/login");
      return;
    }
    if (currentUser) setUser(currentUser);

    try {
      // 1. Fetch strictly the buses assigned to this driver in MongoDB
      const busRes = await axios.get("/api/driver/buses", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 5000,
      }).catch(() => null);

      const fetchedBuses = busRes?.data?.buses || [];
      setDriverBuses(fetchedBuses);

      // Also fetch all available fleet buses from DB
      const allBusesRes = await axios.get("/api/buses").catch(() => null);
      if (allBusesRes?.data?.buses) {
        setAllAvailableBuses(allBusesRes.data.buses);
      }

      let currentBus = null;
      if (fetchedBuses.length > 0) {
        currentBus = fetchedBuses[0];
        setAssignedBus(currentBus);
      } else {
        setAssignedBus(null);
      }

      // 2. Fetch stops & active drive specifically for this assigned bus and driver
      const busIdParam = currentBus?._id ? `&busId=${currentBus._id}` : "";
      const driveRes = await axios.get(`/api/driver/live-drive/status?driverId=${encodeURIComponent(currentUser?._id || "")}${busIdParam}`).catch(() => null);

      if (driveRes?.data?.stops && driveRes.data.stops.length > 0) {
        setStops(driveRes.data.stops);
      } else {
        const stopsRes = await axios.get("/api/rfid/stops").catch(() => null);
        setStops(stopsRes?.data?.stops || []);
      }

      const distRes = await axios.get("/api/rfid/distances").catch(() => null);
      setDistances(distRes?.data?.distances || []);

      // 3. Set active drive state if present
      if (driveRes?.data?.hasActiveDrive && driveRes.data.drive) {
        const d = driveRes.data.drive;
        setActiveTrip(d);
        setDriveStatus(d.status || "ACTIVE");
        setLocationMode(d.mode || "manual");
        setCurrentStopIndex(d.currentStopIndex || 0);
        setTotalDistanceKm(d.totalDistanceKm || 0);
      } else {
        setCurrentStopIndex(0);
      }

      // 4. Fetch recent RFID tap activity
      const tapsRes = await axios.get("/api/rfid/taps/recent?limit=15").catch(() => null);
      if (tapsRes?.data?.taps) {
        setRecentRfidTaps(tapsRes.data.taps);
        if (tapsRes.data.taps.length > 0) setLatestRfidTap(tapsRes.data.taps[0]);
      }
    } catch (err) {
      console.warn("Live Drive initial data notice:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSelectTrip = (bus) => {
    setAssignedBus(bus);
    setCurrentStopIndex(0);
    setDriveStatus("NOT STARTED");
    setShowTripModal(false);
    showToast(`✓ Switched Trip to: ${bus.busName} (${bus.busNumber}) - ${bus.routeName || `${bus.fromLocation} ➔ ${bus.toLocation}`}`);
  };

  const handleReverseDirection = () => {
    if (stops.length < 2) return;
    const reversed = [...stops].reverse();
    setStops(reversed);
    setCurrentStopIndex(0);
    if (assignedBus) {
      const from = stops[stops.length - 1]?.name || assignedBus.toLocation;
      const to = stops[0]?.name || assignedBus.fromLocation;
      setAssignedBus((prev) => ({
        ...prev,
        fromLocation: from,
        toLocation: to,
        routeName: `${from} ➔ ${to}`
      }));
    }
    setShowTripModal(false);
    showToast(`✓ Route reversed: ${stops[stops.length - 1]?.name} ➔ ${stops[0]?.name}`);
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch bus-specific route stops whenever assignedBus changes
  useEffect(() => {
    if (!assignedBus?._id) return;
    const fetchBusRouteStops = async () => {
      try {
        const driveRes = await axios.get(`/api/driver/live-drive/status?busId=${assignedBus._id}`).catch(() => null);
        if (driveRes?.data?.stops && driveRes.data.stops.length > 0) {
          setStops(driveRes.data.stops);
          if (driveRes.data.hasActiveDrive && driveRes.data.drive) {
            setCurrentStopIndex(driveRes.data.drive.currentStopIndex || 0);
          } else {
            setCurrentStopIndex(0);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch route stops for assigned bus:", err.message);
      }
    };
    fetchBusRouteStops();
  }, [assignedBus]);

  // Current Stop and Next Stop computations
  const currentStop = useMemo(() => {
    if (stops.length === 0) {
      return {
        name: assignedBus?.fromLocation || "Origin Terminal",
        code: "STOP_ORIGIN",
        latitude: 9.5574,
        longitude: 76.7904,
      };
    }
    return stops[currentStopIndex] || stops[0];
  }, [stops, currentStopIndex, assignedBus]);

  const nextStop = useMemo(() => {
    if (stops.length === 0) return null;
    if (currentStopIndex < stops.length - 1) {
      return stops[currentStopIndex + 1];
    }
    return null;
  }, [stops, currentStopIndex]);

  useEffect(() => {
    if (nextStop) {
      setSelectedNextStopCode(nextStop.code);
    }
  }, [nextStop]);

  // 2. Setup Real-Time Socket.IO Synchronization
  useEffect(() => {
    const socketUrl = window.location.hostname === "localhost" ? "http://localhost:5000" : window.location.origin;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const currentUser = getStoredUser();
      if (currentUser?._id) {
        socket.emit("join-driver-room", { driverId: currentUser._id });
      }
      if (assignedBus?._id) {
        socket.emit("join-bus-room", { busId: assignedBus._id });
      }
    });

    // Real-time passenger RFID tap stream
    socket.on("rfid:tap-event", (tapData) => {
      if (tapData && tapData.status === "Accepted") {
        setLatestRfidTap(tapData);
        setRecentRfidTaps((prev) => [tapData, ...prev.slice(0, 19)]);
        if (tapData.action === "TAP_IN") {
          showToast(`⚡ Tap-In: ${tapData.passengerName || "Passenger"} at ${tapData.stop?.name || "Stop"}`);
        } else if (tapData.action === "TAP_OUT") {
          showToast(`✓ Tap-Out: ${tapData.passengerName || "Passenger"} (Fare: ₹${Number(tapData.fare).toFixed(2)})`);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [assignedBus]);

  // 3. Initialize & Manage Leaflet OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultLat = currentStop.latitude || 9.5574;
      const defaultLng = currentStop.longitude || 76.7904;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing stop markers
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    // Add Stop Markers along Route
    const stopLatLngs = [];
    stops.forEach((s, idx) => {
      const lat = s.latitude || (9.5574 + idx * 0.035);
      const lng = s.longitude || (76.7904 + idx * 0.015);
      stopLatLngs.push([lat, lng]);

      const isCur = idx === currentStopIndex;
      const isComp = idx < currentStopIndex;
      const markerIcon = createStopMarkerIcon(isCur, isComp, idx + 1);

      const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 13px; color: #0f172a;">${s.name}</strong>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Code: ${s.code}</div>
          <div style="font-size: 11px; font-weight: bold; color: ${isCur ? "#2563eb" : isComp ? "#16a34a" : "#475569"}; margin-top: 4px;">
            ${isCur ? "● Current Bus Position" : isComp ? "✓ Completed Stop" : "○ Upcoming Stop"}
          </div>
        </div>
      `);

      stopMarkersRef.current.push(marker);
    });

    // Draw Polyline connecting stops
    if (stopLatLngs.length > 1) {
      if (polylineRef.current) polylineRef.current.remove();
      polylineRef.current = L.polyline(stopLatLngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.8,
        dashArray: "6, 8",
      }).addTo(map);
    }

    // Update Bus Marker Position
    const curLat = currentStop.latitude || (9.5574 + currentStopIndex * 0.035);
    const curLng = currentStop.longitude || (76.7904 + currentStopIndex * 0.015);

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([curLat, curLng], {
        icon: createLiveBusIcon(45, driveStatus === "ACTIVE"),
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      busMarkerRef.current.setLatLng([curLat, curLng]);
      busMarkerRef.current.setIcon(createLiveBusIcon(45, driveStatus === "ACTIVE"));
    }

    // Pan smoothly to current stop
    map.panTo([curLat, curLng], { animate: true, duration: 0.8 });

  }, [stops, currentStopIndex, currentStop, driveStatus]);

  // 4. HANDLER: Start Drive
  const handleStartDrive = async () => {
    if (!assignedBus) {
      showToast("❌ No bus assigned to your account in database. Please contact admin.");
      return;
    }
    try {
      const res = await axios.post("/api/driver/live-drive/start", {
        driverId: user?._id || user?.id,
        busId: assignedBus._id,
        busNumber: assignedBus.busNumber,
      });

      if (res.data?.success) {
        setDriveStatus("ACTIVE");
        setActiveTrip(res.data.drive);
        setCurrentStopIndex(0);
        setTotalDistanceKm(0);
        showToast(`🚀 Live Drive Started for ${assignedBus.busName} (${assignedBus.busNumber})!`);
      }
    } catch (err) {
      showToast(`❌ Failed to start drive: ${err.response?.data?.message || err.message}`);
    }
  };

  // 5. HANDLER: Move Bus to Next Stop (Manual Simulation)
  const handleMoveToNextStop = async (targetCode = null) => {
    const destCode = targetCode || selectedNextStopCode || (nextStop ? nextStop.code : null);
    if (!destCode) {
      showToast("Destination stop is not selected");
      return;
    }

    try {
      const res = await axios.post("/api/driver/live-drive/location", {
        driverId: user?._id || user?.id,
        busId: assignedBus?._id,
        busNumber: assignedBus?.busNumber,
        stopCode: destCode,
        mode: locationMode,
      });

      if (res.data?.success) {
        const updatedDrive = res.data.drive;
        setActiveTrip(updatedDrive);
        setCurrentStopIndex(updatedDrive.currentStopIndex || 0);
        setLastSegmentDistance(res.data.segmentDistance || 0);
        setTotalDistanceKm(res.data.totalDistanceKm || 0);

        showToast(`📍 Bus reached ${res.data.drive?.currentStop?.name || destCode} (+${res.data.segmentDistance} km)`);
      }
    } catch (err) {
      showToast(`❌ Failed to update bus position: ${err.response?.data?.message || err.message}`);
    }
  };

  // 6. HANDLER: Move Bus to Previous Stop
  const handleMoveToPrevStop = () => {
    if (currentStopIndex > 0) {
      const prevStopObj = stops[currentStopIndex - 1];
      if (prevStopObj) {
        handleMoveToNextStop(prevStopObj.code);
      }
    }
  };

  // 7. HANDLER: Pause / Resume Drive
  const handleTogglePauseDrive = async () => {
    try {
      const res = await axios.post("/api/driver/live-drive/pause", {
        driverId: user?._id || user?.id,
        busId: assignedBus?._id,
      });

      if (res.data?.success) {
        setDriveStatus(res.data.status);
        showToast(`Drive is now ${res.data.status}`);
      }
    } catch (err) {
      showToast(`Failed to update drive state: ${err.message}`);
    }
  };

  // 8. HANDLER: End Drive & Show Report
  const handleEndDrive = async () => {
    if (!window.confirm("Are you sure you want to end this live bus drive? A final route summary will be generated.")) {
      return;
    }

    try {
      const res = await axios.post("/api/driver/live-drive/end", {
        driverId: user?._id || user?.id,
        busId: assignedBus?._id,
      });

      if (res.data?.success) {
        setDriveStatus("COMPLETED");
        setEndSummary(res.data.summary);
        setShowEndModal(true);
        showToast("✓ Live Drive Completed Successfully!");
      }
    } catch (err) {
      showToast(`Failed to end drive: ${err.message}`);
    }
  };

  const isDriveActive = driveStatus === "ACTIVE";
  const isDrivePaused = driveStatus === "PAUSED";
  const isDriveRunning = isDriveActive || isDrivePaused;
  const isFinalStop = stops.length > 0 && currentStopIndex >= stops.length - 1;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f1f5f9", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes liveGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          animation: liveGlow 1.5s infinite;
        }
        .touch-action-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "#0f172a",
            color: "#ffffff",
            padding: "16px 24px",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: "800",
            boxShadow: "0 14px 34px rgba(0,0,0,0.3)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "90vw",
          }}
        >
          <span style={{ fontSize: "18px" }}>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP DRIVER BAR */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", color: "#ffffff", padding: "18px 20px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          
          {/* DRIVER & BUS TITLE */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", flexShrink: 0 }}>
              <Bus size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "-0.3px", color: "#ffffff" }}>
                  MoveSmart Driver
                </span>
                
                {/* STATUS BADGE */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11.5px",
                    fontWeight: "900",
                    background: isDriveActive ? "#16a34a" : isDrivePaused ? "#d97706" : "#475569",
                    color: "#ffffff",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  <span className="live-dot" style={{ background: isDriveActive ? "#86efac" : isDrivePaused ? "#fde68a" : "#cbd5e1" }}></span>
                  {driveStatus}
                </span>

                {/* MODE BADGE */}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    background: locationMode === "manual" ? "#312e81" : "#064e3b",
                    color: locationMode === "manual" ? "#c7d2fe" : "#a7f3d0",
                    border: `1px solid ${locationMode === "manual" ? "#4338ca" : "#047857"}`,
                  }}
                >
                  {locationMode === "manual" ? "DEMO MODE (Manual)" : "LIVE GPS"}
                </span>
              </div>

              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span>Bus: <strong style={{ color: "#38bdf8" }}>{assignedBus ? `${assignedBus.busName} (${assignedBus.busNumber})` : "None"}</strong></span>
                <span>•</span>
                <span>Route: <strong style={{ color: "#facc15" }}>{assignedBus?.routeName || (assignedBus ? `${assignedBus.fromLocation} ➔ ${assignedBus.toLocation}` : "No Route")}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowTripModal(true)}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    border: "none",
                    color: "#ffffff",
                    padding: "3px 10px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    marginLeft: "4px",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
                  }}
                >
                  <span>🔄</span>
                  <span>Change Trip</span>
                </button>
              </div>
            </div>
          </div>

          {/* TOP DRIVER NAVIGATION BUTTONS */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to="/driver"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "13px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <ArrowLeft size={16} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/driver/rfid-device"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.08)",
                color: "#93c5fd",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "13px",
                border: "1px solid rgba(147,197,253,0.3)",
              }}
            >
              <Radio size={16} />
              <span>RFID Hardware</span>
            </Link>

            <Link
              to="/driver/notifications"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.08)",
                color: "#fde68a",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "13px",
                border: "1px solid rgba(253,230,138,0.3)",
              }}
            >
              <Clock size={16} />
              <span>Alerts</span>
            </Link>
          </div>

        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 16px 40px", width: "100%", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* WARNING IF NO BUS IS ASSIGNED IN DATABASE */}
        {!assignedBus && !loading && (
          <div style={{ background: "#ffffff", borderRadius: "18px", padding: "24px", border: "2px solid #fecdd3", boxShadow: "0 4px 20px rgba(225,29,72,0.08)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f43f5e", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#9f1239" }}>No Assigned Bus Selected</div>
              <div style={{ fontSize: "13px", color: "#881337", marginTop: "2px" }}>
                Please choose a registered bus to start your live drive.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTripModal(true)}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "10px",
                fontWeight: "800",
                fontSize: "13.5px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Select Bus &amp; Trip
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 1. PRE-START DRIVE CARD (Shown when Drive is NOT Started)           */}
        {/* ==================================================================== */}
        {!isDriveRunning && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "36px 24px", border: "1.5px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textAlign: "center" }}>
            
            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 24px rgba(22, 163, 74, 0.35)" }}>
                <Navigation size={36} />
              </div>

              <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", margin: "0 0 8px" }}>
                Ready to Start Live Bus Drive
              </h1>
              
              <p style={{ color: "#64748b", fontSize: "14.5px", margin: "0 0 24px" }}>
                Initiate active passenger tracking, broadcast your live bus position, and activate automated RFID tap fare computation.
              </p>

              {/* ROUTE SUMMARY BOX */}
              {assignedBus && (
                <div style={{ background: "#f8fafc", borderRadius: "18px", border: "1.5px solid #e2e8f0", padding: "20px", marginBottom: "28px", textAlign: "left" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "16px" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Your Bus</div>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>
                        {assignedBus.busName} ({assignedBus.busNumber})
                      </div>
                    </div>

                    <div style={{ width: "1px", height: "36px", background: "#cbd5e1" }}></div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Assigned Route</div>
                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#2563eb", marginTop: "2px" }}>
                        {assignedBus.routeName || `${assignedBus.fromLocation} ➔ ${assignedBus.toLocation}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Starting Stop: </span>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{stops[0]?.name || assignedBus.fromLocation}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Destination: </span>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{stops[stops.length - 1]?.name || assignedBus.toLocation}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Total Stops: </span>
                      <strong style={{ fontSize: "13px", color: "#16a34a" }}>{stops.length} Stops</strong>
                    </div>
                  </div>

                  {/* QUICK TRIP ACTIONS */}
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setShowTripModal(true)}
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1.5px solid #bfdbfe",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>🔄</span>
                      <span>Change Trip / Bus</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReverseDirection}
                      style={{
                        background: "#f8fafc",
                        color: "#334155",
                        border: "1.5px solid #cbd5e1",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>⇄</span>
                      <span>Reverse Direction (Return Trip)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PRIMARY HUGE START DRIVE BUTTON */}
              <button
                type="button"
                onClick={handleStartDrive}
                disabled={!assignedBus}
                className="touch-action-btn"
                style={{
                  width: "100%",
                  maxWidth: "420px",
                  background: assignedBus ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : "#cbd5e1",
                  color: "#ffffff",
                  border: "none",
                  padding: "20px 32px",
                  borderRadius: "18px",
                  fontWeight: "900",
                  fontSize: "20px",
                  letterSpacing: "0.5px",
                  cursor: assignedBus ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px",
                  boxShadow: assignedBus ? "0 10px 28px rgba(22, 163, 74, 0.4)" : "none",
                  transition: "transform 0.15s ease",
                }}
              >
                <Play size={24} />
                <span>START DRIVE</span>
              </button>

            </div>

          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. ACTIVE DRIVE COCKPIT (Shown when Drive is Running / Paused)      */}
        {/* ==================================================================== */}
        {isDriveRunning && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* HERO COCKPIT CARD: PROGRESS BAR ➔ CURRENT LOCATION ➔ NEXT STOP ➔ PRIMARY ACTION */}
            <div style={{ background: "#ffffff", borderRadius: "24px", padding: "24px", border: "2px solid #2563eb", boxShadow: "0 10px 30px rgba(37, 99, 235, 0.08)" }}>
              
              {/* ROUTE PROGRESS BAR */}
              <div style={{ marginBottom: "20px", background: "#f8fafc", padding: "12px 16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12.5px", fontWeight: "800" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1e40af" }}>
                    <span>🚍 Journey Progress:</span>
                    <strong style={{ color: "#2563eb", fontSize: "14px" }}>
                      {stops.length > 1 ? Math.round((currentStopIndex / (stops.length - 1)) * 100) : 0}%
                    </strong>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    Stop <strong>{currentStopIndex + 1}</strong> of <strong>{stops.length}</strong> ({Math.max(0, stops.length - 1 - currentStopIndex)} remaining)
                  </div>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      width: `${stops.length > 1 ? Math.min(100, Math.round((currentStopIndex / (stops.length - 1)) * 100)) : 0}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, #2563eb, #16a34a)", 
                      borderRadius: "999px",
                      transition: "width 0.4s ease"
                    }} 
                  />
                </div>
              </div>

              {/* TWO LARGE COCKPIT PANELS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                
                {/* 1. CURRENT STOP */}
                <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", borderRadius: "18px", padding: "20px", border: "1.5px solid #86efac" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "900", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      📍 CURRENT LOCATION
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "800", background: "#16a34a", color: "#ffffff", padding: "2px 8px", borderRadius: "12px" }}>
                      STOP {currentStopIndex + 1} OF {stops.length}
                    </span>
                  </div>

                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", lineHeight: 1.2 }}>
                    {currentStop.name}
                  </div>

                  <div style={{ fontSize: "12.5px", color: "#15803d", fontWeight: "700", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="live-dot"></span>
                    <span>Live RFID Boarding Stop Active</span>
                  </div>
                </div>

                {/* 2. NEXT STOP */}
                <div style={{ background: nextStop ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" : "#f8fafc", borderRadius: "18px", padding: "20px", border: nextStop ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "900", color: nextStop ? "#1e40af" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      ➡ NEXT UPCOMING STOP
                    </span>
                    {nextStop && (
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "12px" }}>
                        STOP {currentStopIndex + 2}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "24px", fontWeight: "900", color: nextStop ? "#1e3a8a" : "#64748b", lineHeight: 1.2 }}>
                    {nextStop ? nextStop.name : "End of Transit Route"}
                  </div>

                  <div style={{ fontSize: "12.5px", color: nextStop ? "#3b82f6" : "#64748b", fontWeight: "700", marginTop: "6px" }}>
                    {nextStop ? `Code: ${nextStop.code}` : "Destination Terminal Reached"}
                  </div>
                </div>

              </div>

              {/* MASSIVE PRIMARY ACTION BUTTON */}
              <div>
                {!isFinalStop && nextStop ? (
                  <button
                    type="button"
                    onClick={() => handleMoveToNextStop()}
                    className="touch-action-btn"
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      border: "none",
                      padding: "20px 24px",
                      borderRadius: "18px",
                      fontWeight: "900",
                      fontSize: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)",
                    }}
                  >
                    <span>MOVE TO NEXT STOP ({nextStop.name.toUpperCase()})</span>
                    <ArrowRight size={26} />
                  </button>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "2px solid #86efac",
                      padding: "18px 24px",
                      borderRadius: "18px",
                      fontWeight: "900",
                      fontSize: "17px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <CheckCircle2 size={22} style={{ color: "#16a34a" }} />
                    <span>ARRIVED AT FINAL DESTINATION TERMINAL</span>
                  </div>
                )}
              </div>

              {/* DEMO / GPS MODE QUICK TOGGLE */}
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>Location Source:</span>
                  <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setLocationMode("manual")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: locationMode === "manual" ? "#7c3aed" : "transparent",
                        color: locationMode === "manual" ? "#ffffff" : "#64748b",
                        fontWeight: "800",
                        fontSize: "11.5px",
                        cursor: "pointer",
                      }}
                    >
                      Manual Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode("gps")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: locationMode === "gps" ? "#16a34a" : "transparent",
                        color: locationMode === "gps" ? "#ffffff" : "#64748b",
                        fontWeight: "800",
                        fontSize: "11.5px",
                        cursor: "pointer",
                      }}
                    >
                      Real GPS
                    </button>
                  </div>
                </div>

                {/* MANUAL STOP SELECTOR (SECONDARY) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Jump To Stop:</span>
                  <select
                    value={selectedNextStopCode}
                    onChange={(e) => {
                      setSelectedNextStopCode(e.target.value);
                      handleMoveToNextStop(e.target.value);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {stops.map((s, idx) => (
                      <option key={s.code} value={s.code}>
                        {idx + 1}. {s.name} {idx < currentStopIndex ? "✓" : idx === currentStopIndex ? "●" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* 2-COLUMN MAIN CONTENT: LEFT (MAP + STEPPER), RIGHT (RFID + TELEMETRY + CONTROLS) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
              
              {/* LEFT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* INTERACTIVE LEAFLET MAP */}
                <div style={{ background: "#ffffff", borderRadius: "20px", overflow: "hidden", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Map size={18} style={{ color: "#2563eb" }} />
                      <span style={{ fontWeight: "900", fontSize: "14px", color: "#0f172a" }}>
                        Live Bus Map
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "6px" }}>
                      ● Live Tracking
                    </span>
                  </div>

                  {/* MAP CANVAS */}
                  <div ref={mapContainerRef} style={{ width: "100%", height: "360px", background: "#e2e8f0" }} />

                  {/* BOTTOM MAP STATUS BAR */}
                  <div style={{ padding: "10px 16px", background: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
                    <div>
                      Stop: <strong style={{ color: "#0f172a" }}>{currentStop.name}</strong>
                    </div>
                    <div>
                      GPS: <span style={{ fontFamily: "monospace" }}>{(currentStop.latitude || 9.5574).toFixed(4)}, {(currentStop.longitude || 76.7904).toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* ROUTE PROGRESS STEPPER */}
                <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                        Route Progress
                      </h3>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {currentStopIndex + 1} of {stops.length} stops ({stops.length - 1 - currentStopIndex} remaining)
                      </div>
                    </div>

                    <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#2563eb", background: "#eff6ff", padding: "3px 10px", borderRadius: "8px" }}>
                      {totalDistanceKm.toFixed(1)} km total
                    </span>
                  </div>

                  {/* STEPPER ITEMS */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stops.map((s, idx) => {
                      const isCur = idx === currentStopIndex;
                      const isComp = idx < currentStopIndex;
                      const isUpcom = idx > currentStopIndex;

                      return (
                        <div
                          key={s.code}
                          onClick={() => handleMoveToNextStop(s.code)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
                            border: isCur ? "2px solid #2563eb" : isComp ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                            background: isCur ? "#eff6ff" : isComp ? "#f0fdf4" : "#ffffff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: isCur ? "#2563eb" : isComp ? "#16a34a" : "#e2e8f0",
                                color: isCur || isComp ? "#ffffff" : "#64748b",
                                fontWeight: "900",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {isComp ? "✓" : idx + 1}
                            </div>

                            <div>
                              <div style={{ fontWeight: isCur ? "900" : "700", fontSize: "13.5px", color: isCur ? "#1e40af" : isComp ? "#15803d" : "#334155" }}>
                                {s.name}
                              </div>
                            </div>
                          </div>

                          <div>
                            {isCur && (
                              <span style={{ fontSize: "10.5px", fontWeight: "900", background: "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "10px" }}>
                                ● Current
                              </span>
                            )}
                            {isComp && (
                              <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a" }}>
                                ✓ Done
                              </span>
                            )}
                            {isUpcom && (
                              <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8" }}>
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* TRIP INFORMATION CARD */}
                <div style={{ background: "#0f172a", borderRadius: "20px", padding: "20px", color: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Trip Information
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
                    <div style={{ background: "rgba(255,255,255,0.06)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Distance Covered</div>
                      <div style={{ fontSize: "20px", fontWeight: "900", color: "#4ade80", marginTop: "2px" }}>
                        {totalDistanceKm.toFixed(1)} km
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.06)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Last Segment</div>
                      <div style={{ fontSize: "20px", fontWeight: "900", color: "#38bdf8", marginTop: "2px" }}>
                        {lastSegmentDistance.toFixed(1)} km
                      </div>
                    </div>
                  </div>
                </div>

                {/* RFID PASSENGER TAP ACTIVITY */}
                <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Zap size={18} style={{ color: "#16a34a" }} />
                      <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                        RFID Activity
                      </span>
                    </div>

                    <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b" }}>
                      {recentRfidTaps.length} taps
                    </span>
                  </div>

                  {/* LATEST TAP HIGHLIGHT */}
                  {latestRfidTap ? (
                    <div style={{ background: latestRfidTap.action === "TAP_IN" ? "#f0fdf4" : "#eff6ff", borderRadius: "14px", padding: "14px", border: `1.5px solid ${latestRfidTap.action === "TAP_IN" ? "#86efac" : "#93c5fd"}`, marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "900", background: latestRfidTap.action === "TAP_IN" ? "#16a34a" : "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "8px" }}>
                          {latestRfidTap.action === "TAP_IN" ? "🟢 TAP-IN" : "🔵 TAP-OUT"}
                        </span>
                        <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b" }}>
                          Just now
                        </span>
                      </div>

                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                        Passenger: {latestRfidTap.passengerName || "Passenger"}
                      </div>

                      <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px" }}>
                        Stop: <strong>{latestRfidTap.journey?.to || latestRfidTap.journey?.from || latestRfidTap.stop?.name || currentStop.name}</strong>
                      </div>

                      {latestRfidTap.fare > 0 && (
                        <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#dc2626", marginTop: "4px" }}>
                          Fare Deducted: ₹{Number(latestRfidTap.fare).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "18px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#64748b", fontSize: "13px", marginBottom: "12px" }}>
                      Waiting for passenger RFID card taps...
                    </div>
                  )}

                  {/* RECENT TAPS LIST */}
                  {recentRfidTaps.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                      {recentRfidTaps.slice(0, 5).map((t) => (
                        <div
                          key={t.id || `${t.timestamp}-${Math.random()}`}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <strong style={{ color: "#0f172a" }}>{t.passengerName || "Passenger"}</strong>
                            <span style={{ color: "#64748b", marginLeft: "6px" }}>({t.action})</span>
                          </div>

                          <div>
                            {t.journey?.fare > 0 && (
                              <strong style={{ color: "#dc2626", marginRight: "6px" }}>₹{Number(t.journey.fare).toFixed(2)}</strong>
                            )}
                            <span style={{ color: "#16a34a", fontWeight: "700" }}>✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECONDARY DRIVER ACTIONS CARD */}
                <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginBottom: "12px" }}>
                    Secondary Actions
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <button
                      type="button"
                      onClick={handleMoveToPrevStop}
                      disabled={currentStopIndex <= 0}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        color: "#334155",
                        cursor: currentStopIndex > 0 ? "pointer" : "not-allowed",
                        opacity: currentStopIndex > 0 ? 1 : 0.5,
                      }}
                    >
                      ← Previous Stop
                    </button>

                    <button
                      type="button"
                      onClick={handleTogglePauseDrive}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        background: isDriveActive ? "#fffbeb" : "#f0fdf4",
                        color: isDriveActive ? "#b45309" : "#15803d",
                        border: `1px solid ${isDriveActive ? "#fde68a" : "#bbf7d0"}`,
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      {isDriveActive ? "⏸ Pause Drive" : "▶ Resume Drive"}
                    </button>
                  </div>

                  {/* END DRIVE BUTTON (DISTINCT HIGH CONTRAST) */}
                  <button
                    type="button"
                    onClick={handleEndDrive}
                    className="touch-action-btn"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      background: "#fff1f2",
                      color: "#dc2626",
                      border: "2px solid #fecaca",
                      fontWeight: "900",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Square size={16} />
                    <span>END LIVE DRIVE SESSION</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* END DRIVE COMPLETION SUMMARY MODAL */}
      {showEndModal && endSummary && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: "0 0 6px" }}>
              Drive Completed!
            </h2>
            <p style={{ color: "#64748b", fontSize: "13.5px", margin: "0 0 20px" }}>
              The live transit journey has successfully concluded.
            </p>

            <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "left", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Origin</div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{endSummary.startStop}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Destination</div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{endSummary.destination}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Stops Visited</div>
                <div style={{ fontWeight: "900", color: "#2563eb", fontSize: "16px" }}>{endSummary.stopsCompleted} stops</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Distance</div>
                <div style={{ fontWeight: "900", color: "#16a34a", fontSize: "16px" }}>{endSummary.totalDistanceKm} km</div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Passenger RFID Taps</div>
                <div style={{ fontWeight: "900", color: "#7c3aed", fontSize: "16px" }}>{endSummary.rfidTapsCount} recorded</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  setDriveStatus("NOT STARTED");
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                New Drive
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  navigate("/driver");
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE TRIP / SELECT BUS MODAL */}
      {showTripModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* MODAL HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                  🔄
                </div>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                    Change Bus &amp; Trip
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b", fontWeight: "600" }}>
                    Select your active transit schedule or reverse journey direction.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTripModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  color: "#64748b",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* REVERSE DIRECTION QUICK ACTION */}
            {stops.length > 1 && (
              <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", padding: "16px", borderRadius: "16px", border: "1.5px solid #93c5fd", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  🔄 Return Journey
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a8a", marginTop: "2px" }}>
                  Reverse Route Direction: <strong>{stops[stops.length - 1]?.name}</strong> ➔ <strong>{stops[0]?.name}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleReverseDirection}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span>⇄</span>
                  <span>Switch to Return Trip ({stops[stops.length - 1]?.name} ➔ {stops[0]?.name})</span>
                </button>
              </div>
            )}

            {/* ASSIGNED BUSES & TRIPS LIST */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                Available Buses &amp; Routes ({driverBuses.length > 0 ? driverBuses.length : allAvailableBuses.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(driverBuses.length > 0 ? driverBuses : allAvailableBuses).map((bus) => {
                  const isSelected = assignedBus?._id === bus._id || assignedBus?.busNumber === bus.busNumber;
                  const routeTitle = bus.routeName || `${bus.fromLocation || "Kanjirappally"} ➔ ${bus.toLocation || "Erattupetta"}`;

                  return (
                    <div
                      key={bus._id || bus.busNumber}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "14px",
                        border: isSelected ? "2px solid #16a34a" : "1.5px solid #e2e8f0",
                        background: isSelected ? "#f0fdf4" : "#ffffff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                            {bus.busName} ({bus.busNumber})
                          </strong>
                          {isSelected && (
                            <span style={{ fontSize: "10.5px", fontWeight: "900", background: "#16a34a", color: "#ffffff", padding: "2px 8px", borderRadius: "10px" }}>
                              Active Trip
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#2563eb", marginTop: "3px" }}>
                          {routeTitle}
                        </div>

                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                          Departure: <strong>{bus.departureTime || "08:00 AM"}</strong> • Capacity: <strong>{bus.totalSeats || 45} seats</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectTrip(bus)}
                        disabled={isSelected}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "10px",
                          background: isSelected ? "#e2e8f0" : "#16a34a",
                          color: isSelected ? "#64748b" : "#ffffff",
                          border: "none",
                          fontWeight: "800",
                          fontSize: "12.5px",
                          cursor: isSelected ? "default" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isSelected ? "Selected ✓" : "Select Trip ➔"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowTripModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
