import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bus,
  CreditCard,
  Wallet,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  Shield,
  Navigation,
  UserCheck
} from "lucide-react";
import { getStoredUser, clearStoredSession } from "../utils/session";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of MoveSmart?")) {
      clearStoredSession();
      setUser(null);
      navigate("/login");
    }
  };

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand Logo & Title */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
          }}
        >
          <img
            src="/logo.png"
            alt="MoveSmart Logo"
            style={{
              height: "42px",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0px 2px 6px rgba(56, 161, 105, 0.2))",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                fontWeight: "900",
                background: "linear-gradient(135deg, var(--primary), var(--accent-purple))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.1,
                letterSpacing: "-0.5px",
              }}
            >
              MoveSmart
            </div>
            <span style={{ fontSize: "10px", fontWeight: "800", color: "var(--accent-purple)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              IoT Transit Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Bar Links */}
        <div
          className="desktop-nav-group"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-primary)",
            padding: "5px 8px",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          {/* Dashboard / Console Link */}
          {user?.role?.toLowerCase() === "driver" ? (
            <Link
              to="/dashboard/driver"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                transition: "all 0.2s ease",
                background: isActive("/dashboard/driver") || isActive("/driver") ? "linear-gradient(135deg, #eab308, #ca8a04)" : "transparent",
                color: isActive("/dashboard/driver") || isActive("/driver") ? "#ffffff" : "var(--text-main)",
                boxShadow: isActive("/dashboard/driver") || isActive("/driver") ? "0 4px 12px rgba(234, 179, 8, 0.3)" : "none",
              }}
            >
              <Navigation size={15} />
              <span>Driver Console</span>
            </Link>
          ) : (
            <Link
              to="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                transition: "all 0.2s ease",
                background: isActive("/dashboard") ? "linear-gradient(135deg, var(--primary), #2f855a)" : "transparent",
                color: isActive("/dashboard") ? "#ffffff" : "var(--text-main)",
                boxShadow: isActive("/dashboard") ? "0 4px 12px rgba(56, 161, 105, 0.3)" : "none",
              }}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </Link>
          )}

          {user?.role?.toLowerCase() !== "driver" && (
            <>
              <Link
                to="/book-bus"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive("/book-bus") ? "linear-gradient(135deg, var(--primary), var(--accent-purple))" : "transparent",
                  color: isActive("/book-bus") ? "#ffffff" : "var(--text-main)",
                  boxShadow: isActive("/book-bus") ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "none",
                }}
              >
                <Bus size={15} />
                <span>Book Bus</span>
              </Link>

              <Link
                to="/dashboard/card-application"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive("/dashboard/card-application") ? "linear-gradient(135deg, var(--accent-purple), #7c3aed)" : "transparent",
                  color: isActive("/dashboard/card-application") ? "#ffffff" : "var(--text-main)",
                  boxShadow: isActive("/dashboard/card-application") ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "none",
                }}
              >
                <CreditCard size={15} />
                <span>RFID Pass</span>
              </Link>
            </>
          )}

          <Link
            to="/wallet"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.2s ease",
              background: isActive("/wallet") ? "linear-gradient(135deg, #16a34a, #15803d)" : "transparent",
              color: isActive("/wallet") ? "#ffffff" : "var(--text-main)",
              boxShadow: isActive("/wallet") ? "0 4px 12px rgba(22, 163, 74, 0.3)" : "none",
            }}
          >
            <Wallet size={15} />
            <span>Wallet</span>
          </Link>

          {/* Apply Driver - ONLY shown to regular users/passengers, NOT drivers or admins */}
          {user?.role?.toLowerCase() !== "driver" && user?.role?.toLowerCase() !== "admin" && (
            <Link
              to="/apply-driver"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                transition: "all 0.2s ease",
                background: isActive("/apply-driver") ? "linear-gradient(135deg, #6d28d9, #4c1d95)" : "transparent",
                color: isActive("/apply-driver") ? "#ffffff" : "var(--text-main)",
                boxShadow: isActive("/apply-driver") ? "0 4px 12px rgba(109, 40, 217, 0.3)" : "none",
              }}
            >
              <UserCheck size={15} />
              <span>Apply Driver</span>
            </Link>
          )}

          {/* Admin link - ONLY shown to Admin */}
          {user?.role?.toLowerCase() === "admin" && (
            <Link
              to="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                transition: "all 0.2s ease",
                background: isActive("/admin") ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "transparent",
                color: isActive("/admin") ? "#ffffff" : "var(--text-main)",
              }}
            >
              <Shield size={15} />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* User Account Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                to="/wallet"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "14px",
                  background: isActive("/wallet") ? "#16a34a" : "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  color: isActive("/wallet") ? "#ffffff" : "#15803d",
                  fontWeight: "800",
                  fontSize: "13px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                <span>💰</span>
                <span>Wallet</span>
              </Link>

              <Link
                to="/profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "14px",
                  background: isActive("/profile") ? "var(--accent-purple-light)" : "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary), var(--accent-purple))",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-main)" }}>
                  {user.name ? user.name.split(" ")[0] : "Profile"}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: "1px solid #fecdd3",
                  background: "#fff1f2",
                  color: "#e11d48",
                  fontSize: "12px",
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
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                to="/login"
                style={{
                  padding: "8px 18px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "var(--text-main)",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                style={{
                  padding: "9px 20px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, var(--primary), var(--accent-purple))",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "800",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(56, 161, 105, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle-btn"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "8px",
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid var(--border-color)",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {user?.role?.toLowerCase() === "driver" ? (
            <>
              <Link
                to="/dashboard/driver"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "#ca8a04", background: "rgba(234, 179, 8, 0.08)", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Navigation size={16} /> Driver Console
              </Link>
              <Link
                to="/driver/notifications"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Bell size={16} /> Notifications
              </Link>
            </>
          ) : (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          )}

          {user?.role?.toLowerCase() !== "driver" && (
            <>
              <Link
                to="/book-bus"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Bus size={16} /> Book Bus
              </Link>
              <Link
                to="/dashboard/card-application"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}
              >
                <CreditCard size={16} /> RFID Card Pass
              </Link>
            </>
          )}

          <Link
            to="/wallet"
            onClick={() => setMobileMenuOpen(false)}
            style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "#15803d", background: "rgba(34, 197, 94, 0.08)", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Wallet size={16} /> MoveSmart Wallet
          </Link>

          {user?.role?.toLowerCase() === "admin" && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "#0284c7", background: "rgba(14, 165, 233, 0.08)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Shield size={16} /> Admin Console
            </Link>
          )}

          {user?.role?.toLowerCase() !== "driver" && user?.role?.toLowerCase() !== "admin" && (
            <Link
              to="/apply-driver"
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "#6d28d9", background: "rgba(109, 40, 217, 0.08)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <UserCheck size={16} /> Apply Driver
            </Link>
          )}

          {user ? (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding: "10px", borderRadius: "10px", fontWeight: 700, fontSize: "14px", textDecoration: "none", color: "var(--accent-purple)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <User size={16} /> Profile ({user.name})
            </Link>
          ) : null}
        </div>
      )}
    </header>
  );
}
