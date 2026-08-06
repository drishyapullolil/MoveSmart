import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bus,
  ArrowLeft,
  Filter,
  Sparkles,
  RefreshCcw,
  SlidersHorizontal,
  AlertCircle,
  Ticket
} from "lucide-react";

import SearchBar from "../components/booking/SearchBar";
import BusCard from "../components/booking/BusCard";
import SeatLayout from "../components/booking/SeatLayout";
import BookingSummary from "../components/booking/BookingSummary";
import BookingSuccess from "../components/booking/BookingSuccess";
import { getStoredUser } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function BusBooking() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getStoredUser());
  const seatBookingRef = useRef(null);

  // Active Tab State: 'search' or 'my_bookings'
  const [activeTab, setActiveTab] = useState("search");

  // Search & Filter States
  const [searchParams, setSearchParams] = useState({
    from: "Kochi",
    to: "Trivandrum",
    date: new Date().toISOString().split("T")[0],
  });

  const [busTypeFilter, setBusTypeFilter] = useState("All");
  const [maxPriceFilter, setMaxPriceFilter] = useState(2000);
  const [departureWindow, setDepartureWindow] = useState("All");
  const [sortBy, setSortBy] = useState("price_asc");

  // Buses & My Bookings Data States
  const [buses, setBuses] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Seat Selection & Booking States
  const [activeBusId, setActiveBusId] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Fetch Buses from Backend API
  const fetchBuses = useCallback(async (params = searchParams) => {
    setLoading(true);
    try {
      const response = await axios.get("/api/buses", {
        params: {
          from: params.from,
          to: params.to,
          date: params.date,
        },
      });

      if (response.data && response.data.buses) {
        setBuses(response.data.buses);
      } else {
        setBuses([]);
      }
    } catch (err) {
      console.error("Error fetching buses:", err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Fetch My Bookings from Backend API
  const fetchMyBookings = useCallback(async () => {
    const uid = currentUser?.id || currentUser?._id || "guest_user";
    try {
      const response = await axios.get(`/api/bookings/user/${uid}`);
      if (response.data && response.data.bookings) {
        setMyBookings(response.data.bookings);
      }
    } catch (err) {
      console.error("Error fetching my bookings:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchBuses();
    fetchMyBookings();
  }, [fetchBuses, fetchMyBookings]);

  const handleSearchSubmit = (newParams) => {
    setSearchParams(newParams);
    setActiveBusId(null);
    setSelectedSeats([]);
    fetchBuses(newParams);
  };

  const handleToggleSeats = (busId) => {
    if (activeBusId === busId) {
      setActiveBusId(null);
      setSelectedSeats([]);
    } else {
      setActiveBusId(busId);
      setSelectedSeats([]);
      setTimeout(() => {
        if (seatBookingRef.current) {
          seatBookingRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  const handleSeatToggle = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length >= 6) {
        alert("You can select a maximum of 6 seats per booking.");
        return;
      }
      setSelectedSeats((prev) => [...prev, seatId]);
    }
  };

  const handleConfirmBooking = async (bookingData) => {
    const activeBus = buses.find((b) => b._id === activeBusId);
    if (!activeBus) return;

    setIsSubmitting(true);
    try {
      const payload = {
        userId: currentUser?.id || currentUser?._id || "guest_user",
        busId: activeBus._id,
        passengerName: bookingData.passengerName,
        passengerEmail: bookingData.passengerEmail,
        passengerPhone: bookingData.passengerPhone,
        fromLocation: bookingData.fromLocation || searchParams.from || activeBus.fromLocation,
        toLocation: bookingData.toLocation || searchParams.to || activeBus.toLocation,
        travelDate: bookingData.travelDate,
        selectedSeats: bookingData.selectedSeats,
        totalPrice: bookingData.totalPrice,
      };

      const response = await axios.post("/api/bookings", payload);

      if (response.data && response.data.booking) {
        setConfirmedBooking({
          ...response.data.booking,
          bus: activeBus,
        });
        fetchBuses();
        fetchMyBookings();
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert(err.response?.data?.message || "Failed to confirm booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchDepartureWindow = (timeStr, window) => {
    if (!window || window === "All") return true;
    if (!timeStr) return true;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const parts = clean.replace(/(AM|PM)/g, "").trim().split(":");
    let hour = parseInt(parts[0], 10) || 0;
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;

    if (window === "Morning") return hour >= 5 && hour < 12;
    if (window === "Afternoon") return hour >= 12 && hour < 17;
    if (window === "Night") return hour >= 17 || hour < 5;
    return true;
  };

  // Filter & Sort Logic
  const filteredBuses = buses
    .filter((bus) => {
      if (busTypeFilter !== "All" && !bus.busType.toLowerCase().includes(busTypeFilter.toLowerCase())) {
        return false;
      }
      if (bus.price > maxPriceFilter) {
        return false;
      }
      if (!matchDepartureWindow(bus.departureTime, departureWindow)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "rating_desc") return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const handleViewAllBuses = () => {
    setBusTypeFilter("All");
    setDepartureWindow("All");
    setMaxPriceFilter(2000);
    const newParams = { from: "All Routes", to: "All Destinations", date: searchParams.date };
    setSearchParams(newParams);
    fetchBuses({ from: "", to: "", date: searchParams.date });
  };

  const handleResetFilters = () => {
    setBusTypeFilter("All");
    setDepartureWindow("All");
    setMaxPriceFilter(2000);
    const defaultParams = { from: "Kochi", to: "Trivandrum", date: searchParams.date };
    setSearchParams(defaultParams);
    fetchBuses(defaultParams);
  };

  const activeBus = buses.find((b) => b._id === activeBusId);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <div className="bus-booking-wrapper" style={{ flex: 1 }}>
      {/* Top Navigation Header */}
      <div className="bus-booking-header">
        <div className="bus-header-left">
          <div className="bus-title-group">
            <h1>MoveSmart Bus Pass & Seat Booking</h1>
            <p>Real-Time IoT Bus Seat Selection & Ticket Reservation System</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="bus-nav-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`bus-tab-btn ${activeTab === "search" ? "active-search" : ""}`}
          >
            <Bus size={16} />
            <span>Search Buses</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my_bookings")}
            className={`bus-tab-btn ${activeTab === "my_bookings" ? "active-tickets" : ""}`}
          >
            <Ticket size={16} />
            <span>My Tickets ({myBookings.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "search" ? (
        <>
          {/* Search Bar Component */}
          <SearchBar
            onSearch={handleSearchSubmit}
            initialFrom={searchParams.from}
            initialTo={searchParams.to}
            initialDate={searchParams.date}
          />

          {/* Filter Bar */}
          <div className="smart-filter-bar">
            <div className="filter-left-group">
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                <SlidersHorizontal size={16} style={{ color: "var(--accent-purple)" }} />
                <span>Filters:</span>
              </div>

              {/* Bus Type Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Type:</span>
                <select
                  value={busTypeFilter}
                  onChange={(e) => setBusTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Bus Types</option>
                  <option value="AC">AC Buses</option>
                  <option value="Sleeper">Sleeper</option>
                  <option value="Express">Express</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>

              {/* Departure Window */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Departure:</span>
                <div className="time-pills-group">
                  {["All", "Morning", "Afternoon", "Night"].map((win) => (
                    <button
                      key={win}
                      type="button"
                      onClick={() => setDepartureWindow(win)}
                      className={`time-pill-btn ${departureWindow === win ? "active" : ""}`}
                    >
                      {win}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Price Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Max Price:</span>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  style={{ accentColor: "var(--primary)", cursor: "pointer", width: 90 }}
                />
                <span style={{ fontWeight: 800, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 8 }}>
                  ₹{maxPriceFilter}
                </span>
              </div>
            </div>

            {/* Sort Control */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
                style={{ borderColor: "var(--accent-purple)", color: "var(--accent-purple)", fontWeight: 800 }}
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Top Rated First</option>
              </select>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div style={{ display: "grid", gridTemplateColumns: activeBusId ? "1fr 420px" : "1fr", gap: 28, alignItems: "start" }}>
            {/* Bus List */}
            <div>
              {loading ? (
                <div style={{ background: "#ffffff", padding: 48, borderRadius: 24, textAlign: "center", border: "1px solid var(--border-color)" }}>
                  <div style={{ width: 40, height: 40, border: "4px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }}></div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Searching Buses...</h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Connecting to MoveSmart IoT Transit System</p>
                </div>
              ) : filteredBuses.length === 0 ? (
                <div style={{ background: "#ffffff", padding: 48, borderRadius: 24, textAlign: "center", border: "1px solid #fecdd3" }}>
                  <AlertCircle size={44} style={{ color: "#e11d48", margin: "0 auto 12px" }} />
                  {buses.length > 0 ? (
                    <>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                        No Buses Match Active Filters
                      </h3>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 18px" }}>
                        There are {buses.length} buses available on this route, but none match your active filters (Type: {busTypeFilter}, Departure: {departureWindow}, Max Price: ₹{maxPriceFilter}).
                      </p>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          style={{ padding: "10px 20px", borderRadius: 12, background: "var(--primary)", color: "#ffffff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <RefreshCcw size={16} /> Reset All Filters
                        </button>
                      </div>
                    </>
                  ) : searchParams.from.toLowerCase().includes("all") || !searchParams.from ? (
                    <>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                        No Registered Buses Found
                      </h3>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 18px" }}>
                        There are currently no active bus schedules registered in the system.
                      </p>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => fetchBuses({ from: "", to: "", date: searchParams.date })}
                          style={{ padding: "10px 20px", borderRadius: 12, background: "var(--primary)", color: "#ffffff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <RefreshCcw size={16} /> Reload Fleet Schedules
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                        No Buses Found For This Route
                      </h3>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 18px" }}>
                        No direct buses match your search "{searchParams.from} ➔ {searchParams.to}". Click below to explore all active buses across all routes.
                      </p>
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleViewAllBuses}
                          style={{ padding: "10px 20px", borderRadius: 12, background: "var(--primary)", color: "#ffffff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <Bus size={16} /> View All Registered Buses
                        </button>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          style={{ padding: "10px 20px", borderRadius: 12, background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <RefreshCcw size={16} /> Reset Search
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bus-cards-container">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                    <span>Showing {filteredBuses.length} Bus Schedules</span>
                    <span>Route: <strong style={{ color: "var(--primary)" }}>{searchParams.from} ➔ {searchParams.to}</strong></span>
                  </div>

                  {filteredBuses.map((bus) => (
                    <BusCard
                      key={bus._id}
                      bus={bus}
                      searchFrom={searchParams.from}
                      searchTo={searchParams.to}
                      isSelected={activeBusId === bus._id}
                      onToggleSeats={handleToggleSeats}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Seat Map & Summary Column */}
            {activeBusId && activeBus && (
              <div ref={seatBookingRef} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <SeatLayout
                  totalSeats={activeBus.totalSeats}
                  bookedSeats={activeBus.bookedSeats || []}
                  selectedSeats={selectedSeats}
                  onSeatToggle={handleSeatToggle}
                  pricePerSeat={activeBus.price}
                />

                <BookingSummary
                  bus={activeBus}
                  selectedSeats={selectedSeats}
                  searchFrom={searchParams.from}
                  searchTo={searchParams.to}
                  travelDate={searchParams.date}
                  currentUser={currentUser}
                  onConfirmBooking={handleConfirmBooking}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        /* My Tickets Tab */
        <div style={{ background: "#ffffff", borderRadius: 24, padding: 32, border: "1px solid var(--border-color)", boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, marginBottom: 24, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--text-main)" }}>Your Reserved Bus Tickets</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Synced with MoveSmart User Account</p>
            </div>
            <span style={{ background: "var(--accent-purple-light)", color: "var(--accent-purple)", padding: "4px 14px", borderRadius: 20, fontWeight: 800, fontSize: 12 }}>
              {myBookings.length} Ticket{myBookings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {myBookings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Ticket size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
              <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>No Reserved Tickets Yet</h4>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 16px" }}>Book your bus ticket now using the Search Buses tab!</p>
              <button
                onClick={() => setActiveTab("search")}
                style={{ padding: "10px 20px", borderRadius: 12, background: "var(--primary)", color: "#ffffff", border: "none", fontWeight: 800, cursor: "pointer", fontSize: 13 }}
              >
                Search Buses
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {myBookings.map((b) => (
                <div key={b._id || b.bookingId} style={{ background: "var(--bg-primary)", padding: 20, borderRadius: 20, border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 900, color: "var(--accent-purple)", fontSize: 13, background: "#ffffff", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                      {b.bookingId}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 12 }}>
                      {b.status}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: "6px 0 2px", color: "var(--text-main)" }}>{b.busName}</h4>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: "0 0 12px" }}>{b.fromLocation} ➔ {b.toLocation}</p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                    <span>Date: <strong>{b.travelDate}</strong></span>
                    <span>Seats: <strong style={{ color: "var(--accent-purple)" }}>{b.selectedSeats?.join(", ")}</strong></span>
                    <strong style={{ fontSize: 15, color: "var(--primary)", fontWeight: 900 }}>₹{b.totalPrice}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Modal Overlay */}
      {confirmedBooking && (
        <BookingSuccess
          booking={confirmedBooking}
          onClose={() => {
            setConfirmedBooking(null);
            setActiveBusId(null);
            setSelectedSeats([]);
          }}
          onGoToDashboard={() => navigate("/dashboard")}
        />
      )}
      </div>
      <Footer />
    </div>
  );
}
