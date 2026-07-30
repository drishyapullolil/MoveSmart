import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Bus, LayoutDashboard, LogOut, ExternalLink, User } from "lucide-react";
import { getStoredUser, clearStoredSession } from "../utils/session";

export default function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());

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
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div
        style={{
          maxWidth: "1380px",
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Brand Logo & Admin Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--primary), #2f855a)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(56, 161, 105, 0.4)",
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <div
                style={{
                  color: "#ffffff",
                  fontWeight: "900",
                  fontSize: "20px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.5px",
                }}
              >
                MoveSmart
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  color: "#38bdf8",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Admin Control Center
              </span>
            </div>
          </Link>
        </div>

        {/* Admin Navigation Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.2s ease",
              background: isActive("/admin") ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: isActive("/admin") ? "#38bdf8" : "#94a3b8",
              border: isActive("/admin") ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
            }}
          >
            <LayoutDashboard size={16} />
            <span>Admin Dashboard</span>
          </Link>

          <Link
            to="/admin/bus-routes"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.2s ease",
              background: isActive("/admin/bus-routes") ? "linear-gradient(135deg, var(--primary), #2f855a)" : "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              boxShadow: isActive("/admin/bus-routes") ? "0 4px 12px rgba(56, 161, 105, 0.3)" : "none",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Bus size={16} />
            <span>Bus &amp; Route Manager</span>
          </Link>

          <Link
            to="/"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: "700",
              textDecoration: "none",
              color: "#94a3b8",
              background: "transparent",
            }}
          >
            <span>Passenger Site</span>
            <ExternalLink size={14} />
          </Link>
        </nav>

        {/* Admin User Info & Sign Out */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.06)",
              padding: "6px 14px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#0284c7",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#ffffff" }}>
                {user?.name || "Administrator"}
              </span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#38bdf8" }}>
                SUPER ADMIN
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#fca5a5",
              fontSize: "12.5px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
