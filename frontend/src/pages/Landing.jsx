import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  // Fare Calculator states
  const [origin, setOrigin] = useState("A");
  const [destination, setDestination] = useState("B");
  const [fareEstimate, setFareEstimate] = useState(4.00);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Zone mapping
  const zones = [
    { value: "A", name: "Zone A (Downtown Central)" },
    { value: "B", name: "Zone B (North Heights & Suburbs)" },
    { value: "C", name: "Zone C (West Tech Park)" },
    { value: "D", name: "Zone D (East Harbor District)" }
  ];

  // Calculate fare dynamically
  const calculateFare = (orig, dest) => {
    const charCodeOrig = orig.charCodeAt(0);
    const charCodeDest = dest.charCodeAt(0);
    const distance = Math.abs(charCodeOrig - charCodeDest);
    
    // Base fare: $2.50 + $1.50 per zone boundary crossed
    const base = 2.50;
    const rate = 1.50;
    const total = base + (distance * rate);
    
    setFareEstimate(total);
  };

  const handleOriginChange = (e) => {
    const val = e.target.value;
    setOrigin(val);
    calculateFare(val, destination);
  };

  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestination(val);
    calculateFare(origin, val);
  };

  // Newsletter Validation
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    setNewsletterError("");
    setNewsletterSuccess(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newsletterEmail) {
      setNewsletterError("Email address is required to subscribe.");
      return;
    }
    if (!emailRegex.test(newsletterEmail)) {
      setNewsletterError("Please provide a valid email address.");
      return;
    }

    // Success simulation
    setNewsletterSuccess(true);
    setNewsletterEmail("");
  };

  return (
    <div>
      {/* Navigation */}
      <nav className="landing-nav">
        <a href="/" className="landing-logo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
            <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
            <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
          </svg>
          MoveSmart
        </a>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#calculator">Fare Finder</a>
          <a href="#newsletter">Newsletter</a>
        </div>
        <div className="landing-nav-actions">
          <button className="btn-text" onClick={() => navigate("/login")}>
            Sign In
          </button>
          <button className="btn-primary btn-sm" onClick={() => navigate("/signup")}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1>
            Your Smart Companion for <span>Urban Mobility</span>
          </h1>
          <p>
            Experience seamless, eco-friendly public transit and city moving solutions. 
            Plan optimized routes, track buses in real-time, and manage all your fare passes in one unified dashboard.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate("/signup")} style={{ width: "auto", padding: "14px 28px" }}>
              Start Commuting Smart
            </button>
            <button className="btn-secondary" onClick={() => navigate("/login")} style={{ width: "auto", padding: "14px 28px" }}>
              Explore Portal
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="map-widget">
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "15px" }}>Live Transit Map</h3>
            <div className="map-route-bar">
              <div className="route-stop">
                <div className="route-dot success-dot"></div>
                <div className="route-info">
                  <h4>Downtown Central Terminal</h4>
                  <p>Line 42 — Arrived 2m ago</p>
                </div>
              </div>
              <div className="route-stop">
                <div className="route-dot"></div>
                <div className="route-info">
                  <h4>North Heights Bus Stop</h4>
                  <p>Line 42 — Approaching (Est. 5 min)</p>
                </div>
              </div>
              <div className="route-stop">
                <div className="route-dot" style={{ borderColor: "#a855f7" }}></div>
                <div className="route-info">
                  <h4>West Tech Business Plaza</h4>
                  <p>Line 10 — Est. 12 min</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Why Commuters Choose MoveSmart</h2>
          <p>We combine advanced tech, scheduling, and local data to simplify your daily trips.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </div>
            <h3>Intelligent Route Planner</h3>
            <p>Enter any destination and receive multi-modal paths optimized for speed, transfers, or carbon footprints.</p>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3>Real-Time Location Tracking</h3>
            <p>Know exactly when your bus, subway, or shuttle arrives using GPS coordinates sent straight to your screen.</p>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3>Unified Fare Dashboard</h3>
            <p>Load funds, manage ticket subscriptions, and scan virtual NFC tickets directly from your mobile wallet dashboard.</p>
          </div>
        </div>
      </section>

      {/* Live Calculator Section */}
      <section id="calculator" className="calc-section">
        <div className="calc-desc">
          <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-1px" }}>Transit Cost Calculator</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "15px", lineHeight: "1.6", fontSize: "16px" }}>
            Plan your commuting budget transparently. Select your starting zone and target destination, and our smart calculator will show the exact fare ticket price instantly.
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", background: "var(--primary)", borderRadius: "50%" }}></span>
              Zone A & B commute: $4.00
            </span>
            <span style={{ fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", background: "var(--primary)", borderRadius: "50%" }}></span>
              Zone A & C commute: $5.50
            </span>
          </div>
        </div>

        <div className="calc-widget-container">
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Estimate Commute Ticket</h3>
          <div className="select-wrapper">
            <label>Origin Terminal</label>
            <select value={origin} onChange={handleOriginChange}>
              {zones.map((z) => (
                <option key={z.value} value={z.value}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <label>Destination Terminal</label>
            <select value={destination} onChange={handleDestinationChange}>
              {zones.map((z) => (
                <option key={z.value} value={z.value}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="calc-result-box">
            <h4>Estimated Fare Cost</h4>
            <div className="price">${fareEstimate.toFixed(2)}</div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup Form */}
      <section id="newsletter" className="newsletter-section">
        <div className="newsletter-content">
          <h2>Stay Smartly Connected</h2>
          <p>Subscribe to receive system alerts, weekend scheduling updates, and smart mobility tips.</p>
          
          {newsletterSuccess ? (
            <div className="alert alert-success" style={{ maxWidth: "450px", margin: "0 auto 20px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Congratulations! You have successfully subscribed to MoveSmart.</span>
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter email address"
              />
              <button type="submit">Subscribe</button>
            </form>
          )}

          {newsletterError && (
            <div className="error-msg" style={{ justifyContent: "center", color: "#fca5a5", marginTop: "10px" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {newsletterError}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} MoveSmart Inc. All rights reserved. Connecting Cities Smarter.</p>
      </footer>
    </div>
  );
}

export default Landing;
