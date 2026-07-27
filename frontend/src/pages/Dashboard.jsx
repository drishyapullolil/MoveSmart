import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import CardApplication from "./Cardapplication";
import { processRazorpayPayment } from "../utils/razorpay";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("planner");
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Real RFID States
  const [myCards, setMyCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [bookRfidTag, setBookRfidTag] = useState("");
  const [bookCardType, setBookCardType] = useState("Silver");
  const [bookSuccess, setBookSuccess] = useState("");
  const [bookError, setBookError] = useState("");
  const [journeyHistory, setJourneyHistory] = useState([]);

  // Wojhati Planner States
  const [origin, setOrigin] = useState("Kochi Bus Stand");
  const [destination, setDestination] = useState("Thiruvananthapuram Central");
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [planTime, setPlanTime] = useState("12:00");
  const [plannerResults, setPlannerResults] = useState(null);

  // Nol Balance Checker States
  const [nolTagId, setNolTagId] = useState("");
  const [balanceResult, setBalanceResult] = useState(null);
  const [checkError, setCheckError] = useState("");

  // Nol Top Up States
  const [topUpTagId, setTopUpTagId] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("50");
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // Bus Route Schedule Search States
  const [routeQuery, setRouteQuery] = useState("");
  const [scheduleResult, setScheduleResult] = useState(null);

  // Intercity Booking States
  const [intercityFrom, setIntercityFrom] = useState("Kochi (M.G. Road)");
  const [intercityTo, setIntercityTo] = useState("Calicut (Private Bus Stand)");
  const [intercitySeats, setIntercitySeats] = useState("1");
  const [intercitySuccess, setIntercitySuccess] = useState(false);

  // Mahboub Chatbot States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Namaskaram! I am Mahboub, your MoveSmart Virtual Assistant. How can I help you navigate today?" }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Wojhati Search Handler
  const handleSearchRoutes = () => {
    if (!origin || !destination) return;

    const mockRoutes = [
      {
        id: 1,
        mode: "Express Bus",
        busName: "Kerala Express",
        busNumber: "KL-101",
        source: origin,
        destination,
        departureTime: planTime,
        arrivalTime: "10:30",
        travelDate: planDate,
        seatsAvailable: 25,
        fare: "120.00",
        distance: "200 km",
        rating: "4.9",
        status: "Seats Available",
        steps: [
          { type: "Walk", desc: `Walk from ${origin} to the main bus stop (5 mins)` },
          { type: "Bus", desc: "Premium air‑conditioned coach with Wi‑Fi" },
          { type: "Walk", desc: `Arrive at ${destination} (5 mins)` }
        ]
      },
      {
        id: 2,
        mode: "Direct Coach",
        busName: "Kerala Deluxe",
        busNumber: "KL-202",
        source: origin,
        destination,
        departureTime: "14:00",
        arrivalTime: "16:20",
        travelDate: planDate,
        seatsAvailable: 0,
        fare: "100.00",
        distance: "150 km",
        rating: "4.7",
        status: "Bus Full",
        steps: [
          { type: "Bus", desc: `Direct coach from ${origin} to ${destination}` },
          { type: "Walk", desc: `Alight and walk to the terminal (3 mins)` }
        ]
      }
    ];
    setPlannerResults(mockRoutes);
  };

  const fetchMyCards = useCallback(async () => {
    if (!user?.email) return;

    try {
      const res = await axios.get(`/api/rfid/my-cards?email=${user.email}`);
      setMyCards(res.data.cards || []);
    } catch (err) {
      console.error("Error fetching cards:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role?.toLowerCase() === "driver") {
      navigate("/dashboard/driver");
      return;
    }
    if (user?.email) {
      const timer = window.setTimeout(() => {
        void fetchMyCards();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [user, fetchMyCards, navigate]);

  const handleBookCard = async (e) => {
    e.preventDefault();
    setBookError("");
    setBookSuccess("");
    if (!bookRfidTag.trim()) {
      setBookError("Please enter an RFID Tag ID.");
      return;
    }
    try {
      const res = await axios.post("/api/rfid/book", {
        rfidTag: bookRfidTag.trim(),
        cardType: bookCardType,
        userEmail: user?.email,
        initialBalance: 20.0
      });
      setBookSuccess(`Card registered successfully! Card: ${res.data.card.cardNumber}`);
      setBookRfidTag("");
      fetchMyCards();
    } catch (err) {
      setBookError(err.response?.data?.message || "Failed to register card.");
    }
  };

  const selectCard = async (card) => {
    setSelectedCard(card);
    setNolTagId(card.cardNumber);
    setTopUpTagId(card.cardNumber);
    try {
      const historyRes = await axios.get(`/api/rfid/history/${card.cardNumber}`);
      setJourneyHistory(historyRes.data.journeys || []);
    } catch (err) {
      console.error("Error fetching card history:", err);
    }
  };

  // Nol Balance Checker Handler
  const handleCheckBalance = async () => {
    setCheckError("");
    setBalanceResult(null);

    if (!nolTagId) {
      setCheckError("Please enter your 10-digit Nol Card Number or Tag ID.");
      return;
    }

    try {
      const res = await axios.get(`/api/rfid/balance/${nolTagId.trim()}`);
      setBalanceResult({
        tagId: res.data.cardNumber,
        rfidTag: res.data.rfidTag,
        type: `${res.data.cardType} Nol Card`,
        balance: res.data.balance.toFixed(2),
        expiry: "12/2031",
        status: res.data.status
      });
    } catch (err) {
      setCheckError(err.response?.data?.message || "Card not found.");
    }
  };

  // Nol Top Up Handler via Razorpay
  const handleTopUpSubmit = (e) => {
    e.preventDefault();
    if (!topUpTagId) {
      alert("Please enter a valid Card Number or Tag ID.");
      return;
    }

    processRazorpayPayment({
      amount: Number(topUpAmount),
      description: `MoveSmart Nol Card Top-Up (${topUpTagId.trim()})`,
      userEmail: user?.email || "",
      userName: user?.name || "Transit Rider",
      paymentType: "topup",
      tagId: topUpTagId.trim(),
      onSuccess: (data) => {
        setTopUpSuccess(true);
        if (user && user.email) {
          fetchMyCards();
        }
        if (selectedCard && data.card && (selectedCard.cardNumber === data.card.cardNumber || selectedCard.rfidTag === data.card.rfidTag)) {
          selectCard(data.card);
        }
        setTimeout(() => {
          setTopUpSuccess(false);
          setTopUpTagId("");
        }, 4000);
      },
      onError: (err) => {
        if (!err.message?.includes("cancelled")) {
          alert(`Top-Up Payment Error: ${err.message}`);
        }
      },
    });
  };

  // Route Schedule Search Handler
  const handleSearchSchedule = () => {
    if (!routeQuery) return;
    const q = routeQuery.toUpperCase().trim();

    const mockRoutesDb = {
      "K01": {
        name: "Kochi Bus Stand ➜ Thiruvananthapuram Central",
        frequency: "Every 30 mins",
        stops: ["Kochi Bus Stand", "Alappuzha", "Kollam", "Thiruvananthapuram Central"],
        timetable: ["06:00", "06:30", "07:00", "07:30", "08:00"]
      },
      "K02": {
        name: "Kochi (M.G. Road) ➜ Calicut (Private Bus Stand)",
        frequency: "Every 45 mins",
        stops: ["Kochi (M.G. Road)", "Thrissur", "Palakkad", "Calicut (Private Bus Stand)"],
        timetable: ["05:45", "06:30", "07:15", "08:00", "08:45"]
      },
      "K03": {
        name: "Thiruvananthapuram ➜ Kottayam",
        frequency: "Every 20 mins",
        stops: ["Thiruvananthapuram Central", "Nedumangad", "Kottayam"],
        timetable: ["06:10", "06:30", "06:50", "07:10", "07:30"]
      }
    };

    if (mockRoutesDb[q]) {
      setScheduleResult({
        route: q,
        ...mockRoutesDb[q]
      });
    } else {
      setScheduleResult({
        route: q,
        error: "Route not found. Try searching K01, K02, or K03."
      });
    }
  };

  // Intercity Booking Handler
  const handleIntercitySubmit = (e) => {
    e.preventDefault();
    setIntercitySuccess(true);
    setTimeout(() => {
      setIntercitySuccess(false);
    }, 4000);
  };

  // Chatbot Handler
  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const newMessages = [...chatMessages, { sender: "user", text: userText }];
    setChatMessages(newMessages);
    setChatInput("");

    // Simulate smart bot typing answers
    setTimeout(() => {
      let botResponse = "I'm sorry, I didn't quite catch that. You can ask me to 'Check K01 schedule', 'Check Kerala bus types' or 'Fares'.";
      const q = userText.toLowerCase();

      if (q.includes("k01") || q.includes("k02") || q.includes("k03")) {
        botResponse = "You can search for live timetables on the Bus Schedule tab on the main page. K01 operates every 30 minutes from Kochi Bus Stand.";
      } else if (q.includes("rfid") || q.includes("card")) {
        botResponse = "MoveSmart supports various RFID cards for seamless boarding. You can top up or apply directly in the RFID Card tab above!";
      } else if (q.includes("intercity")) {
        botResponse = "Yes, intercity buses run from major hubs like Kochi and Thiruvananthapuram. Check out the Intercity tab!";
      } else if (q.includes("fare") || q.includes("price")) {
        botResponse = "Fares depend on transit distances. Express services have dynamic pricing based on your destination.";
      }

      setChatMessages(prev => [...prev, { sender: "bot", text: botResponse }]);
    }, 600);
  };

  const swapPlannerAddresses = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setUser(null);
    navigate("/");
  };

  return (
    <div className="rta-body-theme">
      {/* MoveSmart Header Navigation */}
      <nav className="rta-nav">
        <Link to="/" className="rta-logo" style={{ display: "inline-flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <img 
            src="/logo.png" 
            alt="MoveSmart Logo" 
            style={{ 
              height: "52px", 
              width: "auto", 
              objectFit: "contain",
              filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.06))"
            }} 
          />
          <span style={{ fontSize: "22px", fontWeight: "800", background: "linear-gradient(135deg, #38a169, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MoveSmart
          </span>
        </Link>

        <div className="rta-nav-menu">
          <a href="#services" className="rta-nav-link">Bus Services</a>
          <a href="#nol-hub" className="rta-nav-link">RFID Portal</a>
          <a href="#schedules" className="rta-nav-link">Schedules</a>
          <Link to="/dashboard/card-application" className="rta-nav-link">Card Application</Link>
          {user ? (
            <>
              <Link
                to="/profile"
                className={`rta-nav-link ${location.pathname === "/profile" ? "active" : ""}`}
              >
                Profile ({user.name})
              </Link>
              <button onClick={handleLogout} className="rta-btn-secondary" style={{ padding: "8px 16px" }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rta-nav-link">Sign In</Link>
              <Link to="/signup" className="rta-btn-primary">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* MoveSmart Hero Portal section */}
      <header className="rta-hero">
        <h1 className="rta-hero-title">MoveSmart <span>Transit Portal</span></h1>
        <p className="rta-hero-subtitle">
          Plan inter-district routes, manage your virtual RFID wallet, view timetables, and book express coach lines on the state grid.
        </p>
      </header>

      {/* Wojhati & Travel Services Container */}
      <main className="rta-section" style={{ marginTop: "0", flex: "1 0 auto" }}>
        <div className="rta-planner-card">
          <div className="rta-tabs-header">
            <button 
              className={`rta-tab-btn ${activeTab === "planner" ? "active" : ""}`}
              onClick={() => setActiveTab("planner")}
            >
              Journey Planner
            </button>
            <button 
              className={`rta-tab-btn ${activeTab === "nol" ? "active" : ""}`}
              onClick={() => setActiveTab("nol")}
            >
              RFID Card Portal
            </button>
            <button 
              className={`rta-tab-btn ${activeTab === "schedules" ? "active" : ""}`}
              onClick={() => setActiveTab("schedules")}
            >
              Bus Timetables
            </button>
            <button 
              className={`rta-tab-btn ${activeTab === "intercity" ? "active" : ""}`}
              onClick={() => setActiveTab("intercity")}
            >
              Express Tickets
            </button>
          </div>

          {/* TAB 1: WOJHATI JOURNEY PLANNER */}
          {activeTab === "planner" && (
            <div className="fade-in-section">
              <div className="rta-planner-grid">
                <div className="rta-input-group">
                  <label htmlFor="planner-origin">Origin / Starting Stop</label>
                  <input 
                    id="planner-origin"
                    type="text" 
                    className="rta-input-field" 
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Kochi Bus Stand"
                  />
                </div>
                
                <button className="rta-swap-btn" onClick={swapPlannerAddresses} aria-label="Swap locations">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
                  </svg>
                </button>

                <div className="rta-input-group">
                  <label htmlFor="planner-destination">Destination Stop</label>
                  <input 
                    id="planner-destination"
                    type="text" 
                    className="rta-input-field" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Thiruvananthapuram Central"
                  />
                </div>

                <div className="rta-input-group">
                  <label htmlFor="planner-date">Date</label>
                  <input 
                    id="planner-date"
                    type="date" 
                    className="rta-input-field" 
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                  />
                </div>

                <div className="rta-input-group">
                  <label htmlFor="planner-time">Departure Time</label>
                  <input 
                    id="planner-time"
                    type="time" 
                    className="rta-input-field" 
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button className="rta-btn-primary" onClick={handleSearchRoutes}>
                  Find Route Options
                </button>
              </div>

              {/* Wojhati Results */}
              {plannerResults && (
                <div style={{ marginTop: "30px", borderTop: "1px solid var(--rta-gray-border)", paddingTop: "25px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "15px" }}>Recommended Routes</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {plannerResults.map((res) => {
                      const isFull = res.seatsAvailable <= 0;
                      return (
                        <div
                          key={res.id}
                          className="rta-card"
                          style={{
                            padding: "18px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                            background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>{res.busName}</span>
                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", background: "#f1f5f9", padding: "4px 8px", borderRadius: "999px" }}>
                                  {res.busNumber}
                                </span>
                              </div>
                              <div style={{ marginTop: "6px", fontSize: "13px", color: "#64748b" }}>
                                {res.source} → {res.destination}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isFull ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.12)", color: isFull ? "#dc2626" : "#16a34a", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isFull ? "#dc2626" : "#22c55e" }} />
                              {isFull ? "Bus Full" : "Seats Available"}
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
                            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Departure</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>{res.departureTime}</div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Arrival</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>{res.arrivalTime}</div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>{res.travelDate}</div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Seats</div>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>{res.seatsAvailable}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button className="rta-btn-primary" style={{ padding: "8px 14px", fontSize: "12.5px" }}>Book Seat</button>
                              <button className="rta-btn-secondary" style={{ padding: "8px 14px", fontSize: "12.5px" }}>View Details</button>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "16px", fontWeight: "800", color: "#111827" }}>{res.fare} AED</div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>⭐ {res.rating} • {res.distance} • Live tracking</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NOL SERVICES (BALANCE CHECKER & TOP UP) */}
          {activeTab === "nol" && (
            <div className="fade-in-section">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                
                {/* Balance Checker & Booking */}
                <div style={{ borderRight: "1px solid var(--rta-gray-border)", paddingRight: "30px" }}>
                  
                  {/* Balance Checker */}
                  <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ fontSize: "18.5px", fontWeight: "800", marginBottom: "12px", color: "var(--rta-blue-navy)" }}>Check Card Balance</h3>
                    <p style={{ color: "#717B87", fontSize: "13px", marginBottom: "15px" }}>
                      Enter your 10-digit Card Number or the RFID tag hex ID.
                    </p>
                    
                    <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                      <label htmlFor="nol-tag-input">Card Number / RFID Tag</label>
                      <input 
                        id="nol-tag-input"
                        type="text" 
                        className="rta-input-field" 
                        value={nolTagId}
                        onChange={(e) => setNolTagId(e.target.value)}
                        placeholder="e.g. 5283748293 or 4A:2B:3C:4D"
                      />
                    </div>

                    <button className="rta-btn-primary" onClick={handleCheckBalance}>
                      Check Balance
                    </button>

                    {checkError && (
                      <div style={{ color: "var(--rta-red)", fontSize: "13px", marginTop: "10px", fontWeight: "600" }}>
                        {checkError}
                      </div>
                    )}

                    {balanceResult && (
                      <div className="fade-in-section" style={{ marginTop: "20px" }}>
                        <div className={`rta-nol-card-preview ${balanceResult.type.toLowerCase().includes("gold") ? "gold" : balanceResult.type.toLowerCase().includes("blue") ? "blue" : "silver"}`}>
                          <div className="rta-nol-card-header">
                            <span className="rta-nol-brand">nol</span>
                            <div className="rta-nol-chip"></div>
                          </div>
                          <div className="rta-nol-card-body">
                            <div className="rta-nol-balance-title">Balance</div>
                            <div className="rta-nol-balance-val">{balanceResult.balance} AED</div>
                          </div>
                          <div className="rta-nol-card-footer">
                            <div className="rta-nol-number">{balanceResult.tagId}</div>
                            <div className="rta-nol-status">{balanceResult.status}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--rta-gray-border)", margin: "20px 0" }} />

                  {/* Register/Book RFID Card */}
                  <div>
                    <h3 style={{ fontSize: "18.5px", fontWeight: "800", marginBottom: "12px", color: "var(--rta-blue-navy)" }}>Book / Register RFID Card</h3>
                    <p style={{ color: "#717B87", fontSize: "13px", marginBottom: "15px" }}>
                      Link a new physical RFID Tag to your account to start boarding buses.
                    </p>

                    <form onSubmit={handleBookCard}>
                      <div className="rta-input-group" style={{ marginBottom: "12px" }}>
                        <label htmlFor="book-rfid-tag">RFID Tag (UID)</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input 
                            id="book-rfid-tag"
                            type="text" 
                            className="rta-input-field" 
                            value={bookRfidTag}
                            onChange={(e) => setBookRfidTag(e.target.value.toUpperCase())}
                            placeholder="e.g. 4A:2B:3C:4D or 047A221980"
                            required
                          />
                          <button 
                            type="button" 
                            className="rta-btn-secondary" 
                            style={{ padding: "8px 12px", whiteSpace: "nowrap", fontSize: "12px" }}
                            onClick={() => {
                              const bytes = Array.from({ length: 4 }, () => 
                                Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')
                              );
                              setBookRfidTag(bytes.join(":"));
                            }}
                          >
                            Gen Tag
                          </button>
                        </div>
                      </div>

                      <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                        <label htmlFor="book-card-type">Select Class</label>
                        <select 
                          id="book-card-type" 
                          className="rta-input-field"
                          value={bookCardType}
                          onChange={(e) => setBookCardType(e.target.value)}
                        >
                          <option value="Silver">Silver Card (Standard Fare)</option>
                          <option value="Gold">Gold Card (1.5x Fare, Premium Cabin)</option>
                          <option value="Blue">Blue Card (0.9x Fare, Student/Personalized)</option>
                        </select>
                      </div>

                      <button type="submit" className="rta-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                        Book Card (20 AED initial)
                      </button>

                      {bookSuccess && (
                        <div style={{ color: "#059669", fontSize: "13px", marginTop: "10px", fontWeight: "600" }}>
                          {bookSuccess}
                        </div>
                      )}
                      {bookError && (
                        <div style={{ color: "var(--rta-red)", fontSize: "13px", marginTop: "10px", fontWeight: "600" }}>
                          {bookError}
                        </div>
                      )}
                    </form>
                  </div>

                </div>

                {/* Instant Top Up & My Cards */}
                <div>
                  
                  {/* Instant Top Up */}
                  <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ fontSize: "18.5px", fontWeight: "800", marginBottom: "12px", color: "var(--rta-blue-navy)" }}>Instant Nol Top-Up</h3>
                    <p style={{ color: "#717B87", fontSize: "13px", marginBottom: "15px" }}>
                      Top up your card instantly. Minimum top-up is 10 AED.
                    </p>

                    {topUpSuccess ? (
                      <div className="rta-card" style={{ borderColor: "#059669", backgroundColor: "rgba(5, 150, 105, 0.05)", textAlign: "center", padding: "20px" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ marginBottom: "8px" }}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <h4 style={{ color: "#059669", fontWeight: "800", fontSize: "15px", marginBottom: "4px" }}>Top-Up Successful!</h4>
                        <p style={{ fontSize: "12.5px", color: "#4A515A" }}>We have loaded the funds to your Nol Card. Tapping it at any gate will reflect your new balance.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleTopUpSubmit}>
                        <div className="rta-input-group" style={{ marginBottom: "12px" }}>
                          <label htmlFor="topup-tag-input">Card Number / RFID Tag</label>
                          <input 
                            id="topup-tag-input"
                            type="text" 
                            className="rta-input-field" 
                            value={topUpTagId}
                            onChange={(e) => setTopUpTagId(e.target.value)}
                            placeholder="e.g. 5283748293 or 4A:2B:3C:4D"
                            required
                          />
                        </div>
                        
                        <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                          <label htmlFor="topup-amount-select">Select Top-Up Amount</label>
                          <select 
                            id="topup-amount-select"
                            className="rta-input-field"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                          >
                            <option value="10">10 AED</option>
                            <option value="20">20 AED</option>
                            <option value="50">50 AED</option>
                            <option value="100">100 AED</option>
                            <option value="200">200 AED</option>
                          </select>
                        </div>

                        <button type="submit" className="rta-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                          Proceed to Payment
                        </button>
                      </form>
                    )}
                  </div>
                  
                  {/* Card Application Component */}
                  <div id="card-application-section" style={{ marginTop: "20px" }}>
                      <CardApplication />
                    </div>
                  <hr style={{ border: "none", borderTop: "1px solid var(--rta-gray-border)", margin: "20px 0" }} />

                  {/* My Booked Cards & History */}
                  <div>
                    <h3 style={{ fontSize: "18.5px", fontWeight: "800", marginBottom: "12px", color: "var(--rta-blue-navy)" }}>My Registered Cards</h3>
                    {myCards.length === 0 ? (
                      <p style={{ color: "#717B87", fontSize: "13px" }}>No cards registered to your account yet. Use the booking form on the left to add one.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {myCards.map((card) => (
                          <div 
                            key={card._id} 
                            onClick={() => selectCard(card)}
                            style={{ 
                              padding: "12px 16px", 
                              border: `2px solid ${selectedCard?._id === card._id ? "var(--rta-gold)" : "var(--rta-gray-border)"}`, 
                              borderRadius: "8px", 
                              cursor: "pointer",
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center",
                              backgroundColor: selectedCard?._id === card._id ? "rgba(224, 170, 77, 0.05)" : "#FFF",
                              transition: "all 0.2s"
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--rta-blue-navy)" }}>
                                {card.cardType} Nol Card
                              </div>
                              <div style={{ fontSize: "12px", color: "#717B87", fontFamily: "monospace" }}>
                                {card.cardNumber} (RFID: {card.rfidTag})
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: "800", fontSize: "16px", color: "var(--rta-blue-navy)" }}>
                                {card.balance.toFixed(2)} AED
                              </div>
                              <span style={{ 
                                fontSize: "10px", 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                fontWeight: "bold",
                                backgroundColor: card.status === "Active" ? "rgba(5, 150, 105, 0.1)" : "rgba(220, 38, 38, 0.1)",
                                color: card.status === "Active" ? "#059669" : "var(--rta-red)"
                              }}>
                                {card.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Journey history for selected card */}
                    {selectedCard && (
                      <div style={{ marginTop: "24px" }} className="fade-in-section">
                        <h4 style={{ fontSize: "14.5px", fontWeight: "800", marginBottom: "12px", color: "var(--rta-blue-navy)" }}>
                          Recent Trips for {selectedCard.cardNumber}
                        </h4>
                        {journeyHistory.length === 0 ? (
                          <p style={{ color: "#717B87", fontSize: "12.5px" }}>No recent trips recorded for this card.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                            {journeyHistory.map((j) => (
                              <div 
                                key={j._id} 
                                style={{ 
                                  padding: "10px", 
                                  backgroundColor: "#F8FAFC", 
                                  borderRadius: "6px", 
                                  borderLeft: `4px solid ${j.status === "Completed" ? "#059669" : j.status === "In-Progress" ? "var(--rta-gold)" : "var(--rta-red)"}`,
                                  fontSize: "12.5px"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                  <span style={{ fontWeight: "700" }}>
                                    {j.tapInStop?.name || "Unknown Stop"} 
                                    {j.tapOutStop ? ` ➔ ${j.tapOutStop.name}` : " (In Transit)"}
                                  </span>
                                  <span style={{ fontWeight: "800", color: "var(--rta-blue-navy)" }}>
                                    {j.status === "In-Progress" ? "Pending..." : `${j.fare.toFixed(2)} AED`}
                                  </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#717B87", fontSize: "11px" }}>
                                  <span>{new Date(j.tapInTime).toLocaleString()}</span>
                                  {j.status === "Completed" && (
                                    <span>{j.distanceKm.toFixed(1)} km</span>
                                  )}
                                  {j.status === "Expired" && (
                                    <span style={{ color: "var(--rta-red)", fontWeight: "600" }}>No Tap-Out Penalty</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUS TIMETABLES */}
          {activeTab === "schedules" && (
            <div className="fade-in-section">
              <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>Bus Timetables & Schedules</h3>
              <p style={{ color: "#717B87", fontSize: "14px", marginBottom: "20px" }}>
                Search for schedules by route name. Try searching **C01**, **8**, or **F11** for demo schedules.
              </p>

              <div className="rta-planner-grid" style={{ gridTemplateColumns: "3fr 1fr", maxWidth: "600px", margin: "0 auto 30px" }}>
                <div className="rta-input-group">
                  <label htmlFor="route-search-input">Enter Route Number</label>
                  <input 
                    id="route-search-input"
                    type="text" 
                    className="rta-input-field" 
                    placeholder="e.g. C01" 
                    value={routeQuery} 
                    onChange={(e) => setRouteQuery(e.target.value)}
                  />
                </div>
                <button className="rta-btn-primary" onClick={handleSearchSchedule} style={{ alignSelf: "flex-end", height: "46px" }}>
                  Search
                </button>
              </div>

              {scheduleResult && (
                <div className="fade-in-section" style={{ borderTop: "1px solid var(--rta-gray-border)", paddingTop: "25px" }}>
                  {scheduleResult.error ? (
                    <div style={{ textAlign: "center", color: "var(--rta-red)", fontWeight: "600", fontSize: "14px" }}>
                      {scheduleResult.error}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px" }}>
                      <div>
                        <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#1F2226", marginBottom: "4px" }}>
                          Route {scheduleResult.route} Timetable
                        </h4>
                        <p style={{ fontSize: "13px", color: "var(--rta-gold)", fontWeight: "700", marginBottom: "15px" }}>
                          {scheduleResult.name} ({scheduleResult.frequency})
                        </p>
                        
                        <div style={{ position: "relative", paddingLeft: "24px" }}>
                          <div style={{ position: "absolute", left: "6px", top: "8px", bottom: "8px", width: "2px", backgroundColor: "var(--rta-red)" }}></div>
                          {scheduleResult.stops.map((stop, idx) => (
                            <div key={idx} style={{ position: "relative", paddingBottom: "20px" }}>
                              <span style={{ position: "absolute", left: "-23px", top: "5px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--rta-red)", border: "2px solid #FFFFFF" }}></span>
                              <div style={{ fontWeight: "700", fontSize: "14px", color: "#1F2226" }}>{stop}</div>
                              <div style={{ fontSize: "11px", color: "#717B87" }}>Stop #{1000 + idx}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#1F2226", marginBottom: "12px" }}>Departure Times</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {scheduleResult.timetable.map((time, idx) => (
                            <div key={idx} style={{ padding: "8px", backgroundColor: "var(--rta-gray-light)", borderRadius: "4px", textAlign: "center", fontSize: "13.5px", fontWeight: "600" }}>
                              {time}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERCITY TICKETS */}
          {activeTab === "intercity" && (
            <div className="fade-in-section">
              <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>Intercity Bus Ticket Booking</h3>
              <p style={{ color: "#717B87", fontSize: "14px", marginBottom: "20px" }}>
                Reserve your tickets for intercity bus lines connecting Dubai to other Emirates.
              </p>

              {intercitySuccess ? (
                <div className="rta-card" style={{ borderColor: "#059669", backgroundColor: "rgba(5, 150, 105, 0.05)", textAlign: "center", padding: "40px 20px", maxWidth: "600px", margin: "0 auto" }}>
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ marginBottom: "15px" }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h4 style={{ color: "#059669", fontWeight: "800", fontSize: "18px", marginBottom: "8px" }}>Reservation Confirmed!</h4>
                  <p style={{ fontSize: "14px", color: "#4A515A", marginBottom: "15px" }}>
                    Your ticket(s) from **{intercityFrom}** to **{intercityTo}** have been reserved.
                  </p>
                  <p style={{ fontSize: "12px", color: "#717B87" }}>
                    A confirmation code has been registered to your profile account. Tap to view tickets in your Profile wallet.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleIntercitySubmit} style={{ maxWidth: "600px", margin: "0 auto" }}>
                  <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                    <label htmlFor="intercity-from-select">From (Origin City)</label>
                    <select 
                      id="intercity-from-select"
                      className="rta-input-field" 
                      value={intercityFrom} 
                      onChange={(e) => setIntercityFrom(e.target.value)}
                    >
                      <option value="Dubai (Al Ghubaiba)">Dubai (Al Ghubaiba Station)</option>
                      <option value="Dubai (Ibn Battuta)">Dubai (Ibn Battuta Station)</option>
                      <option value="Sharjah">Sharjah (Al Jubail Station)</option>
                      <option value="Abu Dhabi">Abu Dhabi (Central Station)</option>
                    </select>
                  </div>

                  <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                    <label htmlFor="intercity-to-select">To (Destination City)</label>
                    <select 
                      id="intercity-to-select"
                      className="rta-input-field" 
                      value={intercityTo} 
                      onChange={(e) => setIntercityTo(e.target.value)}
                    >
                      <option value="Abu Dhabi (Central Bus Station)">Abu Dhabi (Central Bus Station)</option>
                      <option value="Sharjah (Al Jubail Bus Station)">Sharjah (Al Jubail Bus Station)</option>
                      <option value="Ajman (Central Bus Station)">Ajman (Central Bus Station)</option>
                      <option value="Al Ain (Central Station)">Al Ain (Central Station)</option>
                    </select>
                  </div>

                  <div className="rta-planner-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                    <div className="rta-input-group">
                      <label htmlFor="intercity-date">Departure Date</label>
                      <input id="intercity-date" type="date" className="rta-input-field" defaultValue={planDate} />
                    </div>
                    <div className="rta-input-group">
                      <label htmlFor="intercity-seats-select">Number of Seats</label>
                      <select 
                        id="intercity-seats-select"
                        className="rta-input-field" 
                        value={intercitySeats} 
                        onChange={(e) => setIntercitySeats(e.target.value)}
                      >
                        <option value="1">1 Passenger</option>
                        <option value="2">2 Passengers</option>
                        <option value="3">3 Passengers</option>
                        <option value="4">4 Passengers</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="rta-btn-primary" style={{ width: "100%", justifyContent: "center", height: "46px" }}>
                    Confirm Reservation
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Dubai Bus Hub Services */}
        <section id="services" style={{ marginTop: "60px" }}>
          <h2 className="rta-section-title">Dubai Bus Services</h2>
          <p className="rta-section-subtitle">A comprehensive urban and intercity transport network catering to millions of daily riders.</p>
          
          <div className="rta-services-grid">
            <div className="rta-card">
              <div className="rta-card-icon red">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
                  <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
                  <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <h3>Urban Bus Routes</h3>
              <p>Over 120 internal feeder and trunk bus lines crossing Dubai, linking neighborhoods, residential zones, and Metro stations seamlessly.</p>
            </div>

            <div className="rta-card">
              <div className="rta-card-icon gold">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Nol Ticket Passes</h3>
              <p>One card controls all transit inside Dubai. Easily top up Silver, Gold, or Student cards online, checking balance within seconds.</p>
            </div>

            <div className="rta-card">
              <div className="rta-card-icon blue">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <h3>Intercity Connections</h3>
              <p>Comfortable, air-conditioned tour coaches leaving central Dubai stations for Sharjah, Abu Dhabi, Ajman, Fujairah, and Al Ain daily.</p>
            </div>
          </div>
        </section>

        {/* Nol Hub Branding Info */}
        <section id="nol-hub" style={{ marginTop: "60px", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "40px", border: "1px solid var(--rta-gray-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "center" }}>
            <div>
              <h2 style={{ fontFamily: "var(--rta-font-title)", fontWeight: "800", fontSize: "28px", color: "#1F2226", marginBottom: "15px" }}>The Smart Way to Pay</h2>
              <p style={{ fontSize: "15px", color: "#4A515A", lineHeight: "1.6", marginBottom: "20px" }}>
                The **nol card** is a smart card that enables you to pay for the use of various RTA transport modes in Dubai with a single tap. 
                Use it to ride the Metro, Buses, Tram, and Water Buses, or even to pay for RTA Parking and purchase items at select convenience stores.
              </p>
              <div style={{ display: "flex", gap: "15px" }}>
                <Link to="/signup" className="rta-btn-primary">Apply for Nol Card</Link>
                <a href="#nol-hub" onClick={() => setActiveTab("nol")} className="rta-btn-secondary">Check Card Balance</a>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div className="rta-nol-card-preview silver">
                <div className="rta-nol-card-header">
                  <span className="rta-nol-brand">nol</span>
                  <div className="rta-nol-chip"></div>
                </div>
                <div className="rta-nol-card-body">
                  <span style={{ fontSize: "14px", fontWeight: "700" }}>Silver Card</span>
                </div>
                <div className="rta-nol-card-footer">
                  <div className="rta-nol-number">9028394857</div>
                  <div className="rta-nol-status">Regular Fare</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Chatbot Widget (Mahboub Assistant) */}
      <div>
        <button className="rta-chat-toggle" onClick={() => setChatOpen(!chatOpen)} aria-label="Chat with Mahboub">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {chatOpen && (
          <div className="rta-chat-window">
            <div className="rta-chat-header">
              <div className="rta-chat-title">
                <span style={{ backgroundColor: "#FFFFFF", color: "var(--rta-red)", width: "24px", height: "24px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px" }}>M</span>
                <span>Mahboub Assistant</span>
              </div>
              <button className="rta-chat-close" onClick={() => setChatOpen(false)}>×</button>
            </div>
            
            <div className="rta-chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`rta-chat-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form className="rta-chat-input-area" onSubmit={handleChatSend}>
              <input 
                type="text" 
                className="rta-chat-input" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="Ask me about routes, Nol card..."
              />
              <button type="submit" className="rta-chat-send" aria-label="Send message">
                ➜
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "40px 5%", borderTop: "3px solid var(--primary)", marginTop: "auto" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifySelf: "space-between", flexWrap: "wrap", gap: "30px" }}>
          <div>
            <div className="rta-logo" style={{ marginBottom: "15px", display: "inline-flex", alignItems: "center", gap: "12px" }}>
              <img 
                src="/logo.png" 
                alt="MoveSmart Logo" 
                style={{ 
                  height: "56px", 
                  width: "auto", 
                  objectFit: "contain", 
                  background: "#ffffff", 
                  padding: "6px 14px", 
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }} 
              />
              <span style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
                MoveSmart Kerala
              </span>
            </div>
            <p style={{ fontSize: "13px", maxWidth: "340px", lineHeight: "1.6", color: "#b7aed6" }}>
              Smart Private Bus Fleet Management &amp; Passenger Portal for Kerala. Real-time bus tracking, RFID pass management, and digital ticketing.
            </p>
          </div>
          <div style={{ display: "flex", gap: "40px" }}>
            <div>
              <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Transit Services</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><a href="#services" style={{ color: "#b7aed6", textDecoration: "none" }}>Private Bus City Routes</a></li>
                <li><a href="#nol-hub" style={{ color: "#b7aed6", textDecoration: "none" }}>MoveSmart RFID Pass</a></li>
                <li><a href="#services" style={{ color: "#b7aed6", textDecoration: "none" }}>Intercity Express Routes</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Support</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><span style={{ cursor: "pointer", color: "#b7aed6" }} onClick={() => setChatOpen(true)}>Chat Assistant</span></li>
                <li><span style={{ color: "#b7aed6" }}>Kerala Transit Helpline: 1800-425-4747</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "30px", paddingTop: "20px", textAlign: "center", fontSize: "12px", color: "#717B87" }}>
          © {new Date().getFullYear()} MoveSmart Kerala. Smart Urban Transit System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;