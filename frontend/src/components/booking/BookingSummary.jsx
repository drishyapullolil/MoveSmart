import React, { useState, useEffect } from "react";
import {
  Ticket,
  User,
  Mail,
  Phone,
  Tag,
  CreditCard,
  Zap,
  ArrowRight,
  ShieldCheck,
  MapPin
} from "lucide-react";

export default function BookingSummary({
  bus,
  selectedSeats = [],
  searchFrom = "",
  searchTo = "",
  travelDate,
  currentUser,
  onConfirmBooking,
  isSubmitting = false,
}) {
  const { busName, busNumber, fromLocation, toLocation, departureTime, arrivalTime, price } = bus || {};

  // Extract available stops for sub-station selection dropdowns
  const getAvailableStops = () => {
    if (Array.isArray(bus?.stops) && bus.stops.length > 0) {
      return bus.stops.map((s) => String(s).trim());
    }
    const scheduleTrips = Array.isArray(bus?.schedule) ? bus.schedule : [];
    if (scheduleTrips.length > 0 && Array.isArray(scheduleTrips[0].stations)) {
      const stNames = scheduleTrips[0].stations.map((s) => String(s.station || s.name || s.stationName).trim()).filter(Boolean);
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

  const [passengerName, setPassengerName] = useState(currentUser?.name || "");
  const [passengerEmail, setPassengerEmail] = useState(currentUser?.email || "");
  const [passengerPhone, setPassengerPhone] = useState(currentUser?.phone || "+91 98765 43210");
  const [paymentMethod, setPaymentMethod] = useState("rfid");
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [formError, setFormError] = useState("");

  const seatCount = selectedSeats.length;
  const rawBaseFare = seatCount * (price || 0);
  const discountAmount = Math.round((rawBaseFare * discountPercent) / 100);
  const baseFare = Math.max(0, rawBaseFare - discountAmount);
  const gstTax = Math.round(baseFare * 0.05);
  const serviceFee = seatCount > 0 ? 15 : 0;
  const totalPrice = baseFare + gstTax + serviceFee;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.trim().toUpperCase() === "MOVESMART10" || couponCode.trim().toUpperCase() === "SMARTBUS") {
      setDiscountPercent(10);
      setCouponMsg("10% MoveSmart Discount Applied! 🎉");
    } else if (couponCode.trim()) {
      setCouponMsg("Invalid promo code. Try 'MOVESMART10'");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!passengerName.trim() || !passengerEmail.trim()) {
      setFormError("Please enter passenger name and email.");
      return;
    }
    if (seatCount === 0) {
      setFormError("Please select at least one seat to proceed.");
      return;
    }
    setFormError("");
    onConfirmBooking({
      passengerName: passengerName.trim(),
      passengerEmail: passengerEmail.trim(),
      passengerPhone: passengerPhone.trim(),
      fromLocation: pickupStation,
      toLocation: dropoffStation,
      selectedSeats,
      totalPrice,
      paymentMethod,
      travelDate,
    });
  };

  return (
    <div className="summary-panel-box">
      <div className="summary-header">
        <Ticket size={22} style={{ color: "var(--accent-purple)" }} />
        <span>Booking Summary</span>
      </div>

      {/* Route & Bus Card Header */}
      <div style={{ background: "var(--bg-primary)", padding: 14, borderRadius: 16, border: "1px solid var(--border-color)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <strong style={{ color: "var(--text-main)" }}>{busName}</strong>
          <span style={{ fontFamily: "monospace", background: "#ffffff", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border-color)", fontSize: 11, fontWeight: 700 }}>
            {busNumber}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Boarding From</span>
            <strong style={{ fontSize: 15, display: "block", color: "var(--primary)" }}>{pickupStation}</strong>
            <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>{departureTime}</span>
          </div>
          <ArrowRight size={18} style={{ color: "var(--accent-purple)" }} />
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Drop-off At</span>
            <strong style={{ fontSize: 15, display: "block", color: "var(--accent-purple)" }}>{dropoffStation}</strong>
            <span style={{ fontSize: 11, color: "var(--accent-purple)", fontWeight: 700 }}>{arrivalTime}</span>
          </div>
        </div>

        {fromLocation !== pickupStation || toLocation !== dropoffStation ? (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed var(--border-color)", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
            Route: <strong style={{ color: "var(--text-main)" }}>{fromLocation} ➔ {toLocation}</strong>
          </div>
        ) : null}
      </div>

      {/* Sub-Station Selection Form Controls */}
      {availableStops.length > 1 && (
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--accent-purple)", textTransform: "uppercase", marginBottom: 8 }}>
            <MapPin size={14} />
            <span>Select Boarding & Drop-off Stations</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Boarding Station:</label>
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
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Drop-off Station:</label>
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

      {/* Selected Seats Badges */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Selected Seats ({seatCount})
        </span>
        {seatCount > 0 ? (
          <div className="selected-seats-badges">
            {selectedSeats.map((seat) => (
              <span key={seat} className="seat-badge-chip">
                Seat {seat}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#e11d48", fontStyle: "italic", margin: 0 }}>
            No seats selected yet. Please click on green seats from layout grid.
          </p>
        )}
      </div>

      {/* Passenger Details Form */}
      <form onSubmit={handleSubmit} className="passenger-form">
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Passenger Contact Details
        </span>

        <div className="input-with-icon">
          <User className="input-icon" size={16} style={{ color: "#94a3b8" }} />
          <input
            type="text"
            value={passengerName}
            onChange={(e) => setPassengerName(e.target.value)}
            placeholder="Full Name"
            required
            className="passenger-input"
            style={{ paddingLeft: 40 }}
          />
        </div>

        <div className="input-with-icon">
          <Mail className="input-icon" size={16} style={{ color: "#94a3b8" }} />
          <input
            type="email"
            value={passengerEmail}
            onChange={(e) => setPassengerEmail(e.target.value)}
            placeholder="Email Address"
            required
            className="passenger-input"
            style={{ paddingLeft: 40 }}
          />
        </div>

        <div className="input-with-icon">
          <Phone className="input-icon" size={16} style={{ color: "#94a3b8" }} />
          <input
            type="text"
            value={passengerPhone}
            onChange={(e) => setPassengerPhone(e.target.value)}
            placeholder="Phone Number"
            className="passenger-input"
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Promo Code Input */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Promo (MOVESMART10)"
            className="passenger-input"
            style={{ textTransform: "uppercase" }}
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            style={{ padding: "8px 14px", borderRadius: 12, background: "var(--accent-purple)", color: "#ffffff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
          >
            Apply
          </button>
        </div>
        {couponMsg && (
          <span style={{ fontSize: 11, fontWeight: 700, color: discountPercent > 0 ? "var(--primary)" : "#e11d48", display: "block" }}>
            {couponMsg}
          </span>
        )}

        {/* Payment Selector */}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Payment Method
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPaymentMethod("rfid")}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border-color)",
                background: paymentMethod === "rfid" ? "var(--primary)" : "#ffffff",
                color: paymentMethod === "rfid" ? "#ffffff" : "var(--text-main)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Zap size={14} /> RFID Pass
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("upi")}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border-color)",
                background: paymentMethod === "upi" ? "var(--accent-purple)" : "#ffffff",
                color: paymentMethod === "upi" ? "#ffffff" : "var(--text-main)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <CreditCard size={14} /> UPI / Card
            </button>
          </div>
        </div>

        {formError && (
          <div style={{ padding: 10, borderRadius: 10, background: "#fff1f2", color: "#e11d48", fontSize: 12, fontWeight: 700 }}>
            {formError}
          </div>
        )}

        {/* Fare Breakdown */}
        <div className="fare-breakdown-table">
          <div className="fare-row">
            <span>Seat Fare ({seatCount} x ₹{price})</span>
            <span>₹{rawBaseFare}</span>
          </div>
          {discountAmount > 0 && (
            <div className="fare-row" style={{ color: "var(--primary)", fontWeight: 700 }}>
              <span>Promo Discount (10%)</span>
              <span>-₹{discountAmount}</span>
            </div>
          )}
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

        <button
          type="submit"
          disabled={seatCount === 0 || isSubmitting}
          className="confirm-booking-btn"
        >
          {isSubmitting ? "Processing Booking..." : `Confirm & Book (${seatCount} Seat${seatCount > 1 ? "s" : ""})`}
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ShieldCheck size={14} style={{ color: "var(--primary)" }} /> MoveSmart Instant E-Ticket Guarantee
        </div>
      </form>
    </div>
  );
}
