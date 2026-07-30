import React, { useState } from "react";
import {
  CheckCircle2,
  QrCode,
  Printer,
  Copy,
  Check,
  User,
  Calendar,
  Sparkles
} from "lucide-react";

export default function BookingSuccess({ booking, onClose, onGoToDashboard }) {
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const {
    bookingId,
    passengerName,
    busName,
    fromLocation,
    toLocation,
    travelDate,
    departureTime,
    selectedSeats = [],
    totalPrice,
  } = booking;

  const handleCopyId = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay-bg">
      <div className="modal-pass-card">
        {/* Banner */}
        <div className="pass-card-header">
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <CheckCircle2 size={32} style={{ color: "#86efac" }} />
          </div>

          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", background: "rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: 20, display: "inline-block" }}>
            Booking Confirmed 🎉
          </span>

          <h2 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 2px" }}>MoveSmart Boarding Pass</h2>
          <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>Synced with MoveSmart IoT Bus Database</p>
        </div>

        {/* Content */}
        <div className="pass-card-body">
          {/* Ref ID & QR */}
          <div className="ref-id-box">
            <div>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                Booking Reference ID
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="ref-id-num">{bookingId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  style={{ background: "#ffffff", border: "1px solid var(--border-color)", padding: 4, borderRadius: 6, cursor: "pointer" }}
                >
                  {copied ? <Check size={14} style={{ color: "var(--primary)" }} /> : <Copy size={14} />}
                </button>
              </div>
              <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Sparkles size={12} /> SMS & Email Dispatched
              </span>
            </div>

            <div style={{ background: "#ffffff", padding: 8, borderRadius: 12, border: "1px solid var(--border-color)", textAlign: "center" }}>
              <QrCode size={44} />
              <span style={{ fontSize: 8, fontFamily: "monospace", color: "var(--text-muted)", display: "block" }}>SCAN ON BUS</span>
            </div>
          </div>

          {/* Details */}
          <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: 16, border: "1px solid var(--border-color)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 8, marginBottom: 10 }}>
              <strong style={{ color: "var(--text-main)" }}>{busName}</strong>
              <span style={{ color: "var(--primary)", fontWeight: 800 }}>Confirmed</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>From</span>
                <strong style={{ color: "var(--text-main)" }}>{fromLocation}</strong>
                <span style={{ fontSize: 11, color: "var(--primary)", display: "block", fontWeight: 700 }}>{departureTime}</span>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>To</span>
                <strong style={{ color: "var(--text-main)" }}>{toLocation}</strong>
                <span style={{ fontSize: 11, color: "var(--accent-purple)", display: "block", fontWeight: 700 }}>Scheduled Arrival</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Passenger:</span>
                <strong style={{ display: "block", color: "var(--text-main)" }}>{passengerName}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-muted)" }}>Travel Date:</span>
                <strong style={{ display: "block", color: "var(--text-main)" }}>{travelDate}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-muted)" }}>Reserved Seats:</span>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  {selectedSeats.map((s) => (
                    <span key={s} style={{ background: "var(--accent-purple)", color: "#ffffff", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ color: "var(--text-muted)" }}>Total Paid:</span>
                <strong style={{ display: "block", fontSize: 16, color: "var(--primary)", fontWeight: 900 }}>₹{totalPrice}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{ padding: 12, borderRadius: 14, background: "var(--text-main)", color: "#ffffff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Printer size={16} style={{ color: "#86efac" }} /> Print / Download E-Ticket PDF
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: 10, borderRadius: 12, background: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--border-color)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                Book Another Ticket
              </button>

              <button
                type="button"
                onClick={onGoToDashboard}
                style={{ padding: 10, borderRadius: 12, background: "var(--accent-purple)", color: "#ffffff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
