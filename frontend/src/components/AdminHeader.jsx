import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Bus, LayoutDashboard, LogOut, ExternalLink, User, Bell } from "lucide-react";
import { getStoredUser, clearStoredSession } from "../utils/session";

export default function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [showNotif, setShowNotif] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of the Admin Console?")) {
      clearStoredSession();
      setUser(null);
      navigate("/login");
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        background: "rgba(46, 16, 101, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 4px 30px rgba(88, 28, 135, 0.4)",
      }}
    >
      <div
        style={{
          maxWidth: "1380px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Brand Logo & Admin Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(74, 222, 128, 0.3)",
                overflow: "hidden",
                border: "2px solid rgba(74, 222, 128, 0.5)",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <img src="/logo.png" alt="MoveSmart Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
            </div>
            <div>
              <div
                style={{
                  color: "#ffffff",
                  fontWeight: "900",
                  fontSize: "22px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.5px",
                  textShadow: "0 2px 10px rgba(255, 255, 255, 0.1)",
                }}
              >
                MoveSmart
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "2px",
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }}></div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#4ade80",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Admin Control Center
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Admin Navigation Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              background: isActive("/admin") ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)" : "transparent",
              color: isActive("/admin") ? "#d8b4fe" : "#c4b5fd",
              border: isActive("/admin") ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
              boxShadow: isActive("/admin") ? "0 4px 12px rgba(168, 85, 247, 0.2)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/admin")) {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                e.currentTarget.style.color = "#f3e8ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/admin")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#c4b5fd";
              }
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/admin/bus-routes"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              background: isActive("/admin/bus-routes") ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)" : "transparent",
              color: isActive("/admin/bus-routes") ? "#d8b4fe" : "#c4b5fd",
              border: isActive("/admin/bus-routes") ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
              boxShadow: isActive("/admin/bus-routes") ? "0 4px 12px rgba(168, 85, 247, 0.2)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/admin/bus-routes")) {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                e.currentTarget.style.color = "#f3e8ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/admin/bus-routes")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#c4b5fd";
              }
            }}
          >
            <Bus size={18} />
            <span>Bus &amp; Routes</span>
          </Link>

          <div style={{ width: "1px", height: "24px", background: "rgba(255, 255, 255, 0.1)", margin: "0 8px" }}></div>

          <Link
            to="/"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
              color: "#c4b5fd",
              background: "transparent",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#c4b5fd")}
          >
            <span>Passenger Site</span>
            <ExternalLink size={14} />
          </Link>
        </nav>

        {/* Admin User Info & Sign Out */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowNotif(!showNotif)}
              title="System Notifications"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#c4b5fd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(167, 139, 250, 0.2)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#c4b5fd";
              }}
            >
              <Bell size={18} />
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 8px #4ade80",
                }}
              />
            </button>

            {showNotif && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  width: "280px",
                  background: "#1e1b4b",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  borderRadius: "14px",
                  padding: "16px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  zIndex: 1100,
                  color: "#ffffff",
                  fontSize: "13px",
                }}
              >
                <div style={{ fontWeight: "800", marginBottom: "8px", color: "#4ade80", display: "flex", justifyContent: "space-between" }}>
                  <span>Notifications 🔔</span>
                  <span style={{ fontSize: "11px", color: "#a78bfa" }}>Live</span>
                </div>
                <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  🟢 Operations API running normally.
                </div>
                <div style={{ padding: "8px 0" }}>
                  🚌 Kerala Bus Services operational today.
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(255, 255, 255, 0.08)",
              padding: "6px 16px",
              borderRadius: "30px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4ade80, #a78bfa)",
                color: "#1e1b4b",
                fontWeight: "900",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(74, 222, 128, 0.4)",
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffffff" }}>
                {user?.name || "Administrator"}
              </span>
              <span style={{ fontSize: "10px", fontWeight: "800", color: "#4ade80" }}>
                SUPER ADMIN
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%)",
              color: "#fca5a5",
              fontSize: "13px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.4) 100%)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
