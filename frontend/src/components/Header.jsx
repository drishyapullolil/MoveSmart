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
  Bell,
  MapPin,
  Radio,
  Image as ImageIcon
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
    if (path === "/bus-gallery" || path === "/gallery") {
      return location.pathname === "/bus-gallery" || location.pathname === "/gallery";
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
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
        width: "100%",
      }}
    >
      <style>{`
        .desktop-nav-group {
          display: flex;
          align-items: center;
          gap: 3px;
          flex: 1;
          justifyContent: center;
          margin: 0 8px;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .desktop-nav-group::-webkit-scrollbar {
          display: none;
        }
        .mobile-toggle-btn {
          display: none;
        }
        @media (max-width: 1080px) {
          .desktop-nav-group {
            display: none !important;
          }
          .mobile-toggle-btn {
            display: flex !important;
          }
        }
        @media (min-width: 1081px) {
          .mobile-toggle-btn {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "0 16px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
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
            gap: "8px",
            textDecoration: "none",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(56, 161, 105, 0.25)",
              boxShadow: "0 2px 6px rgba(56, 161, 105, 0.12)",
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
                fontSize: "17px",
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
                fontSize: "8.5px",
                fontWeight: "800",
                color: "#7c3aed",
                letterSpacing: "0.5px",
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
        <nav className="desktop-nav-group">
          {/* DRIVER NAVIGATION */}
          {isRole("driver") ? (
            <>
              <Link
                to="/dashboard/driver"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/dashboard/driver") || isActive("/driver")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/dashboard/driver") || isActive("/driver") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/dashboard/driver") || isActive("/driver")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <Navigation size={13} />
                <span>Console</span>
              </Link>

              <Link
                to="/driver/live-drive"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/driver/live-drive")
                    ? "linear-gradient(135deg, #059669, #10b981)"
                    : "transparent",
                  color: isActive("/driver/live-drive") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/driver/live-drive")
                    ? "0 2px 8px rgba(16, 185, 129, 0.2)"
                    : "none",
                }}
              >
                <MapPin size={13} />
                <span>Live Drive</span>
              </Link>

              <Link
                to="/driver/rfid-device"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/driver/rfid-device")
                    ? "linear-gradient(135deg, #16a34a, #15803d)"
                    : "transparent",
                  color: isActive("/driver/rfid-device") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/driver/rfid-device")
                    ? "0 2px 8px rgba(22, 163, 74, 0.2)"
                    : "none",
                }}
              >
                <Radio size={13} />
                <span>RFID Reader</span>
              </Link>

              <Link
                to="/driver/notifications"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/driver/notifications")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/driver/notifications") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/driver/notifications")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <Bell size={13} />
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
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/dashboard")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/dashboard") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/dashboard")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <LayoutDashboard size={13} />
                <span>Dashboard</span>
              </Link>

              {/* My RFID Card */}
              <Link
                to="/my-rfid-card"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/my-rfid-card")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/my-rfid-card") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/my-rfid-card")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <CreditCard size={13} />
                <span>My RFID Card</span>
              </Link>

              {/* Bus Schedules */}
              <Link
                to="/book-bus"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/book-bus")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/book-bus") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/book-bus")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <Bus size={13} />
                <span>Bus Schedules</span>
              </Link>

              {/* Bus Gallery */}
              <Link
                to="/bus-gallery"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/bus-gallery") || isActive("/gallery")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/bus-gallery") || isActive("/gallery") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/bus-gallery") || isActive("/gallery")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <ImageIcon size={13} />
                <span>Bus Gallery</span>
              </Link>

              {/* RFID Pass Apply */}
              <Link
                to="/dashboard/card-application"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/dashboard/card-application") || isActive("/card-application")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/dashboard/card-application") || isActive("/card-application") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/dashboard/card-application") || isActive("/card-application")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <CreditCard size={13} />
                <span>Apply Pass</span>
              </Link>

              {/* Wallet */}
              <Link
                to="/wallet"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  background: isActive("/wallet")
                    ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                    : "transparent",
                  color: isActive("/wallet") ? "#ffffff" : "#475569",
                  boxShadow: isActive("/wallet")
                    ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                    : "none",
                }}
              >
                <Wallet size={13} />
                <span>Wallet</span>
              </Link>

              {/* Apply Driver */}
              {!isRole("driver") && !isRole("admin") && (
                <Link
                  to="/apply-driver"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: "700",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    background: isActive("/apply-driver")
                      ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                      : "transparent",
                    color: isActive("/apply-driver") ? "#ffffff" : "#475569",
                    boxShadow: isActive("/apply-driver")
                      ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                      : "none",
                  }}
                >
                  <UserCheck size={13} />
                  <span>Apply Driver</span>
                </Link>
              )}

              {/* Lost & Found */}
              {!isRole("driver") && !isRole("admin") && (
                <Link
                  to="/lost-found"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: "700",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    background: isActive("/lost-found")
                      ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                      : "transparent",
                    color: isActive("/lost-found") ? "#ffffff" : "#475569",
                    boxShadow: isActive("/lost-found")
                      ? "0 2px 8px rgba(124, 58, 237, 0.2)"
                      : "none",
                  }}
                >
                  <Package size={13} />
                  <span>Lost &amp; Found</span>
                </Link>
              )}

              {/* Admin Quick Link */}
              {isRole("admin") && (
                <Link
                  to="/admin"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    borderRadius: "7px",
                    fontSize: "12px",
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
                  <Shield size={13} />
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
            marginLeft: "auto",
          }}
        >
          {user ? (
            <>
              {/* User Profile Pill */}
              <Link
                to="/profile"
                title={`Profile: ${user.name || "User"}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 8px 3px 3px",
                  borderRadius: "16px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #15803d, #7c3aed)",
                    color: "#ffffff",
                    fontWeight: "800",
                    fontSize: "10.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#0F172A",
                    maxWidth: "75px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name ? user.name.split(" ")[0] : "Profile"}
                </span>
              </Link>

              {/* Sign Out Button (Always clearly visible & accessible) */}
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out of MoveSmart"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 10px",
                  borderRadius: "7px",
                  border: "1px solid #FECACA",
                  background: "#FEF2F2",
                  color: "#DC2626",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FEE2E2";
                  e.currentTarget.style.borderColor = "#FCA5A5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FEF2F2";
                  e.currentTarget.style.borderColor = "#FECACA";
                }}
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            /* GUEST AUTH BUTTONS */
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Link
                to="/login"
                style={{
                  padding: "5px 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
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
                  padding: "5px 14px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #15803d, #7c3aed)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(124, 58, 237, 0.2)",
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
                to="/driver/live-drive"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "#059669",
                  background: "rgba(16, 185, 129, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <MapPin size={16} /> Live Drive (Map & Simulation)
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
                to="/bus-gallery"
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
                <ImageIcon size={16} /> Bus Gallery
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
