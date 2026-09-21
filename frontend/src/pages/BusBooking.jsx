import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bus,
  Clock,
  Sparkles,
  RefreshCcw,
  SlidersHorizontal,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Calendar,
  Users
} from "lucide-react";

import SearchBar from "../components/booking/SearchBar";
import BusCard from "../components/booking/BusCard";
import { getStoredUser } from "../utils/session";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function BusBooking() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getStoredUser());

  // Search & Filter States
  const [searchParams, setSearchParams] = useState({
    from: "",
    to: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [busTypeFilter, setBusTypeFilter] = useState("All");
  const [maxPriceFilter, setMaxPriceFilter] = useState(2000);
  const [departureWindow, setDepartureWindow] = useState("All");
  const [sortBy, setSortBy] = useState("time_asc");

  // Buses Data State
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Buses from Backend API
  const fetchBuses = useCallback(async (params = searchParams) => {
    setLoading(true);
    try {
      const response = await axios.get("/api/buses", {
        timeout: 6000,
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
      setBuses([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const handleSearchSubmit = (newParams) => {
    setSearchParams(newParams);
    fetchBuses(newParams);
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

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const parts = clean.replace(/(AM|PM)/g, "").trim().split(":");
    let hour = parseInt(parts[0], 10) || 0;
    let mins = parseInt(parts[1], 10) || 0;
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    return hour * 60 + mins;
  };

  // Filter & Sort Logic
  const filteredBuses = buses
    .filter((bus) => {
      if (busTypeFilter !== "All" && !bus.busType?.toLowerCase().includes(busTypeFilter.toLowerCase())) {
        return false;
      }
      if (bus.price && bus.price > maxPriceFilter) {
        return false;
      }
      if (!matchDepartureWindow(bus.departureTime, departureWindow)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "time_asc") return parseTimeToMinutes(a.departureTime) - parseTimeToMinutes(b.departureTime);
      if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "rating_desc") return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const handleViewAllBuses = () => {
    setBusTypeFilter("All");
    setDepartureWindow("All");
    setMaxPriceFilter(2000);
    const newParams = { from: "", to: "", date: searchParams.date };
    setSearchParams(newParams);
    fetchBuses(newParams);
  };

  const handleResetFilters = () => {
    setBusTypeFilter("All");
    setDepartureWindow("All");
    setMaxPriceFilter(2000);
    const defaultParams = { from: "", to: "", date: searchParams.date };
    setSearchParams(defaultParams);
    fetchBuses(defaultParams);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div className="bus-booking-wrapper" style={{ flex: 1, padding: "24px 20px 60px" }}>
        
        {/* Top Header Banner */}
        <div className="bus-booking-header" style={{ marginBottom: 24 }}>
          <div className="bus-header-left">
            <div className="bus-title-group">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                <Sparkles size={14} /> LIVE FLEET &amp; TIMETABLES
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>
                MoveSmart Bus Schedules &amp; Driver Directory
              </h1>
              <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
                Real-Time Bus Timetables, Complete Route Stops &amp; Admin-Verified Driver Credentials
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleViewAllBuses}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}
            >
              <RefreshCcw size={15} /> View All Fleet Buses
            </button>
          </div>
        </div>

        {/* Search Bar Component */}
        <SearchBar
          onSearch={handleSearchSubmit}
          initialFrom={searchParams.from}
          initialTo={searchParams.to}
          initialDate={searchParams.date}
        />

        {/* Filter Bar */}
        <div className="smart-filter-bar" style={{ marginTop: 18, marginBottom: 24 }}>
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
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Max Fare:</span>
              <input
                type="range"
                min="50"
                max="2000"
                step="25"
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
              <option value="time_asc">Departure Time (Earliest First)</option>
              <option value="price_asc">Fare: Low to High</option>
              <option value="price_desc">Fare: High to Low</option>
              <option value="rating_desc">Top Rated First</option>
            </select>
          </div>
        </div>

        {/* Bus List Container */}
        <div>
          {loading ? (
            <div style={{ background: "#ffffff", padding: 48, borderRadius: 24, textAlign: "center", border: "1px solid var(--border-color)", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
              <div style={{ width: 44, height: 44, border: "4px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }}></div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Searching Scheduled Buses...</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>Querying active fleet buses and verified drivers from MoveSmart Admin database</p>
            </div>
          ) : filteredBuses.length === 0 ? (
            <div style={{ background: "#ffffff", padding: 48, borderRadius: 24, textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
              <AlertCircle size={48} style={{ color: "#64748b", margin: "0 auto 12px" }} />
              {buses.length > 0 ? (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    No Buses Match Active Filters
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 18px" }}>
                    There are {buses.length} buses registered in the system, but none match your active filters (Type: {busTypeFilter}, Departure: {departureWindow}, Max Fare: ₹{maxPriceFilter}).
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
              ) : searchParams.from ? (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    No Buses Found For This Route
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 18px", maxWidth: 500, marginInline: "auto" }}>
                    No active buses are currently scheduled for "{searchParams.from}{searchParams.to ? ` ➔ ${searchParams.to}` : ''}". You can explore all available fleet buses across Kerala below.
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
                      <RefreshCcw size={16} /> Clear Search
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    No Admin Buses Registered Yet
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 18px", maxWidth: 500, marginInline: "auto" }}>
                    There are currently no active buses added by the admin in the database. When an admin adds a bus and assigns a driver in the Admin Console, it will appear here automatically.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => fetchBuses({ from: "", to: "", date: searchParams.date })}
                      style={{ padding: "10px 20px", borderRadius: 12, background: "var(--primary)", color: "#ffffff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <RefreshCcw size={16} /> Refresh Bus Fleet
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bus-cards-container">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, padding: "0 4px" }}>
                <span>Showing <strong style={{ color: "#0f172a" }}>{filteredBuses.length}</strong> Active Bus Schedule{filteredBuses.length !== 1 ? 's' : ''}</span>
                {searchParams.from && (
                  <span>Route: <strong style={{ color: "var(--primary)" }}>{searchParams.from}{searchParams.to ? ` ➔ ${searchParams.to}` : ''}</strong></span>
                )}
              </div>

              {filteredBuses.map((bus) => (
                <BusCard
                  key={bus._id}
                  bus={bus}
                  searchFrom={searchParams.from}
                  searchTo={searchParams.to}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
