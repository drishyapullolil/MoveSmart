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
  X,
  Radio,
  Eye,
  Search,
  Check,
  AlertTriangle,
  Smartphone,
  Layers,
  FileText,
  HelpCircle,
  TrendingUp,
  Cpu,
  Compass
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState("passenger");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [tapFeedIndex, setTapFeedIndex] = useState(0);
  const [etaTicks, setEtaTicks] = useState(0);

  // Live simulation tick for ETAs and radar movement
  useEffect(() => {
    const interval = setInterval(() => {
      setEtaTicks((t) => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Periodic RFID tap feed rotation
  useEffect(() => {
    const tapInterval = setInterval(() => {
      setTapFeedIndex((prev) => (prev + 1) % recentTaps.length);
    }, 4500);
    return () => clearInterval(tapInterval);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const keralaRoutes = [
    {
      id: "R101",
      name: "Infopark Tech Express",
      busNumber: "KL-07-CD-4048",
      type: "AC Low Floor Electric",
      origin: "Vyttila Mobility Hub",
      destination: "Kakkanad Infopark Campus",
      speed: "38 km/h",
      occupancy: 24,
      totalSeats: 36,
      stops: [
        { name: "Vyttila Hub", offset: "0 min", passed: true },
        { name: "Palarivattom Bypass", offset: "8 min", passed: true },
        { name: "Kakkanad Civil Station", offset: "18 min", current: true },
        { name: "Infopark Phase 1 & 2", offset: "26 min", passed: false }
      ],
      fare: "₹18 - ₹32"
    },
    {
      id: "R204",
      name: "Kochi Metro Feeder Line",
      busNumber: "KL-07-BN-8821",
      type: "Super Fast Smart Bus",
      origin: "Aluva Metro Station",
      destination: "MG Road Marine Drive",
      speed: "44 km/h",
      occupancy: 31,
      totalSeats: 40,
      stops: [
        { name: "Aluva Metro", offset: "0 min", passed: true },
        { name: "Kalamassery Toll", offset: "12 min", current: true },
        { name: "Edappally Junction", offset: "22 min", passed: false },
        { name: "MG Road Marine Drive", offset: "35 min", passed: false }
      ],
      fare: "₹14 - ₹28"
    },
    {
      id: "R309",
      name: "Coastal Island Corridor",
      busNumber: "KL-43-E-1902",
      type: "Eco City Shuttle",
      origin: "Fort Kochi Customs Jetty",
      destination: "Kaloor International Stadium",
      speed: "32 km/h",
      occupancy: 18,
      totalSeats: 32,
      stops: [
        { name: "Fort Kochi", offset: "0 min", passed: true },
        { name: "Thoppumpady", offset: "10 min", passed: true },
        { name: "Menaka Junction", offset: "24 min", current: true },
        { name: "Kaloor Stadium", offset: "34 min", passed: false }
      ],
      fare: "₹12 - ₹24"
    }
  ];

  const recentTaps = [
    { card: "84:A2:F3:11", name: "Rahul Menon", stop: "Palarivattom Bypass", fare: "₹18.00", time: "Just now" },
    { card: "91:B4:C8:42", name: "Ananya Pillai", stop: "Kalamassery Toll", fare: "₹14.00", time: "10s ago" },
    { card: "33:FE:19:80", name: "Mohammed Asif", stop: "Vyttila Hub Entry", fare: "Tap-In Recorded", time: "25s ago" },
    { card: "72:6C:55:09", name: "Deepa Nair", stop: "Kakkanad Civil Station", fare: "₹22.00", time: "40s ago" }
  ];

  const activeRoute = keralaRoutes[selectedRouteIndex];

  return (
    <div className="landing-page-root">
      {/* SCOPED MODERN CSS STYLES */}
      <style>{`
        .landing-page-root {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif);
          overflow-x: hidden;
        }

        /* 1. TOP ANNOUNCEMENT BANNER */
        .landing-top-ribbon {
          background: linear-gradient(90deg, #059669, #7c3aed);
          color: #ffffff;
          padding: 7px 16px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          letter-spacing: 0.3px;
        }

        .pulse-dot-green {
          width: 8px;
          height: 8px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 10px #4ade80;
          animation: pulseGreen 1.8s infinite;
        }

        @keyframes pulseGreen {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { transform: scale(1.2); box-shadow: 0 0 0 8px rgba(74, 222, 128, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }

        /* 2. NAVIGATION BAR */
        .landing-navbar-container {
          position: sticky;
          top: 0;
          z-index: 120;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
          transition: all 0.25s ease;
        }

        .landing-navbar {
          max-width: 1320px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          text-decoration: none;
        }

        .brand-logo-mark {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #059669, #7c3aed);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 18px rgba(5, 150, 105, 0.28);
        }

        .brand-text-name {
          font-family: var(--font-display, 'Outfit', sans-serif);
          font-size: 21px;
          font-weight: 800;
          background: linear-gradient(135deg, #0f172a 30%, #059669 80%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .brand-text-subtitle {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.9px;
          color: #059669;
        }

        .desktop-nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-link-item {
          background: none;
          border: none;
          font-size: 13.5px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 6px 4px;
        }

        .nav-link-item:hover {
          color: #059669;
        }

        .nav-cta-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-nav-outline {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #1e293b;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-nav-outline:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .btn-nav-primary {
          padding: 8px 18px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #059669, #047857);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
          transition: all 0.2s;
        }

        .btn-nav-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35);
        }

        /* 3. HERO SECTION */
        .hero-section-wrapper {
          position: relative;
          padding: 56px 24px 80px;
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          gap: 40px;
          align-items: center;
        }

        .hero-left-content {
          max-width: 640px;
        }

        .hero-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 40px;
          color: #047857;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 20px;
        }

        .hero-headline-title {
          font-family: var(--font-display, 'Outfit', sans-serif);
          font-size: 48px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -1.2px;
          color: #0f172a;
          margin-bottom: 18px;
        }

        .hero-headline-title .gradient-text {
          background: linear-gradient(135deg, #059669 0%, #7c3aed 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-description-paragraph {
          font-size: 16px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 30px;
        }

        .hero-action-buttons-group {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-hero-primary {
          padding: 13px 26px;
          border-radius: 12px;
          background: linear-gradient(135deg, #059669, #047857);
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 20px rgba(5, 150, 105, 0.28);
          transition: all 0.25s ease;
        }

        .btn-hero-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(5, 150, 105, 0.38);
        }

        .btn-hero-secondary {
          padding: 13px 22px;
          border-radius: 12px;
          background: #ffffff;
          color: #1e293b;
          font-size: 14.5px;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        .btn-hero-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        /* Hero Key Metric Counters */
        .hero-metrics-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .metric-counter-block {
          display: flex;
          flex-direction: column;
        }

        .metric-counter-value {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .metric-counter-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-top: 4px;
        }

        /* 4. HERO RIGHT: INTERACTIVE BUS RADAR CARD */
        .hero-radar-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .radar-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .route-selector-tabs {
          display: flex;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          margin-top: 14px;
        }

        .route-tab-pill {
          flex: 1;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .route-tab-pill.active {
          background: #ffffff;
          color: #059669;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .live-bus-telemetry-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          margin-top: 14px;
        }

        .bus-route-progress-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          margin: 24px 8px 12px;
        }

        .bus-route-progress-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 4px;
          background: #e2e8f0;
          transform: translateY(-50%);
          z-index: 1;
        }

        .bus-route-progress-fill {
          position: absolute;
          left: 0;
          top: 50%;
          width: 60%;
          height: 4px;
          background: linear-gradient(90deg, #059669, #7c3aed);
          transform: translateY(-50%);
          z-index: 2;
        }

        .route-stop-node {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stop-circle-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #cbd5e1;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stop-circle-dot.passed {
          background: #059669;
        }

        .stop-circle-dot.current {
          background: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.25);
          animation: pulseDot 1.6s infinite;
        }

        .stop-name-label {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          margin-top: 8px;
          max-width: 70px;
          text-align: center;
          line-height: 1.2;
        }

        /* RFID Tap Toast Notification in Radar */
        .live-rfid-tap-toast {
          background: linear-gradient(135deg, #ecfdf5, #f3e8ff);
          border: 1px solid rgba(5, 150, 105, 0.2);
          border-radius: 14px;
          padding: 12px 14px;
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.3s ease;
        }

        /* 5. GENERAL SECTION STYLING */
        .landing-content-section {
          padding: 80px 24px;
          max-width: 1320px;
          margin: 0 auto;
        }

        .section-header-block {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 48px;
        }

        .section-subhead-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 30px;
          color: #059669;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 12px;
        }

        .section-main-title {
          font-family: var(--font-display, 'Outfit', sans-serif);
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -0.8px;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 12px;
        }

        .section-desc-text {
          font-size: 15px;
          color: #64748b;
          line-height: 1.6;
        }

        /* 6. CORRIDOR ROUTES CARDS */
        .routes-grid-wrapper {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 22px;
        }

        .route-corridor-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 24px;
          transition: all 0.28s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .route-corridor-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
          border-color: #059669;
        }

        /* 7. ROLE PREVIEWS TABS & PLAYGROUND */
        .role-switcher-bar {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 32px;
        }

        .role-switch-btn {
          padding: 10px 22px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .role-switch-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
        }

        .role-preview-card-frame {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
        }

        /* 8. FEATURE CARDS GRID */
        .features-grid-6col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 22px;
        }

        .feature-box-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
          transition: all 0.25s ease;
        }

        .feature-box-card:hover {
          transform: translateY(-4px);
          border-color: #059669;
          box-shadow: 0 14px 30px rgba(5, 150, 105, 0.08);
        }

        .feature-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        /* 9. HOW IT WORKS 4 STEPS */
        .steps-flow-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .step-block-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 26px 20px;
          text-align: center;
          position: relative;
        }

        .step-badge-number {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          color: #ffffff;
          margin: 0 auto 16px;
        }

        /* 10. CTA FOOTER BANNER */
        .cta-glass-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #059669 100%);
          border-radius: 28px;
          padding: 60px 40px;
          color: #ffffff;
          text-align: center;
          box-shadow: 0 24px 50px rgba(15, 23, 42, 0.25);
          position: relative;
          overflow: hidden;
        }

        .cta-glass-banner::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        /* 11. FOOTER */
        .landing-footer-area {
          background: #0f172a;
          color: #94a3b8;
          padding: 60px 24px 30px;
          border-top: 1px solid #1e293b;
        }

        .footer-grid-columns {
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }

        .footer-col-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .footer-col-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .footer-link-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 13.5px;
          text-align: left;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .footer-link-btn:hover {
          color: #34d399;
        }

        .footer-bottom-strip {
          max-width: 1320px;
          margin: 0 auto;
          padding-top: 24px;
          border-top: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          flex-wrap: wrap;
          gap: 14px;
        }

        @media (max-width: 960px) {
          .hero-section-wrapper {
            grid-template-columns: 1fr;
            padding-top: 30px;
          }
          .hero-headline-title {
            font-size: 36px;
          }
          .desktop-nav-links {
            display: none;
          }
          .footer-grid-columns {
            grid-template-columns: 1fr 1fr;
          }
          .hero-metrics-strip {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .footer-grid-columns {
            grid-template-columns: 1fr;
          }
          .cta-glass-banner {
            padding: 36px 20px;
          }
        }
      `}</style>

      {/* 1. TOP ANNOUNCEMENT RIBBON */}
      <div className="landing-top-ribbon">
        <div className="pulse-dot-green"></div>
        <span>MoveSmart Kerala Live: Kochi Corridor ESP32 RFID Gates & Real-Time GPS Tracking Active</span>
        <span style={{ opacity: 0.7 }}>•</span>
        <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => navigate("/signup")}>
          Apply for Smart Pass
        </span>
      </div>

      {/* 2. NAVIGATION BAR */}
      <header className="landing-navbar-container">
        <div className="landing-navbar">
          <div className="brand-logo-area" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
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
            <div>
              <div className="brand-text-name">MoveSmart</div>
              <div className="brand-text-subtitle">Kerala IoT Transit Platform</div>
            </div>
          </div>

          <nav className="desktop-nav-links">
            <button className="nav-link-item" onClick={() => scrollToSection("live-radar")}>
              Live Bus Radar
            </button>
            <button className="nav-link-item" onClick={() => scrollToSection("corridors")}>
              Kerala Corridors
            </button>
            <button className="nav-link-item" onClick={() => scrollToSection("role-portals")}>
              Portals & Ecosystem
            </button>
            <button className="nav-link-item" onClick={() => scrollToSection("tech-features")}>
              IoT & AI Tech
            </button>
            <button className="nav-link-item" onClick={() => scrollToSection("how-it-works")}>
              How It Works
            </button>
          </nav>

          <div className="nav-cta-actions">
            <button onClick={() => navigate("/login")} className="btn-nav-outline">
              Sign In
            </button>
            <button onClick={() => navigate("/signup")} className="btn-nav-primary">
              <span>Get Smart Pass</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="hero-section-wrapper">
        <div className="hero-left-content">
          <div className="hero-pill-badge">
            <Zap className="w-3.5 h-3.5" />
            <span>Next-Gen Smart Transit Ecosystem • Live ESP32 & AI Powered</span>
          </div>

          <h1 className="hero-headline-title">
            The Future of Public Transit in Kerala is <span className="gradient-text">Connected, Cashless & Safe.</span>
          </h1>

          <p className="hero-description-paragraph">
            Experience real-time GPS bus tracking with intermediate stop arrival predictions, sub-second ESP32 RFID card tap-in, Driver Edge AI drowsiness monitoring, and automated cashless wallet fare deductions.
          </p>

          <div className="hero-action-buttons-group">
            <button onClick={() => navigate("/signup")} className="btn-hero-primary">
              <span>Get Started as Commuter</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button onClick={() => scrollToSection("live-radar")} className="btn-hero-secondary">
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Explore Live Bus Radar</span>
            </button>
          </div>

          {/* Key Metrics Counters */}
          <div className="hero-metrics-strip">
            <div className="metric-counter-block">
              <div className="metric-counter-value" style={{ color: "#059669" }}>99.8%</div>
              <div className="metric-counter-label">GPS Precision</div>
            </div>
            <div className="metric-counter-block">
              <div className="metric-counter-value" style={{ color: "#7c3aed" }}>&lt; 350ms</div>
              <div className="metric-counter-label">RFID Tap Speed</div>
            </div>
            <div className="metric-counter-block">
              <div className="metric-counter-value" style={{ color: "#2563eb" }}>100%</div>
              <div className="metric-counter-label">Cashless Auto-Debit</div>
            </div>
            <div className="metric-counter-block">
              <div className="metric-counter-value" style={{ color: "#0f172a" }}>42+</div>
              <div className="metric-counter-label">Connected Stations</div>
            </div>
          </div>
        </div>

        {/* 4. HERO RIGHT: INTERACTIVE LIVE BUS RADAR */}
        <div id="live-radar" className="hero-radar-card">
          <div className="radar-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="pulse-dot-green"></div>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Live Kochi Fleet Telemetry
              </span>
            </div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#7c3aed", background: "#f3e8ff", padding: "4px 10px", borderRadius: "20px" }}>
              ESP32 + Socket.IO Active
            </div>
          </div>

          {/* Interactive Route Selector */}
          <div className="route-selector-tabs">
            {keralaRoutes.map((route, idx) => (
              <button
                key={route.id}
                onClick={() => setSelectedRouteIndex(idx)}
                className={`route-tab-pill ${selectedRouteIndex === idx ? "active" : ""}`}
              >
                {route.name.split(" ")[0]} ({route.id})
              </button>
            ))}
          </div>

          {/* Telemetry Overview */}
          <div className="live-bus-telemetry-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{activeRoute.name}</div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                  {activeRoute.busNumber} • {activeRoute.type}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "18px", fontWeight: "800", color: "#059669" }}>{activeRoute.speed}</span>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>LIVE SPEED</div>
              </div>
            </div>

            {/* Visual Route Progress Track */}
            <div className="bus-route-progress-track">
              <div className="bus-route-progress-line"></div>
              <div className="bus-route-progress-fill"></div>
              {activeRoute.stops.map((st, i) => (
                <div key={i} className="route-stop-node">
                  <div className={`stop-circle-dot ${st.passed ? "passed" : ""} ${st.current ? "current" : ""}`}></div>
                  <span className="stop-name-label">{st.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Seats: <strong>{activeRoute.occupancy} / {activeRoute.totalSeats}</strong> ({(activeRoute.occupancy / activeRoute.totalSeats * 100).toFixed(0)}%)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                <Eye className="w-4 h-4 text-purple-600" />
                <span style={{ color: "#7c3aed", fontWeight: "700" }}>Driver AI: Active (EAR 0.32)</span>
              </div>
            </div>
          </div>

          {/* Live Simulated ESP32 RFID Tap Feed */}
          <div className="live-rfid-tap-toast">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>
                  {recentTaps[tapFeedIndex].name} ({recentTaps[tapFeedIndex].card})
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  Tapped at <strong>{recentTaps[tapFeedIndex].stop}</strong>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#059669" }}>
                {recentTaps[tapFeedIndex].fare}
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>{recentTaps[tapFeedIndex].time}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. KERALA CORRIDORS & REAL-TIME TIMETABLE SECTION */}
      <section id="corridors" style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div className="landing-content-section">
          <div className="section-header-block">
            <div className="section-subhead-pill">
              <Compass className="w-3.5 h-3.5" />
              <span>Smart Transit Network</span>
            </div>
            <h2 className="section-main-title">Major Kerala Commute Corridors</h2>
            <p className="section-desc-text">
              Fully automated dynamic stop offset timetables, real-time seat tracking, and instant tap-in coverage across Ernakulam and greater Kochi.
            </p>
          </div>

          <div className="routes-grid-wrapper">
            {keralaRoutes.map((route, i) => (
              <div key={i} className="route-corridor-card">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "8px" }}>
                      Line {route.id}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#7c3aed" }}>
                      Fare: {route.fare}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>
                    {route.name}
                  </h3>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                    {route.origin} ➔ {route.destination}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", background: "#f8fafc", borderRadius: "12px", fontSize: "12px" }}>
                    {route.stops.map((s, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.passed ? "#059669" : "#94a3b8" }}></div>
                          <span>{s.name}</span>
                        </div>
                        <span style={{ color: "#64748b", fontWeight: "600" }}>+{s.offset}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", color: "#059669", fontWeight: "700" }}>
                    {route.totalSeats - route.occupancy} Seats Available
                  </div>
                  <button
                    onClick={() => navigate("/signup")}
                    style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: "700", fontSize: "12.5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>Book Seat</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ROLE PORTALS & ECOSYSTEM PLAYGROUND */}
      <section id="role-portals">
        <div className="landing-content-section">
          <div className="section-header-block">
            <div className="section-subhead-pill">
              <Layers className="w-3.5 h-3.5" />
              <span>Unified 3-Tier Platform</span>
            </div>
            <h2 className="section-main-title">Built for Passengers, Drivers & Administrators</h2>
            <p className="section-desc-text">
              Specialized, purpose-built digital cockpits engineered for every stakeholder in the smart transit chain.
            </p>
          </div>

          {/* Role Tab Switcher */}
          <div className="role-switcher-bar">
            <button
              onClick={() => setActiveRole("passenger")}
              className={`role-switch-btn ${activeRole === "passenger" ? "active" : ""}`}
            >
              <User className="w-4 h-4" />
              <span>Passenger Portal</span>
            </button>
            <button
              onClick={() => setActiveRole("driver")}
              className={`role-switch-btn ${activeRole === "driver" ? "active" : ""}`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Driver Cockpit</span>
            </button>
            <button
              onClick={() => setActiveRole("admin")}
              className={`role-switch-btn ${activeRole === "admin" ? "active" : ""}`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Command Center</span>
            </button>
          </div>

          {/* Role Preview Card Frame */}
          <div className="role-preview-card-frame">
            {activeRole === "passenger" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "36px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#059669", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>
                    Passenger App & Web Portal
                  </div>
                  <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                    Effortless Daily Commutes with Live Bus Radar
                  </h3>
                  <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: "1.6", marginBottom: "22px" }}>
                    Plan trips across Kerala routes with real-time GPS bus locations, reserve guaranteed seats in advance, reload your digital transit wallet instantly via Razorpay, and report misplaced items to the AI Lost & Found registry.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Live interactive OpenStreetMap with moving bus beacons & stop ETAs</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Visual interactive seat layout booking before boarding</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Contactless RFID Smart Card application & automatic exit-tap fare deduction</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => navigate("/login")} className="btn-hero-primary" style={{ padding: "10px 20px", fontSize: "13.5px" }}>
                      <span>Open Passenger Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate("/signup")} className="btn-hero-secondary" style={{ padding: "10px 18px", fontSize: "13.5px" }}>
                      <span>Apply for Card</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Passenger Card */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#059669" }}>MY SMART PASS</span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>UID: 84:A2:F3:11</span>
                  </div>

                  <div style={{ background: "linear-gradient(135deg, #059669, #7c3aed)", color: "#ffffff", borderRadius: "14px", padding: "18px", marginBottom: "14px", boxShadow: "0 10px 20px rgba(5, 150, 105, 0.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "11px", opacity: 0.8 }}>MoveSmart Transit Pass</div>
                        <div style={{ fontSize: "16px", fontWeight: "800" }}>Kochi Metro & Bus Link</div>
                      </div>
                      <Wifi className="w-5 h-5 opacity-90" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: "10px", opacity: 0.8 }}>Wallet Balance</div>
                        <div style={{ fontSize: "22px", fontWeight: "800" }}>₹ 450.00</div>
                      </div>
                      <div style={{ fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "20px", fontWeight: "700" }}>
                        Active & Verified
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button onClick={() => navigate("/login")} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: "pointer", textAlign: "center" }}>
                      + Top Up Wallet
                    </button>
                    <button onClick={() => navigate("/login")} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: "pointer", textAlign: "center" }}>
                      Trip History
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeRole === "driver" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "36px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>
                    Driver Console & Edge AI Vision
                  </div>
                  <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                    AI-Assisted Safety Cockpit & Live Drive
                  </h3>
                  <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: "1.6", marginBottom: "22px" }}>
                    Equipped with real-time Edge AI facial and Eye Aspect Ratio (EAR) drowsiness monitoring, Malayalam voice alertness prompts, live GPS telemetry broadcasting, and instant ESP32 RFID passenger tap validation.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>Real-time EAR camera monitoring with fatigue warnings & voice reminders</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>GPS location broadcaster broadcasting live coordinates to passengers</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>Live passenger occupancy meter & hardware tap logs</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => navigate("/login")} className="btn-hero-primary" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", padding: "10px 20px", fontSize: "13.5px" }}>
                      <span>Open Driver Cockpit</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate("/apply-driver")} className="btn-hero-secondary" style={{ padding: "10px 18px", fontSize: "13.5px" }}>
                      <span>Driver Registration</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Driver Cockpit Card */}
                <div style={{ background: "#0f172a", color: "#ffffff", border: "1px solid #1e293b", borderRadius: "18px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="pulse-dot-green"></div>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#34d399" }}>AI COCKPIT ON AIR</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Driver: Silpa (Lic #KL-07-2018)</span>
                  </div>

                  <div style={{ background: "#1e293b", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>AI Eye Aspect Ratio (EAR)</span>
                      <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "700" }}>0.32 (Alert & Awake)</span>
                    </div>
                    <div style={{ height: "6px", background: "#334155", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: "85%", height: "100%", background: "#10b981" }}></div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                      <div style={{ color: "#94a3b8" }}>Telemetry Broadcast</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>Active • 38 km/h</div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                      <div style={{ color: "#94a3b8" }}>Onboard Occupancy</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#facc15", marginTop: "2px" }}>24 / 36 Seats</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === "admin" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "36px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>
                    Admin Command & Fleet Management
                  </div>
                  <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                    Centralized Fleet Control & Timing Engine
                  </h3>
                  <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: "1.6", marginBottom: "22px" }}>
                    Complete transit network administration. Configure multi-stop route timing offsets, assign drivers to buses, approve RFID Smart Pass requests with 1-click card linking, and audit real-time revenue collection.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Dynamic Route Stop Offset Timing Engine with automatic stop ETA math</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1-Click Smart RFID pass application approval & hardware UID matching</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Live fleet GPS oversight, driver shift scheduling & revenue audits</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => navigate("/login")} className="btn-hero-primary" style={{ padding: "10px 20px", fontSize: "13.5px" }}>
                      <span>Access Admin Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate("/login")} className="btn-hero-secondary" style={{ padding: "10px 18px", fontSize: "13.5px" }}>
                      <span>System Audit Logs</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Admin Overview Card */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>SYSTEM TELEMETRY KPI</span>
                    <span style={{ fontSize: "11px", color: "#059669", fontWeight: "700", background: "#ecfdf5", padding: "3px 8px", borderRadius: "12px" }}>
                      ESP32 Cluster OK
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ background: "#ffffff", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Active Buses on Road</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#059669", marginTop: "2px" }}>18 Vehicles</div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Pending Card Passes</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#7c3aed", marginTop: "2px" }}>4 Approvals</div>
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "700" }}>Daily Cashless Revenue</span>
                      <span style={{ fontWeight: "800", color: "#059669" }}>₹ 42,850.00</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>1,842 Smart RFID tap transactions today</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. MOVE SMART IOT & AI CORE CAPABILITIES (6-GRID) */}
      <section id="tech-features" style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div className="landing-content-section">
          <div className="section-header-block">
            <div className="section-subhead-pill">
              <Cpu className="w-3.5 h-3.5" />
              <span>Next-Gen IoT Architecture</span>
            </div>
            <h2 className="section-main-title">High-Precision Transit Engineering</h2>
            <p className="section-desc-text">
              Combining microcontrollers, edge computer vision, automated distance pricing, and cloud sync for seamless urban mobility.
            </p>
          </div>

          <div className="features-grid-6col">
            <div className="feature-box-card">
              <div className="feature-icon-badge" style={{ background: "#ecfdf5", color: "#059669" }}>
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "#0f172a" }}>
                ESP32 & RFID Contactless Pass
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                Sub-second contactless tap-in & tap-out at bus doors powered by ESP32 microcontrollers and RC522 RFID readers with cloud balance sync.
              </p>
            </div>

            <div className="feature-box-card">
              <div className="feature-icon-badge" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
                <Eye className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "#0f172a" }}>
                Edge AI Driver Safety & Drowsiness
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                Real-time Eye Aspect Ratio (EAR) facial analysis detecting fatigue, face distraction, with instant Malayalam voice alert interventions.
              </p>
            </div>

            <div className="feature-box-card">
              <div className="feature-icon-badge" style={{ background: "#eff6ff", color: "#2563eb" }}>
                <Clock className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "#0f172a" }}>
                Multi-Stop Route Timing Engine
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                Automated timetable calculation using base departures and stop offset minutes to deliver pinpoint arrival ETAs across all intermediate stages.
              </p>
            </div>

            <div className="feature-box-card">
              <div className="feature-icon-badge" style={{ background: "#ecfdf5", color: "#059669" }}>
                <Calculator className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "#0f172a" }}>
                Automated Distance-Based Fare
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                Precise dynamic fare matrix that calculates exact station-to-station fares on exit tap with automated Razorpay digital wallet deductions.
              </p>
            </div>

            <div className="feature-box-card">
              <div className="feature-icon-badge" style={{ background: "#fef3c7", color: "#d97706" }}>
                <Search className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "#0f172a" }}>
                AI Lost & Found Luggage Hub
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                Passengers and drivers report forgotten baggage with photo uploads, AI item categorization, custody tagging, and verified recovery.
              </p>
            </div>

            <div className="feature-box-card">
              <div className="feature-icon-badge" style={{ background: "#fee2e2", color: "#dc2626" }}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "#0f172a" }}>
                Emergency SOS & Fleet Watchdog
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                One-tap driver emergency broadcast, speed violation alerts, route deviation detection, and instant notification to transit control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW IT WORKS: 4 SIMPLE STEPS */}
      <section id="how-it-works">
        <div className="landing-content-section">
          <div className="section-header-block">
            <div className="section-subhead-pill">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simple Commuter Journey</span>
            </div>
            <h2 className="section-main-title">How MoveSmart Works</h2>
            <p className="section-desc-text">
              Go from registration to destination seamlessly in four quick steps.
            </p>
          </div>

          <div className="steps-flow-container">
            <div className="step-block-card">
              <div className="step-badge-number" style={{ background: "#059669" }}>01</div>
              <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                Create Account & Apply Pass
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                Sign up in under a minute, submit your profile, and request your custom MoveSmart RFID contactless card.
              </p>
            </div>

            <div className="step-block-card">
              <div className="step-badge-number" style={{ background: "#7c3aed" }}>02</div>
              <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                Top Up Digital Wallet
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                Add funds securely using UPI, cards, or net banking via Razorpay with instant balance credit.
              </p>
            </div>

            <div className="step-block-card">
              <div className="step-badge-number" style={{ background: "#2563eb" }}>03</div>
              <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                Track Bus & Tap On Entry
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                Check live GPS arrival time, select your seat, and tap your card on the ESP32 reader when stepping aboard.
              </p>
            </div>

            <div className="step-block-card">
              <div className="step-badge-number" style={{ background: "#0f172a" }}>04</div>
              <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                Tap On Exit & Auto-Debit
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                Tap out upon reaching your destination. Exact distance-based fare is auto-calculated and debited.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS SECTION */}
      <section style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div className="landing-content-section">
          <div className="section-header-block">
            <div className="section-subhead-pill">
              <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>Real User Feedback</span>
            </div>
            <h2 className="section-main-title">Trusted by Kerala Commuters & Crew</h2>
            <p className="section-desc-text">
              Discover how daily tech commuters and transit operators rely on MoveSmart every day.
            </p>
          </div>

          <div className="features-grid-6col">
            <div className="feature-box-card">
              <div style={{ display: "flex", gap: "3px", color: "#f59e0b", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: "1.6", fontStyle: "italic", marginBottom: "18px" }}>
                "Traveling from Vyttila Hub to Kakkanad Infopark used to be unpredictable. With MoveSmart live bus radar and RFID tap, I save 20 minutes every single morning!"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #059669, #7c3aed)", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>
                  RM
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>Rahul Menon</div>
                  <div style={{ fontSize: "11px", color: "#059669", fontWeight: "600" }}>Infopark Phase 2 Software Engineer</div>
                </div>
              </div>
            </div>

            <div className="feature-box-card">
              <div style={{ display: "flex", gap: "3px", color: "#f59e0b", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: "1.6", fontStyle: "italic", marginBottom: "18px" }}>
                "The Driver Edge AI camera alerts and voice cues are a genuine lifesaver on late-night highway routes. Boarding with contactless RFID takes 2 seconds per rider."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>
                  SK
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>Suresh Kumar</div>
                  <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: "600" }}>Senior Bus Driver • Route 101</div>
                </div>
              </div>
            </div>

            <div className="feature-box-card">
              <div style={{ display: "flex", gap: "3px", color: "#f59e0b", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: "1.6", fontStyle: "italic", marginBottom: "18px" }}>
                "I forgot my laptop bag on the bus last Friday. Within 15 minutes of reporting it on MoveSmart Lost & Found, the driver verified custody and I got it back safely."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #059669)", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>
                  AN
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>Ananya Nair</div>
                  <div style={{ fontSize: "11px", color: "#059669", fontWeight: "600" }}>Daily Kochi Metro Commuter</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CALL TO ACTION BANNER */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
          <div className="cta-glass-banner">
            <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "36px", fontWeight: "800", marginBottom: "14px", letterSpacing: "-0.6px" }}>
              Ready for a Smarter, Faster Commute?
            </h2>
            <p style={{ fontSize: "16px", color: "#cbd5e1", maxWidth: "620px", margin: "0 auto 28px", lineHeight: "1.6" }}>
              Join thousands of commuters across Kochi and Kerala traveling cashless with MoveSmart RFID passes and real-time bus tracking.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/signup")} className="btn-hero-primary" style={{ padding: "14px 28px", fontSize: "15px" }}>
                <span>Create Free Account</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => navigate("/login")} className="btn-hero-secondary" style={{ padding: "14px 24px", fontSize: "15px" }}>
                <span>Commuter Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="landing-footer-area">
        <div className="footer-grid-columns">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
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
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff" }}>MoveSmart</span>
            </div>
            <p style={{ fontSize: "13.5px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "18px" }}>
              Kerala's integrated IoT Smart Urban Transit platform. Powered by ESP32 microcontrollers, Edge AI safety radar, and contactless RFID ticketing.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#34d399", fontWeight: "700" }}>
              <div className="pulse-dot-green"></div>
              <span>All ESP32 Transit Gateways Operational</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Commuters</div>
            <div className="footer-col-links">
              <button className="footer-link-btn" onClick={() => navigate("/login")}>Passenger Dashboard</button>
              <button className="footer-link-btn" onClick={() => navigate("/signup")}>Apply for Smart Card</button>
              <button className="footer-link-btn" onClick={() => navigate("/login")}>Recharge Wallet</button>
              <button className="footer-link-btn" onClick={() => navigate("/login")}>AI Lost & Found</button>
              <button className="footer-link-btn" onClick={() => scrollToSection("corridors")}>Route Timetables</button>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Fleet & Crew</div>
            <div className="footer-col-links">
              <button className="footer-link-btn" onClick={() => navigate("/login")}>Driver Cockpit</button>
              <button className="footer-link-btn" onClick={() => navigate("/apply-driver")}>Driver Registration</button>
              <button className="footer-link-btn" onClick={() => navigate("/login")}>Edge AI Safety Camera</button>
              <button className="footer-link-btn" onClick={() => navigate("/login")}>ESP32 Hardware Test</button>
              <button className="footer-link-btn" onClick={() => navigate("/login")}>Admin Command</button>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Support & Hotline</div>
            <div className="footer-col-links">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>+91 1800-425-9090</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                <Mail className="w-4 h-4 text-purple-400" />
                <span>support@movesmart.kerala.gov</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Mobility Hub, Vyttila, Kochi</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom-strip">
          <div>
            &copy; {new Date().getFullYear()} MoveSmart Kerala Urban Transit System. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "18px" }}>
            <span style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Privacy Policy</span>
            <span style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Terms of Service</span>
            <span style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Security & RFID Standards</span>
          </div>
        </div>
      </footer>
    </div>
  );
}