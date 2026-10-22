import React, { useState, useEffect } from "react";
import { MapPin, Calendar, ArrowRightLeft, Search, Sparkles, Bus, Clock, X } from "lucide-react";
import axios from "axios";

// Standard fallback stations to ensure dropdown is never empty while loading
const FALLBACK_STATIONS = [
  "New Delhi",
  "Kottayam",
  "Erattupetta",
  "Kanjirappally",
  "Kochi",
  "Pala",
  "Thiruvananthapuram",
  "Kozhikode",
  "Thrissur",
  "Angamaly",
  "Perumbavoor",
  "Muvattupuzha",
  "Kuravilangad",
  "Ettumanoor",
  "Mysuru (Mysore)",
  "Ahmednagar",
  "Shirdi",
  "Indore",
  "Ujjain",
  "Bengaluru",
  "Erumely",
  "Changanassery"
];

// Helper for fuzzy normalization (handles repeated characters and parentheses content)
const normalizeFuzzy = (s) => {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/[()\/,-]/g, " ")
    .replace(/sub-stop|sub stop|junction|bus stand|stand|road|stop/gi, " ")
    .replace(/[^a-z0-9]/gi, "")
    .replace(/(.)\1+/g, "$1");
};

const filterLocations = (locations, query, subStationsSet = new Set()) => {
  if (!Array.isArray(locations) || locations.length === 0) return FALLBACK_STATIONS.slice(0, 18);
  if (!query || !query.trim()) return locations.slice(0, 18);
  
  const qClean = query.trim().toLowerCase();
  const qFuzzy = normalizeFuzzy(query);

  // If user explicitly searches "sub station", "substation", "sub-stop", or "sub", show all sub-stations!
  const isGenericSubStationQuery = /sub[\s-]?station|sub[\s-]?stop|^sub$/i.test(qClean);
  if (isGenericSubStationQuery) {
    const subs = locations.filter(
      (loc) => subStationsSet.has(loc) || /sub-stop|sub stop|junction|road|gate|stand|\(.*?\)/i.test(loc)
    );
    return subs.length > 0 ? subs.slice(0, 18) : locations.slice(0, 18);
  }

  return locations
    .filter((loc) => {
      const locClean = String(loc).toLowerCase();
      const locFuzzy = normalizeFuzzy(loc);
      return (
        locClean.includes(qClean) ||
        (qFuzzy && locFuzzy.includes(qFuzzy))
      );
    })
    .slice(0, 18);
};

