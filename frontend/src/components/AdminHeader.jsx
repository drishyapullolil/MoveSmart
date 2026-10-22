import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Bus, LayoutDashboard, LogOut, ExternalLink, User, Bell, Package, Clock, Menu, X, Image as ImageIcon } from "lucide-react";
import { getStoredUser, clearStoredSession } from "../utils/session";

export default function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [showNotif, setShowNotif] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <style>{`
        .admin-desktop-nav {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-mobile-toggle {
          display: none !important;
        }
        @media (max-width: 1080px) {
          .admin-desktop-nav {
            display: none !important;
          }
          .admin-mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: "1380px",
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "nowrap",
          gap: "12px",
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
        <nav className="admin-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

          <Link
            to="/admin/shift-roster"
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
              background: isActive("/admin/shift-roster") ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)" : "transparent",
              color: isActive("/admin/shift-roster") ? "#d8b4fe" : "#c4b5fd",
              border: isActive("/admin/shift-roster") ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
              boxShadow: isActive("/admin/shift-roster") ? "0 4px 12px rgba(168, 85, 247, 0.2)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/admin/shift-roster")) {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                e.currentTarget.style.color = "#f3e8ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/admin/shift-roster")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#c4b5fd";
              }
            }}
          >
            <Clock size={18} />
            <span>Shift Roster</span>
          </Link>

          <Link
            to="/admin/lost-found"
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
              background: isActive("/admin/lost-found") ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)" : "transparent",
              color: isActive("/admin/lost-found") ? "#d8b4fe" : "#c4b5fd",
              border: isActive("/admin/lost-found") ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
              boxShadow: isActive("/admin/lost-found") ? "0 4px 12px rgba(168, 85, 247, 0.2)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/admin/lost-found")) {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                e.currentTarget.style.color = "#f3e8ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/admin/lost-found")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#c4b5fd";
              }
            }}
          >
            <Package size={18} />
            <span>Lost &amp; Found</span>
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
            <span style={{ display: "inline-block" }}>Sign Out</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="admin-mobile-toggle"
            title="Toggle Admin Navigation"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: "10px",
              padding: "8px",
              cursor: "pointer",
              color: "#ffffff",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            background: "rgba(30, 10, 60, 0.98)",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            padding: "16px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            boxShadow: "0 14px 30px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Link
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: isActive("/admin") ? "#4ade80" : "#e2e8f0",
              background: isActive("/admin") ? "rgba(74, 222, 128, 0.1)" : "transparent",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <LayoutDashboard size={16} /> Overview
          </Link>
          <Link
            to="/admin/bus-routes"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: isActive("/admin/bus-routes") ? "#4ade80" : "#e2e8f0",
              background: isActive("/admin/bus-routes") ? "rgba(74, 222, 128, 0.1)" : "transparent",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <Bus size={16} /> Bus Routes &amp; Schedules
          </Link>
          <Link
            to="/admin/bus-fleet"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: isActive("/admin/bus-fleet") ? "#4ade80" : "#e2e8f0",
              background: isActive("/admin/bus-fleet") ? "rgba(74, 222, 128, 0.1)" : "transparent",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <Bus size={16} /> Bus Fleet
          </Link>
          <Link
            to="/admin/shift-roster"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: isActive("/admin/shift-roster") ? "#4ade80" : "#e2e8f0",
              background: isActive("/admin/shift-roster") ? "rgba(74, 222, 128, 0.1)" : "transparent",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <Clock size={16} /> 3-Shift Driver Roster
          </Link>
          <Link
            to="/admin/bus-gallery"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: isActive("/admin/bus-gallery") ? "#4ade80" : "#e2e8f0",
              background: isActive("/admin/bus-gallery") ? "rgba(74, 222, 128, 0.1)" : "transparent",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <ImageIcon size={16} /> Bus Gallery
          </Link>
          <Link
            to="/admin/lost-found"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: isActive("/admin/lost-found") ? "#4ade80" : "#e2e8f0",
              background: isActive("/admin/lost-found") ? "rgba(74, 222, 128, 0.1)" : "transparent",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <Package size={16} /> Lost &amp; Found
          </Link>
          <Link
            to="/"
            target="_blank"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "10px",
              color: "#c4b5fd",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              marginTop: "4px",
              paddingTop: "12px",
            }}
          >
            <ExternalLink size={16} /> Open Passenger Site
          </Link>
        </div>
      )}
    </header>
  );
}
