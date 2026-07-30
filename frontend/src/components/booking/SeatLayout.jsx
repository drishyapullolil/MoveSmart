import React from "react";
import { Navigation, Sparkles } from "lucide-react";

export default function SeatLayout({
  totalSeats = 32,
  bookedSeats = [],
  selectedSeats = [],
  onSeatToggle,
  pricePerSeat = 450,
}) {
  const rows = Math.ceil(totalSeats / 4);

  const handleQuickWindowSelect = () => {
    const windowAvailable = [];
    for (let r = 1; r <= rows; r++) {
      for (let c of ["A", "D"]) {
        const id = `${r}${c}`;
        if (!bookedSeats.includes(id) && !selectedSeats.includes(id)) {
          windowAvailable.push(id);
          if (windowAvailable.length === 2) break;
        }
      }
      if (windowAvailable.length === 2) break;
    }
    windowAvailable.forEach((id) => onSeatToggle(id));
  };

  const currentTotal = selectedSeats.length * pricePerSeat;

  return (
    <div className="seat-map-card">
      <div className="seat-map-header">
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
            Interactive Seat Selection
          </h4>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
            Click on any green seat to select or deselect.
          </p>
        </div>

        <div style={{ background: "var(--bg-primary)", padding: "6px 14px", borderRadius: 14, border: "1px solid var(--border-color)", textAlign: "right" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block", fontWeight: 700 }}>Total Fare</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--primary)" }}>₹{currentTotal}</span>
        </div>
      </div>

      {/* Legend & Quick Select */}
      <div className="seat-legend-row">
        <div className="legend-item">
          <div className="legend-box available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-box selected"></div>
          <span>Selected ({selectedSeats.length})</span>
        </div>
        <div className="legend-item">
          <div className="legend-box booked"></div>
          <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>Booked</span>
        </div>

        <button
          type="button"
          onClick={handleQuickWindowSelect}
          style={{
            marginLeft: "auto",
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "var(--accent-purple-light)",
            color: "var(--accent-purple)",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Sparkles size={12} /> Auto Window
        </button>
      </div>

      {/* Bus Cabin Grid */}
      <div className="bus-cabin-frame">
        <div className="driver-cabin-row">
          <span>FRONT / ENTRANCE</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Navigation size={14} style={{ color: "var(--primary)", transform: "rotate(45deg)" }} /> Driver Seat
          </span>
        </div>

        <div className="seat-grid-rows">
          {Array.from({ length: rows }).map((_, rIdx) => {
            const rowNum = rIdx + 1;
            return (
              <div key={rowNum} className="seat-row">
                {/* Row Number */}
                <span style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", width: 14 }}>{rowNum}</span>

                {/* Seats A & B */}
                <div className="seat-pair">
                  {["A", "B"].map((col) => {
                    const seatId = `${rowNum}${col}`;
                    const isBooked = bookedSeats.includes(seatId);
                    const isSelected = selectedSeats.includes(seatId);

                    return (
                      <button
                        key={seatId}
                        type="button"
                        disabled={isBooked}
                        onClick={() => onSeatToggle(seatId)}
                        className={`seat-btn ${isSelected ? "selected" : ""}`}
                        title={`Seat ${seatId} (${col === "A" ? "Window" : "Aisle"})`}
                      >
                        <span>{seatId}</span>
                        <span style={{ fontSize: 8, opacity: 0.8, fontWeight: 500 }}>
                          {col === "A" ? "Win" : "Aisle"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <span className="aisle-gap">AISLE</span>

                {/* Seats C & D */}
                <div className="seat-pair">
                  {["C", "D"].map((col) => {
                    const seatId = `${rowNum}${col}`;
                    const isBooked = bookedSeats.includes(seatId);
                    const isSelected = selectedSeats.includes(seatId);

                    return (
                      <button
                        key={seatId}
                        type="button"
                        disabled={isBooked}
                        onClick={() => onSeatToggle(seatId)}
                        className={`seat-btn ${isSelected ? "selected" : ""}`}
                        title={`Seat ${seatId} (${col === "D" ? "Window" : "Aisle"})`}
                      >
                        <span>{seatId}</span>
                        <span style={{ fontSize: 8, opacity: 0.8, fontWeight: 500 }}>
                          {col === "D" ? "Win" : "Aisle"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 10, borderTop: "2px dashed rgba(0,0,0,0.1)", fontSize: 10, fontWeight: 800, color: "#cbd5e1", letterSpacing: 2 }}>
          REAR OF BUS
        </div>
      </div>
    </div>
  );
}
