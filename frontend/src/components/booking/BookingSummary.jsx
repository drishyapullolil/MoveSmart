import React, { useState, useEffect } from "react";
import {
  Ticket,
  User,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Edit3,
  X,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function BookingSummary({
  bus,
  selectedSeats = [],
  searchFrom = "",
  searchTo = "",
  travelDate,
  currentUser,
  onConfirmBooking,
  onSeatToggle,
  isSubmitting = false,
}) {
  const { busName, busNumber, fromLocation, toLocation, departureTime, arrivalTime, price } = bus || {};

  // Extract available stops for station selection
  const getAvailableStops = () => {
    if (Array.isArray(bus?.stops) && bus.stops.length > 0) {
      return bus.stops.map((s) => {
        if (typeof s === "object" && s !== null) return String(s.stopName || s.name || s.station || "").trim();
        return String(s).trim();
      }).filter(Boolean);
    }
    const scheduleTrips = Array.isArray(bus?.schedule) ? bus.schedule : [];
    if (scheduleTrips.length > 0 && Array.isArray(scheduleTrips[0].stations)) {
      const stNames = scheduleTrips[0].stations.map((s) => String(s.station || s.name || s.stationName || "").trim()).filter(Boolean);
      if (stNames.length > 0) return Array.from(new Set(stNames));
    }
    const list = [];
    if (bus?.fromLocation) list.push(String(bus.fromLocation).trim());
    if (bus?.toLocation && !list.includes(String(bus.toLocation).trim())) list.push(String(bus.toLocation).trim());
    return list;
  };

  const availableStops = getAvailableStops();

  const findMatchInStops = (query, defaultVal) => {
    if (!query) return defaultVal;
    const q = String(query).trim().toLowerCase();
    if (q.includes("all") || q.includes("any") || q === "") return defaultVal;
    const found = availableStops.find((st) => st.toLowerCase().includes(q) || q.includes(st.toLowerCase()));
    return found || defaultVal;
  };

  const [pickupStation, setPickupStation] = useState(() => findMatchInStops(searchFrom, fromLocation || "Kochi"));
  const [dropoffStation, setDropoffStation] = useState(() => findMatchInStops(searchTo, toLocation || "Trivandrum"));
  const [isEditingStations, setIsEditingStations] = useState(false);

  useEffect(() => {
    const stops = getAvailableStops();
    const match = (query, defaultVal) => {
      if (!query) return defaultVal;
      const q = String(query).trim().toLowerCase();
      if (q.includes("all") || q.includes("any") || q === "") return defaultVal;
      const found = stops.find((st) => st.toLowerCase().includes(q) || q.includes(st.toLowerCase()));
      return found || defaultVal;
    };
    setPickupStation(match(searchFrom, fromLocation || "Kochi"));
    setDropoffStation(match(searchTo, toLocation || "Trivandrum"));
  }, [bus, searchFrom, searchTo, fromLocation, toLocation]);

  // Primary booker details
  const [passengerName, setPassengerName] = useState(currentUser?.name || "");
  const [passengerEmail, setPassengerEmail] = useState(currentUser?.email || "");
  const [passengerPhone, setPassengerPhone] = useState(() => {
    const raw = (currentUser?.phone || "").replace(/\D/g, "");
    return raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : (raw.length === 10 ? raw : "");
  });

  // Individual Passenger per Seat details
  // Keyed by seat number: { [seat]: { name: string, age: string, gender: string } }
  const [seatPassengers, setSeatPassengers] = useState(() => {
    const initial = {};
    selectedSeats.forEach((seat, idx) => {
      initial[seat] = {
        name: idx === 0 ? (currentUser?.name || "") : "",
        age: "",
        gender: "",
      };
    });
    return initial;
  });

  // Keep seatPassengers in sync when selectedSeats change
  useEffect(() => {
    setSeatPassengers((prev) => {
      const next = { ...prev };
      selectedSeats.forEach((seat, idx) => {
        if (!next[seat]) {
          next[seat] = {
            name: idx === 0 && !prev[seat]?.name ? passengerName : "",
            age: "",
            gender: "",
          };
        }
      });
      // Clean up deselected seats
      Object.keys(next).forEach((key) => {
        if (!selectedSeats.includes(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [selectedSeats]);

  // If primary passenger name changes, sync with seat 0 if appropriate
  const handlePrimaryNameChange = (val) => {
    setPassengerName(val);
    if (selectedSeats.length > 0) {
      const firstSeat = selectedSeats[0];
      setSeatPassengers((prev) => ({
        ...prev,
        [firstSeat]: {
          ...prev[firstSeat],
          name: val,
        },
      }));
    }
  };

  const handleSeatPassengerChange = (seat, field, value) => {
    setSeatPassengers((prev) => ({
      ...prev,
      [seat]: {
        ...prev[seat],
        [field]: value,
      },
    }));
    // If updating first seat name, sync with primary booker name
    if (selectedSeats[0] === seat && field === "name") {
      setPassengerName(value);
    }
  };

  const [formError, setFormError] = useState("");

  const seatCount = selectedSeats.length;
  const effectiveSeatPrice = bus?.searchContext?.segmentPrice || price || 0;
  const rawBaseFare = seatCount * effectiveSeatPrice;
  const gstTax = Math.round(rawBaseFare * 0.05);
  const serviceFee = seatCount > 0 ? 15 : 0;
  const totalPrice = rawBaseFare + gstTax + serviceFee;

  const validateDetails = () => {
    if (seatCount === 0) {
      return "Please select at least one seat from the layout grid to proceed.";
    }
    if (!passengerName.trim() || !passengerEmail.trim()) {
      return "Please enter the primary passenger's full name and email.";
    }
    if (!passengerPhone.trim()) {
      return "Please enter the primary passenger's contact phone number.";
    }
    if (/[a-zA-Z]/.test(passengerPhone.trim())) {
      return "❌ Phone number cannot contain letters. Only numbers (0-9) are allowed.";
    }
    if (/[^\d]/.test(passengerPhone.trim())) {
      return "❌ Phone number cannot contain symbols. Only numbers (0-9) are allowed.";
    }
    if (passengerPhone.trim().length !== 10) {
      return "⚠️ Indian phone number must be exactly 10 digits.";
    }
    if (!/^[6-9]/.test(passengerPhone.trim())) {
      return "❌ Indian mobile numbers must start with 6, 7, 8, or 9.";
    }

    // Multi-seat passenger name validation
    for (let i = 0; i < selectedSeats.length; i++) {
      const seat = selectedSeats[i];
      const p = seatPassengers[seat];
      if (!p || !p.name || !p.name.trim()) {
        return `Please type the passenger name for Seat ${seat}. (Each reserved seat requires a passenger name)`;
      }
    }

    return "";
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    const err = validateDetails();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");

    // Build structured passengers array
    const structuredPassengers = selectedSeats.map((seat, idx) => {
      const p = seatPassengers[seat] || {};
      return {
        seat,
        name: (p.name || (idx === 0 ? passengerName : `Passenger ${idx + 1}`)).trim(),
        age: p.age ? String(p.age).trim() : "",
        gender: p.gender || "",
      };
    });

    onConfirmBooking({
      passengerName: passengerName.trim(),
      passengerEmail: passengerEmail.trim(),
      passengerPhone: passengerPhone.trim(),
      passengers: structuredPassengers,
      fromLocation: pickupStation,
      toLocation: dropoffStation,
      selectedSeats,
      totalPrice,
      paymentMethod: "Direct Booking",
      travelDate,
    });
  };

  return (
    <div className="summary-panel-box" style={{ background: "#ffffff", borderRadius: 20, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div className="summary-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ticket size={20} style={{ color: "var(--accent-purple)" }} />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", display: "block" }}>
              Seat Booking Summary
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Enter passenger details to instantly book your seats
            </span>
          </div>
        </div>
      </div>

      {/* 1. Route & Station Summary Card */}
      <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", padding: 14, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <strong style={{ color: "#0f172a" }}>{busName}</strong>
          <span style={{ fontFamily: "monospace", background: "#ffffff", padding: "2px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 11, fontWeight: 700 }}>
            {busNumber}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Boarding From</span>
            <strong style={{ fontSize: 14, display: "block", color: "var(--primary)" }}>{pickupStation}</strong>
            <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>{departureTime}</span>
          </div>
          <ArrowRight size={18} style={{ color: "var(--accent-purple)" }} />
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Drop-off At</span>
            <strong style={{ fontSize: 14, display: "block", color: "var(--accent-purple)" }}>{dropoffStation}</strong>
            <span style={{ fontSize: 11, color: "var(--accent-purple)", fontWeight: 700 }}>{arrivalTime || "Scheduled"}</span>
          </div>
        </div>

        {/* Change Stations Toggle */}
        {availableStops.length > 1 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Selected Stops: <strong>{pickupStation}</strong> ➔ <strong>{dropoffStation}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsEditingStations(!isEditingStations)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-purple)",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <Edit3 size={12} /> {isEditingStations ? "Hide Station Picker" : "Change Stations"}
            </button>
          </div>
        )}

        {/* Sub-Station Selection Dropdowns */}
        {isEditingStations && (
          <div style={{ marginTop: 10, background: "#ffffff", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Boarding Station:</label>
                <select
                  value={pickupStation}
                  onChange={(e) => setPickupStation(e.target.value)}
                  style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, color: "var(--primary)" }}
                >
                  {availableStops.map((stop, idx) => (
                    <option key={idx} value={stop}>
                      {stop} {stop === fromLocation ? "(Origin)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Drop-off Station:</label>
                <select
                  value={dropoffStation}
                  onChange={(e) => setDropoffStation(e.target.value)}
                  style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, color: "var(--accent-purple)" }}
                >
                  {availableStops.map((stop, idx) => (
                    <option key={idx} value={stop}>
                      {stop} {stop === toLocation ? "(Terminus)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Selected Seats Badges with Quick-Remove 'x' */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Selected Seats ({seatCount})
          </span>
          {seatCount > 1 && (
            <span style={{ fontSize: 11, color: "var(--accent-purple)", fontWeight: 700 }}>
              👥 {seatCount} Passengers Booked
            </span>
          )}
        </div>

        {seatCount > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedSeats.map((seat, idx) => (
              <span
                key={seat}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: idx === 0 ? "rgba(124, 58, 237, 0.1)" : "rgba(34, 197, 94, 0.1)",
                  color: idx === 0 ? "#7c3aed" : "#15803d",
                  border: idx === 0 ? "1px solid rgba(124, 58, 237, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
                  padding: "4px 8px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                <span>Seat {seat}</span>
                {idx === 0 && <span style={{ fontSize: 9, opacity: 0.8 }}>(Primary)</span>}
                {typeof onSeatToggle === "function" && (
                  <button
                    type="button"
                    onClick={() => onSeatToggle(seat)}
                    title={`Remove Seat ${seat}`}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      color: "inherit"
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#e11d48", fontStyle: "italic", margin: 0 }}>
            No seats selected yet. Please click on green seats from the layout grid to select.
          </p>
        )}
      </div>

      {/* 3. Direct Booking Form */}
      <form onSubmit={handleBookingSubmit} className="passenger-form">
        {/* Primary Contact Information */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Primary Contact &amp; Passenger (Seat {selectedSeats[0] || 1})
          </span>

          <div className="input-with-icon" style={{ marginBottom: 8 }}>
            <User className="input-icon" size={16} style={{ color: "#94a3b8" }} />
            <input
              type="text"
              value={passengerName}
              onChange={(e) => handlePrimaryNameChange(e.target.value)}
              placeholder="Full Name (Primary Booker)"
              required
              className="passenger-input"
              style={{ paddingLeft: 40 }}
            />
          </div>

          <div className="input-with-icon" style={{ marginBottom: 8 }}>
            <Mail className="input-icon" size={16} style={{ color: "#94a3b8" }} />
            <input
              type="email"
              value={passengerEmail}
              onChange={(e) => setPassengerEmail(e.target.value)}
              placeholder="Email Address (For E-Ticket PDF dispatch)"
              required
              className="passenger-input"
              style={{ paddingLeft: 40 }}
            />
          </div>

          <div className="input-with-icon">
            <Phone className="input-icon" size={16} style={{ color: "#94a3b8" }} />
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={passengerPhone}
              onChange={(e) => setPassengerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Mobile Number (10 digits for SMS & OTP)"
              required
              className="passenger-input"
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        {/* MULTI-SEAT PASSENGER DETAILS: When booking more than 1 seat, type another person's name */}
        {selectedSeats.length > 1 && (
          <div style={{ background: "#f8fafc", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Users size={16} style={{ color: "var(--accent-purple)" }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                Co-Passenger Names per Seat
              </span>
              <span style={{ fontSize: 10, background: "#ede9fe", color: "#6d28d9", padding: "1px 6px", borderRadius: 8, fontWeight: 800, marginLeft: "auto" }}>
                Required for E-Ticket
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px 0" }}>
              Type the name of each additional passenger for their specific seat number:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedSeats.map((seat, idx) => {
                const p = seatPassengers[seat] || {};
                const isPrimary = idx === 0;

                return (
                  <div
                    key={seat}
                    style={{
                      background: "#ffffff",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: isPrimary ? "var(--accent-purple)" : "#0f172a", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ background: isPrimary ? "#ede9fe" : "#f1f5f9", padding: "2px 8px", borderRadius: 6 }}>
                          Seat {seat}
                        </span>
                        {isPrimary ? "(Primary Passenger)" : `(Co-Passenger ${idx + 1})`}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                      {/* Passenger Name Input */}
                      <div>
                        <input
                          type="text"
                          value={p.name || ""}
                          onChange={(e) => handleSeatPassengerChange(seat, "name", e.target.value)}
                          placeholder={isPrimary ? "Primary passenger name" : `Type person name for Seat ${seat}`}
                          required
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0f172a",
                            outline: "none"
                          }}
                        />
                      </div>

                      {/* Age Input */}
                      <div>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={p.age || ""}
                          onChange={(e) => handleSeatPassengerChange(seat, "age", e.target.value)}
                          placeholder="Age"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0f172a",
                            outline: "none"
                          }}
                        />
                      </div>

                      {/* Gender Dropdown */}
                      <div>
                        <select
                          value={p.gender || ""}
                          onChange={(e) => handleSeatPassengerChange(seat, "gender", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "7px 6px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0f172a",
                            background: "#ffffff",
                            outline: "none"
                          }}
                        >
                          <option value="">Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fare Breakdown */}
        <div className="fare-breakdown-table" style={{ marginTop: 8 }}>
          <div className="fare-row">
            <span>Seat Fare ({seatCount} x ₹{price})</span>
            <span>₹{rawBaseFare}</span>
          </div>
          <div className="fare-row">
            <span>GST (5%)</span>
            <span>₹{gstTax}</span>
          </div>
          <div className="fare-row">
            <span>Service Fee</span>
            <span>₹{serviceFee}</span>
          </div>
          <div className="fare-row total">
            <span>Total Payable</span>
            <span style={{ color: "var(--primary)" }}>₹{totalPrice}</span>
          </div>
        </div>

        {formError && (
          <div style={{ padding: 10, borderRadius: 10, background: "#fff1f2", color: "#e11d48", fontSize: 12, fontWeight: 700, marginTop: 10 }}>
            {formError}
          </div>
        )}

        {/* Direct Booking Submit Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <button
            type="submit"
            disabled={seatCount === 0 || isSubmitting}
            className="confirm-booking-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: seatCount === 0 ? "#cbd5e1" : "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              boxShadow: seatCount === 0 ? "none" : "0 4px 14px rgba(124, 58, 237, 0.35)",
              padding: "14px",
              borderRadius: 14,
              border: "none",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 14,
              cursor: seatCount === 0 || isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {isSubmitting ? (
              "Confirming Booking..."
            ) : seatCount === 0 ? (
              "Select a Seat to Book"
            ) : (
              <>
                <CheckCircle2 size={18} /> Book {seatCount > 1 ? `${seatCount} Seats` : "Seat"} • ₹{totalPrice}
              </>
            )}
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ShieldCheck size={14} style={{ color: "var(--primary)" }} /> MoveSmart Instant E-Ticket Guarantee &amp; PDF Sheet
        </div>
      </form>
    </div>
  );
}
