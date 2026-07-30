import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus,
  Navigation,
  CreditCard,
  Calculator,
  ShieldCheck,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  User,
  UserCheck,
  Shield,
  Clock,
  Users,
  Zap,
  Star,
  ChevronRight,
  PhoneCall,
  Mail,
  MapPin,
  Sparkles,
  Wifi,
  Activity,
  Menu,
  X
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState("passenger");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [etaTicks, setEtaTicks] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setEtaTicks((t) => t + 1), 2800);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const sampleDepartureRoutes = [
    { line: "Route 12", dest: "Downtown Loop", baseEta: 3, seats: "14 Available" },
    { line: "Route 47", dest: "University Campus", baseEta: 7, seats: "6 Available" },
    { line: "Route 08", dest: "Tech Hub Station", baseEta: 2, seats: "22 Available" },
    { line: "Route 21", dest: "Metro Airport Link", baseEta: 11, seats: "9 Available" },
  ];

  return (
    <div className="landing-page-wrapper">
      {/* Scope CSS for Landing Page consistent with index.css Theme */}
      <style>{`
        .landing-page-wrapper {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: var(--text-main);
          font-family: var(--font-body);
        }

        .landing-navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 8%;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .brand-logo-group {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .brand-logo-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 6px 16px rgba(56, 161, 105, 0.25);
        }

        .brand-logo-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .brand-logo-tag {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--primary);
        }

        .nav-links-container {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .nav-link-btn {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .nav-link-btn:hover {
          color: var(--primary);
        }

        .nav-actions-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .hero-banner-section {
          padding: 70px 8% 90px;
          max-width: 1300px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 50px;
          align-items: center;
        }

        .hero-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: var(--primary-light);
          border: 1px solid var(--border-color);
          border-radius: 50px;
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 20px;
        }

        .hero-title-text {
          font-family: var(--font-display);
          font-size: 52px;
          line-height: 1.12;
          font-weight: 800;
          letter-spacing: -1.2px;
          color: var(--text-main);
          margin-bottom: 20px;
        }

        .hero-title-gradient {
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle-text {
          font-size: 17px;
          line-height: 1.6;
          color: var(--text-muted);
          margin-bottom: 32px;
          max-width: 520px;
        }

        .hero-buttons-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .live-card-widget {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(124, 58, 237, 0.08);
          position: relative;
        }

        .departure-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-radius: 12px;
          background: var(--bg-primary);
          border: 1px solid rgba(56, 161, 105, 0.1);
          margin-top: 10px;
        }

        .section-wrapper {
          padding: 80px 8%;
          max-width: 1300px;
          margin: 0 auto;
        }

        .section-title-center {
          text-align: center;
          max-width: 650px;
          margin: 0 auto 50px;
        }

        .section-title-center h2 {
          font-family: var(--font-display);
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.8px;
          margin-top: 10px;
        }

        .features-grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
        }

        .feature-item-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 30px;
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
        }

        .feature-item-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(124, 58, 237, 0.08);
          border-color: var(--primary);
        }

        .feature-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .steps-flow-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .step-flow-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 28px;
          text-align: center;
        }

        .step-number-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          color: white;
          margin: 0 auto 16px;
        }

        .role-tabs-container {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 35px;
        }

        .role-tab-button {
          padding: 12px 24px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          border: 1px solid var(--border-color);
          background: #ffffff;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
        }

        .role-tab-button.active-tab {
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          color: white;
          border-color: transparent;
          box-shadow: 0 6px 16px rgba(56, 161, 105, 0.25);
        }

        .cta-banner-container {
          background: linear-gradient(135deg, rgba(56, 161, 105, 0.12), rgba(139, 92, 246, 0.12));
          border: 1px solid var(--border-color);
          border-radius: 28px;
          padding: 50px 40px;
          text-align: center;
          backdrop-filter: blur(12px);
        }

        .footer-bottom-bar {
          background: #ffffff;
          border-top: 1px solid var(--border-color);
          padding: 30px 8%;
          font-size: 13px;
          color: var(--text-muted);
        }

        @media (max-width: 900px) {
          .hero-banner-section {
            grid-template-columns: 1fr;
            padding-top: 40px;
          }
          .hero-title-text {
            font-size: 38px;
          }
          .nav-links-container {
            display: none;
          }
        }
      `}</style>

      {/* 1. NAVBAR */}
      <nav className="landing-navbar">
        <div className="brand-logo-group" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo.png" alt="MoveSmart Logo" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: "800", background: "linear-gradient(135deg, var(--primary), var(--accent-purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: "1.1" }}>
              MoveSmart
            </div>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="nav-links-container">
          <button onClick={() => scrollToSection("features")} className="nav-link-btn">Features</button>
          <button onClick={() => scrollToSection("how-it-works")} className="nav-link-btn">How It Works</button>
          <button onClick={() => scrollToSection("user-roles")} className="nav-link-btn">User Roles</button>
          <button onClick={() => scrollToSection("benefits")} className="nav-link-btn">Benefits</button>
          <button onClick={() => scrollToSection("testimonials")} className="nav-link-btn">Testimonials</button>
          <button onClick={() => scrollToSection("contact")} className="nav-link-btn">Contact</button>
        </div>

        {/* Actions */}
        <div className="nav-actions-group">
          <button onClick={() => navigate("/login")} className="btn-text" style={{ padding: "8px 16px" }}>
            Sign In
          </button>
          <button onClick={() => navigate("/signup")} className="btn-primary btn-sm">
            Get Started
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="hero-banner-section">
        <div>
          <div className="hero-badge-pill">
            <Sparkles className="w-4 h-4" />
            <span>IoT-Based Smart Bus Management System</span>
          </div>

          <h1 className="hero-title-text">
            Smart Travel Starts <span className="hero-title-gradient">Here</span>
          </h1>

          <p className="hero-subtitle-text">
            Book, Track & Travel Smarter with IoT Technology. Experience real-time GPS bus tracking, seamless RFID tap-and-go payments, and automated fare calculation.
          </p>

          <div className="hero-buttons-row">
            <button
              onClick={() => navigate("/signup")}
              className="btn-primary"
              style={{ width: "auto", padding: "14px 28px", borderRadius: "14px" }}
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => scrollToSection("features")}
              className="btn-secondary"
              style={{ padding: "14px 24px", borderRadius: "14px", fontWeight: "600" }}
            >
              <span>Learn More</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "40px", paddingTop: "24px", borderTop: "1px solid var(--border-color)" }}>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--primary)" }}>99.8%</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>GPS Accuracy</div>
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent-purple)" }}>&lt; 0.5s</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>RFID Tap Speed</div>
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#2563eb" }}>100%</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Cashless Travel</div>
            </div>
          </div>
        </div>

        {/* Right side live widget */}
        <div className="live-card-widget">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--primary)" }}></div>
              <span style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "var(--primary)" }}>Live IoT Transit Feed</span>
            </div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-purple)", background: "var(--accent-purple-light)", padding: "4px 10px", borderRadius: "20px" }}>
              ESP32 Active
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            {sampleDepartureRoutes.map((route, i) => {
              const dynamicEta = Math.max(1, route.baseEta - (etaTicks % route.baseEta));
              return (
                <div key={i} className="departure-item-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px" }}>
                      {route.line.replace("Route ", "R")}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700" }}>{route.dest}</div>
                      <div style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "600" }}>{route.seats}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-purple)" }}>{dynamicEta}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "3px" }}>min</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "18px", padding: "14px", borderRadius: "14px", background: "linear-gradient(135deg, var(--primary-light), var(--accent-purple-light))", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CreditCard className="w-6 h-6" style={{ color: "var(--accent-purple)" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700" }}>Tap & Go RFID Pass</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>UID: 84:A2:F3:11</div>
              </div>
            </div>
            <div style={{ padding: "4px 10px", borderRadius: "8px", background: "#ffffff", color: "var(--primary)", fontWeight: "800", fontSize: "11px" }}>
              Auto Debit
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" style={{ background: "rgba(255, 255, 255, 0.6)", borderTop: "1px solid var(--border-color)" }}>
        <div className="section-wrapper">
          <div className="section-title-center">
            <div className="hero-badge-pill" style={{ margin: "0 auto 12px" }}>
              <Zap className="w-4 h-4" />
              <span>Next-Gen Transit Capabilities</span>
            </div>
            <h2>Powered by <span className="hero-title-gradient">IoT & Smart Tech</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px" }}>
              Everything you need for effortless commuter journeys, automated fare collection, and complete transit management.
            </p>
          </div>

          <div className="features-grid-layout">
            <div className="feature-item-card">
              <div className="feature-icon-wrapper" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                <Navigation className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Real-Time Bus Tracking</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                GPS-based live location tracking. Commuters know exact arrival times, eliminating uncertain wait times at bus stops.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-wrapper" style={{ background: "var(--accent-purple-light)", color: "var(--accent-purple)" }}>
                <Bus className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Smart Seat Booking System</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Interactive visual seat layout selection. Reserve guaranteed seats in advance before boarding to avoid overcrowding.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-wrapper" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>RFID/NFC Tap & Go Payment</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Contactless physical card or mobile NFC tap on entry and exit gates powered by ESP32 RFID readers.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-wrapper" style={{ background: "var(--accent-purple-light)", color: "var(--accent-purple)" }}>
                <Calculator className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Automatic Fare Calculation</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Distance-based dynamic pricing matrix automatically debits exact trip amounts from digital wallet balances.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-wrapper" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Driver & Admin Dashboard</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Comprehensive fleet control, driver dispatch, route management, passenger logs, and automated card approval tools.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-wrapper" style={{ background: "var(--accent-purple-light)", color: "var(--accent-purple)" }}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Safety Monitoring System</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Emergency SOS alerts, route deviation detection, speed tracking, and verified rider identification for complete safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" style={{ borderTop: "1px solid var(--border-color)" }}>
        <div className="section-wrapper">
          <div className="section-title-center">
            <div className="hero-badge-pill" style={{ margin: "0 auto 12px", background: "var(--accent-purple-light)", color: "var(--accent-purple)" }}>
              <span>Simple 4-Step Process</span>
            </div>
            <h2>How MoveSmart <span className="hero-title-gradient">Works</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px" }}>
              From registration to destination, travel seamlessly in four easy steps.
            </p>
          </div>

          <div className="steps-flow-grid">
            <div className="step-flow-card">
              <div className="step-number-circle" style={{ background: "var(--primary)" }}>01</div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Register / Login</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Create your account in seconds, verify your email, and request your custom RFID Smart Transit Card.
              </p>
            </div>

            <div className="step-flow-card">
              <div className="step-number-circle" style={{ background: "var(--accent-purple)" }}>02</div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Search & Book</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Search available routes, check live ETA, select preferred seat numbers, and reserve instantly.
              </p>
            </div>

            <div className="step-flow-card">
              <div className="step-number-circle" style={{ background: "var(--primary)" }}>03</div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Tap RFID Card</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Tap your Smart Pass on the IoT bus entry gate. ESP32 readers instantly validate your trip.
              </p>
            </div>

            <div className="step-flow-card">
              <div className="step-number-circle" style={{ background: "var(--accent-purple)" }}>04</div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Auto Fare Debit</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Enjoy your comfortable ride! On exit tap, exact fare is calculated and debited automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. USER ROLES SECTION */}
      <section id="user-roles" style={{ background: "rgba(255, 255, 255, 0.6)", borderTop: "1px solid var(--border-color)" }}>
        <div className="section-wrapper">
          <div className="section-title-center">
            <div className="hero-badge-pill" style={{ margin: "0 auto 12px" }}>
              <Users className="w-4 h-4" />
              <span>Tailored Experiences</span>
            </div>
            <h2>Designed For Every <span className="hero-title-gradient">Role</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px" }}>
              Customized interfaces and tools built specifically for passengers, drivers, and administrators.
            </p>
          </div>

          <div className="role-tabs-container">
            <button
              onClick={() => setActiveRole("passenger")}
              className={`role-tab-button ${activeRole === "passenger" ? "active-tab" : ""}`}
            >
              <User className="w-4 h-4" /> Passenger
            </button>

            <button
              onClick={() => setActiveRole("driver")}
              className={`role-tab-button ${activeRole === "driver" ? "active-tab" : ""}`}
            >
              <UserCheck className="w-4 h-4" /> Driver
            </button>

            <button
              onClick={() => setActiveRole("admin")}
              className={`role-tab-button ${activeRole === "admin" ? "active-tab" : ""}`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
          </div>

          <div className="container" style={{ maxWidth: "800px", margin: "0 auto", padding: "36px" }}>
            {activeRole === "passenger" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "12px" }}>Passenger Portal</h3>
                  <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "20px" }}>
                    Commute without stress. Search routes, check seat availability, view live GPS location of your bus, and manage your Smart RFID Card balance.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <span>Instant seat reservation with visual seat layout</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <span>Contactless RFID/NFC card wallet top-up</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <span>Live ETA alerts & route map view</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", marginBottom: "8px" }}>Passenger Dashboard</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>My Active Smart Card Pass</div>
                  <div style={{ padding: "16px", borderRadius: "12px", background: "#ffffff", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Balance</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--primary)" }}>₹ 450.00</div>
                    </div>
                    <CreditCard className="w-7 h-7" style={{ color: "var(--accent-purple)" }} />
                  </div>
                </div>
              </div>
            )}

            {activeRole === "driver" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "12px" }}>Driver Console</h3>
                  <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "20px" }}>
                    Keep trips running smoothly. View passenger manifest, monitor real-time seat occupancy, and manage trip start/stop statuses.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-purple)" }} />
                      <span>Live passenger boarding updates via IoT tap feed</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-purple)" }} />
                      <span>Turn-by-turn route stop guidance</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-purple)" }} />
                      <span>Emergency dispatch & delay reporting</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-purple)", textTransform: "uppercase", marginBottom: "8px" }}>Driver Console</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Route 12 Trip Control</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                    <div style={{ padding: "8px 12px", background: "#ffffff", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                      <span>Occupancy</span>
                      <span style={{ fontWeight: "700", color: "var(--primary)" }}>28 / 40 Seats</span>
                    </div>
                    <div style={{ padding: "8px 12px", background: "#ffffff", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                      <span>Next Stop</span>
                      <span style={{ fontWeight: "700", color: "var(--accent-purple)" }}>Tech Park Junction</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === "admin" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "12px" }}>Admin Command</h3>
                  <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "20px" }}>
                    Full system administration. Approve RFID Card applications, monitor overall fleet operations, manage fare rates, and review analytics.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <span>Smart Card application approval & RFID assignment</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <span>Revenue analytics & trip transaction reports</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      <span>System health & ESP32 device status</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", marginBottom: "8px" }}>Admin Overview</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Fleet Activity</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", textAlign: "center" }}>
                    <div style={{ padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ color: "var(--text-muted)" }}>Active Buses</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--primary)" }}>18 Vehicles</div>
                    </div>
                    <div style={{ padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ color: "var(--text-muted)" }}>Pending Apps</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-purple)" }}>4 Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. BENEFITS SECTION */}
      <section id="benefits" style={{ borderTop: "1px solid var(--border-color)" }}>
        <div className="section-wrapper">
          <div className="section-title-center">
            <div className="hero-badge-pill" style={{ margin: "0 auto 12px" }}>
              <Sparkles className="w-4 h-4" />
              <span>Commuter Advantages</span>
            </div>
            <h2>Why Choose <span className="hero-title-gradient">MoveSmart?</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px" }}>
              Key benefits designed to transform public transit into a pleasant, reliable daily routine.
            </p>
          </div>

          <div className="features-grid-layout" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="feature-item-card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Clock className="w-5 h-5" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Save Time</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Zero line delays at ticket counters. Tap and board immediately.</p>
            </div>

            <div className="feature-item-card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-purple-light)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Users className="w-5 h-5" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Avoid Overcrowding</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Pre-book guaranteed seat numbers before step onto the bus.</p>
            </div>

            <div className="feature-item-card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Cashless Travel</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Integrated RFID card wallet and Razorpay online top-ups.</p>
            </div>

            <div className="feature-item-card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent-purple-light)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Activity className="w-5 h-5" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Real-Time Updates</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Live GPS location map and dynamic arrival countdowns.</p>
            </div>

            <div className="feature-item-card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Improved Safety</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Verified commuter profiles and automated emergency monitoring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS SECTION */}
      <section id="testimonials" style={{ background: "rgba(255, 255, 255, 0.6)", borderTop: "1px solid var(--border-color)" }}>
        <div className="section-wrapper">
          <div className="section-title-center">
            <div className="hero-badge-pill" style={{ margin: "0 auto 12px" }}>
              <Star className="w-4 h-4" style={{ fill: "var(--primary)" }} />
              <span>Loved By Commuters</span>
            </div>
            <h2>What Our Users <span className="hero-title-gradient">Say</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px" }}>
              Read feedback from daily bus commuters and fleet operators using MoveSmart.
            </p>
          </div>

          <div className="features-grid-layout" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <div className="feature-item-card">
              <div style={{ display: "flex", gap: "4px", color: "#f59e0b", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4" style={{ fill: "#f59e0b" }} />
                ))}
              </div>
              <p style={{ fontSize: "14px", fontStyle: "italic", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "20px" }}>
                "MoveSmart saved my daily commute! Being able to see live GPS location and tap my RFID pass without carrying loose cash makes traveling so smooth."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--accent-purple))", color: "white", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                  AR
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>Ananya Rao</div>
                  <div style={{ fontSize: "11px", color: "var(--primary)" }}>Daily Tech Park Commuter</div>
                </div>
              </div>
            </div>

            <div className="feature-item-card">
              <div style={{ display: "flex", gap: "4px", color: "#f59e0b", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4" style={{ fill: "#f59e0b" }} />
                ))}
              </div>
              <p style={{ fontSize: "14px", fontStyle: "italic", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "20px" }}>
                "As a bus driver, having the IoT tap-and-go system means passenger boarding takes seconds rather than minutes. Occupancy tracking is super accurate!"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-purple), var(--primary))", color: "white", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                  VK
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>Vikram Kumar</div>
                  <div style={{ fontSize: "11px", color: "var(--accent-purple)" }}>Transit Bus Driver</div>
                </div>
              </div>
            </div>

            <div className="feature-item-card">
              <div style={{ display: "flex", gap: "4px", color: "#f59e0b", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4" style={{ fill: "#f59e0b" }} />
                ))}
              </div>
              <p style={{ fontSize: "14px", fontStyle: "italic", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "20px" }}>
                "The seat booking feature eliminates morning rush panic. I reserve my seat, track the bus arrival, and step right in. Highly recommended!"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), #2563eb)", color: "white", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                  SJ
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>Sneha Joseph</div>
                  <div style={{ fontSize: "11px", color: "var(--primary)" }}>University Student</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CONTACT / CTA SECTION */}
      <section id="contact" style={{ borderTop: "1px solid var(--border-color)" }}>
        <div className="section-wrapper">
          <div className="cta-banner-container">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "38px", fontWeight: "800", marginBottom: "14px" }}>
              Start Your Smart Journey <span className="hero-title-gradient">Today</span>
            </h2>
            <p style={{ fontSize: "16px", color: "var(--text-muted)", maxWidth: "600px", margin: "0 auto 28px" }}>
              Join thousands of commuters enjoying seamless, contactless IoT transit. Register now and claim your Smart RFID Pass!
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/signup")}
                className="btn-primary"
                style={{ width: "auto", padding: "14px 28px", borderRadius: "14px" }}
              >
                <span>Register Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate("/login")}
                className="btn-secondary"
                style={{ padding: "14px 24px", borderRadius: "14px", fontWeight: "600" }}
              >
                <span>Commuter Sign In</span>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "30px", marginTop: "40px", paddingTop: "24px", borderTop: "1px solid var(--border-color)", fontSize: "13px", color: "var(--text-muted)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span>support@movesmart.com</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PhoneCall className="w-4 h-4" style={{ color: "var(--accent-purple)" }} />
                <span>Helpline: +91 1800-425-9090</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span>Smart Transit Command Center</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="footer-bottom-bar">
        <div style={{ maxWidth: "1300px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700" }}>
            <img src="/logo.png" alt="MoveSmart Logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
            <span>&copy; {new Date().getFullYear()} MoveSmart Kerala. Smart Urban Transit System.</span>
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <span style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Home</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/login")}>Sign In</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/signup")}>Register</span>
          </div>
        </div>
      </footer>
    </div>
  );
}