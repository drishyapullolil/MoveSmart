import React, { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import axios from "axios";
import {
  Bus as BusIcon,
  Navigation,
  Compass,
  MapPin,
  Clock,
  Gauge,
  Wifi,
  WifiOff,
  Radio,
  LocateFixed,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Shield,
  Layers
} from "lucide-react";

// Kerala Default Center Coordinates (Kochi / Central Kerala)
const DEFAULT_CENTER = [9.9658, 76.2801];

// Helper to calculate seconds ago
function getSecondsAgo(timestamp) {
  if (!timestamp) return null;
  const timeMs = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  if (isNaN(timeMs)) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
  return diffSec;
}

// Helper to format seconds ago text
function formatSecondsAgo(sec) {
  if (sec === null || sec === undefined) return "No signal received";
  if (sec < 5) return "Just now (real-time)";
  if (sec < 60) return `${sec}s ago`;
  const mins = Math.floor(sec / 60);
  return `${mins}m ${sec % 60}s ago`;
}

// Custom Leaflet Animated Bus Marker DivIcon
function createBusMarkerIcon(heading = 0, isLive = true, status = "LIVE") {
  const isDelayed = status === "DELAYED";
  const isOffline = status === "OFFLINE" || !isLive;

  const haloColor = isOffline
    ? "rgba(148, 163, 184, 0.4)"
    : isDelayed
    ? "rgba(234, 179, 8, 0.5)"
    : "rgba(16, 185, 129, 0.5)";

  const badgeBg = isOffline
    ? "#64748b"
    : isDelayed
    ? "#eab308"
    : "#059669";

  const html = `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      ${
        isLive && !isOffline
          ? `<div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: ${haloColor};
              animation: pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            "></div>`
          : ""
      }
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
        border: 2px solid ${badgeBg};
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        transform: rotate(${heading || 0}deg);
        transition: transform 0.4s ease-out;
      ">
        <span style="font-size: 19px; line-height: 1; transform: rotate(-${heading || 0}deg); transition: transform 0.4s ease-out;">
          🚌
        </span>
      </div>
      <div style="
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${badgeBg};
        border: 2px solid #ffffff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "movesmart-live-bus-marker",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -26],
  });
}

// Station Pin Icon
function createStationIcon(label, isTerminus = false, type = "station") {
  const bg = isTerminus ? (type === "origin" ? "#059669" : "#dc2626") : "#7c3aed";
  const text = isTerminus ? (type === "origin" ? "🚩" : "🏁") : "●";

  const html = `
    <div style="
      background: ${bg};
      color: #ffffff;
      width: ${isTerminus ? "26px" : "18px"};
      height: ${isTerminus ? "26px" : "18px"};
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${isTerminus ? "12px" : "10px"};
      font-weight: 900;
    ">
      ${text}
    </div>
  `;

  return L.divIcon({
    html,
    className: "movesmart-station-marker",
    iconSize: isTerminus ? [26, 26] : [18, 18],
    iconAnchor: isTerminus ? [13, 13] : [9, 9],
  });
}

/**
 * LiveBusMap Component
 * @param {Object} props
 * @param {string} props.busId - ID of bus to track
 * @param {Object} [props.busData] - Optional bus details
 * @param {Array} [props.routeCoordinates] - Optional polyline coordinates
 * @param {Array} [props.stops] - Optional array of stops
 * @param {string} [props.height="420px"] - Height of map container
 * @param {boolean} [props.showControls=true] - Show overlay HUD and controls
 * @param {function} [props.onClose] - Close modal callback
 */
