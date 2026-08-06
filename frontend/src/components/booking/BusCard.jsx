import React, { useState } from "react";
import {
  Bus,
  Clock,
  Star,
  ChevronRight,
  ChevronDown,
  Check,
  MapPin,
  Sparkles,
  ShieldCheck,
  UserCheck,
  X,
  Info,
  Navigation,
  ArrowRight
} from "lucide-react";

export default function BusCard({ bus, searchFrom = "", searchTo = "", isSelected, onToggleSeats }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedStationIndex, setSelectedStationIndex] = useState(null);

  const {
    _id,
    busName = bus?.busName,
    busNumber = bus?.busNumber,
    busType = bus?.busType,
    operator = bus?.operator,
    fromLocation = bus?.fromLocation,
    toLocation = bus?.toLocation,
    departureTime = bus?.departureTime,
    arrivalTime = bus?.arrivalTime,
    duration = bus?.duration,
    availableSeats = bus?.availableSeats,
    totalSeats = bus?.totalSeats,
    price = bus?.price,
    rating = bus?.rating,
    amenities = bus?.amenities || [],
    driverName = bus?.driverName,
    driverPhone = bus?.driverPhone,
    driverLicense = bus?.driverLicense,
    driverPhoto = bus?.driverPhoto,
    driverVerified = bus?.driverVerified,
    driverExperience = bus?.driverExperience,
  } = bus || {};

  const isLowSeat = availableSeats > 0 && availableSeats <= 8;

  // Extract complete station timings list from bus.schedule or bus.stops
  const getStationTimings = () => {
    const list = [];
    const scheduleTrips = Array.isArray(bus?.schedule) ? bus.schedule : [];
    
    let rawStations = [];
    if (scheduleTrips.length > 0 && Array.isArray(scheduleTrips[0].stations)) {
      rawStations = scheduleTrips[0].stations;
    }

    if (rawStations.length > 0) {
      rawStations.forEach((st, idx) => {
        const name = String(st.station || st.name || st.stationName || `Stop ${idx + 1}`).trim();
        const arr = st.arrivalTime || st.time || st.arrival || (idx === 0 ? departureTime : arrivalTime);
        const dep = st.departureTime || st.time || st.departure || (idx === rawStations.length - 1 ? arrivalTime : arr);
        list.push({
          id: idx,
          name,
          arrivalTime: arr,
          departureTime: dep,
          isStart: idx === 0,
          isEnd: idx === rawStations.length - 1,
          halt: idx === 0 ? "Origin Terminal" : idx === rawStations.length - 1 ? "Final Terminus" : "5 mins halt",
          platform: `Platform ${(idx % 4) + 1}`,
          type: idx === 0 ? "Starting Location" : idx === rawStations.length - 1 ? "Ending Location" : "Intermediate Station",
          facilities: ["Waiting Room", "Ticket Counter", "IoT Tracking"],
        });
      });
      return list;
    }

    // Fallback: build list from bus.stops or fromLocation/toLocation
    const stopsList = Array.isArray(bus?.stops) && bus.stops.length > 0
      ? bus.stops
      : [fromLocation, toLocation].filter(Boolean);

    stopsList.forEach((stopName, idx) => {
      const name = String(stopName).trim();
      const isStart = idx === 0;
      const isEnd = idx === stopsList.length - 1;
      
      let arr = arrivalTime;
      let dep = departureTime;
      if (isStart) {
        arr = "--";
        dep = departureTime;
      } else if (isEnd) {
        arr = arrivalTime;
        dep = "--";
      } else {
        arr = "En Route";
        dep = "En Route";
      }

      list.push({
        id: idx,
        name,
        arrivalTime: arr,
        departureTime: dep,
        isStart,
        isEnd,
        halt: isStart ? "Origin Terminal" : isEnd ? "Final Terminus" : "5 mins halt",
        platform: `Platform ${(idx % 4) + 1}`,
        type: isStart ? "Starting Location" : isEnd ? "Ending Location" : "Intermediate Station",
        facilities: ["Waiting Room", "Ticket Counter", "IoT Tracking"],
      });
    });

    return list;
  };

  const stationList = getStationTimings();
  const startStation = stationList.length > 0 ? stationList[0] : { name: fromLocation, departureTime };
  const endStation = stationList.length > 0 ? stationList[stationList.length - 1] : { name: toLocation, arrivalTime };

  const findStationByQuery = (query, defaultStation) => {
    if (!query) return defaultStation;
    const q = String(query).trim().toLowerCase();
    if (q.includes("all") || q.includes("any") || q === "") return defaultStation;
    const found = stationList.find((st) => st.name.toLowerCase().includes(q) || q.includes(st.name.toLowerCase()));
    return found || defaultStation;
  };

  const displayStartStation = findStationByQuery(searchFrom, startStation);
  const displayEndStation = findStationByQuery(searchTo, endStation);

  const isSubStationSegment =
    (searchFrom && !searchFrom.toLowerCase().includes("all") && displayStartStation.name !== startStation.name) ||
    (searchTo && !searchTo.toLowerCase().includes("all") && displayEndStation.name !== endStation.name);

  const handleStationClick = (idx) => {
    if (selectedStationIndex === idx) {
      setSelectedStationIndex(null);
    } else {
      setSelectedStationIndex(idx);
      setShowDetails(true);
    }
  };

  return (
    <div className={`bus-card-box ${isSelected ? "selected-bus" : ""}`}>
      <div className="bus-card-header-row">
        {/* Bus Title & Operator */}
        <div className="bus-info-group">
          <div className="bus-type-icon">
            <Bus size={28} />
          </div>

          <div className="bus-title-meta">
            <h3>
              {busName}
              <span className="bus-type-tag">{busType}</span>
            </h3>

            <div className="bus-meta-sub">
              <span>{operator}</span>
              <span>•</span>
              <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                {busNumber}
              </span>
              <span>•</span>
              <span style={{ color: "#d97706", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 2 }}>
                <Star size={14} style={{ fill: "#f59e0b" }} />
                {rating}
              </span>
            </div>

            {isSubStationSegment && (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <span>📍 Sub-Station Stop: <strong>{displayStartStation.name} ➔ {displayEndStation.name}</strong></span>
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Route: {startStation.name} ➔ {endStation.name})</span>
              </div>
            )}
          </div>
        </div>

        {/* Route Timing Block - Shows Display Station (Sub-station or Terminal) */}
        <div className="bus-route-timing">
          <div
            className="timing-block"
            onClick={() => handleStationClick(displayStartStation.id ?? 0)}
            style={{ cursor: "pointer" }}
            title={`Click to view ${displayStartStation.name} station details`}
          >
            <span className="time">{displayStartStation.departureTime || displayStartStation.arrivalTime || departureTime}</span>
            <span className="location" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              🟢 {displayStartStation.name || fromLocation}
            </span>
          </div>

          <div className="duration-connector">
            <span className="duration-pill">{duration || "4h 30m"}</span>
            <div className="route-line"></div>
            <span
              onClick={() => setShowDetails(!showDetails)}
              style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              {stationList.length} Stations ({showDetails ? "Hide" : "Show All"})
            </span>
          </div>

          <div
            className="timing-block"
            onClick={() => handleStationClick(displayEndStation.id ?? (stationList.length - 1))}
            style={{ cursor: "pointer" }}
            title={`Click to view ${displayEndStation.name} station details`}
          >
            <span className="time">{displayEndStation.arrivalTime || displayEndStation.departureTime || arrivalTime}</span>
            <span className="location" style={{ color: "var(--accent-purple)", display: "flex", alignItems: "center", gap: 4 }}>
              🔴 {displayEndStation.name || toLocation}
            </span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="bus-price-action">
          <div className="price-display">
            <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>Starting at</span>
            <span className="price-num">₹{price}</span>
          </div>

          <button
            type="button"
            onClick={() => onToggleSeats(_id)}
            className={`view-seats-btn ${isSelected ? "seats-active" : ""}`}
          >
            <span>{isSelected ? "Hide Seats" : "Select Seats"}</span>
            <ChevronRight size={16} style={{ transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
          </button>
        </div>
      </div>

      {/* Driver Badge Row */}
      <div
        onClick={() => setShowDriverModal(true)}
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderRadius: 12,
          padding: "10px 14px",
          marginTop: 12,
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          border: "1px solid #cbd5e1",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
        title="Click to view complete driver credentials, photo & admin verification"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#16a34a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justify: "center",
              fontWeight: 900,
              fontSize: 16,
              overflow: "hidden",
              border: driverVerified ? "2px solid #22c55e" : "2px solid #f59e0b",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              flexShrink: 0,
            }}
          >
            {driverPhoto ? (
              <img src={driverPhoto} alt={driverName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              driverName ? driverName[0] : "D"
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>Assigned Driver: <strong>{driverName}</strong></span>
              {driverVerified ? (
                <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 10, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 3, border: "1px solid #86efac" }}>
                  <ShieldCheck size={12} /> Admin Verified ✅
                </span>
              ) : (
                <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 10, fontWeight: 900, border: "1px solid #fcd34d" }}>
                  Verification Pending ⏳
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              License: <strong style={{ fontFamily: "monospace", color: "#475569" }}>{driverLicense}</strong> · {driverExperience || 8} yrs exp
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDriverModal(true);
          }}
          style={{
            background: "#ffffff",
            border: "1px solid #94a3b8",
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 800,
            color: "#0f172a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <UserCheck size={14} style={{ color: "#16a34a" }} />
          <span>View Driver &amp; License</span>
        </button>
      </div>

      {/* Footer Meta */}
      <div className="bus-card-footer-row">
        <div className="amenities-list">
          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Amenities:</span>
          {amenities.map((item, idx) => (
            <span key={idx} className="amenity-chip">
              <Check size={12} style={{ color: "var(--primary)", display: "inline", marginRight: 2 }} />
              {item}
            </span>
          ))}

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{ background: "none", border: "none", color: "var(--accent-purple)", fontWeight: 700, cursor: "pointer", marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Clock size={14} />
            {showDetails ? "Hide Station Times" : `View All Station Times (${stationList.length} Stops)`}
          </button>
        </div>

        <div className="seats-left-pill" style={isLowSeat ? { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" } : {}}>
          {availableSeats === 0 ? "Sold Out" : `${availableSeats} Seats Available`}
        </div>
      </div>

      {/* Expandable Route & All Station Timings */}
      {showDetails && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-color)", background: "#faf5ff", padding: 16, borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: "#6b21a8", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Navigation size={18} style={{ color: "#9333ea" }} />
              Full Route Station Timings ({stationList.length} Stations)
            </div>
            <span style={{ fontSize: 11, color: "#7e22ce", background: "#f3e8ff", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
              💡 Click any station to view full stop details
            </span>
          </div>

          {/* Interactive Station Pills Horizontal/Timeline */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 14 }}>
            {stationList.map((st, idx) => {
              const isSelectedStation = selectedStationIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStationClick(idx)}
                  style={{
                    background: isSelectedStation ? "#7e22ce" : st.isStart ? "#dcfce7" : st.isEnd ? "#fae8ff" : "#ffffff",
                    color: isSelectedStation ? "#ffffff" : st.isStart ? "#15803d" : st.isEnd ? "#86198f" : "#334155",
                    border: isSelectedStation ? "2px solid #6b21a8" : "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "8px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 120,
                    flexShrink: 0,
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.8, textTransform: "uppercase" }}>
                    {st.isStart ? "🟢 Starting" : st.isEnd ? "🔴 Terminus" : `Stop #${idx + 1}`}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>{st.name}</div>
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: "monospace", fontWeight: 700 }}>
                    🕒 {st.departureTime || st.arrivalTime}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Station Full Stop Details (or Start & End Summary if none selected) */}
          {selectedStationIndex !== null && stationList[selectedStationIndex] ? (
            <div style={{ background: "#ffffff", padding: 16, borderRadius: 14, border: "2px solid #9333ea", boxShadow: "0 4px 12px rgba(147, 51, 234, 0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, background: "#f3e8ff", color: "#6b21a8", padding: "2px 8px", borderRadius: 8, textTransform: "uppercase" }}>
                    {stationList[selectedStationIndex].type} · Stop #{selectedStationIndex + 1} of {stationList.length}
                  </span>
                  <h4 style={{ fontSize: 18, fontWeight: 900, color: "#1e1b4b", margin: "4px 0 0" }}>
                    📍 {stationList[selectedStationIndex].name} Station
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStationIndex(null)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer" }}
                >
                  Close Details ✕
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Arrival Time:</span>
                  <strong style={{ fontSize: 14, color: "#166534" }}>{stationList[selectedStationIndex].arrivalTime}</strong>
                </div>

                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Departure Time:</span>
                  <strong style={{ fontSize: 14, color: "#1d4ed8" }}>{stationList[selectedStationIndex].departureTime}</strong>
                </div>

                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Halt Duration:</span>
                  <strong style={{ fontSize: 14, color: "#6b21a8" }}>{stationList[selectedStationIndex].halt}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: "1px border-dashed #e2e8f0", fontSize: 12, color: "#475569" }}>
                <span>🚉 <strong>{stationList[selectedStationIndex].platform}</strong></span>
                <span>📶 Live RFID Tap Sensor Active</span>
                <span>🎫 Electronic Ticket Allowed</span>
              </div>
            </div>
          ) : (
            <div style={{ background: "#ffffff", padding: 14, borderRadius: 12, border: "1px solid #e9d5ff", fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#f0fdf4", padding: 10, borderRadius: 10, border: "1px solid #bbf7d0" }}>
                  <strong style={{ color: "#15803d", display: "block" }}>🟢 Starting Station: {startStation.name}</strong>
                  <p style={{ margin: "4px 0 0", color: "#166534", fontSize: 12 }}>
                    Departure: <strong>{startStation.departureTime || departureTime}</strong> • Main Bus Bay
                  </p>
                </div>

                <div style={{ background: "#faf5ff", padding: 10, borderRadius: 10, border: "1px solid #e9d5ff" }}>
                  <strong style={{ color: "#7e22ce", display: "block" }}>🔴 Ending Station: {endStation.name}</strong>
                  <p style={{ margin: "4px 0 0", color: "#6b21a8", fontSize: 12 }}>
                    Arrival: <strong>{endStation.arrivalTime || arrivalTime}</strong> • Terminus Station
                  </p>
                </div>
              </div>
              <p style={{ color: "#64748b", fontSize: 11, margin: "8px 0 0", textAlign: "center" }}>
                👉 Select any station pill above to view its complete arrival, departure, and halt details.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Driver Credentials Verification Modal */}
      {showDriverModal && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setShowDriverModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 28,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDriverModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X size={18} color="#64748b" />
            </button>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px", background: "linear-gradient(135deg, #38a169, #8b5cf6)", padding: 3 }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {driverPhoto ? (
                    <img src={driverPhoto} alt={driverName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#38a169" }}>{driverName[0]}</span>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>{driverName}</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 10px" }}>MoveSmart Assigned Bus Driver</p>

              {driverVerified ? (
                <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "8px 14px", borderRadius: 20, fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} /> Admin Verified Driver ✅
                </div>
              ) : (
                <div style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", padding: "8px 14px", borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                  ⏳ Pending Admin Verification
                </div>
              )}
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0", fontSize: 13, display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Driving License No:</span>
                <strong style={{ fontFamily: "monospace", color: "#6d28d9" }}>{driverLicense}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Driving Experience:</span>
                <strong>{driverExperience} Years</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Contact Phone:</span>
                <strong>{driverPhone}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Bus Assigned:</span>
                <strong style={{ color: "#2563eb" }}>{busNumber} ({busName})</strong>
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 12, fontSize: 12, color: "#166534", lineHeight: "1.5" }}>
              🛡️ MoveSmart Safety Guarantee: This driver's government driving license and identity background have been verified &amp; accepted by MoveSmart Admin Control before route departure.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
