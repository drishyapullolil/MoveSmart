import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import CardApplication from "./Cardapplication";
import { processRazorpayPayment } from "../utils/razorpay";
import { getStoredUser, clearStoredSession } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("planner");
  const [user, setUser] = useState(() => getStoredUser());

  // Real RFID States
  const [myCards, setMyCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
  const [intercityFrom, setIntercityFrom] = useState("Ernakulam (Kaloor Bus Stand)");
  const [intercityTo, setIntercityTo] = useState("Kozhikode (Mofussil Bus Stand)");
  const [intercitySeats, setIntercitySeats] = useState("1");
  const [intercitySuccess, setIntercitySuccess] = useState(false);

  // Appu Chatbot States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Namaskaram! I am Appu, your MoveSmart Virtual Assistant. How can I help you navigate Kerala bus routes today?" }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Wojhati Search Handler
  const handleSearchRoutes = () => {
    if (!origin || !destination) return;

    const mockRoutes = [
      {
        id: 1,
        mode: "Express Bus",
        busName: "KSRTC Kerala Express",
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
          { type: "Walk", desc: `Walk from ${origin} to the main departure platform (5 mins)` },
          { type: "Bus", desc: "Premium air‑conditioned coach with Wi‑Fi and live GPS" },
          { type: "Walk", desc: `Arrive at ${destination} (5 mins)` }
        ]
      },
      {
        id: 2,
        mode: "Direct Coach",
        busName: "KSRTC Swift Deluxe",
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
          { type: "Bus", desc: `Direct express coach from ${origin} to ${destination}` },
          { type: "Walk", desc: `Alight and walk to the terminal exit (3 mins)` }
        ]
      }
    ];
    setPlannerResults(mockRoutes);
  };

  const fetchMyCards = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoadingCards(true);
      const res = await axios.get(`/api/rfid/my-cards?email=${user.email}`);
      setMyCards(res.data.cards || []);
    } catch (err) {
      console.error("Error fetching cards:", err);
    } finally {
      setLoadingCards(false);
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
      setBookError("Please enter a valid RFID Tag ID.");
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
      setBookError(err.response?.data?.message || "Failed to register RFID card.");
    }
  };

  const selectCard = async (card) => {
    setSelectedCard(card);
    setNolTagId(card.cardNumber);
    setTopUpTagId(card.cardNumber);
    try {
      setLoadingHistory(true);
      const historyRes = await axios.get(`/api/rfid/history/${card.cardNumber}`);
      setJourneyHistory(historyRes.data.journeys || []);
    } catch (err) {
      console.error("Error fetching card history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Nol Balance Checker Handler
  const handleCheckBalance = async () => {
    setCheckError("");
    setBalanceResult(null);

    if (!nolTagId) {
      setCheckError("Please enter your 10-digit Card Number or RFID Tag ID.");
      return;
    }

    try {
      const res = await axios.get(`/api/rfid/balance/${nolTagId.trim()}`);
      setBalanceResult({
        tagId: res.data.cardNumber,
        rfidTag: res.data.rfidTag,
        type: `${res.data.cardType} Smart Card`,
        balance: res.data.balance.toFixed(2),
        expiry: "12/2031",
        status: res.data.status
      });
    } catch (err) {
      setCheckError(err.response?.data?.message || "Smart Card not found in database.");
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
      description: `MoveSmart Nol Transit Top-Up (${topUpTagId.trim()})`,
      userEmail: user?.email || "",
      userName: user?.name || "Transit Passenger",
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
        stops: ["Kochi Bus Stand", "Alappuzha KSRTC", "Kollam Central", "Thiruvananthapuram Central"],
        timetable: ["06:00", "06:30", "07:00", "07:30", "08:00"]
      },
      "K02": {
        name: "Ernakulam (Kaloor) ➜ Kozhikode (Mofussil Stand)",
        frequency: "Every 45 mins",
        stops: ["Ernakulam Kaloor", "Thrissur Sakthan", "Palakkad KSRTC", "Kozhikode Mofussil"],
        timetable: ["05:45", "06:30", "07:15", "08:00", "08:45"]
      },
      "K03": {
        name: "Thiruvananthapuram ➜ Kottayam Express",
        frequency: "Every 20 mins",
        stops: ["Thiruvananthapuram Central", "Nedumangad", "Kottayam KSRTC"],
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

  // Appu Chatbot Handler
  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const newMessages = [...chatMessages, { sender: "user", text: userText }];
    setChatMessages(newMessages);
    setChatInput("");

    // Simulate smart bot typing answers
    setTimeout(() => {
      let botResponse = "I'm sorry, I didn't quite catch that. You can ask me to 'Check K01 schedule', 'Check Kerala bus routes' or 'Fares'.";
      const q = userText.toLowerCase();

      if (q.includes("k01") || q.includes("k02") || q.includes("k03")) {
        botResponse = "You can search for live timetables on the Bus Schedule tab on the main page. K01 operates every 30 minutes from Kochi Bus Stand to Thiruvananthapuram.";
      } else if (q.includes("rfid") || q.includes("card") || q.includes("nol")) {
        botResponse = "MoveSmart supports virtual Nol RFID cards for seamless boarding across Kerala. You can top up or apply directly in the RFID Card tab above!";
      } else if (q.includes("intercity") || q.includes("express")) {
        botResponse = "Yes, intercity express coaches connect major hubs like Ernakulam, Kozhikode, Thrissur, and Thiruvananthapuram. Check out the Express Tickets tab!";
      } else if (q.includes("fare") || q.includes("price")) {
        botResponse = "Fares depend on transit distance. KSRTC and private express services offer dynamic pricing based on your destination.";
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
    clearStoredSession();
    setUser(null);
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#1e293b", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* MoveSmart Header Navigation */}
      <Header />

      {/* Hero Portal Banner Section */}
      <header style={{
        background: "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)",
        padding: "36px 24px",
        color: "#ffffff",
        textAlign: "center",
        boxShadow: "0 15px 35px rgba(46, 16, 101, 0.25)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: "-60px", top: "-60px", width: "260px", height: "260px", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.15) 0%, rgba(167,139,250,0) 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 14px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(8px)", fontSize: "12px", fontWeight: "800", color: "#4ade80", marginBottom: "12px", border: "1px solid rgba(74, 222, 128, 0.3)" }}>
            🚌 KERALA STATE BUS &amp; SMART RFID TRANSIT GRID
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "900", margin: 0, letterSpacing: "-0.5px" }}>
            MoveSmart <span style={{ color: "#a78bfa" }}>Transit Portal</span>
          </h1>
          <p style={{ fontSize: "14.5px", color: "#cbd5e1", margin: "10px auto 0 auto", maxWidth: "700px", lineHeight: "1.6" }}>
            Plan inter-district routes, manage your virtual RFID smart wallet, view live KSRTC timetables, and book express coach lines across Kerala.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "28px 20px 60px 20px", flex: 1 }}>
        <div style={{ background: "#ffffff", borderRadius: "24px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}>

          {/* Driver Recruitment Banner */}
          {(user && user.role !== "driver" && user.role !== "admin") && (
            <div style={{ background: "linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(74, 222, 128, 0.08) 100%)", borderRadius: "20px", padding: "20px 24px", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(139, 92, 246, 0.2)", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ width: "52px", height: "52px", background: "linear-gradient(135deg, #6d28d9, #2e1065)", color: "#ffffff", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: "0 8px 18px rgba(109, 40, 217, 0.25)" }}>
                  🚌
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 4px", color: "#1e293b" }}>Drive with MoveSmart Transit</h3>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>Earn competitive fares on Kerala state &amp; private express routes with automated RFID collection.</p>
                </div>
              </div>

              {user.verificationStatus === "Pending" ? (
                <div style={{ background: "rgba(217, 119, 6, 0.1)", color: "#d97706", padding: "10px 18px", borderRadius: "12px", fontWeight: "800", fontSize: "13px", border: "1px solid rgba(217, 119, 6, 0.3)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⏳</span> Application Under Review
                </div>
              ) : (
                <Link to="/apply-driver" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", padding: "12px 24px", borderRadius: "12px", textDecoration: "none", fontWeight: "800", fontSize: "13.5px", boxShadow: "0 8px 18px rgba(22, 163, 74, 0.25)", display: "inline-block", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  Apply Now →
                </Link>
              )}
            </div>
          )}

          {/* Tab Navigation Header with Icons */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "28px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
            {[
              { id: "planner", label: "🗺️ Journey Planner" },
              { id: "nol", label: "🪪 RFID Card Portal" },
              { id: "schedules", label: "⏱️ Bus Timetables" },
              { id: "intercity", label: "🎫 Express Tickets" },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "14px",
                    border: `2px solid ${isSelected ? "#6d28d9" : "#e2e8f0"}`,
                    background: isSelected ? "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)" : "#f8fafc",
                    color: isSelected ? "#ffffff" : "#475569",
                    fontWeight: "800",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 6px 16px rgba(46, 16, 101, 0.2)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => navigate("/wallet")}
              style={{
                padding: "10px 18px",
                borderRadius: "14px",
                border: "2px solid #16a34a",
                background: "rgba(22, 163, 74, 0.08)",
                color: "#15803d",
                fontWeight: "800",
                fontSize: "13.5px",
                cursor: "pointer",
                marginLeft: "auto",
                transition: "all 0.2s ease",
              }}
            >
              💳 Main Wallet &amp; History
            </button>
          </div>

          {/* TAB 1: KERALA JOURNEY PLANNER */}
          {activeTab === "planner" && (
            <div className="fade-in-section">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "flex-end" }}>
                <div className="rta-input-group">
                  <label htmlFor="planner-origin" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>Origin / Boarding Stop</label>
                  <input
                    id="planner-origin"
                    type="text"
                    className="rta-input-field"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Kochi Bus Stand"
                  />
                </div>

                <button
                  type="button"
                  onClick={swapPlannerAddresses}
                  aria-label="Swap locations"
                  style={{
                    height: "46px",
                    borderRadius: "12px",
                    border: "1.5px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#6d28d9",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  🔄 Swap
                </button>

                <div className="rta-input-group">
                  <label htmlFor="planner-destination" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>Destination Stop</label>
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
                  <label htmlFor="planner-date" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>Travel Date</label>
                  <input
                    id="planner-date"
                    type="date"
                    className="rta-input-field"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                  />
                </div>

                <div className="rta-input-group">
                  <label htmlFor="planner-time" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>Departure Time</label>
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
                <button
                  type="button"
                  onClick={handleSearchRoutes}
                  style={{
                    padding: "12px 26px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(46, 16, 101, 0.2)",
                  }}
                >
                  Find Express Routes →
                </button>
              </div>

              {/* Wojhati Results */}
              {plannerResults && (
                <div style={{ marginTop: "32px", borderTop: "1px dashed #e2e8f0", paddingTop: "28px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", marginBottom: "18px", color: "#1e293b" }}>Recommended Routes &amp; Fares</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {plannerResults.map((res) => {
                      const isFull = res.seatsAvailable <= 0;
                      return (
                        <div
                          key={res.id}
                          style={{
                            padding: "20px",
                            borderRadius: "18px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.03)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b" }}>{res.busName}</span>
                                <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#6d28d9", background: "rgba(109, 40, 217, 0.08)", padding: "4px 10px", borderRadius: "999px" }}>
                                  {res.busNumber}
                                </span>
                              </div>
                              <div style={{ marginTop: "6px", fontSize: "13.5px", color: "#64748b" }}>
                                {res.source} ➔ {res.destination}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isFull ? "rgba(225, 29, 72, 0.1)" : "rgba(34, 197, 94, 0.12)", color: isFull ? "#dc2626" : "#16a34a", padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "800" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isFull ? "#dc2626" : "#22c55e" }} />
                              {isFull ? "Bus Full" : "Seats Available"}
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
                            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "10px 14px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Departure</div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginTop: "3px" }}>{res.departureTime}</div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "10px 14px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Arrival</div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginTop: "3px" }}>{res.arrivalTime}</div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "10px 14px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Date</div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginTop: "3px" }}>{res.travelDate}</div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "10px 14px" }}>
                              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Available Seats</div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginTop: "3px" }}>{res.seatsAvailable}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px dashed #f1f5f9" }}>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <button onClick={() => navigate("/bus-booking")} style={{ padding: "8px 16px", borderRadius: "10px", background: "#16a34a", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>Book Seat</button>
                              <button onClick={() => navigate("/bus-booking")} style={{ padding: "8px 16px", borderRadius: "10px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>View Details</button>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "18px", fontWeight: "900", color: "#2e1065" }}>₹ {res.fare}</div>
                              <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>⭐ {res.rating} • {res.distance} • Live KSRTC GPS</div>
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

          {/* TAB 2: RFID CARD SERVICES (BALANCE CHECKER & TOP UP) */}
          {activeTab === "nol" && (
            <div className="fade-in-section">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>

                {/* Left Column: Balance Checker & Booking */}
                <div>
                  {/* Balance Checker */}
                  <div style={{ marginBottom: "32px", background: "#f8fafc", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "6px", color: "#1e293b" }}>🔍 Check Smart Card Balance</h3>
                    <p style={{ color: "#64748b", fontSize: "12.5px", marginBottom: "16px" }}>
                      Enter your 10-digit MoveSmart Nol Card Number or RFID Tag UID.
                    </p>

                    <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                      <label htmlFor="nol-tag-input" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Card Number / RFID Tag UID</label>
                      <input
                        id="nol-tag-input"
                        type="text"
                        className="rta-input-field"
                        value={nolTagId}
                        onChange={(e) => setNolTagId(e.target.value)}
                        placeholder="e.g. 9842104910 or 4A:2B:3C:4D"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckBalance}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #2e1065, #4c1d95)",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "800",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Check Live Balance →
                    </button>

                    {checkError && (
                      <div style={{ background: "rgba(225, 29, 72, 0.08)", border: "1px solid rgba(225, 29, 72, 0.3)", borderRadius: "12px", padding: "10px 14px", color: "#dc2626", fontSize: "13px", marginTop: "14px", fontWeight: "700" }}>
                        ⚠️ {checkError}
                      </div>
                    )}

                    {/* Balance Preview Card */}
                    {balanceResult && (
                      <div className="fade-in-section" style={{ marginTop: "20px" }}>
                        <div style={{
                          background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)",
                          borderRadius: "20px",
                          padding: "20px",
                          color: "#ffffff",
                          boxShadow: "0 10px 25px rgba(30, 27, 75, 0.2)",
                          border: "1px solid rgba(167, 139, 250, 0.3)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "800", color: "#a78bfa", letterSpacing: "1px" }}>MOVESMART NOL CARD</span>
                            <span style={{ background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", border: "1px solid rgba(74, 222, 128, 0.3)", padding: "2px 8px", borderRadius: "999px", fontSize: "10.5px", fontWeight: "800" }}>
                              {balanceResult.status || "Active"}
                            </span>
                          </div>

                          <div style={{ fontSize: "11px", color: "#cbd5e1", textTransform: "uppercase" }}>Current Balance</div>
                          <div style={{ fontSize: "32px", fontWeight: "900", color: "#ffffff", margin: "2px 0 10px 0" }}>
                            ₹ {balanceResult.balance}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>
                            <span>{balanceResult.tagId}</span>
                            <span>Exp: {balanceResult.expiry}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Register/Book RFID Card Form */}
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "6px", color: "#1e293b" }}>🪪 Book / Register Physical RFID Card</h3>
                    <p style={{ color: "#64748b", fontSize: "12.5px", marginBottom: "16px" }}>
                      Link a physical RFID Tag UID to your account for automatic bus tap-ins.
                    </p>

                    <form onSubmit={handleBookCard}>
                      <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                        <label htmlFor="book-rfid-tag" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>RFID Tag UID</label>
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
                            style={{ padding: "8px 14px", whiteSpace: "nowrap", fontSize: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#6d28d9", fontWeight: "800", cursor: "pointer" }}
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
                        <label htmlFor="book-card-type" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Select Class</label>
                        <select
                          id="book-card-type"
                          className="rta-input-field"
                          value={bookCardType}
                          onChange={(e) => setBookCardType(e.target.value)}
                        >
                          <option value="Silver">Silver Pass (Standard KSRTC Fare)</option>
                          <option value="Gold">Gold Pass (1.5x Fare, Premium A/C Express)</option>
                          <option value="Blue">Blue Pass (0.9x Student / Concession)</option>
                        </select>
                      </div>

                      <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "13.5px", cursor: "pointer" }}>
                        Book Card (₹20 Initial Top-Up) →
                      </button>

                      {bookSuccess && (
                        <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "12px", padding: "10px 14px", color: "#16a34a", fontSize: "13px", marginTop: "14px", fontWeight: "700" }}>
                          ✓ {bookSuccess}
                        </div>
                      )}
                      {bookError && (
                        <div style={{ background: "rgba(225, 29, 72, 0.08)", border: "1px solid rgba(225, 29, 72, 0.3)", borderRadius: "12px", padding: "10px 14px", color: "#dc2626", fontSize: "13px", marginTop: "14px", fontWeight: "700" }}>
                          ⚠️ {bookError}
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Right Column: Instant Top Up & Registered Cards */}
                <div>
                  {/* Instant Top Up via Razorpay */}
                  <div style={{ marginBottom: "32px", background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "6px", color: "#1e293b" }}>⚡ Instant Nol Top-Up via Razorpay</h3>
                    <p style={{ color: "#64748b", fontSize: "12.5px", marginBottom: "16px" }}>
                      Top up your card instantly. Minimum top-up is ₹10.
                    </p>

                    {topUpSuccess ? (
                      <div style={{ borderColor: "#16a34a", backgroundColor: "rgba(34, 197, 94, 0.08)", textAlign: "center", padding: "20px", borderRadius: "16px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                        <div style={{ fontSize: "32px", marginBottom: "6px" }}>✓</div>
                        <h4 style={{ color: "#15803d", fontWeight: "900", fontSize: "16px", margin: "0 0 4px 0" }}>Top-Up Successful!</h4>
                        <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>Funds have been credited via Razorpay to your MoveSmart Nol Card.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleTopUpSubmit}>
                        <div className="rta-input-group" style={{ marginBottom: "14px" }}>
                          <label htmlFor="topup-tag-input" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Card Number / RFID Tag</label>
                          <input
                            id="topup-tag-input"
                            type="text"
                            className="rta-input-field"
                            value={topUpTagId}
                            onChange={(e) => setTopUpTagId(e.target.value)}
                            placeholder="e.g. 9842104910 or 4A:2B:3C:4D"
                            required
                          />
                        </div>

                        <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                          <label htmlFor="topup-amount-select" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Select Top-Up Amount (₹)</label>
                          <select
                            id="topup-amount-select"
                            className="rta-input-field"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                          >
                            <option value="10">₹10</option>
                            <option value="20">₹20</option>
                            <option value="50">₹50</option>
                            <option value="100">₹100</option>
                            <option value="200">₹200</option>
                            <option value="500">₹500</option>
                          </select>
                        </div>

                        <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "13.5px", cursor: "pointer" }}>
                          Proceed to Razorpay Payment →
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Card Application Component */}
                  <div id="card-application-section" style={{ marginTop: "20px" }}>
                    <CardApplication />
                  </div>

                  <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "24px 0" }} />

                  {/* My Booked Cards & History */}
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "14px", color: "#1e293b" }}>💳 My Registered Smart Cards</h3>
                    {loadingCards ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Loading cards from database...</div>
                    ) : myCards.length === 0 ? (
                      <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "16px", padding: "24px", textAlign: "center", color: "#64748b" }}>
                        <div style={{ fontSize: "28px", marginBottom: "6px" }}>🪪</div>
                        <strong style={{ fontSize: "14px", color: "#334155", display: "block" }}>No smart cards linked yet</strong>
                        <span style={{ fontSize: "12.5px" }}>Register your RFID card using the form on the left or apply for a pass.</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {myCards.map((card) => {
                          const isSel = selectedCard?._id === card._id;
                          return (
                            <div
                              key={card._id}
                              onClick={() => selectCard(card)}
                              style={{
                                padding: "14px 18px",
                                border: `2px solid ${isSel ? "#6d28d9" : "#e2e8f0"}`,
                                borderRadius: "14px",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                backgroundColor: isSel ? "rgba(109, 40, 217, 0.05)" : "#ffffff",
                                transition: "all 0.2s"
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: "800", fontSize: "14px", color: "#1e293b" }}>
                                  {card.cardType} Nol Pass
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                                  {card.cardNumber} (RFID: {card.rfidTag})
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: "900", fontSize: "16px", color: "#16a34a" }}>
                                  ₹ {card.balance.toFixed(2)}
                                </div>
                                <span style={{
                                  fontSize: "10px",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontWeight: "800",
                                  backgroundColor: card.status === "Active" ? "rgba(34, 197, 94, 0.12)" : "rgba(225, 29, 72, 0.12)",
                                  color: card.status === "Active" ? "#16a34a" : "#dc2626"
                                }}>
                                  {card.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Journey history for selected card */}
                    {selectedCard && (
                      <div style={{ marginTop: "24px" }} className="fade-in-section">
                        <h4 style={{ fontSize: "14.5px", fontWeight: "900", marginBottom: "12px", color: "#1e293b" }}>
                          Recent Trips for {selectedCard.cardNumber}
                        </h4>
                        {loadingHistory ? (
                          <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Loading trip history...</div>
                        ) : journeyHistory.length === 0 ? (
                          <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "14px", padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12.5px" }}>
                            No recent transit trips recorded for this smart card.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                            {journeyHistory.map((j) => (
                              <div
                                key={j._id}
                                style={{
                                  padding: "12px 14px",
                                  backgroundColor: "#f8fafc",
                                  borderRadius: "12px",
                                  borderLeft: `4px solid ${j.status === "Completed" ? "#16a34a" : j.status === "In-Progress" ? "#d97706" : "#dc2626"}`,
                                  fontSize: "12.5px"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                  <span style={{ fontWeight: "800", color: "#1e293b" }}>
                                    {j.tapInStop?.name || "Kochi Terminal"}
                                    {j.tapOutStop ? ` ➔ ${j.tapOutStop.name}` : " (In Transit)"}
                                  </span>
                                  <span style={{ fontWeight: "900", color: "#6d28d9" }}>
                                    {j.status === "In-Progress" ? "Pending..." : `₹ ${j.fare.toFixed(2)}`}
                                  </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "11px" }}>
                                  <span>{new Date(j.tapInTime).toLocaleString()}</span>
                                  {j.status === "Completed" && (
                                    <span>{j.distanceKm.toFixed(1)} km</span>
                                  )}
                                  {j.status === "Expired" && (
                                    <span style={{ color: "#dc2626", fontWeight: "700" }}>No Tap-Out Penalty</span>
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

          {/* TAB 3: KERALA BUS TIMETABLES */}
          {activeTab === "schedules" && (
            <div className="fade-in-section">
              <h3 style={{ fontSize: "18px", fontWeight: "900", marginBottom: "6px", color: "#1e293b" }}>Bus Timetables &amp; Schedules</h3>
              <p style={{ color: "#64748b", fontSize: "13.5px", marginBottom: "24px" }}>
                Search for KSRTC and private bus schedules by route code. Try searching <strong>K01</strong>, <strong>K02</strong>, or <strong>K03</strong>.
              </p>

              <div style={{ display: "flex", gap: "12px", maxWidth: "600px", margin: "0 auto 32px auto", flexWrap: "wrap" }}>
                <div className="rta-input-group" style={{ flex: 1, minWidth: "220px" }}>
                  <label htmlFor="route-search-input" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Enter Route Code</label>
                  <input
                    id="route-search-input"
                    type="text"
                    className="rta-input-field"
                    placeholder="e.g. K01"
                    value={routeQuery}
                    onChange={(e) => setRouteQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchSchedule}
                  style={{ alignSelf: "flex-end", height: "46px", padding: "0 24px", borderRadius: "12px", background: "linear-gradient(135deg, #2e1065, #4c1d95)", color: "#ffffff", border: "none", fontWeight: "800", cursor: "pointer" }}
                >
                  Search Timetable →
                </button>
              </div>

              {scheduleResult && (
                <div className="fade-in-section" style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "25px" }}>
                  {scheduleResult.error ? (
                    <div style={{ textAlign: "center", color: "#dc2626", fontWeight: "700", fontSize: "14px", background: "rgba(225, 29, 72, 0.08)", padding: "16px", borderRadius: "14px" }}>
                      ⚠️ {scheduleResult.error}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px" }}>
                      <div>
                        <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b", marginBottom: "4px" }}>
                          Route {scheduleResult.route} Timetable
                        </h4>
                        <p style={{ fontSize: "13.5px", color: "#6d28d9", fontWeight: "800", marginBottom: "18px" }}>
                          {scheduleResult.name} ({scheduleResult.frequency})
                        </p>

                        <div style={{ position: "relative", paddingLeft: "24px" }}>
                          <div style={{ position: "absolute", left: "6px", top: "8px", bottom: "8px", width: "2px", backgroundColor: "#6d28d9" }}></div>
                          {scheduleResult.stops.map((stop, idx) => (
                            <div key={idx} style={{ position: "relative", paddingBottom: "20px" }}>
                              <span style={{ position: "absolute", left: "-23px", top: "5px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#16a34a", border: "2px solid #FFFFFF" }}></span>
                              <div style={{ fontWeight: "800", fontSize: "14px", color: "#1e293b" }}>{stop}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>Stop #{1000 + idx}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: "15px", fontWeight: "900", color: "#1e293b", marginBottom: "14px" }}>Scheduled Departure Times</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "10px" }}>
                          {scheduleResult.timetable.map((time, idx) => (
                            <div key={idx} style={{ padding: "10px", backgroundColor: "rgba(109, 40, 217, 0.08)", color: "#2e1065", border: "1px solid rgba(109, 40, 217, 0.2)", borderRadius: "10px", textAlign: "center", fontSize: "13.5px", fontWeight: "800" }}>
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
              <h3 style={{ fontSize: "18px", fontWeight: "900", marginBottom: "6px", color: "#1e293b" }}>Intercity Express Coach Reservation</h3>
              <p style={{ color: "#64748b", fontSize: "13.5px", marginBottom: "24px" }}>
                Reserve express coach tickets connecting Kerala district hubs.
              </p>

              {intercitySuccess ? (
                <div style={{ border: "1px solid rgba(34, 197, 94, 0.3)", backgroundColor: "rgba(34, 197, 94, 0.08)", textAlign: "center", padding: "36px 20px", maxWidth: "600px", margin: "0 auto", borderRadius: "20px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>✓</div>
                  <h4 style={{ color: "#15803d", fontWeight: "900", fontSize: "18px", marginBottom: "8px" }}>Reservation Confirmed!</h4>
                  <p style={{ fontSize: "14px", color: "#334155", marginBottom: "12px" }}>
                    Your ticket(s) from <strong>{intercityFrom}</strong> to <strong>{intercityTo}</strong> have been reserved.
                  </p>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>
                    Confirmation code registered to your account. View tickets in your Profile wallet.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleIntercitySubmit} style={{ maxWidth: "600px", margin: "0 auto" }}>
                  <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                    <label htmlFor="intercity-from-select" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>From (Origin District Hub)</label>
                    <select
                      id="intercity-from-select"
                      className="rta-input-field"
                      value={intercityFrom}
                      onChange={(e) => setIntercityFrom(e.target.value)}
                    >
                      <option value="Ernakulam (Kaloor Bus Stand)">Ernakulam (Kaloor Bus Stand)</option>
                      <option value="Thiruvananthapuram (Central Station)">Thiruvananthapuram (Central Station)</option>
                      <option value="Kozhikode (Private Bus Stand)">Kozhikode (Private Bus Stand)</option>
                      <option value="Thrissur (Sakthan Stand)">Thrissur (Sakthan Stand)</option>
                      <option value="Kottayam (KSRTC Terminal)">Kottayam (KSRTC Terminal)</option>
                    </select>
                  </div>

                  <div className="rta-input-group" style={{ marginBottom: "16px" }}>
                    <label htmlFor="intercity-to-select" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>To (Destination District Hub)</label>
                    <select
                      id="intercity-to-select"
                      className="rta-input-field"
                      value={intercityTo}
                      onChange={(e) => setIntercityTo(e.target.value)}
                    >
                      <option value="Thiruvananthapuram (Central Bus Station)">Thiruvananthapuram (Central Bus Station)</option>
                      <option value="Kozhikode (Mofussil Bus Stand)">Kozhikode (Mofussil Bus Stand)</option>
                      <option value="Thrissur (Central Station)">Thrissur (Central Station)</option>
                      <option value="Kollam (KSRTC Bus Station)">Kollam (KSRTC Bus Station)</option>
                      <option value="Kannur (Central Bus Stand)">Kannur (Central Bus Stand)</option>
                      <option value="Palakkad (KSRTC Terminal)">Palakkad (KSRTC Terminal)</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div className="rta-input-group">
                      <label htmlFor="intercity-date" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Departure Date</label>
                      <input id="intercity-date" type="date" className="rta-input-field" defaultValue={planDate} />
                    </div>
                    <div className="rta-input-group">
                      <label htmlFor="intercity-seats-select" style={{ fontSize: "12px", fontWeight: "800", color: "#475569" }}>Number of Seats</label>
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

                  <button type="submit" style={{ width: "100%", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}>
                    Confirm Reservation →
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Kerala Bus Grid Services Showcase */}
        <section id="services" style={{ marginTop: "50px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#1e293b", marginBottom: "6px" }}>Kerala Transit Bus Services</h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "24px" }}>Comprehensive public and private bus network catering to commuters across Kerala.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 8px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "rgba(109, 40, 217, 0.1)", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "14px" }}>
                🚌
              </div>
              <h3 style={{ fontSize: "16.5px", fontWeight: "900", color: "#1e293b", margin: "0 0 8px 0" }}>Inter-District Express Lines</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>Over 150 daily feeder and trunk routes connecting Ernakulam, Trivandrum, Kozhikode, and Thrissur terminals seamlessly.</p>
            </div>

            <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 8px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "rgba(34, 197, 94, 0.1)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "14px" }}>
                🪪
              </div>
              <h3 style={{ fontSize: "16.5px", fontWeight: "900", color: "#1e293b", margin: "0 0 8px 0" }}>MoveSmart Nol Pass</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>One virtual RFID smart card across Kerala transit. Instant top-ups via Razorpay and real-time balance tracking.</p>
            </div>

            <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 8px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "rgba(167, 139, 250, 0.15)", color: "#4c1d95", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "14px" }}>
                🗺️
              </div>
              <h3 style={{ fontSize: "16.5px", fontWeight: "900", color: "#1e293b", margin: "0 0 8px 0" }}>Live Route Tracking</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>Comfortable, GPS-tracked coaches leaving central bus stands daily for express corridor connectivity.</p>
            </div>
          </div>
        </section>

        {/* Nol Hub Branding Info */}
        <section id="nol-hub" style={{ marginTop: "50px", backgroundColor: "#ffffff", borderRadius: "24px", padding: "32px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px", alignItems: "center" }}>
            <div>
              <h2 style={{ fontWeight: "900", fontSize: "24px", color: "#1e293b", marginBottom: "12px" }}>The Smart Way to Board &amp; Pay</h2>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6", marginBottom: "20px" }}>
                The <strong>MoveSmart Nol Card</strong> is an RFID smart pass enabling tap-and-go fare deduction across Kerala bus services.
                Use it to ride KSRTC Fast Passenger, Swift Deluxe, and private feeder lines with dynamic distance-based calculation.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link to="/card-application" style={{ padding: "10px 20px", borderRadius: "12px", background: "#6d28d9", color: "#ffffff", textDecoration: "none", fontWeight: "800", fontSize: "13px" }}>Apply for Smart Pass</Link>
                <button type="button" onClick={() => setActiveTab("nol")} style={{ padding: "10px 20px", borderRadius: "12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}>Check Card Balance</button>
              </div>
            </div>

            <div>
              <div style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)",
                borderRadius: "20px",
                padding: "24px",
                color: "#ffffff",
                boxShadow: "0 12px 28px rgba(30, 27, 75, 0.2)",
                border: "1px solid rgba(167, 139, 250, 0.3)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "900", color: "#a78bfa", letterSpacing: "1px" }}>MOVESMART NOL PASS</span>
                  <span style={{ background: "rgba(74, 222, 128, 0.2)", color: "#4ade80", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "800" }}>ACTIVE</span>
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1" }}>Silver Smart Pass</div>
                <div style={{ fontSize: "20px", fontFamily: "monospace", fontWeight: "800", color: "#ffffff", margin: "10px 0" }}>9028 3948 57</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Auto Tap-In Enabled across Kerala Grid</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Appu Virtual Assistant Chatbot Widget */}
      <div>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Chat with Appu Assistant"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2e1065, #6d28d9)",
            color: "#ffffff",
            border: "2px solid #a78bfa",
            boxShadow: "0 10px 25px rgba(46, 16, 101, 0.35)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {chatOpen && (
          <div style={{
            position: "fixed",
            bottom: "92px",
            right: "24px",
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            height: "480px",
            background: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 999,
          }}>
            <div style={{ background: "linear-gradient(135deg, #2e1065, #1e1b4b)", padding: "16px 20px", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ backgroundColor: "#4ade80", color: "#1e1b4b", width: "26px", height: "26px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "13px" }}>A</span>
                <span style={{ fontWeight: "900", fontSize: "15px" }}>Appu Assistant</span>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "22px", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#f8fafc" }}>
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    background: msg.sender === "user" ? "#6d28d9" : "#ffffff",
                    color: msg.sender === "user" ? "#ffffff" : "#1e293b",
                    padding: "10px 14px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    maxWidth: "80%",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    border: msg.sender === "bot" ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleChatSend} style={{ padding: "12px 16px", background: "#ffffff", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="rta-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Appu about routes, Nol card..."
                style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
              />
              <button type="submit" style={{ padding: "10px 14px", borderRadius: "12px", background: "#6d28d9", color: "#ffffff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                ➜
              </button>
            </form>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default Dashboard;