export default function LiveBusMap({
  busId,
  busData = null,
  busNumber = "",
  busName = "",
  routeSource = "",
  routeDestination = "",
  routeStops = [],
  routeCoordinates = [],
  stops = [],
  height = "460px",
  showControls = true,
  onClose = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const stopsLayerGroupRef = useRef(null);
  const socketRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Real-time Bus Telemetry State
  const [liveLocation, setLiveLocation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [activeBusInfo, setActiveBusInfo] = useState(() => ({
    busNumber: busNumber || busData?.busNumber,
    busName: busName || busData?.busName,
    routeName: (routeSource && routeDestination) ? `${routeSource} ➔ ${routeDestination}` : busData?.routeName,
    ...busData,
  }));

  // Position interpolation state for smooth movement
  const prevCoordsRef = useRef(null);
  const targetCoordsRef = useRef(null);
  const animStartTimeRef = useRef(null);

  // Determine Live Status Category accurately
  // A bus only has live location if driver started the trip (isTracking === true)
  const isTrackingActive = Boolean(liveLocation?.isTracking);
  const isSignalDelayed = isTrackingActive && secondsAgo !== null && secondsAgo > 15;
  const isSignalLost = isTrackingActive && secondsAgo !== null && secondsAgo > 60;
  const isTripNotStarted = !isTrackingActive || !liveLocation?.latitude;

  const liveStatus = isTripNotStarted
    ? "NOT_STARTED"
    : isSignalLost || isSignalDelayed
    ? "FACING_PROBLEM"
    : "LIVE";

  // Fetch initial bus details and latest known location via REST API
  const fetchInitialData = useCallback(async () => {
    if (!busId) return;
    setLoadingInitial(true);
    try {
      const res = await axios.get(`/api/buses/${busId}/live-location`);
      if (res.data?.success) {
        const d = res.data;
        setActiveBusInfo((prev) => ({ ...prev, ...d }));
        if (d.latitude && d.longitude) {
          const locObj = {
            busId: d.busId,
            busNumber: d.busNumber || busNumber,
            routeName: d.routeName || (routeSource && routeDestination ? `${routeSource} ➔ ${routeDestination}` : ""),
            driverName: d.driverName,
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
            speed: d.speed || 0,
            heading: d.heading || 0,
            lastUpdated: d.lastUpdated,
            timestamp: d.timestamp,
            isTracking: Boolean(d.isTracking),
            status: d.status || (d.isTracking ? "LIVE" : "OFFLINE"),
          };
          setLiveLocation(locObj);
          if (d.lastUpdated) {
            setSecondsAgo(getSecondsAgo(d.lastUpdated));
          }

          // Sync marker on map based on isTracking
          if (busMarkerRef.current && mapInstanceRef.current) {
            if (d.isTracking) {
              if (!mapInstanceRef.current.hasLayer(busMarkerRef.current)) {
                busMarkerRef.current.addTo(mapInstanceRef.current);
              }
            } else {
              if (mapInstanceRef.current.hasLayer(busMarkerRef.current)) {
                mapInstanceRef.current.removeLayer(busMarkerRef.current);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch initial live bus location:", err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, [busId, busNumber, routeSource, routeDestination]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Seconds ago timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (liveLocation?.lastUpdated) {
        setSecondsAgo(getSecondsAgo(liveLocation.lastUpdated));
      } else if (liveLocation?.timestamp) {
        setSecondsAgo(getSecondsAgo(liveLocation.timestamp));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [liveLocation]);

  // Smooth position interpolation between GPS updates
  const animateMarkerPosition = useCallback(() => {
    if (!prevCoordsRef.current || !targetCoordsRef.current || !busMarkerRef.current) return;

    const duration = 1200; // ms transition duration
    const now = performance.now();
    const elapsed = now - (animStartTimeRef.current || now);
    const progress = Math.min(1, elapsed / duration);

    // Ease-out cubic curve
    const ease = 1 - Math.pow(1 - progress, 3);

    const curLat = prevCoordsRef.current.lat + (targetCoordsRef.current.lat - prevCoordsRef.current.lat) * ease;
    const curLng = prevCoordsRef.current.lng + (targetCoordsRef.current.lng - prevCoordsRef.current.lng) * ease;

    busMarkerRef.current.setLatLng([curLat, curLng]);

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animateMarkerPosition);
    } else {
      prevCoordsRef.current = targetCoordsRef.current;
    }
  }, []);

  // Update marker position and icon smoothly
  const handleLocationUpdate = useCallback(
    (locData) => {
      if (!locData || locData.latitude === undefined || locData.longitude === undefined) return;

      const newLat = Number(locData.latitude);
      const newLng = Number(locData.longitude);
      if (isNaN(newLat) || isNaN(newLng) || newLat === 0 || newLng === 0) return;

      setLiveLocation((prev) => ({
        ...prev,
        ...locData,
        latitude: newLat,
        longitude: newLng,
        lastUpdated: locData.lastUpdated || Date.now(),
        status: locData.status || "LIVE",
        isTracking: locData.isTracking !== false,
      }));

      setSecondsAgo(0);

      // Interpolate marker coordinates
      if (!prevCoordsRef.current) {
        prevCoordsRef.current = { lat: newLat, lng: newLng };
        targetCoordsRef.current = { lat: newLat, lng: newLng };
        if (busMarkerRef.current) {
          busMarkerRef.current.setLatLng([newLat, newLng]);
        }
      } else {
        targetCoordsRef.current = { lat: newLat, lng: newLng };
        animStartTimeRef.current = performance.now();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(animateMarkerPosition);
      }

      // Update icon (heading & status)
      if (busMarkerRef.current) {
        const icon = createBusMarkerIcon(locData.heading || 0, locData.isTracking !== false, locData.status || "LIVE");
        busMarkerRef.current.setIcon(icon);
      }

      // If map is initialized and this is the first real fix, pan to it
      if (mapInstanceRef.current && !prevCoordsRef.current) {
        mapInstanceRef.current.setView([newLat, newLng], 14, { animate: true });
      }
    },
    [animateMarkerPosition]
  );

  // Initialize Socket.IO connection and join room
  useEffect(() => {
    if (!busId) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : window.location.origin);
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("joinBusTracking", { busId: String(busId) });
      socket.emit("joinBusTracking", String(busId));
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("bus:initialLocation", (data) => {
      if (String(data.busId) === String(busId)) {
        handleLocationUpdate(data);
      }
    });

    socket.on("bus:locationUpdate", (data) => {
      if (String(data.busId) === String(busId)) {
        handleLocationUpdate(data);
      }
    });

    socket.on("bus:trackingStarted", (data) => {
      if (String(data.busId) === String(busId)) {
        handleLocationUpdate({ ...data, isTracking: true, status: "LIVE" });
      }
    });

    socket.on("bus:trackingStopped", (data) => {
      if (String(data.busId) === String(busId)) {
        setLiveLocation((prev) => (prev ? { ...prev, isTracking: false, status: "OFFLINE" } : null));
        if (busMarkerRef.current) {
          busMarkerRef.current.setIcon(createBusMarkerIcon(0, false, "OFFLINE"));
        }
      }
    });

    return () => {
      socket.emit("leaveBusTracking", { busId: String(busId) });
      socket.emit("leaveBusTracking", String(busId));
      socket.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [busId, handleLocationUpdate]);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = liveLocation?.latitude || DEFAULT_CENTER[0];
    const initialLng = liveLocation?.longitude || DEFAULT_CENTER[1];

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
    });

    // Custom OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | MoveSmart',
    }).addTo(map);

    // Zoom controls at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Layer group for stops
    const stopsGroup = L.layerGroup().addTo(map);
    stopsLayerGroupRef.current = stopsGroup;

    // Create Bus Marker (only added to map if trip is actively transmitting)
    const busIcon = createBusMarkerIcon(
      liveLocation?.heading || 0,
      Boolean(liveLocation?.isTracking),
      liveLocation?.status || "OFFLINE"
    );

    const marker = L.marker([initialLat, initialLng], {
      icon: busIcon,
      zIndexOffset: 1000,
    });

    if (liveLocation?.isTracking && liveLocation?.latitude && liveLocation?.longitude) {
      marker.addTo(map);
    }

    busMarkerRef.current = marker;
    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Polyline & Station Markers on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // 1. Draw Route Polyline if coordinates are available
    if (routeCoordinates && routeCoordinates.length > 1) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routeCoordinates);
      } else {
        routePolylineRef.current = L.polyline(routeCoordinates, {
          color: "#7c3aed",
          weight: 4.5,
          opacity: 0.8,
          lineJoin: "round",
          dashArray: "2, 8",
        }).addTo(mapInstanceRef.current);
      }
    }

    // 2. Draw Stop Markers
    if (stopsLayerGroupRef.current && stops && stops.length > 0) {
      stopsLayerGroupRef.current.clearLayers();

      stops.forEach((stop, idx) => {
        const lat = Number(stop.lat || stop.latitude);
        const lng = Number(stop.lng || stop.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
          const isOrigin = idx === 0;
          const isDest = idx === stops.length - 1;
          const isTerminus = isOrigin || isDest;
          const icon = createStationIcon(stop.name || `Stop ${idx + 1}`, isTerminus, isOrigin ? "origin" : "dest");

          const sMarker = L.marker([lat, lng], { icon });
          sMarker.bindTooltip(
            `<strong>${stop.name || stop.stationName || "Station"}</strong>${stop.departureTime ? `<br/>Dep: ${stop.departureTime}` : ""}`,
            { direction: "top", offset: [0, -12] }
          );
          stopsLayerGroupRef.current.addLayer(sMarker);
        }
      });
    }
  }, [routeCoordinates, stops, isMapReady]);

  // Center Map on Bus
  const handleCenterBus = () => {
    if (mapInstanceRef.current && liveLocation?.latitude && liveLocation?.longitude) {
      mapInstanceRef.current.setView([liveLocation.latitude, liveLocation.longitude], 15, { animate: true });
    }
  };

  // Fit Full Route View
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    if (routeCoordinates && routeCoordinates.length > 1) {
      mapInstanceRef.current.fitBounds(L.polyline(routeCoordinates).getBounds(), { padding: [40, 40] });
    } else if (liveLocation?.latitude && liveLocation?.longitude) {
      mapInstanceRef.current.setView([liveLocation.latitude, liveLocation.longitude], 13, { animate: true });
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1.5px solid #ede9fe",
        boxShadow: "0 12px 36px rgba(168, 85, 247, 0.08), 0 4px 12px rgba(0,0,0,0.05)",
        background: "#ffffff",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .movesmart-live-bus-marker {
          transition: transform 0.2s ease-out;
        }
      `}</style>

      {/* TOP FLOATING HEADER HUD */}
      {showControls && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            right: onClose ? "56px" : "14px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            pointerEvents: "none",
          }}
        >
          {/* Status & Bus Pill */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#ffffff",
              padding: "8px 14px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              pointerEvents: "auto",
            }}
          >
            {/* Status indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background:
                    liveStatus === "LIVE"
                      ? "#10b981"
                      : liveStatus === "FACING_PROBLEM"
                      ? "#eab308"
                      : "#94a3b8",
                  boxShadow:
                    liveStatus === "LIVE"
                      ? "0 0 10px #10b981"
                      : liveStatus === "FACING_PROBLEM"
                      ? "0 0 10px #eab308"
                      : "none",
                  animation: liveStatus === "LIVE" ? "pulseRing 1.5s infinite" : "none",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  color:
                    liveStatus === "LIVE"
                      ? "#34d399"
                      : liveStatus === "FACING_PROBLEM"
                      ? "#fde047"
                      : "#cbd5e1",
                }}
              >
                {liveStatus === "LIVE"
                  ? "LIVE TRACKING"
                  : liveStatus === "FACING_PROBLEM"
                  ? "FACING PROBLEM (SIGNAL DELAYED)"
                  : "BUS NOT STARTED"}
              </span>
            </div>

            <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.2)" }} />

            {/* Bus Number & Route */}
            <div style={{ fontSize: "13px", fontWeight: "800", color: "#f8fafc" }}>
              {activeBusInfo?.busNumber || "Bus Fleet"}
            </div>

            {activeBusInfo?.routeName && (
              <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "600" }}>
                ({activeBusInfo.routeName})
              </span>
            )}
          </div>

          {/* Telemetry Chips (Speed, Heading, Last Update) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              pointerEvents: "auto",
              flexWrap: "wrap",
            }}
          >
            {liveLocation && (
              <>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid #ede9fe",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <Gauge size={14} />
                  <span>{liveLocation.speed || 0} km/h</span>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid #ede9fe",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <Clock size={14} />
                  <span>{formatSecondsAgo(secondsAgo)}</span>
                </div>
              </>
            )}

            {/* Socket Connection Status */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid #ede9fe",
                padding: "6px 10px",
                borderRadius: "10px",
                fontSize: "11px",
                fontWeight: "800",
                color: socketConnected ? "#059669" : "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              title={socketConnected ? "Socket.IO Live Connected" : "Connecting to socket..."}
            >
              {socketConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{socketConnected ? "Sync" : "Reconnecting"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 BANNER 1: BUS NOT STARTED BY DRIVER */}
      {!loadingInitial && isTripNotStarted && (
        <div
          style={{
            position: "absolute",
            top: showControls ? "72px" : "14px",
            left: "14px",
            right: "14px",
            zIndex: 1000,
            background: "linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(49, 16, 66, 0.95))",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            color: "#ffffff",
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1.5px solid rgba(196, 181, 253, 0.25)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              🛑
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "15px", fontWeight: "900", color: "#ffffff" }}>
                  Bus is Not Started by Driver
                </span>
                <span style={{ fontSize: "10.5px", fontWeight: "900", background: "rgba(255, 255, 255, 0.2)", color: "#f8fafc", padding: "2px 8px", borderRadius: "6px" }}>
                  NOT STARTED
                </span>
              </div>
              <div style={{ fontSize: "12.5px", color: "#ddd6fe", marginTop: "3px", lineHeight: "1.4" }}>
                The driver has not started this bus yet. Live location tracking will only appear once the driver starts the trip.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.08)", padding: "8px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Clock size={15} style={{ color: "#c4b5fd" }} />
            <div style={{ fontSize: "12px" }}>
              <span style={{ color: "#c4b5fd" }}>Scheduled Departure:</span> <strong>{activeBusInfo?.departureTime || "Scheduled"}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ BANNER 2: FACING PROBLEM - NOT SHOWING LOCATION IN TIME */}
      {!loadingInitial && !isTripNotStarted && (isSignalDelayed || isSignalLost) && (
        <div
          style={{
            position: "absolute",
            top: showControls ? "72px" : "14px",
            left: "14px",
            right: "14px",
            zIndex: 1000,
            background: "linear-gradient(135deg, rgba(120, 53, 15, 0.95), rgba(146, 64, 14, 0.95))",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            color: "#ffffff",
            padding: "16px 20px",
            borderRadius: "18px",
            border: "1.5px solid rgba(251, 191, 36, 0.5)",
            boxShadow: "0 12px 36px rgba(180, 83, 9, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              ⚠️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "15px", fontWeight: "900", color: "#ffffff" }}>
                  Facing Problem: Location Not Received in Time
                </span>
                <span style={{ fontSize: "10.5px", fontWeight: "900", background: "#f59e0b", color: "#78350f", padding: "2px 8px", borderRadius: "6px" }}>
                  FACING PROBLEM ({formatSecondsAgo(secondsAgo)})
                </span>
              </div>
              <div style={{ fontSize: "12.5px", color: "#fef3c7", marginTop: "3px", lineHeight: "1.4" }}>
                Facing network or GPS signal connectivity problem. Real-time updates from this bus are delayed. Showing last reported position.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchInitialData}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#78350f",
              border: "none",
              fontSize: "12px",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <RefreshCw size={14} />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* CLOSE BUTTON (If rendered as modal/card) */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 1001,
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            color: "#475569",
          }}
        >
          <X size={18} />
        </button>
      )}

      {/* MAP VIEW CONTAINER */}
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: height,
          background: "#f1f5f9",
          zIndex: 1,
        }}
      />

      {/* BOTTOM CONTROLS & FLOATING BAR */}
      {showControls && (
        <div
          style={{
            position: "absolute",
            bottom: "14px",
            left: "14px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={handleCenterBus}
            style={{
              background: "#ffffff",
              border: "1.5px solid #d1fae5",
              color: "#059669",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfdf5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            <LocateFixed size={15} />
            <span>Center on Bus</span>
          </button>

          {routeCoordinates && routeCoordinates.length > 1 && (
            <button
              type="button"
              onClick={handleFitRoute}
              style={{
                background: "#ffffff",
                border: "1.5px solid #ede9fe",
                color: "#7c3aed",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <Layers size={15} />
              <span>Full Route</span>
            </button>
          )}
        </div>
      )}

      {/* NOT ACTIVE OVERLAY / PLACEHOLDER (when driver has not started trip yet) */}
      {!loadingInitial && !liveLocation?.isTracking && (
        <div
          style={{
            position: "absolute",
            bottom: "14px",
            right: "14px",
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            padding: "10px 16px",
            borderRadius: "12px",
            color: "#f8fafc",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#94a3b8" }} />
          <span>Vehicle currently at depot • Waiting for driver departure</span>
        </div>
      )}
    </div>
  );
}
