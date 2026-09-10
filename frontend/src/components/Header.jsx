import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bus,
  CreditCard,
  Wallet,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Navigation,
  UserCheck,
  Package,
  Bell
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
      return (location.pathname === "/" || location.pathname === "/dashboard") && !location.pathname.includes("lost-found") && !location.pathname.includes("card-application");
    }
    if (path === "/lost-found") {
      return location.pathname === "/lost-found" || location.pathname === "/dashboard/lost-found";
    }
    if (path === "/wallet") {
      return location.pathname === "/wallet";
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const isRole = (role) => user?.role?.toLowerCase() === role;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.07)",
        boxShadow: "0 2px 14px rgba(0, 0, 0, 0.04)",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "0 20px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          boxSizing: "border-box",
        }}
      >
        {/* ========================================================= */}
        {/* 1. LEFT: Brand Logo & Title */}
        {/* ========================================================= */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(56, 161, 105, 0.25)",
              boxShadow: "0 2px 8px rgba(56, 161, 105, 0.15)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src="/logo.png"
              alt="MoveSmart Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: "2px",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "19px",
                fontWeight: "900",
                background: "linear-gradient(135deg, #15803d 0%, #7c3aed 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.4px",
              }}
            >
              MoveSmart
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: "800",
                color: "#7c3aed",
                letterSpacing: "0.6px",
                textTransform: "uppercase",
              }}
            >
              IoT Transit Portal
            </span>
          </div>
        </Link>

        {/* ========================================================= */}
        {/* 2. CENTER: Clean Horizontal Navigation Menu */}
        {/* ========================================================= */}
        <nav
          className="desktop-nav-group"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flex: 1,
            justifyContent: "center",
            margin: "0 8px",
          }}
        >
          {/* DRIVER NAVIGATION */}
          {isRole("driver") ? (
            <>
              <Link
                to="/dashboard/driver"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/dashboard/driver") || isActive("/driver")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/dashboard/driver") || isActive("/driver") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/dashboard/driver") || isActive("/driver")
                    ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                    : "none",
                }}
              >
                <Navigation size={14} />
                <span>Console</span>
              </Link>

              <Link
                to="/driver/notifications"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/driver/notifications")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/driver/notifications") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/driver/notifications")
                    ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                    : "none",
                }}
              >
                <Bell size={14} />
                <span>Notifications</span>
              </Link>
            </>
          ) : (
            /* PASSENGER / USER NAVIGATION */
            <>
              {/* Dashboard */}
              <Link
                to="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/dashboard")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/dashboard") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/dashboard")
                    ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                    : "none",
                }}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </Link>

              {/* Bus Schedules */}
              <Link
                to="/book-bus"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/book-bus")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/book-bus") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/book-bus")
                    ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                    : "none",
                }}
              >
                <Bus size={14} />
                <span>Bus Schedules</span>
              </Link>

              {/* RFID Pass */}
              <Link
                to="/dashboard/card-application"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/dashboard/card-application") || isActive("/card-application")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/dashboard/card-application") || isActive("/card-application") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/dashboard/card-application") || isActive("/card-application")
                    ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                    : "none",
                }}
              >
                <CreditCard size={14} />
                <span>RFID Pass</span>
              </Link>

              {/* Wallet */}
              <Link
                to="/wallet"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/wallet")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/wallet") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/wallet")
                    ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                    : "none",
                }}
              >
                <Wallet size={14} />
                <span>Wallet</span>
              </Link>

              {/* Apply Driver */}
              {!isRole("driver") && !isRole("admin") && (
                <Link
                  to="/apply-driver"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 13px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    background: isActive("/apply-driver")
                      ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                      : "transparent",
                    color: isActive("/apply-driver") ? "#ffffff" : "#475569",
                    boxShadow: isActive("/apply-driver")
                      ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                      : "none",
                  }}
                >
                  <UserCheck size={14} />
                  <span>Apply Driver</span>
                </Link>
              )}

              {/* Lost & Found (Standalone Route /lost-found) */}
              {!isRole("driver") && !isRole("admin") && (
                <Link
                  to="/lost-found"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 13px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    background: isActive("/lost-found")
                      ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                      : "transparent",
                    color: isActive("/lost-found")
                      ? "#ffffff"
                      : "#475569",
                    boxShadow: isActive("/lost-found")
                      ? "0 2px 10px rgba(124, 58, 237, 0.25)"
                      : "none",
                  }}
                >
                  <Package size={14} />
                  <span>Lost &amp; Found</span>
                </Link>
              )}

              {/* Admin Panel Quick Link (if admin) */}
              {isRole("admin") && (
                <Link
                  to="/admin"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 13px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    background: isActive("/admin")
                      ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                      : "transparent",
                    color: isActive("/admin") ? "#ffffff" : "#0369a1",
                  }}
                >
                  <Shield size={14} />
                  <span>Admin</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* ========================================================= */}
        {/* 3. RIGHT: Compact User Controls (Wallet, Profile, Logout) */}
        {/* ========================================================= */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
              {/* Right-Side Wallet Pill */}
              <Link
                to="/wallet"
                title="View Wallet Balance"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 11px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  color: "#15803d",
                  fontWeight: "700",
                  fontSize: "12.5px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span>💰</span>
                <span>Wallet</span>
              </Link>

              {/* User Profile Pill */}
              <Link
                to="/profile"
                title={`Profile: ${user.name || "User"}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "4px 10px 4px 4px",
                  borderRadius: "20px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #15803d, #7c3aed)",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "#1e293b",
                    maxWidth: "85px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name ? user.name.split(" ")[0] : "Profile"}
                </span>
              </Link>

              {/* Sign Out Button (Guaranteed fully visible) */}
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out of MoveSmart"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 11px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.22)",
                  background: "rgba(239, 68, 68, 0.05)",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.22)";
                }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            /* GUEST AUTH BUTTONS */
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link
                to="/login"
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#334155",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #15803d, #7c3aed)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                  transition: "all 0.2s ease",
                }}
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle-btn"
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
              marginLeft: "4px",
            }}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MOBILE / TABLET DRAWER */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
          }}
        >
          {isRole("driver") ? (
            <>
              <Link
                to="/dashboard/driver"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#6d28d9",
                  background: "rgba(124, 58, 237, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Navigation size={16} /> Driver Console
              </Link>
              <Link
                to="/driver/notifications"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Bell size={16} /> Notifications
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>

              <Link
                to="/book-bus"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Bus size={16} /> Bus Schedules
              </Link>

              <Link
                to="/dashboard/card-application"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CreditCard size={16} /> RFID Card Pass
              </Link>

              <Link
                to="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#15803d",
                  background: "rgba(34, 197, 94, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Wallet size={16} /> MoveSmart Wallet
              </Link>

              {!isRole("driver") && !isRole("admin") && (
                <Link
                  to="/apply-driver"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#6d28d9",
                    background: "rgba(109, 40, 217, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <UserCheck size={16} /> Apply Driver
                </Link>
              )}

              {!isRole("driver") && !isRole("admin") && (
                <Link
                  to="/lost-found"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#7c3aed",
                    background: "rgba(124, 58, 237, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Package size={16} /> Lost &amp; Found
                </Link>
              )}

              {isRole("admin") && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "14px",
                    textDecoration: "none",
                    color: "#0284c7",
                    background: "rgba(14, 165, 233, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Shield size={16} /> Admin Console
                </Link>
              )}
            </>
          )}

          {user && (
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <User size={16} /> Profile ({user.name || "User"})
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#dc2626",
                  background: "rgba(239, 68, 68, 0.06)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
