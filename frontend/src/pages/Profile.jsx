import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeSubTab, setActiveSubTab] = useState("info");

  // Profile form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("050-1234567");
  const [lang, setLang] = useState("English");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Nol Cards states
  const [cards, setCards] = useState([
    { id: "3028374829", type: "Silver", balance: 42.50, expiry: "12/2031", status: "Active" },
    { id: "5081726354", type: "Gold", balance: 120.00, expiry: "08/2032", status: "Active" }
  ]);
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);

  // Link New Card states
  const [newCardId, setNewCardId] = useState("");
  const [newCardType, setNewCardType] = useState("Silver");
  const [linkSuccess, setLinkSuccess] = useState("");

  // Transaction history per card type
  const [transactions, setTransactions] = useState({
    "Silver": [
      { id: "tx1", title: "Bus C01 — Al Ghubaiba to Gold Souq", date: "Today, 10:45 AM", amount: "-3.00 AED", isDebit: true },
      { id: "tx2", title: "Nol Web Top-up", date: "Yesterday, 06:12 PM", amount: "+50.00 AED", isDebit: false },
      { id: "tx3", title: "Metro Red Line — Union to Dubai Mall", date: "20 May 2026", amount: "-5.00 AED", isDebit: true }
    ],
    "Gold": [
      { id: "tx4", title: "Metro Gold Cabin — Mall of Emirates to Burjuman", date: "Yesterday, 02:30 PM", amount: "-10.00 AED", isDebit: true },
      { id: "tx5", title: "Nol Web Top-up", date: "18 May 2026", amount: "+100.00 AED", isDebit: false }
    ],
    "Blue": [
      { id: "tx6", title: "Student Concession Ride — Bus 8", date: "Yesterday, 08:15 AM", amount: "-1.50 AED", isDebit: true },
      { id: "tx7", title: "Station Cash Top-up", date: "15 May 2026", amount: "+20.00 AED", isDebit: false }
    ]
  });

  // NFC Scanner simulator states
  const [nfcState, setNfcState] = useState("idle"); // idle, scanning, success
  const [scanMessage, setScanMessage] = useState("");

  // Saved Journeys states
  const [savedJourneys, setSavedJourneys] = useState([
    { id: 1, title: "Home to Office", from: "Al Barsha", to: "Dubai Media City", mode: "Metro" },
    { id: 2, title: "Weekend Souq Trip", from: "Jumeirah", to: "Gold Souq", mode: "Bus" }
  ]);
  const [newJourneyTitle, setNewJourneyTitle] = useState("");
  const [newJourneyFrom, setNewJourneyFrom] = useState("");
  const [newJourneyTo, setNewJourneyTo] = useState("");

  // Populate form fields once we have the logged-in user
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Protected route check
  useEffect(() => {
    if (!user) {
      localStorage.setItem(
        "moveSmart_loginWarning",
        "Please sign in to access your Dubai Bus Profile."
      );
      navigate("/login");
    }
  }, [user, navigate]);

  const handleProfileSave = (e) => {
    e.preventDefault();
    setProfileSuccess("");
    if (!name || !email) return;

    const updatedUser = { ...user, name, email };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));

    setProfileSuccess("Profile updated successfully!");
    setTimeout(() => setProfileSuccess(""), 4000);
  };

  const handleLinkCard = (e) => {
    e.preventDefault();
    setLinkSuccess("");

    if (!newCardId || newCardId.length !== 10 || isNaN(newCardId)) {
      alert("Please enter a valid 10-digit Nol Tag ID.");
      return;
    }

    const cardExists = cards.some(c => c.id === newCardId);
    if (cardExists) {
      alert("This Nol card is already linked to your profile.");
      return;
    }

    const newCard = {
      id: newCardId,
      type: newCardType,
      balance: 15.00, // Default signup balance
      expiry: "06/2033",
      status: "Active"
    };

    setCards([...cards, newCard]);

    // Add default mock transactions for new cards
    if (!transactions[newCardType]) {
      setTransactions({
        ...transactions,
        [newCardType]: [
          { id: Math.random().toString(), title: "Card Activation Balance", date: "Just now", amount: "+15.00 AED", isDebit: false }
        ]
      });
    }

    setLinkSuccess(`Successfully linked ${newCardType} Nol Card!`);
    setNewCardId("");
    setTimeout(() => setLinkSuccess(""), 4000);
  };

  const handleNfcSimulate = () => {
    if (cards.length === 0) {
      alert("Please link at least one Nol Card to simulate scanning.");
      return;
    }

    setNfcState("scanning");
    setScanMessage("Place phone near bus/metro reader card slot...");

    setTimeout(() => {
      const currentCard = cards[selectedCardIdx];
      const fareVal = currentCard.type === "Gold" ? 6.00 : 3.00;

      if (currentCard.balance < fareVal) {
        setNfcState("idle");
        setScanMessage(`Failed: Insufficient balance. Card balance is ${currentCard.balance.toFixed(2)} AED (Required: ${fareVal.toFixed(2)} AED)`);
        return;
      }

      // Deduct balance
      const updatedCards = [...cards];
      updatedCards[selectedCardIdx] = {
        ...currentCard,
        balance: currentCard.balance - fareVal
      };
      setCards(updatedCards);

      // Add debit transaction log
      const cardTypeKey = currentCard.type;
      const newTx = {
        id: Math.random().toString(),
        title: `Bus Concession Ride — Simulated NFC Tap`,
        date: "Just now",
        amount: `-${fareVal.toFixed(2)} AED`,
        isDebit: true
      };

      setTransactions({
        ...transactions,
        [cardTypeKey]: [newTx, ...(transactions[cardTypeKey] || [])]
      });

      setNfcState("success");
      setScanMessage(`BEEP! check-in successful. Fare charged: ${fareVal.toFixed(2)} AED. New Balance: ${(currentCard.balance - fareVal).toFixed(2)} AED.`);

      setTimeout(() => {
        setNfcState("idle");
        setScanMessage("");
      }, 4000);
    }, 1500);
  };

  const handleAddJourney = (e) => {
    e.preventDefault();
    if (!newJourneyTitle || !newJourneyFrom || !newJourneyTo) return;

    const newJ = {
      id: Date.now(),
      title: newJourneyTitle,
      from: newJourneyFrom,
      to: newJourneyTo,
      mode: "Bus"
    };

    setSavedJourneys([...savedJourneys, newJ]);
    setNewJourneyTitle("");
    setNewJourneyFrom("");
    setNewJourneyTo("");
  };

  const handleDeleteJourney = (id) => {
    setSavedJourneys(savedJourneys.filter(j => j.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="rta-body-theme" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* MoveSmart Header Navigation */}
      <nav className="rta-nav">
        <Link to="/" className="rta-logo" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <img 
            src="/logo.png" 
            alt="MoveSmart Logo" 
            style={{ 
              height: "72px", 
              width: "auto", 
              objectFit: "contain",
              filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.06))"
            }} 
          />
        </Link>
        <div className="rta-nav-menu">
          <Link to="/" className="rta-nav-link">Home</Link>
          <a href="/#services" className="rta-nav-link">Bus Services</a>
          <a href="/#nol-hub" className="rta-nav-link">Nol Portal</a>
          <Link to="/profile" className="rta-nav-link active">Profile</Link>
          <button onClick={handleLogout} className="rta-btn-secondary" style={{ padding: "8px 16px" }}>Sign Out</button>
        </div>
      </nav>

      {/* Profile Dashboard Layout */}
      <main className="profile-container" style={{ flex: "1" }}>
        {/* Profile Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
          <h2 className="profile-name">{name}</h2>
          <p className="profile-email">{email}</p>

          <div className="profile-menu">
            <button
              className={`profile-menu-item ${activeSubTab === "info" ? "active" : ""}`}
              onClick={() => setActiveSubTab("info")}
            >
              👤 Profile Info
            </button>
            <button
              className={`profile-menu-item ${activeSubTab === "wallet" ? "active" : ""}`}
              onClick={() => setActiveSubTab("wallet")}
            >
              💳 Nol Card Wallet
            </button>
            <button
              className={`profile-menu-item ${activeSubTab === "nfc" ? "active" : ""}`}
              onClick={() => setActiveSubTab("nfc")}
            >
              📱 NFC Tap Simulator
            </button>
            <button
              className={`profile-menu-item ${activeSubTab === "journeys" ? "active" : ""}`}
              onClick={() => setActiveSubTab("journeys")}
            >
              📍 Saved Journeys
            </button>
          </div>
        </aside>

        {/* Profile Details Panel */}
        <section className="profile-main">
          {/* TAB 1: PROFILE INFO */}
          {activeSubTab === "info" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">Account Details</h2>
              {profileSuccess && (
                <div style={{ color: "#059669", fontWeight: "700", marginBottom: "15px", fontSize: "14.5px" }}>
                  ✓ {profileSuccess}
                </div>
              )}
              <form onSubmit={handleProfileSave}>
                <div className="profile-grid-2col">
                  <div className="rta-input-group">
                    <label htmlFor="profile-name-input">Full Name</label>
                    <input
                      id="profile-name-input"
                      type="text"
                      className="rta-input-field"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="profile-email-input">Email Address</label>
                    <input
                      id="profile-email-input"
                      type="email"
                      className="rta-input-field"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="profile-grid-2col">
                  <div className="rta-input-group">
                    <label htmlFor="profile-phone-input">Phone Number (UAE)</label>
                    <input
                      id="profile-phone-input"
                      type="text"
                      className="rta-input-field"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="profile-lang-select">Preferred Language</label>
                    <select
                      id="profile-lang-select"
                      className="rta-input-field"
                      value={lang}
                      onChange={(e) => setLang(e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Arabic">العربية (Arabic)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="rta-btn-primary" style={{ marginTop: "15px" }}>
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: NOL CARD WALLET */}
          {activeSubTab === "wallet" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">My Nol Cards</h2>

              {cards.length === 0 ? (
                <p style={{ color: "#717B87", fontStyle: "italic" }}>No cards linked to your account.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "30px" }}>

                  {/* Cards Carousel/Selector */}
                  <div>
                    <h4 style={{ fontWeight: "800", marginBottom: "15px" }}>Linked Nol Cards</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      {cards.map((c, idx) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCardIdx(idx)}
                          style={{
                            cursor: "pointer",
                            border: selectedCardIdx === idx ? "2px solid var(--rta-red)" : "2px solid transparent",
                            borderRadius: "18px",
                            padding: "4px"
                          }}
                        >
                          <div className={`rta-nol-card-preview ${c.type.toLowerCase()}`}>
                            <div className="rta-nol-card-header">
                              <span className="rta-nol-brand">nol</span>
                              <div className="rta-nol-chip"></div>
                            </div>
                            <div className="rta-nol-card-body">
                              <div className="rta-nol-balance-title">{c.type} Card Balance</div>
                              <div className="rta-nol-balance-val">{c.balance.toFixed(2)} AED</div>
                            </div>
                            <div className="rta-nol-card-footer">
                              <div className="rta-nol-number">{c.id}</div>
                              <div className="rta-nol-status">{c.status}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transaction History for selected Card */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                      <h4 style={{ fontWeight: "800" }}>Transaction Logs</h4>
                      <span style={{ fontSize: "12px", color: "var(--rta-gold)", fontWeight: "700" }}>
                        Tag: {cards[selectedCardIdx]?.id}
                      </span>
                    </div>

                    <div className="tx-list">
                      {(transactions[cards[selectedCardIdx]?.type] || []).map((tx) => (
                        <div key={tx.id} className="tx-item">
                          <div className="tx-info">
                            <span className="tx-title">{tx.title}</span>
                            <span className="tx-meta">{tx.date}</span>
                          </div>
                          <span className={`tx-amount ${tx.isDebit ? "minus" : "plus"}`}>
                            {tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Link New Nol Card Form */}
              <div style={{ borderTop: "2px solid var(--rta-gray-border)", marginTop: "40px", paddingTop: "25px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "15px" }}>Link Additional Nol Card</h3>
                {linkSuccess && (
                  <div style={{ color: "#059669", fontWeight: "700", marginBottom: "15px", fontSize: "13.5px" }}>
                    ✓ {linkSuccess}
                  </div>
                )}
                <form onSubmit={handleLinkCard} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "15px", alignItems: "flex-end" }}>
                  <div className="rta-input-group">
                    <label htmlFor="newcard-id-input">Nol Tag ID (10 digits)</label>
                    <input
                      id="newcard-id-input"
                      type="text"
                      maxLength="10"
                      className="rta-input-field"
                      value={newCardId}
                      onChange={(e) => setNewCardId(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 3012938475"
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="newcard-type-select">Card Type</label>
                    <select
                      id="newcard-type-select"
                      className="rta-input-field"
                      value={newCardType}
                      onChange={(e) => setNewCardType(e.target.value)}
                    >
                      <option value="Silver">Silver Nol</option>
                      <option value="Gold">Gold Nol</option>
                      <option value="Blue">Blue Personal</option>
                    </select>
                  </div>
                  <button type="submit" className="rta-btn-primary" style={{ height: "46px" }}>
                    Link Card
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: NFC TAP SIMULATOR */}
          {activeSubTab === "nfc" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">Virtual NFC Reader Tap</h2>
              <p style={{ color: "#717B87", fontSize: "14px", marginBottom: "25px", lineHeight: "1.6" }}>
                Simulate tapping your digital wallet device on a bus card reader check-in gate. Select a card from your wallet, then click the tap zone to scan.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "40px", alignItems: "center" }}>

                {/* Simulator Reader Box */}
                <div className="nfc-simulator-box">
                  <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", color: "var(--rta-gold)" }}>RTA NFC Reader</div>

                  <div
                    className={`nfc-tap-zone ${nfcState === "scanning" ? "scanning" : nfcState === "success" ? "success" : ""}`}
                    onClick={handleNfcSimulate}
                  >
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>

                  <div style={{ fontSize: "13.5px", fontWeight: "600", minHeight: "36px" }}>
                    {nfcState === "idle" && "Tap to simulate check-in"}
                    {nfcState === "scanning" && "Scanning Device..."}
                    {nfcState === "success" && "BEEP! Approved"}
                  </div>
                </div>

                {/* Configuration Area */}
                <div>
                  <div className="rta-input-group" style={{ marginBottom: "20px" }}>
                    <label htmlFor="nfc-card-select">Choose Nol Card to Tap</label>
                    <select
                      id="nfc-card-select"
                      className="rta-input-field"
                      value={selectedCardIdx}
                      onChange={(e) => setSelectedCardIdx(Number(e.target.value))}
                    >
                      {cards.map((c, idx) => (
                        <option key={c.id} value={idx}>
                          {c.type} Nol Card ({c.id}) — {c.balance.toFixed(2)} AED
                        </option>
                      ))}
                    </select>
                  </div>

                  {scanMessage && (
                    <div className="rta-card" style={{ padding: "16px", borderColor: nfcState === "success" ? "#059669" : "var(--rta-gold)", backgroundColor: nfcState === "success" ? "rgba(5, 150, 105, 0.05)" : "rgba(192, 153, 77, 0.05)" }}>
                      <span style={{ fontSize: "13.5px", color: "#1F2226", fontWeight: "600", lineHeight: "1.5", display: "block" }}>
                        {scanMessage}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SAVED JOURNEYS */}
          {activeSubTab === "journeys" && (
            <div className="fade-in-section">
              <h2 className="profile-section-title">Saved Journeys &amp; Routes</h2>
              <p style={{ color: "#717B87", fontSize: "14px", marginBottom: "25px" }}>
                Keep track of your frequently used routes for fast access to live schedule searches.
              </p>

              {/* Saved Journeys List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "40px" }}>
                {savedJourneys.map((j) => (
                  <div key={j.id} className="rta-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px" }}>
                    <div>
                      <h4 style={{ fontWeight: "800", fontSize: "15.5px", color: "#1F2226", marginBottom: "4px" }}>{j.title}</h4>
                      <p style={{ fontSize: "13px", color: "#717B87" }}>
                        From **{j.from}** ➜ To **{j.to}** ({j.mode})
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => {
                          localStorage.setItem("moveSmart_origin", j.from);
                          localStorage.setItem("moveSmart_dest", j.to);
                          navigate("/");
                        }}
                        className="rta-btn-primary"
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                      >
                        Search Route
                      </button>
                      <button
                        onClick={() => handleDeleteJourney(j.id)}
                        className="rta-btn-secondary"
                        style={{ padding: "8px 12px", fontSize: "13px", color: "var(--rta-red)", borderColor: "rgba(214, 28, 28, 0.2)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Saved Journey Form */}
              <div style={{ borderTop: "2px solid var(--rta-gray-border)", paddingTop: "25px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "15px" }}>Add New Favorite Route</h3>
                <form onSubmit={handleAddJourney} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 100px", gap: "15px", alignItems: "flex-end" }}>
                  <div className="rta-input-group">
                    <label htmlFor="journey-title-input">Route Label / Title</label>
                    <input
                      id="journey-title-input"
                      type="text"
                      className="rta-input-field"
                      value={newJourneyTitle}
                      onChange={(e) => setNewJourneyTitle(e.target.value)}
                      placeholder="e.g. Work commute"
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="journey-from-input">From Stop</label>
                    <input
                      id="journey-from-input"
                      type="text"
                      className="rta-input-field"
                      value={newJourneyFrom}
                      onChange={(e) => setNewJourneyFrom(e.target.value)}
                      placeholder="e.g. Al Barsha"
                      required
                    />
                  </div>
                  <div className="rta-input-group">
                    <label htmlFor="journey-to-input">To Stop</label>
                    <input
                      id="journey-to-input"
                      type="text"
                      className="rta-input-field"
                      value={newJourneyTo}
                      onChange={(e) => setNewJourneyTo(e.target.value)}
                      placeholder="e.g. Dubai Media City"
                      required
                    />
                  </div>
                  <button type="submit" className="rta-btn-primary" style={{ height: "46px", justifyContent: "center" }}>
                    Add
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer Branding */}
      <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "40px 5%", borderTop: "3px solid var(--primary)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "30px" }}>
          <div>
            <div className="rta-logo" style={{ color: "#FFFFFF", marginBottom: "15px" }}>
              <div className="brand-icon" style={{ display: "inline-flex", background: "var(--primary)", color: "#fff", padding: "6px", borderRadius: "8px", marginRight: "4px" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
                  <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
                  <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span style={{ color: "#fff" }}>MoveSmart</span>
            </div>
            <p style={{ fontSize: "13px", maxWidth: "320px", lineHeight: "1.6", color: "#b7aed6" }}>
              Smart Urban Transit &amp; Logistics portal companion. Optimized route scheduling, Nol wallet tracking, and carbon-footprint reduction diagnostics.
            </p>
          </div>
          <div style={{ display: "flex", gap: "40px" }}>
            <div>
              <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Transit Services</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><Link to="/" style={{ color: "#b7aed6", textDecoration: "none" }}>Dubai Bus Routes</Link></li>
                <li><Link to="/profile" style={{ color: "#b7aed6", textDecoration: "none" }}>Nol Card System</Link></li>
                <li><Link to="/" style={{ color: "#b7aed6", textDecoration: "none" }}>Intercity Coaches</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Support</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><Link to="/" style={{ color: "#b7aed6", textDecoration: "none" }}>Chat with Mahboub</Link></li>
                <li><span style={{ color: "#b7aed6" }}>Call Center 800 9090</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "30px", paddingTop: "20px", textAlign: "center", fontSize: "12px", color: "#717B87" }}>
          © {new Date().getFullYear()} MoveSmart. Every trip counted. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Profile;