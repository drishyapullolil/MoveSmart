/**
 * ============================================================================
 * MoveSmart Driver Portal - DriverLocationSimulator.jsx
 * ============================================================================
 * Dedicated Manual Location & Route Stop Simulator for Drivers:
 * 1. Allows driver to manually change the bus's active stop position along
 *    the transit route without having to physically travel.
 * 2. Instant Distance Matrix & Kilometer Calculator between any two stops.
 * 3. Shows accurate tariff breakdown for Regular, Student (50% Concession),
 *    and Tourist cardholders.
 * 4. Real-time RFID Tap Tester / Simulator to test Tap-In, Tap-Out, kilometer
 *    calculations, and wallet deductions right from the interface.
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  MapPin,
  Navigation,
  Bus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Calculator,
  CreditCard,
  Zap,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowLeftRight
} from "lucide-react";
import { getStoredUser, getStoredToken } from "../utils/session";
import DriverLayout from "../components/driver/DriverLayout";
import StatusBadge from "../components/driver/StatusBadge";

export default function DriverLocationSimulator() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [assignedBus, setAssignedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Stops & Distances Data from MongoDB
  const [stops, setStops] = useState([]);
  const [distances, setDistances] = useState([]);
  const [currentStopCode, setCurrentStopCode] = useState("STOP_VYTTILA");
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Manual Distance & Fare Calculator State
  const [calcFromStop, setCalcFromStop] = useState("STOP_VYTTILA");
  const [calcToStop, setCalcToStop] = useState("STOP_KALOOR");

  // Tap Simulator State
  const [registeredCards, setRegisteredCards] = useState([]);
  const [selectedTag, setSelectedTag] = useState("53262A56");
  const [customTagInput, setCustomTagInput] = useState("");
  const [isSimulatingTap, setIsSimulatingTap] = useState(false);
  const [lastSimulatedResult, setLastSimulatedResult] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // 1. Initial Data Fetch: Driver, Bus, Stops, Distances, and Registered Cards
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
      // Fetch assigned bus
      const busRes = await axios.get("/api/driver/buses", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 4000,
      }).catch(() => null);

      if (busRes?.data?.buses?.length > 0) {
        setAssignedBus(busRes.data.buses[0]);
      }

      // Fetch Stops
      const stopsRes = await axios.get("/api/rfid/stops");
      const fetchedStops = stopsRes.data?.stops || [];
      setStops(fetchedStops);

      // Fetch Distances
      const distRes = await axios.get("/api/rfid/distances");
      setDistances(distRes.data?.distances || []);

      // Fetch Device status to get current active stop
      const devRes = await axios.get(`/api/rfid/device/status?driverId=${encodeURIComponent(currentUser?._id || "")}`);
      if (devRes.data?.device?.stopCode) {
        setCurrentStopCode(devRes.data.device.stopCode);
        setCalcFromStop(devRes.data.device.stopCode);
      }

      // Fetch registered cards for quick tap testing
      const cardsRes = await axios.get("/api/rfid/cards").catch(() => null);
      if (cardsRes?.data?.cards) {
        setRegisteredCards(cardsRes.data.cards);
        if (cardsRes.data.cards.length > 0) {
          setSelectedTag(cardsRes.data.cards[0].rfidTag || cardsRes.data.cards[0].cardNumber);
        }
      }
    } catch (err) {
      console.warn("Initial simulator load notice:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Real-Time Socket Synchronization
  useEffect(() => {
    const socketUrl = window.location.hostname === "localhost" ? "http://localhost:5000" : window.location.origin;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("rfid:location-updated", (data) => {
      if (data?.stopCode) {
        setCurrentStopCode(data.stopCode);
        showToast(`📍 Bus location synced to: ${data.stopName || data.stopCode}`);
      }
    });

    socket.on("rfid:tap-event", (data) => {
      if (data && data.action) {
        setLastSimulatedResult(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Current Stop Object Lookup
  const currentStop = useMemo(() => {
    return stops.find((s) => s.code.toUpperCase() === currentStopCode.toUpperCase()) || {
      name: "Vyttila Mobility Hub",
      code: "STOP_VYTTILA",
    };
  }, [stops, currentStopCode]);

  // 4. Distance Lookup between any two stops
  const getDistanceBetween = useCallback((fromCode, toCode) => {
    if (!fromCode || !toCode || fromCode === toCode) return 0;
    const fromStopObj = stops.find((s) => s.code.toUpperCase() === fromCode.toUpperCase());
    const toStopObj = stops.find((s) => s.code.toUpperCase() === toCode.toUpperCase());
    if (!fromStopObj || !toStopObj) return 4.0;

    const match = distances.find((d) => {
      const dFromId = d.fromStop?._id || d.fromStop;
      const dToId = d.toStop?._id || d.toStop;
      return (
        (dFromId === fromStopObj._id && dToId === toStopObj._id) ||
        (dFromId === toStopObj._id && dToId === fromStopObj._id)
      );
    });

    return match ? Number(match.distanceKm) : 4.0; // fallback standard transit distance
  }, [stops, distances]);

  // 5. Fare Calculation Formula
  const calculateFare = useCallback((distanceKm, category = "Regular") => {
    const BASE_FARE = 3.00;
    const RATE_PER_KM = 0.50;
    const MAX_FARE = 15.00;

    let multiplier = 1.0;
    const catLower = String(category).toLowerCase();
    if (catLower.includes("student") || catLower === "blue") multiplier = 0.5;
    else if (catLower.includes("foreigner") || catLower.includes("tourist") || catLower === "gold") multiplier = 1.5;

    let fare = (BASE_FARE + (distanceKm * RATE_PER_KM)) * multiplier;
    if (fare > (MAX_FARE * multiplier)) fare = MAX_FARE * multiplier;
    return Number(fare.toFixed(2));
  }, []);

  // 6. Handler: Set Bus Current Stop Position
  const handleSetStop = async (newStopCode) => {
    if (updatingLocation) return;
    setUpdatingLocation(true);
    try {
      const res = await axios.post("/api/rfid/device/set-location", {
        driverId: user?._id || user?.id,
        busNumber: assignedBus?.busNumber || user?.busNumber || "",
        stopCode: newStopCode,
      });

      if (res.data?.success) {
        setCurrentStopCode(newStopCode);
        showToast(`✓ Active Stop updated to: ${res.data.stop?.name || newStopCode}`);
      }
    } catch (err) {
      showToast(`❌ Failed to update stop: ${err.response?.data?.message || err.message}`);
    } finally {
      setUpdatingLocation(false);
    }
  };

  // 7. Handler: Step to Next / Previous Stop along Route
  const handleStepStop = (direction = "next") => {
    if (stops.length === 0) return;
    const currentIndex = stops.findIndex((s) => s.code.toUpperCase() === currentStopCode.toUpperCase());
    let nextIndex = 0;

    if (direction === "next") {
      nextIndex = currentIndex >= stops.length - 1 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex <= 0 ? stops.length - 1 : currentIndex - 1;
    }

    const nextStop = stops[nextIndex];
    if (nextStop) {
      handleSetStop(nextStop.code);
    }
  };

  // 8. Handler: Simulate Card Tap at Current Stop
  const handleSimulateTap = async () => {
    const finalTag = (customTagInput.trim() || selectedTag || "53262A56").replace(/\s/g, "");
    if (!finalTag) {
      showToast("Please select or enter an RFID UID tag");
      return;
    }

    setIsSimulatingTap(true);
    try {
      const res = await axios.post("/api/rfid/tap", {
        rfidTag: finalTag,
        stopCode: currentStopCode,
        busNumber: assignedBus?.busNumber || user?.busNumber || "",
      });

      if (res.data) {
        setLastSimulatedResult(res.data);
        if (res.data.action === "TAP_IN") {
          showToast(`⚡ Tap-In Recorded on ${res.data.bus?.busName || "Bus"} at ${res.data.stop?.name || currentStop.name}`);
        } else if (res.data.action === "TAP_OUT") {
          showToast(`✓ Tap-Out Recorded! Distance: ${res.data.journey?.distanceKm} km • Fare: -₹${Number(res.data.fare).toFixed(2)} • Bal: ₹${Number(res.data.balance).toFixed(2)}`);
        }
      }
    } catch (err) {
      showToast(`❌ Tap rejected: ${err.response?.data?.message || err.message}`);
      if (err.response?.data) {
        setLastSimulatedResult(err.response.data);
      }
    } finally {
      setIsSimulatingTap(false);
    }
  };

  const calculatedDist = useMemo(() => {
    return getDistanceBetween(calcFromStop, calcToStop);
  }, [calcFromStop, calcToStop, getDistanceBetween]);

  return (
    <DriverLayout
      activeNav="live-drive"
      user={user}
      assignedBus={assignedBus}
      eyebrow="ROUTE SIMULATOR"
      title="Manual Route Stop & Distance Control"
      description="Manually change your bus's active stop position to test distance calculations, kilometer accuracy, concession tariffs, and RFID card fare deductions without physically traveling."
      pageActions={
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/driver/live-drive" className="btn-drv-primary">
            <span>🚍 Live Drive Cockpit ➔</span>
          </Link>
          <Link to="/driver/rfid-device" className="btn-drv-secondary">
            <span>📡 RFID Reader</span>
          </Link>
        </div>
      }
    >
      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "#182033",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "14px",
            fontSize: "13.5px",
            fontWeight: "800",
            boxShadow: "0 10px 30px rgba(24, 32, 51, 0.3)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <span>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SIMULATOR TWO COLUMN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
          
          {/* LEFT COLUMN: ACTIVE STOP CONTROLLER & ROUTE STEPPER */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* 1. INTERACTIVE STOP SELECTOR */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 18px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                    📍 Set Bus Position / Active Transit Stop
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Click any stop along the corridor to instantly move your bus there for tap calculations.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleStepStop("prev")}
                    disabled={updatingLocation}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepStop("next")}
                    disabled={updatingLocation}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#7c3aed",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                    }}
                  >
                    <span>Next Stop</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* ROUTE PROGRESS STEPPER LIST */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {stops.map((s, idx) => {
                  const isCurrent = s.code.toUpperCase() === currentStopCode.toUpperCase();
                  const distFromFirst = getDistanceBetween(stops[0]?.code, s.code);

                  return (
                    <div
                      key={s.code}
                      onClick={() => handleSetStop(s.code)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "14px",
                        border: isCurrent ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                        background: isCurrent ? "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" : "#ffffff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isCurrent ? "0 4px 14px rgba(124, 58, 237, 0.12)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: isCurrent ? "#7c3aed" : "#f1f5f9",
                            color: isCurrent ? "#ffffff" : "#64748b",
                            fontWeight: "900",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div style={{ fontWeight: "900", fontSize: "14.5px", color: isCurrent ? "#5b21b6" : "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                            {s.name}
                            {isCurrent && (
                              <span style={{ fontSize: "11px", fontWeight: "800", background: "#7c3aed", color: "#ffffff", padding: "2px 8px", borderRadius: "12px" }}>
                                Current Location 🚌
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                            Code: <strong style={{ color: "#475569" }}>{s.code}</strong> • {idx > 0 ? `+${getDistanceBetween(stops[idx - 1]?.code, s.code).toFixed(1)} km from prev stop` : "Origin Depot"}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "800", fontSize: "13px", color: "#475569" }}>
                          {distFromFirst.toFixed(1)} km
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: isCurrent ? "#7c3aed" : "#94a3b8" }}>
                          {isCurrent ? "Active ✓" : "Click to select"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. DISTANCE MATRIX & KILOMETER CALCULATOR */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 18px rgba(0,0,0,0.03)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Calculator size={20} style={{ color: "#2563eb" }} />
                <span>Transit Distance &amp; Tariff Verification Calculator</span>
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Origin Stop (From)
                  </label>
                  <select
                    value={calcFromStop}
                    onChange={(e) => setCalcFromStop(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13.5px",
                      fontWeight: "700",
                      background: "#ffffff",
                    }}
                  >
                    {stops.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Destination Stop (To)
                  </label>
                  <select
                    value={calcToStop}
                    onChange={(e) => setCalcToStop(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13.5px",
                      fontWeight: "700",
                      background: "#ffffff",
                    }}
                  >
                    {stops.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DISTANCE & FARE BREAKDOWN BOX */}
              <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: "16px", padding: "18px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Calculated Transit Distance</div>
                    <div style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>
                      {calculatedDist.toFixed(1)} km
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Formula</div>
                    <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>
                      ₹3.00 + ({calculatedDist.toFixed(1)} × ₹0.50)
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Regular Tariff</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
                      ₹ {calculateFare(calculatedDist, "Regular").toFixed(2)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>100% standard fare</div>
                  </div>

                  <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "10px", border: "1px solid #bfdbfe", textAlign: "center" }}>
                    <div style={{ fontSize: "10.5px", color: "#1e40af", fontWeight: "700", textTransform: "uppercase" }}>Student Pass</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>
                      ₹ {calculateFare(calculatedDist, "Student").toFixed(2)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#1d4ed8", marginTop: "2px" }}>50% Concession</div>
                  </div>

                  <div style={{ background: "#fef3c7", padding: "12px", borderRadius: "10px", border: "1px solid #fde68a", textAlign: "center" }}>
                    <div style={{ fontSize: "10.5px", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>Foreigner / Tourist</div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#b45309", marginTop: "4px" }}>
                      ₹ {calculateFare(calculatedDist, "Foreigner").toFixed(2)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#78350f", marginTop: "2px" }}>1.5x Premium</div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: LIVE RFID TAP TESTER & SIMULATION RESULTS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* TAP SIMULATOR CARD */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "26px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 18px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={20} style={{ color: "#7c3aed" }} />
                  <span>Test Card Tap at Current Stop</span>
                </h2>
                <span style={{ fontSize: "11px", fontWeight: "800", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", color: "#475569" }}>
                  {currentStop.name}
                </span>
              </div>

              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 16px" }}>
                Simulate tapping a card at <strong>{currentStop.name}</strong> to test tap-in and tap-out calculations, distance computation, and wallet deduction.
              </p>

              {/* CARD SELECTION */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Select Registered Card or Commuter
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => {
                    setSelectedTag(e.target.value);
                    setCustomTagInput("");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13.5px",
                    fontWeight: "700",
                    background: "#ffffff",
                    marginBottom: "8px",
                  }}
                >
                  {registeredCards.map((c) => (
                    <option key={c._id} value={c.rfidTag || c.cardNumber}>
                      {c.user?.name || "Passenger"} ({c.cardType || "Regular"}) • UID: {c.rfidTag || c.cardNumber} • Bal: ₹{Number(c.balance).toFixed(2)}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Or enter custom RFID UID (e.g. 53262A56)"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    background: "#f8fafc",
                  }}
                />
              </div>

              {/* SIMULATE TAP ACTION BUTTON */}
              <button
                type="button"
                onClick={handleSimulateTap}
                disabled={isSimulatingTap}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "900",
                  fontSize: "14.5px",
                  cursor: isSimulatingTap ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(22, 163, 74, 0.25)",
                }}
              >
                {isSimulatingTap ? (
                  <>
                    <RefreshCw size={16} className="spin-animation" />
                    <span>Processing Transit Tap...</span>
                  </>
                ) : (
                  <>
                    <Radio size={16} />
                    <span>Tap Card at {currentStop.name}</span>
                  </>
                )}
              </button>
            </div>

            {/* LIVE SIMULATION RESULT VIEW */}
            {lastSimulatedResult ? (
              <div
                style={{
                  background: lastSimulatedResult.action === "TAP_OUT" ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: `1.5px solid ${lastSimulatedResult.action === "TAP_OUT" ? "#86efac" : "#93c5fd"}`,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "900",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: lastSimulatedResult.action === "TAP_OUT" ? "#16a34a" : "#2563eb",
                      color: "#ffffff",
                    }}
                  >
                    {lastSimulatedResult.action}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                    {new Date(lastSimulatedResult.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                  {lastSimulatedResult.message}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Passenger</div>
                    <div style={{ fontWeight: "800", color: "#0f172a" }}>
                      {lastSimulatedResult.passengerName || "Passenger"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {lastSimulatedResult.passengerEmail || ""}
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Card Category</div>
                    <div style={{ fontWeight: "800", color: "#2563eb" }}>
                      {lastSimulatedResult.card?.cardType || "Student"}
                    </div>
                  </div>

                  {lastSimulatedResult.journey?.distanceKm && (
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Distance Traveled</div>
                      <div style={{ fontWeight: "900", color: "#0f172a", fontSize: "14px" }}>
                        {Number(lastSimulatedResult.journey.distanceKm).toFixed(1)} km
                      </div>
                    </div>
                  )}

                  {lastSimulatedResult.fare > 0 && (
                    <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: "10px", color: "#dc2626", fontWeight: "700", textTransform: "uppercase" }}>Fare Deducted</div>
                      <div style={{ fontWeight: "900", color: "#dc2626", fontSize: "15px" }}>
                        -₹ {Number(lastSimulatedResult.fare).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "10px", color: "#15803d", fontWeight: "700", textTransform: "uppercase" }}>Remaining Wallet Balance</div>
                    <div style={{ fontWeight: "900", color: "#15803d", fontSize: "16px" }}>
                      ₹ {Number(lastSimulatedResult.balance || lastSimulatedResult.card?.balance || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "30px", border: "1.5px dashed #cbd5e1", textAlign: "center", color: "#64748b" }}>
                <Radio size={28} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                <div style={{ fontWeight: "800", fontSize: "14px", color: "#475569" }}>No test tap executed yet</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  Select a card above and tap to view the exact distance, fare calculation, and wallet deduction.
                </div>
              </div>
            )}

        </div>
      </div>
    </DriverLayout>
  );
}
