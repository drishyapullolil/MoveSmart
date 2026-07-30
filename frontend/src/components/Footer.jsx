import React from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Zap,
  Clock,
  ExternalLink,
  Sparkles
} from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        background: "linear-gradient(180deg, #13112b 0%, #090718 100%)",
        color: "#ffffff",
        borderTop: "3px solid var(--primary)",
        marginTop: "auto",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "52px 24px 24px",
        }}
      >
        {/* Main 4-Column Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "36px",
            marginBottom: "40px",
          }}
        >
          {/* Column 1: Brand & Status */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <img
                src="/logo.png"
                alt="MoveSmart Logo"
                style={{
                  height: "44px",
                  width: "auto",
                  objectFit: "contain",
                  background: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(56, 161, 105, 0.2)",
                }}
              />
              <div>
                <span style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.5px", display: "block", lineHeight: 1.1 }}>
                  MoveSmart
                </span>
                <span style={{ fontSize: "11px", color: "var(--accent-purple)", fontWeight: "800", textTransform: "uppercase" }}>
                  Kerala Bus Transit System
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#a098c7", lineHeight: "1.6", margin: "0 0 16px" }}>
              IoT-Based Smart Private Bus Management & Passenger Portal. Live tracking, contactless RFID pass tap, and instant bus seat booking across Kerala.
            </p>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", padding: "5px 12px", borderRadius: "20px", fontSize: "11px", color: "#4ade80", fontWeight: "700" }}>
              <Zap size={13} /> IoT Fleet Live & Connected
            </div>
          </div>

          {/* Column 2: Passenger Portals */}
          <div>
            <h4 style={{ color: "#ffffff", fontSize: "15px", fontWeight: "800", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Transit Portals
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <li>
                <Link to="/book-bus" style={{ color: "#b7aed6", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                  <Bus size={14} style={{ color: "var(--primary)" }} /> Book Bus Seats
                </Link>
              </li>
              <li>
                <Link to="/dashboard/card-application" style={{ color: "#b7aed6", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                  <Zap size={14} style={{ color: "var(--accent-purple)" }} /> RFID Card Application
                </Link>
              </li>
              <li>
                <Link to="/dashboard" style={{ color: "#b7aed6", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                  <Clock size={14} style={{ color: "var(--primary)" }} /> Schedules & Live Tracking
                </Link>
              </li>
              <li>
                <Link to="/driver" style={{ color: "#b7aed6", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                  <ShieldCheck size={14} style={{ color: "var(--accent-purple)" }} /> Driver Shift Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Major Hubs */}
          <div>
            <h4 style={{ color: "#ffffff", fontSize: "15px", fontWeight: "800", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Key Bus Routes
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#b7aed6" }}>
              <li>Kochi ➔ Trivandrum Express</li>
              <li>Kozhikode ➔ Ernakulam AC</li>
              <li>Thrissur ➔ Palakkad Shuttle</li>
              <li>Kottayam ➔ Alappuzha Coastal</li>
            </ul>
          </div>

          {/* Column 4: Helpline & Command Center */}
          <div>
            <h4 style={{ color: "#ffffff", fontSize: "15px", fontWeight: "800", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              24/7 Helpline & Support
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#b7aed6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={16} />
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", textTransform: "uppercase", fontWeight: 700 }}>Toll-Free Helpline</span>
                  <strong style={{ color: "#ffffff", fontSize: "14px" }}>1800-425-4747</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(56, 161, 105, 0.15)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail size={16} />
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", textTransform: "uppercase", fontWeight: 700 }}>Support Email</span>
                  <strong style={{ color: "#ffffff", fontSize: "13px" }}>support@movesmart.in</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", textTransform: "uppercase", fontWeight: 700 }}>Command Center</span>
                  <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: 600 }}>Ernakulam / Kochi, Kerala</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Footer Line */}
        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12px",
            color: "#717B87",
          }}
        >
          <div>
            © {new Date().getFullYear()} <strong>MoveSmart Kerala</strong>. Smart Private Bus Transit System. All rights reserved.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ color: "var(--accent-purple)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={13} /> IoT Connected Mobility
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
