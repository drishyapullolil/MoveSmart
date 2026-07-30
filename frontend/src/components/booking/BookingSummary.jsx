import React, { useState } from "react";
import {
  Ticket,
  User,
  Mail,
  Phone,
  Tag,
  CreditCard,
  Zap,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function BookingSummary({
  bus,
  selectedSeats = [],
  travelDate,
  currentUser,
  onConfirmBooking,
  isSubmitting = false,
}) {
  const { busName, busNumber, fromLocation, toLocation, departureTime, arrivalTime, price } = bus || {};

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
            <strong style={{ fontSize: 15, display: "block" }}>{fromLocation}</strong>
            <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>{departureTime}</span>
          </div>
          <ArrowRight size={18} style={{ color: "var(--accent-purple)" }} />
          <div style={{ textAlign: "right" }}>
            <strong style={{ fontSize: 15, display: "block" }}>{toLocation}</strong>
            <span style={{ fontSize: 11, color: "var(--accent-purple)", fontWeight: 700 }}>{arrivalTime}</span>
          </div>
        </div>
      </div>

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
