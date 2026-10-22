import React, { useState } from "react";
import {
  CheckCircle2,
  QrCode,
  Printer,
  Copy,
  Check,
  User,
  Calendar,
  Sparkles,
  Download,
  FileText,
  Users,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Clock
} from "lucide-react";
import { generateTicketPDF } from "../../utils/ticketPdfGenerator";

export default function BookingSuccess({ booking, onClose, onGoToDashboard }) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!booking) return null;

  const {
    bookingId = "MS-BK-" + Date.now().toString(36).toUpperCase(),
    passengerName = "Primary Passenger",
    passengerEmail = "",
    passengerPhone = "",
    passengers = [],
    busName = "MoveSmart Fleet Bus",
    busNumber = "",
    busType = "Superfast Express",
    operator = "MoveSmart Kerala",
    fromLocation = "Origin",
    toLocation = "Destination",
    travelDate = new Date().toISOString().split("T")[0],
    departureTime = "08:00 AM",
    arrivalTime = "12:00 PM",
    selectedSeats = [],
    totalPrice = 0,
    paymentMethod = "rfid",
  } = booking;

  // Normalized passengers list for seats
  const passengerList = selectedSeats.map((seat, idx) => {
    const p = Array.isArray(passengers) ? (passengers.find((item) => item.seat === seat) || passengers[idx]) : null;
    return {
      seat,
      name: (p?.name || (idx === 0 ? passengerName : `Passenger ${idx + 1}`)).trim(),
      age: p?.age ? `${p.age} yrs` : "",
      gender: p?.gender || "",
    };
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      const ok = generateTicketPDF({
        ...booking,
        passengers: passengerList,
        bookingId,
        busName,
        busNumber,
        busType,
        operator,
        fromLocation,
        toLocation,
        departureTime,
        arrivalTime,
        travelDate,
        selectedSeats,
        totalPrice,
        paymentMethod,
        passengerName,
        passengerEmail,
        passengerPhone,
      });

      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Failed to generate ticket PDF:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay-bg" style={{ zIndex: 10000 }}>
      <div className="modal-pass-card" style={{ maxWidth: 640, width: "100%", maxHeight: "94vh", overflowY: "auto" }}>
        {/* Banner */}
        <div className="pass-card-header" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", color: "#ffffff", padding: "24px 20px 20px" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(34, 197, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", border: "2px solid #86efac" }}>
            <CheckCircle2 size={32} style={{ color: "#4ade80" }} />
          </div>

          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", background: "rgba(34, 197, 94, 0.25)", color: "#86efac", padding: "4px 14px", borderRadius: 20, display: "inline-block", border: "1px solid rgba(134, 239, 172, 0.4)" }}>
            Seat Reservation Confirmed 🎉
          </span>

          <h2 style={{ fontSize: 22, fontWeight: 900, margin: "8px 0 4px", letterSpacing: "-0.5px" }}>
            MoveSmart Official E-Ticket Pass
          </h2>
          <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>
            Official Boarding Sheet Synced with Fleet IoT &amp; RFID Validation System
          </p>
        </div>

        {/* Content */}
        <div className="pass-card-body" style={{ padding: 20 }}>
          {/* Ref ID & QR */}
          <div className="ref-id-box" style={{ background: "#f8fafc", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                Booking Reference ID
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span className="ref-id-num" style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: "#0f172a" }}>
                  {bookingId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy Booking ID"
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}
                >
                  {copied ? <Check size={13} style={{ color: "var(--primary)" }} /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Sparkles size={12} /> SMS &amp; Email Dispatched
              </span>
            </div>

            <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: 12, border: "1px solid #cbd5e1", textAlign: "center" }}>
              <QrCode size={46} style={{ color: "#0f172a" }} />
              <span style={{ fontSize: 8, fontFamily: "monospace", color: "#64748b", display: "block", fontWeight: 700, marginTop: 2 }}>
                SCAN ON BUS
              </span>
            </div>
          </div>

          {/* Route & Journey Box */}
          <div style={{ background: "#ffffff", padding: 16, borderRadius: 16, border: "1.5px solid #e2e8f0", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>{busName}</strong>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Fleet #{busNumber || "MS-101"} • {busType}
                </span>
              </div>
              <span style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                Confirmed ✅
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Boarding Station
                </span>
                <strong style={{ color: "#0f172a", fontSize: 14, display: "block" }}>{fromLocation}</strong>
                <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>{departureTime}</span>
              </div>

              <div style={{ padding: "0 8px", color: "var(--accent-purple)", textAlign: "center" }}>
                <ArrowRight size={20} />
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Destination Station
                </span>
                <strong style={{ color: "#0f172a", fontSize: 14, display: "block" }}>{toLocation}</strong>
                <span style={{ fontSize: 11, color: "var(--accent-purple)", fontWeight: 700 }}>{arrivalTime || "Scheduled"}</span>
              </div>
            </div>

            {/* Travel Date & Primary Contact Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, borderTop: "1px solid #f1f5f9", paddingTop: 10, marginBottom: 12 }}>
              <div>
                <span style={{ color: "#64748b", fontSize: 11 }}>Travel Date:</span>
                <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{travelDate}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: 11 }}>Booked By:</span>
                <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{passengerName}</strong>
              </div>
            </div>

            {/* PASSENGERS LIST TABLE (Shows each person's name per seat!) */}
            <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Users size={14} style={{ color: "var(--accent-purple)" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                  Reserved Seats &amp; Passenger Names ({passengerList.length})
                </span>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#475569", textAlign: "left", fontSize: 11 }}>
                      <th style={{ padding: "6px 10px", fontWeight: 700 }}>Seat</th>
                      <th style={{ padding: "6px 10px", fontWeight: 700 }}>Passenger Name</th>
                      <th style={{ padding: "6px 10px", fontWeight: 700 }}>Details</th>
                      <th style={{ padding: "6px 10px", fontWeight: 700, textAlign: "right" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengerList.map((p, i) => (
                      <tr key={p.seat} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 800, color: "var(--accent-purple)" }}>
                          <span style={{ background: "#ede9fe", padding: "2px 6px", borderRadius: 4 }}>
                            {p.seat}
                          </span>
                        </td>
                        <td style={{ padding: "7px 10px", fontWeight: 700, color: "#0f172a" }}>
                          {p.name || `Passenger ${i + 1}`}
                          {i === 0 && <span style={{ fontSize: 9, color: "#64748b", marginLeft: 4 }}>(Primary)</span>}
                        </td>
                        <td style={{ padding: "7px 10px", color: "#64748b", fontSize: 11 }}>
                          {p.age ? `${p.age}` : ""} {p.gender ? `(${p.gender})` : "--"}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>
                          <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 6, fontWeight: 800 }}>
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Fare & Payment */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Payment Method
                </span>
                <strong style={{ fontSize: 12, color: "#0f172a" }}>
                  {paymentMethod === "rfid" ? "⚡ RFID Transit Smart Pass" : paymentMethod === "upi" ? "💳 Online / UPI Gateway" : "🎟️ Direct Booking"}
                </strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Total Paid
                </span>
                <strong style={{ fontSize: 18, color: "var(--primary)", fontWeight: 900 }}>
                  ₹{totalPrice}
                </strong>
              </div>
            </div>

            {/* Assigned Driver Card */}
            {(() => {
              const rawDrv = booking.bus?.driverName || booking.driverName;
              const isGeneric = !rawDrv || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(rawDrv).toLowerCase().trim());
              const displayDriverName = !isGeneric ? rawDrv : "Assigned Fleet Driver";

              return (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#16a34a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, overflow: "hidden", border: "2px solid #86efac" }}>
                      {displayDriverName[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Driver: {displayDriverName}</span>
                        <span style={{ fontSize: 9, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 8, fontWeight: 900 }}>
                          Admin Verified ✅
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        License: <strong style={{ fontFamily: "monospace" }}>{booking.driverLicense || booking.bus?.driverLicense || "KL-GOV-VERIFIED"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Download Success Alert */}
          {downloadSuccess && (
            <div style={{ background: "#ecfdf5", border: "1.5px solid #86efac", borderRadius: 12, padding: "10px 14px", color: "#15803d", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={16} />
              <span>Official MoveSmart PDF Information Sheet downloaded to your device! 🎉</span>
            </div>
          )}

          {/* Action Buttons: Download PDF Sheet, Print, Book Another */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Primary Action: Download PDF Information Sheet */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                color: "#ffffff",
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 6px 16px rgba(124, 58, 237, 0.35)",
                transition: "all 0.15s ease"
              }}
            >
              <Download size={18} style={{ color: "#ffffff" }} />
              {isDownloading ? "Generating PDF Sheet..." : "Download Booking Details & Official Ticket (PDF)"}
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#f8fafc",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <Printer size={15} style={{ color: "#64748b" }} /> Print Ticket
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#ffffff",
                  color: "var(--primary)",
                  border: "1px solid var(--primary)",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Book Another Ticket
              </button>
            </div>

            <button
              type="button"
              onClick={onGoToDashboard}
              style={{
                padding: "10px",
                borderRadius: 12,
                background: "none",
                color: "#64748b",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              Return to User Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
