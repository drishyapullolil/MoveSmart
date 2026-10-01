import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Bus,
  MapPin,
  Clock,
  ArrowRight,
  Search,
  Calendar,
  CreditCard,
  Wallet as WalletIcon,
  ShieldCheck,
  ArrowLeftRight,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Ticket,
  Filter,
  Compass,
  MessageSquare,
  X,
  ChevronRight,
  AlertCircle,
  Info,
  RefreshCw,
  Zap,
  Check,
  ExternalLink,
  Shield,
  Luggage,
  Send,
  Radio,
  Navigation,
  Layers,
  ArrowUpRight,
  LocateFixed,
  Eye,
  Maximize2,
  Image as ImageIcon
} from "lucide-react";
import { getStoredUser, getStoredToken } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LiveBusMap from "../components/common/LiveBusMap";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  // Search & Planner States
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dbLocations, setDbLocations] = useState([]);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Live Bus Results
  const [searchedBuses, setSearchedBuses] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Active Fleet & Departures Board
  const [allFleetBuses, setAllFleetBuses] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [fleetTimeFilter, setFleetTimeFilter] = useState("all"); // 'all', 'morning', 'afternoon', 'evening'
  const [fleetSearchQuery, setFleetSearchQuery] = useState("");

  // Live Tracking Search & Selected Bus State
  const [trackingSearchQuery, setTrackingSearchQuery] = useState("");
  const [selectedTrackingBus, setSelectedTrackingBus] = useState(null);
  const [liveFleetMap, setLiveFleetMap] = useState({}); // Key: busId -> { isTracking, status, latitude, longitude, speed }

  // User Stats & Dynamic Wallet/Passes
  const [userWalletBalance, setUserWalletBalance] = useState(null);
  const [activeCardsCount, setActiveCardsCount] = useState(0);

  // Appu Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "Namaskaram! 🌴 I am Appu, your MoveSmart AI Transit Assistant. How can I assist your journey today across Kerala?"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef(null);

  // Quick suggestions for chatbot
  const quickChatPrompts = [
    "🚍 Live buses active?",
    "💳 How to recharge card?",
    "🎫 Average route fares?",
    "🧳 Lost item support"
  ];

  // Fetch Database Stations on Load
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get("/api/locations");
        if (res.data?.success && Array.isArray(res.data.locations)) {
          setDbLocations(res.data.locations);
        }
      } catch (err) {
        console.warn("Could not load stations:", err.message);
      }
    };
    fetchLocations();
  }, []);

  // Fetch Live Fleet Buses & Real-Time Tracking Data from Database
  const fetchFleetBuses = useCallback(async () => {
    setLoadingFleet(true);
    try {
      const res = await axios.get("/api/buses/live-fleet");
      if (res.data?.fleet && Array.isArray(res.data.fleet)) {
        setAllFleetBuses(res.data.fleet);
        const map = {};
        res.data.fleet.forEach((b) => {
          map[String(b._id)] = {
            isTracking: b.isTracking,
            status: b.status,
            latitude: b.latitude,
            longitude: b.longitude,
            speed: b.speed,
            heading: b.heading,
            lastUpdated: b.lastUpdated,
          };
        });
        setLiveFleetMap(map);
      } else {
        const fallbackRes = await axios.get("/api/buses");
        if (fallbackRes.data?.buses && Array.isArray(fallbackRes.data.buses)) {
          setAllFleetBuses(fallbackRes.data.buses);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch fleet buses:", err.message);
    } finally {
      setLoadingFleet(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetBuses();
  }, [fetchFleetBuses]);

  // Real-Time Socket.IO Listener for Fleet GPS Broadcasts
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : window.location.origin);
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      // Listen to global fleet live locations
    });

    socket.on("admin:fleet-location", (data) => {
      if (data?.busId) {
        setLiveFleetMap((prev) => ({
          ...prev,
          [String(data.busId)]: {
            isTracking: data.isTracking !== false,
            status: data.status || "LIVE",
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            heading: data.heading,
            lastUpdated: data.lastUpdated || Date.now(),
          },
        }));
      }
    });

    socket.on("bus:trackingStarted", (data) => {
      if (data?.busId) {
        setLiveFleetMap((prev) => ({
          ...prev,
          [String(data.busId)]: {
            isTracking: true,
            status: "LIVE",
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            heading: data.heading,
            lastUpdated: Date.now(),
          },
        }));
      }
    });

    socket.on("bus:trackingStopped", (data) => {
      if (data?.busId) {
        setLiveFleetMap((prev) => ({
          ...prev,
          [String(data.busId)]: {
            ...(prev[String(data.busId)] || {}),
            isTracking: false,
            status: "OFFLINE",
          },
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch User Active Smart Cards & Balance Dynamically from Database
  useEffect(() => {
    const fetchUserStats = async () => {
      const token = getStoredToken();
      if (!token) return;
      try {
        const res = await axios.get("/api/cards/my-cards", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success && Array.isArray(res.data.cards)) {
          setActiveCardsCount(res.data.cards.length);
          const totalBal = res.data.cards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
          setUserWalletBalance(totalBal);
        }
      } catch (e) {
        // Handled silently
      }
    };
    fetchUserStats();
  }, []);

  // Dynamically extract unique active corridors from database buses
  const dynamicCorridors = useMemo(() => {
    const seen = new Set();
    const corridors = [];
    for (const bus of allFleetBuses) {
      if (bus.fromLocation && bus.toLocation) {
        const key = `${bus.fromLocation.trim()}-->${bus.toLocation.trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          corridors.push({
            from: bus.fromLocation.trim(),
            to: bus.toLocation.trim(),
            busType: bus.busType || "Standard",
            duration: bus.duration || "Direct",
            fare: bus.ticketPrice || bus.fare,
            departureTime: bus.departureTime
          });
        }
      }
    }
    return corridors;
  }, [allFleetBuses]);

  // Auto-scroll chatbot
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  // Autocomplete filtering from DB locations
  const handleOriginChange = (val) => {
    setOrigin(val);
    if (!val.trim()) {
      setOriginSuggestions([]);
      setShowOriginDropdown(false);
      return;
    }
    const q = val.toLowerCase();
    const matches = dbLocations.filter((loc) => loc.toLowerCase().includes(q)).slice(0, 7);
    setOriginSuggestions(matches);
    setShowOriginDropdown(matches.length > 0);
  };

  const handleDestChange = (val) => {
    setDestination(val);
    if (!val.trim()) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }
    const q = val.toLowerCase();
    const matches = dbLocations.filter((loc) => loc.toLowerCase().includes(q)).slice(0, 7);
    setDestSuggestions(matches);
    setShowDestDropdown(matches.length > 0);
  };

  const swapStations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  // Perform Live Bus Search against backend database
  const handleSearchBuses = async (orig = origin, dest = destination) => {
    if (!orig.trim() || !dest.trim()) {
      setSearchError("Please specify both Boarding (Origin) and Drop (Destination) stations.");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    setHasSearched(true);

    try {
      const res = await axios.get("/api/buses", {
        params: {
          from: orig.trim(),
          to: dest.trim(),
          date: planDate
        }
      });
      const busesList = res.data?.buses || [];
      setSearchedBuses(busesList);
    } catch (err) {
      setSearchError(err.response?.data?.message || "Error searching for bus routes. Please try again.");
      setSearchedBuses([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 1-Click Dynamic Corridor Search
  const handleQuickCorridor = (corr) => {
    setOrigin(corr.from);
    setDestination(corr.to);
    handleSearchBuses(corr.from, corr.to);
  };

  // Dynamic AI Database Chatbot Handler (queries active MongoDB database in real-time)
  const handleSendMessage = async (customText) => {
    const textToSend = typeof customText === "string" ? customText : chatInput;
    if (!textToSend.trim()) return;
    const userText = textToSend.trim();
    const newMsgs = [...chatMessages, { sender: "user", text: userText }];
    setChatMessages(newMsgs);
    setChatInput("");

    try {
      const res = await axios.post("/api/chat", { message: userText }, { timeout: 8000 });
      if (res.data && res.data.reply) {
        setChatMessages((prev) => [...prev, { sender: "bot", text: res.data.reply }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: "I couldn't find relevant details in the database. Try asking for buses between two stations (e.g. 'Kanjirappally to Erumely')." }
        ]);
      }
    } catch (err) {
      console.warn("Error querying database chat assistant:", err.message);
      // Fallback local intelligent response if offline
      const q = userText.toLowerCase();
      let fallbackReply = `We have ${allFleetBuses.length} active buses across ${dbLocations.length} stations. Try asking for 'Kanjirappally to Erumely', fares, or driver details!`;
      setChatMessages((prev) => [...prev, { sender: "bot", text: fallbackReply }]);
    }
  };

  // Filter fleet buses for Timetable Radar
  const filteredFleet = allFleetBuses.filter((bus) => {
    if (fleetTimeFilter !== "all") {
      const dep = bus.departureTime || "";
      const match = dep.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        const meridiem = (match[3] || "").toUpperCase();
        if (meridiem === "PM" && hour < 12) hour += 12;
        if (meridiem === "AM" && hour === 12) hour = 0;

        if (fleetTimeFilter === "morning" && (hour < 5 || hour >= 12)) return false;
        if (fleetTimeFilter === "afternoon" && (hour < 12 || hour >= 17)) return false;
        if (fleetTimeFilter === "evening" && hour < 17) return false;
      }
    }
    if (fleetSearchQuery.trim()) {
      const q = fleetSearchQuery.toLowerCase();
      const bNum = (bus.busNumber || "").toLowerCase();
      const bName = (bus.busName || "").toLowerCase();
      const bFrom = (bus.fromLocation || "").toLowerCase();
      const bTo = (bus.toLocation || "").toLowerCase();
      const bType = (bus.busType || "").toLowerCase();
      return bNum.includes(q) || bName.includes(q) || bFrom.includes(q) || bTo.includes(q) || bType.includes(q);
    }
    return true;
  });

  // Filter buses for Live Bus Tracking Radar
  const trackingMatchedBuses = useMemo(() => {
    if (!trackingSearchQuery.trim()) {
      return allFleetBuses.slice(0, 6);
    }
    const q = trackingSearchQuery.toLowerCase().trim();
    return allFleetBuses.filter((b) => {
      const bNum = (b.busNumber || "").toLowerCase();
      const bName = (b.busName || "").toLowerCase();
      const bFrom = (b.fromLocation || "").toLowerCase();
      const bTo = (b.toLocation || "").toLowerCase();
      const bRoute = `${bFrom} ${bTo}`;
      return bNum.includes(q) || bName.includes(q) || bRoute.includes(q);
    });
  }, [allFleetBuses, trackingSearchQuery]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #fbfaff 0%, #f4fbf7 50%, #f9fafb 100%)",
        color: "#1e293b",
        fontFamily: "'Plus Jakarta Sans', 'Outfit', -apple-system, sans-serif",
        position: "relative"
      }}
    >
      {/* Decorative ambient background accents */}
      <div
        style={{
          position: "fixed",
          top: "5%",
          left: "-5%",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "35%",
          right: "-5%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      <Header />

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          maxWidth: "1380px",
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px 64px",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1
        }}
      >
        {/* ========================================================= */}
        {/* 1. HERO COMMUTER BANNER WITH LIGHT PURPLE & GREEN PALETTE */}
        {/* ========================================================= */}
        <section
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 40%, #064e3b 100%)",
            borderRadius: "24px",
            padding: "36px 40px",
            color: "#ffffff",
            marginBottom: "36px",
            boxShadow: "0 20px 40px -15px rgba(30, 27, 75, 0.4), 0 0 0 1px rgba(168, 85, 247, 0.2)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Subtle luminous aesthetic rings */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: "-60px",
              width: "320px",
              height: "320px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 75%)",
              filter: "blur(20px)",
              pointerEvents: "none"
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-70px",
              left: "20%",
              width: "250px",
              height: "250px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
              filter: "blur(30px)",
              pointerEvents: "none"
            }}
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "28px",
              position: "relative",
              zIndex: 2
            }}
          >
            <div>
              {/* Status Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    background: "rgba(16, 185, 129, 0.18)",
                    color: "#34d399",
                    padding: "5px 14px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(52, 211, 153, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backdropFilter: "blur(6px)"
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#34d399",
                      boxShadow: "0 0 10px #34d399"
                    }}
                  />
                  Smart Transit Online
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    background: "rgba(168, 85, 247, 0.2)",
                    color: "#d8b4fe",
                    padding: "5px 14px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(192, 132, 252, 0.35)",
                    backdropFilter: "blur(6px)"
                  }}
                >
                  ✨ {dbLocations.length > 0 ? `${dbLocations.length} Connected Stations` : "Network Active"}
                </span>
              </div>

              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: "900",
                  margin: "0 0 8px 0",
                  color: "#ffffff",
                  letterSpacing: "-0.5px",
                  lineHeight: "1.2"
                }}
              >
                Namaskaram,{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #a7f3d0 0%, #d8b4fe 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  {user?.name || "Commuter"}
                </span>{" "}
                👋
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  color: "#cbd5e1",
                  maxWidth: "620px",
                  lineHeight: "1.6"
                }}
              >
                Your unified smart transit hub. Track live buses in real time on the map, check intermediate station arrivals, top up your wallet, and reserve seats.
              </p>
            </div>

            {/* Dynamic Glassmorphic KPI Stat Cards */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              
              {/* Card 1: Live Active Fleet */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  borderRadius: "18px",
                  padding: "16px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  transition: "transform 0.2s"
                }}
              >
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)",
                    border: "1px solid rgba(52, 211, 153, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#34d399"
                  }}
                >
                  <Bus size={24} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#a7f3d0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
                    Active Network Fleet
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", marginTop: "2px" }}>
                    {loadingFleet ? "Checking..." : `${allFleetBuses.length} Buses Live`}
                  </div>
                </div>
              </div>

              {/* Card 2: Smart Pass / Wallet Balance */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(192, 132, 252, 0.35)",
                  borderRadius: "18px",
                  padding: "16px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  transition: "transform 0.2s"
                }}
              >
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(126, 34, 206, 0.4) 100%)",
                    border: "1px solid rgba(192, 132, 252, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#d8b4fe"
                  }}
                >
                  <WalletIcon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#e9d5ff", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
                    RFID Pass Balance
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", marginTop: "2px" }}>
                    {userWalletBalance !== null ? `₹${userWalletBalance.toFixed(2)}` : (activeCardsCount > 0 ? "Active" : "Apply Pass")}
                  </div>
                </div>
                <Link
                  to="/wallet"
                  style={{
                    color: "#a7f3d0",
                    marginLeft: "8px",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    transition: "all 0.2s"
                  }}
                  title="Open Wallet"
                >
                  <ArrowUpRight size={18} />
                </Link>
              </div>

              {/* Card 3: Bus Fleet Gallery Showcase */}
              <Link
                to="/bus-gallery"
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(147, 51, 234, 0.4)",
                  borderRadius: "18px",
                  padding: "16px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  textDecoration: "none",
                  transition: "transform 0.2s, background 0.2s",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                }}
              >
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(147, 51, 234, 0.4) 100%)",
                    border: "1px solid rgba(236, 72, 153, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f472b6"
                  }}
                >
                  <ImageIcon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#fbcfe8", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
                    Fleet Showcase
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Bus Gallery</span>
                    <ArrowUpRight size={16} color="#f472b6" />
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. REAL-TIME LIVE BUS TRACKING & RADAR MAP SECTION        */}
        {/* ========================================================= */}
        <section
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #fbfaff 100%)",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 10px 30px -5px rgba(168, 85, 247, 0.06), 0 4px 12px rgba(16, 185, 129, 0.04)",
            border: "1.5px solid #ede9fe",
            marginBottom: "36px",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ecfdf5 0%, #f3e8ff 100%)",
                    border: "1px solid #d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669"
                  }}
                >
                  <Radio size={20} className="animate-pulse" />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#1e1b4b", margin: 0 }}>
                  Live Bus Tracking &amp; GPS Radar
                </h2>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                Track moving vehicles on OpenStreetMap in real time with live speed and stop ETAs
              </p>
            </div>

            {/* Bus Search Input for Quick Tracking */}
            <div style={{ position: "relative", minWidth: "260px" }}>
              <Search size={16} color="#8b5cf6" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search bus no. (e.g. MS-102, KL-07) or route..."
                value={trackingSearchQuery}
                onChange={(e) => setTrackingSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: "12px",
                  border: "1.5px solid #ddd6fe",
                  background: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#1e1b4b",
                  boxSizing: "border-box",
                  outline: "none"
                }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#059669")}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#ddd6fe")}
              />
            </div>
          </div>

          {/* Quick Bus Tracking Results / Selector Chips */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", marginBottom: selectedTrackingBus ? "24px" : "0" }}>
            {trackingMatchedBuses.map((bus) => {
              const liveData = liveFleetMap[String(bus._id)] || {};
              const isLive = Boolean(liveData.isTracking && liveData.status !== "OFFLINE");
              const isSelected = selectedTrackingBus?._id === bus._id;

              return (
                <div
                  key={bus._id}
                  onClick={() => setSelectedTrackingBus(isSelected ? null : bus)}
                  style={{
                    background: isSelected ? "linear-gradient(135deg, #f5f3ff 0%, #ecfdf5 100%)" : "#ffffff",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid #059669" : "1.5px solid #ede9fe",
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: isSelected ? "0 8px 20px rgba(5, 150, 105, 0.15)" : "0 2px 6px rgba(0,0,0,0.02)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "#8b5cf6";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "#ede9fe";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "900", color: "#1e1b4b", fontSize: "14px" }}>
                        {bus.busNumber}
                      </span>
                      {isLive ? (
                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "9999px", display: "inline-flex", alignItems: "center", gap: "4px", border: "1px solid #a7f3d0" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                          LIVE
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "9999px" }}>
                          STANDBY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>{bus.fromLocation}</span>
                      <ArrowRight size={11} color="#94a3b8" />
                      <span>{bus.toLocation}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      style={{
                        background: isSelected ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                        color: isSelected ? "#ffffff" : "#6d28d9",
                        border: "none",
                        padding: "7px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Navigation size={13} />
                      <span>{isSelected ? "Tracking Active" : "Track Bus"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Embedded Real-Time Leaflet Bus Map */}
          {selectedTrackingBus && (
            <div style={{ marginTop: "16px", animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#059669" }}>
                    🛰️ Live Map:
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: "900", color: "#1e1b4b" }}>
                    {selectedTrackingBus.busName} ({selectedTrackingBus.busNumber})
                  </span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    — {selectedTrackingBus.fromLocation} ➔ {selectedTrackingBus.toLocation}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTrackingBus(null)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", fontWeight: "700", color: "#475569", cursor: "pointer" }}
                >
                  Close Map ✕
                </button>
              </div>

              <LiveBusMap
                busId={selectedTrackingBus._id}
                busData={selectedTrackingBus}
                height="440px"
                onClose={() => setSelectedTrackingBus(null)}
              />
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 3. LIVE BUS ROUTE FINDER & STOPS PLANNER                  */}
        {/* ========================================================= */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 10px 30px -5px rgba(168, 85, 247, 0.06), 0 4px 12px rgba(16, 185, 129, 0.04)",
            border: "1.5px solid #ede9fe",
            marginBottom: "36px",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ecfdf5 0%, #f3e8ff 100%)",
                    border: "1px solid #d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669"
                  }}
                >
                  <Compass size={20} />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1e1b4b", margin: 0 }}>
                  Smart Route &amp; Stop Planner
                </h2>
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                Search direct routes and intermediate stopping stations with live departure schedules
              </p>
            </div>

            {/* Dynamic Active Corridor Quick Chips */}
            {dynamicCorridors.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚡ Quick Routes:
                </span>
                {dynamicCorridors.slice(0, 4).map((corr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickCorridor(corr)}
                    style={{
                      background: "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%)",
                      border: "1px solid #ddd6fe",
                      borderRadius: "9999px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#4338ca",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(168, 85, 247, 0.06)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#ede9fe";
                      e.currentTarget.style.borderColor = "#059669";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%)";
                      e.currentTarget.style.borderColor = "#ddd6fe";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <span>{corr.from}</span>
                    <ArrowRight size={12} color="#059669" />
                    <span>{corr.to}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Inputs Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "flex-end" }}>
            
            {/* Origin Stop Input */}
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#059669", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🟢 Boarding From (Origin)
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#059669", display: "flex" }}>
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Ernakulam, Trivandrum..."
                  value={origin}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  onFocus={() => { if (originSuggestions.length > 0) setShowOriginDropdown(true); }}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "14px",
                    border: "1.5px solid #d1fae5",
                    background: "#fdfefe",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = "#10b981";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.15)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = "#d1fae5";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Origin Autocomplete Dropdown */}
              {showOriginDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, background: "#ffffff", borderRadius: "14px", marginTop: "6px", boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {originSuggestions.map((loc, i) => (
                    <div
                      key={i}
                      onClick={() => { setOrigin(loc); setShowOriginDropdown(false); }}
                      style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#1e293b", cursor: "pointer", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", gap: "10px" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      <MapPin size={15} color="#059669" /> {loc}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button (desktop) */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "6px" }}>
              <button
                type="button"
                onClick={swapStations}
                title="Swap Boarding &amp; Drop Stations"
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  border: "1.5px solid #ddd6fe",
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ecfdf5 100%)",
                  color: "#7c3aed",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(124, 58, 237, 0.1)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "rotate(180deg) scale(1.05)";
                  e.currentTarget.style.borderColor = "#059669";
                  e.currentTarget.style.color = "#059669";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "#ddd6fe";
                  e.currentTarget.style.color = "#7c3aed";
                }}
              >
                <ArrowLeftRight size={18} />
              </button>
            </div>

            {/* Destination Stop Input */}
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#7c3aed", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🟣 Destination (Drop Stop)
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#8b5cf6", display: "flex" }}>
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Kozhikode, Thrissur..."
                  value={destination}
                  onChange={(e) => handleDestChange(e.target.value)}
                  onFocus={() => { if (destSuggestions.length > 0) setShowDestDropdown(true); }}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "14px",
                    border: "1.5px solid #ede9fe",
                    background: "#fdfefe",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = "#8b5cf6";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(139, 92, 246, 0.15)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = "#ede9fe";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Destination Autocomplete Dropdown */}
              {showDestDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, background: "#ffffff", borderRadius: "14px", marginTop: "6px", boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {destSuggestions.map((loc, i) => (
                    <div
                      key={i}
                      onClick={() => { setDestination(loc); setShowDestDropdown(false); }}
                      style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "700", color: "#1e293b", cursor: "pointer", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", gap: "10px" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      <MapPin size={15} color="#8b5cf6" /> {loc}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Travel Date */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📅 Journey Date
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", display: "flex" }}>
                  <Calendar size={18} />
                </div>
                <input
                  type="date"
                  value={planDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPlanDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "14px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(124, 58, 237, 0.12)";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Search Action Button */}
            <div>
              <button
                type="button"
                onClick={() => handleSearchBuses()}
                disabled={isSearching}
                style={{
                  width: "100%",
                  padding: "15px 22px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #7c3aed 100%)",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: "800",
                  border: "none",
                  cursor: isSearching ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 8px 20px rgba(5, 150, 105, 0.28)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (!isSearching) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 26px rgba(124, 58, 237, 0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(5, 150, 105, 0.28)";
                }}
              >
                {isSearching ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Searching Fleet...
                  </>
                ) : (
                  <>
                    <Search size={18} /> Find Live Buses
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Error Message */}
          {searchError && (
            <div
              style={{
                marginTop: "20px",
                padding: "14px 18px",
                background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
                border: "1.5px solid #fecaca",
                borderRadius: "12px",
                color: "#b91c1c",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <AlertCircle size={20} />
              <span>{searchError}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* SEARCH RESULTS TRAY                                      */}
          {/* ========================================================= */}
          {hasSearched && !isSearching && (
            <div style={{ marginTop: "32px", borderTop: "2px dashed #ede9fe", paddingTop: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>Matching Departures:</span>
                  <span
                    style={{
                      color: "#059669",
                      background: "linear-gradient(135deg, #ecfdf5 0%, #f5f3ff 100%)",
                      padding: "4px 14px",
                      borderRadius: "9999px",
                      border: "1px solid #a7f3d0",
                      fontSize: "14px",
                      fontWeight: "800"
                    }}
                  >
                    {origin} ➔ {destination}
                  </span>
                </h3>
                <span style={{ fontSize: "13px", color: "#7c3aed", fontWeight: "800", background: "#f5f3ff", padding: "4px 12px", borderRadius: "8px" }}>
                  {searchedBuses?.length || 0} buses found
                </span>
              </div>

              {searchedBuses && searchedBuses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "44px 20px", background: "linear-gradient(180deg, #fbfaff 0%, #f4fbf7 100%)", borderRadius: "18px", border: "1.5px dashed #cbd5e1" }}>
                  <Bus size={48} color="#8b5cf6" style={{ margin: "0 auto 14px", opacity: 0.8 }} />
                  <h4 style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b", margin: "0 0 8px 0" }}>
                    No Scheduled Buses Found for this Corridor
                  </h4>
                  <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", maxWidth: "500px", marginInline: "auto", lineHeight: "1.6" }}>
                    We could not find direct or intermediate buses passing "{origin}" and "{destination}" on {planDate}. Try checking major terminus points or view our full active network.
                  </p>
                  <button
                    onClick={() => navigate("/book-bus")}
                    style={{
                      background: "linear-gradient(135deg, #059669 0%, #7c3aed 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "10px 22px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(124, 58, 237, 0.25)"
                    }}
                  >
                    Explore Complete Bus Directory
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "20px" }}>
                  {searchedBuses?.map((bus) => {
                    const ctx = bus.searchContext;
                    const boardingTime = ctx?.boardingDepartureTime || bus.departureTime;
                    const dropTime = ctx?.dropArrivalTime || bus.arrivalTime;
                    const segDuration = ctx?.segmentDuration || bus.duration;
                    const boardingName = ctx?.boardingStationName || bus.fromLocation;
                    const dropName = ctx?.dropStationName || bus.toLocation;
                    const displayFare = bus.ticketPrice || bus.fare;
                    const isLiveBus = Boolean(liveFleetMap[String(bus._id)]?.isTracking);

                    return (
                      <div
                        key={bus._id}
                        style={{
                          background: "#ffffff",
                          borderRadius: "18px",
                          border: "1.5px solid #ede9fe",
                          padding: "22px",
                          boxShadow: "0 4px 16px rgba(168, 85, 247, 0.05)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          transition: "all 0.25s",
                          position: "relative",
                          overflow: "hidden"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#10b981";
                          e.currentTarget.style.transform = "translateY(-3px)";
                          e.currentTarget.style.boxShadow = "0 12px 30px rgba(16, 185, 129, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#ede9fe";
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "0 4px 16px rgba(168, 85, 247, 0.05)";
                        }}
                      >
                        {/* Top accent line */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #10b981, #8b5cf6)" }} />

                        <div>
                          {/* Top Tag & Bus Name */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", marginTop: "4px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", background: "linear-gradient(135deg, #f5f3ff 0%, #ecfdf5 100%)", color: "#6d28d9", padding: "4px 10px", borderRadius: "8px", border: "1px solid #ddd6fe" }}>
                                  {bus.busType || "Standard"} • {bus.busNumber}
                                </span>
                                {isLiveBus && (
                                  <span style={{ fontSize: "10px", fontWeight: "800", color: "#059669", background: "#ecfdf5", padding: "3px 8px", borderRadius: "6px", border: "1px solid #a7f3d0", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
                                    LIVE GPS
                                  </span>
                                )}
                              </div>
                              <h4 style={{ fontSize: "17px", fontWeight: "900", color: "#1e1b4b", margin: 0 }}>
                                {bus.busName}
                              </h4>
                            </div>
                            {displayFare && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "20px", fontWeight: "900", color: "#059669" }}>
                                  ₹{displayFare}
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>per passenger</div>
                              </div>
                            )}
                          </div>

                          {/* Route & Timings Widget */}
                          <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f5f3ff 100%)", borderRadius: "14px", padding: "14px", marginBottom: "16px", border: "1px solid #ede9fe" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <div>
                                <div style={{ fontSize: "11px", color: "#059669", fontWeight: "800" }}>🟢 Board at {boardingName}</div>
                                <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e1b4b", marginTop: "2px" }}>{boardingTime}</div>
                              </div>
                              <div style={{ textAlign: "center", padding: "0 8px" }}>
                                <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: "800" }}>{segDuration}</div>
                                <div style={{ display: "flex", alignItems: "center", color: "#94a3b8", justifyContent: "center" }}>
                                  <div style={{ width: "24px", height: "2px", background: "linear-gradient(90deg, #10b981, #8b5cf6)" }} />
                                  <ArrowRight size={14} color="#7c3aed" />
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "11px", color: "#8b5cf6", fontWeight: "800" }}>🟣 Drop at {dropName}</div>
                                <div style={{ fontSize: "16px", fontWeight: "900", color: "#1e1b4b", marginTop: "2px" }}>{dropTime}</div>
                              </div>
                            </div>

                            {/* Origin/Terminus indicator if intermediate segment */}
                            {ctx && (
                              <div style={{ fontSize: "11px", color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: "8px", marginTop: "8px" }}>
                                Full Corridor: <strong style={{ color: "#1e1b4b" }}>{bus.fromLocation}</strong> ➔ <strong style={{ color: "#1e1b4b" }}>{bus.toLocation}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "6px" }}>
                          <button
                            onClick={() => setSelectedTrackingBus(bus)}
                            style={{
                              background: "#f5f3ff",
                              color: "#6d28d9",
                              border: "1.5px solid #ddd6fe",
                              padding: "12px 14px",
                              borderRadius: "12px",
                              fontSize: "13px",
                              fontWeight: "800",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px"
                            }}
                          >
                            <Navigation size={15} /> Track Live
                          </button>

                          <button
                            onClick={() => navigate("/book-bus", { state: { preselectBusId: bus._id, from: origin, to: destination, date: planDate } })}
                            style={{
                              flex: 1,
                              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                              color: "#ffffff",
                              border: "none",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              fontSize: "13px",
                              fontWeight: "800",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                              transition: "all 0.2s"
                            }}
                          >
                            <Ticket size={16} /> Select Seats &amp; Book
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 4. CORE COMMUTER SERVICES HUB (LIGHT PURPLE & GREEN)      */}
        {/* ========================================================= */}
        <section style={{ marginBottom: "38px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#1e1b4b", margin: 0 }}>
                Essential Commuter Services
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                Direct portals for bus seats, smart card recharge, pass applications, and claims
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "22px" }}>
            
            {/* Card 1: Bus Booking & Seats (Green Theme) */}
            <div
              onClick={() => navigate("/book-bus")}
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "26px",
                border: "1.5px solid #d1fae5",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.06)",
                cursor: "pointer",
                transition: "all 0.25s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#059669";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(5, 150, 105, 0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "#d1fae5";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.06)";
              }}
            >
              <div>
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                    border: "1px solid #a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                    marginBottom: "18px"
                  }}
                >
                  <Bus size={26} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1e1b4b", margin: "0 0 8px 0" }}>
                  Bus Seat Reservation
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
                  Browse real-time coach seat layouts, reserve preferred seats, and download digital boarding passes.
                </p>
              </div>
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontSize: "13px", fontWeight: "800" }}>
                <span>Open Seat Directory</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Card 2: MoveSmart Nol Wallet (Purple Theme) */}
            <div
              onClick={() => navigate("/wallet")}
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "26px",
                border: "1.5px solid #ede9fe",
                boxShadow: "0 6px 20px rgba(168, 85, 247, 0.06)",
                cursor: "pointer",
                transition: "all 0.25s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#8b5cf6";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(139, 92, 246, 0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "#ede9fe";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(168, 85, 247, 0.06)";
              }}
            >
              <div>
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                    border: "1px solid #ddd6fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#7c3aed",
                    marginBottom: "18px"
                  }}
                >
                  <CreditCard size={26} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1e1b4b", margin: "0 0 8px 0" }}>
                  MoveSmart Nol Wallet
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
                  Instant digital wallet recharge via Razorpay UPI &amp; Cards. Monitor pass tap deductions and history.
                </p>
              </div>
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "6px", color: "#7c3aed", fontSize: "13px", fontWeight: "800" }}>
                <span>Recharge &amp; Passes</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Card 3: Smart RFID Passes (Lilac/Violet Theme) */}
            <div
              onClick={() => navigate("/dashboard/card-application")}
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "26px",
                border: "1.5px solid #f3e8ff",
                boxShadow: "0 6px 20px rgba(192, 132, 252, 0.06)",
                cursor: "pointer",
                transition: "all 0.25s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#a855f7";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(168, 85, 247, 0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "#f3e8ff";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(192, 132, 252, 0.06)";
              }}
            >
              <div>
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                    border: "1px solid #e9d5ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9333ea",
                    marginBottom: "18px"
                  }}
                >
                  <ShieldCheck size={26} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1e1b4b", margin: "0 0 8px 0" }}>
                  RFID Smart Card Pass
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
                  Apply for physical contact-free RFID transit passes (Student, Senior Citizen, Concession) with depot pickup.
                </p>
              </div>
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "6px", color: "#9333ea", fontSize: "13px", fontWeight: "800" }}>
                <span>Apply / Track Card</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Card 4: Lost &amp; Found Desk (Mint &amp; Amber Theme) */}
            <div
              onClick={() => navigate("/lost-found")}
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "26px",
                border: "1.5px solid #ecfdf5",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.06)",
                cursor: "pointer",
                transition: "all 0.25s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#059669";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(5, 150, 105, 0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "#ecfdf5";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.06)";
              }}
            >
              <div>
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
                    border: "1px solid #a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                    marginBottom: "18px"
                  }}
                >
                  <Luggage size={26} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1e1b4b", margin: "0 0 8px 0" }}>
                  Transit Lost &amp; Found
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
                  Search recovered belongings left in buses or submit claims for misplaced bags, devices, and documents.
                </p>
              </div>
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontSize: "13px", fontWeight: "800" }}>
                <span>Open Claims Desk</span>
                <ChevronRight size={16} />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. LIVE FLEET RADAR & TIMETABLE TABLE                     */}
        {/* ========================================================= */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 10px 30px -5px rgba(168, 85, 247, 0.06), 0 4px 12px rgba(16, 185, 129, 0.04)",
            border: "1.5px solid #ede9fe",
            marginBottom: "38px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "18px", marginBottom: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ecfdf5 0%, #ede9fe 100%)",
                    border: "1px solid #d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669"
                  }}
                >
                  <Zap size={20} />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#1e1b4b", margin: 0 }}>
                  Active Network Timetable Radar
                </h2>
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                Live departures and scheduled fleet operations across Kerala
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              
              {/* Quick Search */}
              <div style={{ position: "relative" }}>
                <Search size={16} color="#8b5cf6" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Filter bus or station..."
                  value={fleetSearchQuery}
                  onChange={(e) => setFleetSearchQuery(e.target.value)}
                  style={{
                    padding: "9px 14px 9px 38px",
                    borderRadius: "12px",
                    border: "1.5px solid #ede9fe",
                    fontSize: "13px",
                    fontWeight: "600",
                    outline: "none",
                    background: "#fbfaff",
                    color: "#1e1b4b"
                  }}
                  onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#8b5cf6")}
                  onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#ede9fe")}
                />
              </div>

              {/* Time Filters */}
              <div style={{ display: "flex", background: "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%)", padding: "4px", borderRadius: "12px", border: "1px solid #ddd6fe" }}>
                {[
                  { id: "all", label: "All Day" },
                  { id: "morning", label: "Morning" },
                  { id: "afternoon", label: "Afternoon" },
                  { id: "evening", label: "Evening" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFleetTimeFilter(t.id)}
                    style={{
                      background: fleetTimeFilter === t.id ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "transparent",
                      color: fleetTimeFilter === t.id ? "#ffffff" : "#475569",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: "pointer",
                      boxShadow: fleetTimeFilter === t.id ? "0 2px 8px rgba(5, 150, 105, 0.3)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={fetchFleetBuses}
                title="Refresh Timetable"
                style={{
                  background: "#f5f3ff",
                  border: "1px solid #ddd6fe",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#7c3aed",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#ede9fe"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f5f3ff"; }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Timetable Table */}
          <div style={{ overflowX: "auto", borderRadius: "14px", border: "1px solid #ede9fe" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%)", borderBottom: "1.5px solid #ddd6fe" }}>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bus / Service</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Class</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Corridor Route</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Departure</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Duration</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Fare</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>Live Status</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "800", color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingFleet ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 10px", color: "#059669" }} />
                      <div style={{ fontWeight: "700" }}>Syncing live fleet departures...</div>
                    </td>
                  </tr>
                ) : filteredFleet.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#64748b", fontWeight: "600" }}>
                      No active buses match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredFleet.map((bus) => {
                    const isLive = Boolean(liveFleetMap[String(bus._id)]?.isTracking);
                    return (
                      <tr
                        key={bus._id}
                        style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ fontWeight: "800", color: "#1e1b4b", fontSize: "14px" }}>{bus.busName}</div>
                          <div style={{ fontSize: "12px", color: "#7c3aed", fontWeight: "700" }}>{bus.busNumber}</div>
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "800",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              background: bus.busType?.toLowerCase().includes("ac") ? "#ecfdf5" : "#f5f3ff",
                              color: bus.busType?.toLowerCase().includes("ac") ? "#059669" : "#6d28d9",
                              border: `1px solid ${bus.busType?.toLowerCase().includes("ac") ? "#a7f3d0" : "#ddd6fe"}`
                            }}
                          >
                            {bus.busType || "Standard"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{bus.fromLocation}</span>
                            <ArrowRight size={13} color="#059669" />
                            <span>{bus.toLocation}</span>
                          </div>
                          {Array.isArray(bus.intermediateStops) && bus.intermediateStops.length > 0 && (
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                              via {bus.intermediateStops.map(s => s.name || s.stationName || s).slice(0, 3).join(", ")}
                              {bus.intermediateStops.length > 3 ? ` +${bus.intermediateStops.length - 3} stops` : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ fontWeight: "800", color: "#1e1b4b", fontSize: "14px" }}>{bus.departureTime}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Arr: {bus.arrivalTime}</div>
                        </td>
                        <td style={{ padding: "16px 18px", fontSize: "13px", color: "#475569", fontWeight: "700" }}>
                          {bus.duration || "Direct"}
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ fontWeight: "900", color: "#059669", fontSize: "15px" }}>
                            {bus.ticketPrice || bus.fare ? `₹${bus.ticketPrice || bus.fare}` : "Standard"}
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px" }}>
                          {isLive ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "800", color: "#059669", background: "#ecfdf5", padding: "4px 10px", borderRadius: "9999px", border: "1px solid #a7f3d0" }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                              <span>LIVE NOW</span>
                            </div>
                          ) : (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "9999px" }}>
                              <span>Scheduled</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "16px 18px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            <button
                              onClick={() => setSelectedTrackingBus(bus)}
                              style={{
                                background: "#f5f3ff",
                                color: "#6d28d9",
                                border: "1px solid #ddd6fe",
                                padding: "8px 12px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "800",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                              title="Track Live on Map"
                            >
                              <Navigation size={13} />
                              <span>Track</span>
                            </button>

                            <button
                              onClick={() => navigate("/book-bus", { state: { preselectBusId: bus._id } })}
                              style={{
                                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                                color: "#ffffff",
                                border: "none",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "800",
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                                transition: "all 0.2s"
                              }}
                            >
                              Book Seat
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. POPULAR ACTIVE TRANSIT CORRIDORS                       */}
        {/* ========================================================= */}
        {dynamicCorridors.length > 0 && (
          <section style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#1e1b4b", margin: 0 }}>
                  Active Transit Corridors
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                  Direct scheduled routes operating in the network
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px" }}>
              {dynamicCorridors.slice(0, 6).map((corr, i) => (
                <div
                  key={i}
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px",
                    padding: "20px",
                    border: "1.5px solid #ede9fe",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 4px 14px rgba(168, 85, 247, 0.04)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#059669";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ede9fe";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                        {corr.busType}
                      </span>
                      {corr.fare && (
                        <span style={{ fontSize: "14px", color: "#7c3aed", fontWeight: "900" }}>₹{corr.fare}</span>
                      )}
                    </div>
                    <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#1e1b4b", margin: "0 0 6px 0" }}>
                      {corr.from} ➔ {corr.to}
                    </h4>
                    <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                      <span>⏱ {corr.duration}</span>
                      {corr.departureTime && <span>• Dep {corr.departureTime}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickCorridor(corr)}
                    style={{
                      marginTop: "16px",
                      background: "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%)",
                      border: "1px solid #ddd6fe",
                      color: "#4338ca",
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#059669";
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "#059669";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%)";
                      e.currentTarget.style.color = "#4338ca";
                      e.currentTarget.style.borderColor = "#ddd6fe";
                    }}
                  >
                    <Search size={14} /> Check Live Timings
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ========================================================= */}
      {/* 7. FLOATING APPU TRANSIT CHATBOT                          */}
      {/* ========================================================= */}
      <div style={{ position: "fixed", bottom: "28px", right: "28px", zIndex: 1000 }}>
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #7c3aed 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 8px 24px rgba(124, 58, 237, 0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            title="Ask Appu MoveSmart Assistant"
          >
            <MessageSquare size={28} />
          </button>
        ) : (
          <div
            style={{
              width: "360px",
              height: "490px",
              background: "#ffffff",
              borderRadius: "22px",
              boxShadow: "0 16px 40px rgba(30, 27, 75, 0.25)",
              border: "1.5px solid #ede9fe",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Chat Header */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #064e3b 100%)", padding: "16px 20px", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #a7f3d0 0%, #d8b4fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                  🐘
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "900" }}>Appu Transit Guide</div>
                  <div style={{ fontSize: "11px", color: "#a7f3d0", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                    Live Fleet Synced
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                style={{ background: "rgba(255, 255, 255, 0.15)", border: "none", color: "#ffffff", cursor: "pointer", padding: "6px", borderRadius: "8px", display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div style={{ flex: 1, padding: "16px", overflowY: "auto", background: "linear-gradient(180deg, #fbfaff 0%, #f4fbf7 100%)", display: "flex", flexDirection: "column", gap: "12px" }}>
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: "84%",
                    background: msg.sender === "user" ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "#ffffff",
                    color: msg.sender === "user" ? "#ffffff" : "#1e1b4b",
                    padding: "11px 15px",
                    borderRadius: msg.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    fontSize: "13px",
                    fontWeight: msg.sender === "user" ? "600" : "500",
                    lineHeight: "1.5",
                    boxShadow: "0 2px 8px rgba(168, 85, 247, 0.06)",
                    border: msg.sender === "user" ? "none" : "1px solid #ede9fe"
                  }}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompt Chips (Positioned just above the search/input bar) */}
            <div
              className="no-scrollbar"
              style={{
                padding: "8px 12px",
                background: "#f8fafc",
                borderTop: "1px solid #ede9fe",
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                whiteSpace: "nowrap",
                alignItems: "center"
              }}
            >
              {quickChatPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    background: "#ffffff",
                    color: "#059669",
                    border: "1px solid #d1fae5",
                    borderRadius: "9999px",
                    padding: "5px 12px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.18s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#059669";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.borderColor = "#059669";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 3px 8px rgba(5, 150, 105, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.color = "#059669";
                    e.currentTarget.style.borderColor = "#d1fae5";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div style={{ padding: "10px 14px", borderTop: "1.5px solid #ede9fe", background: "#ffffff", display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Ask route, fares, smart cards..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid #ede9fe",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#059669")}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#ede9fe")}
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "#ffffff",
                  border: "none",
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                  transition: "transform 0.15s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}