export default function SearchBar({ onSearch, initialFrom = "", initialTo = "", initialDate = "" }) {
  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [travelDate, setTravelDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [fromSuggestions, setFromSuggestions] = useState(false);
  const [toSuggestions, setToSuggestions] = useState(false);
  const [availableLocations, setAvailableLocations] = useState(FALLBACK_STATIONS);
  const [subStationsSet, setSubStationsSet] = useState(new Set());

  // Sync props when navigated with state or reset
  useEffect(() => {
    setFromLocation(initialFrom || "");
  }, [initialFrom]);

  useEffect(() => {
    setToLocation(initialTo || "");
  }, [initialTo]);

  useEffect(() => {
    if (initialDate) setTravelDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    let isMounted = true;
    const fetchLocations = async () => {
      try {
        const res = await axios.get("/api/locations");
        if (isMounted && res.data && res.data.success && Array.isArray(res.data.locations) && res.data.locations.length > 0) {
          const combined = Array.from(new Set([...res.data.locations, ...FALLBACK_STATIONS]));
          setAvailableLocations(combined);
          if (Array.isArray(res.data.subStations)) {
            setSubStationsSet(new Set(res.data.subStations));
          }
        }
      } catch (err) {
        console.warn("Error fetching stations:", err.message);
      }
    };
    fetchLocations();
    return () => { isMounted = false; };
  }, []);

  const handleSwap = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const setDateShortcut = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setTravelDate(d.toISOString().split("T")[0]);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    onSearch({ from: fromLocation, to: toLocation, date: travelDate });
  };

  const handleClear = () => {
    setFromLocation("");
    setToLocation("");
    onSearch({ from: "", to: "", date: travelDate });
  };

  const fromMatches = filterLocations(availableLocations, fromLocation, subStationsSet);
  const toMatches = filterLocations(availableLocations, toLocation, subStationsSet);

  const isSubStop = (loc) => {
    return subStationsSet.has(loc) || /sub-stop|sub stop|junction|stand|road|gate|\(.*?\)/i.test(loc);
  };

  return (
    <div className="smart-search-card">
      <div className="search-card-header">
        <div className="search-card-title">
          <Bus style={{ color: "var(--primary)" }} />
          <span>Search Bus Schedules &amp; Stops</span>
        </div>
        <span className="search-badge-pill">
          <Sparkles style={{ width: 14, height: 14, display: "inline-block", marginRight: 4 }} />
          Main &amp; Sub-Stations Supported
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="search-form-row">
          {/* From Location */}
          <div className="input-field-group">
            <label>Origin / Boarding Station</label>
            <div className="input-with-icon">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => {
                  setFromLocation(e.target.value);
                  setFromSuggestions(true);
                }}
                onFocus={() => setFromSuggestions(true)}
                onBlur={() => setTimeout(() => setFromSuggestions(false), 300)}
                placeholder="e.g. New Delhi, Indore, Cherpunkal, Ponkunnam..."
                className="search-input"
                autoComplete="off"
              />
              {fromLocation && (
                <button
                  type="button"
                  onClick={() => setFromLocation("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {fromSuggestions && fromMatches.length > 0 && (
              <div className="search-suggestions-drop" style={{ maxHeight: 260, overflowY: "auto" }}>
                {fromMatches.map((city, idx) => {
                  const isSub = isSubStop(city);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFromLocation(city);
                        setFromSuggestions(false);
                      }}
                      className="suggestion-item"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <MapPin size={14} style={{ color: isSub ? "#0284c7" : "var(--primary)" }} />
                        <span>{city}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isSub ? "#e0f2fe" : "#dcfce7",
                          color: isSub ? "#0369a1" : "#15803d",
                        }}
                      >
                        {isSub ? "🚏 Sub-Station" : "🏁 Terminal"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button type="button" onClick={handleSwap} className="swap-loc-btn" title="Swap From and To">
            <ArrowRightLeft size={16} />
          </button>

          {/* To Location */}
          <div className="input-field-group">
            <label>Destination / Drop Station</label>
            <div className="input-with-icon">
              <MapPin className="input-icon purple-icon" size={18} />
              <input
                type="text"
                value={toLocation}
                onChange={(e) => {
                  setToLocation(e.target.value);
                  setToSuggestions(true);
                }}
                onFocus={() => setToSuggestions(true)}
                onBlur={() => setTimeout(() => setToSuggestions(false), 300)}
                placeholder="e.g. Kottayam, Pala, Shirdi, Erumely..."
                className="search-input"
                autoComplete="off"
              />
              {toLocation && (
                <button
                  type="button"
                  onClick={() => setToLocation("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {toSuggestions && toMatches.length > 0 && (
              <div className="search-suggestions-drop" style={{ maxHeight: 260, overflowY: "auto" }}>
                {toMatches.map((city, idx) => {
                  const isSub = isSubStop(city);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setToLocation(city);
                        setToSuggestions(false);
                      }}
                      className="suggestion-item"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <MapPin size={14} style={{ color: isSub ? "#7c3aed" : "var(--accent-purple)" }} />
                        <span>{city}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isSub ? "#ede9fe" : "#fae8ff",
                          color: isSub ? "#6d28d9" : "#a21caf",
                        }}
                      >
                        {isSub ? "🚏 Sub-Station" : "🏁 Terminal"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Input */}
          <div className="input-field-group">
            <label>Travel Date</label>
            <div className="input-with-icon">
              <Calendar className="input-icon" size={18} />
              <input
                type="date"
                value={travelDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setTravelDate(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Footer Row */}
        <div className="search-footer-row">
          <div className="quick-dates-group">
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
              <Clock size={14} style={{ display: "inline", marginRight: 4 }} /> Quick Date:
            </span>
            <button type="button" onClick={() => setDateShortcut(0)} className="quick-date-btn">
              Today
            </button>
            <button type="button" onClick={() => setDateShortcut(1)} className="quick-date-btn">
              Tomorrow
            </button>
            <button type="button" onClick={() => setDateShortcut(2)} className="quick-date-btn">
              Day After
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {(fromLocation || toLocation) && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#64748b",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Clear Search
              </button>
            )}

            <button type="submit" className="submit-search-btn">
              <Search size={18} />
              <span>Search Buses</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
