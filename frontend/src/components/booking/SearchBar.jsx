import React, { useState, useEffect } from "react";
import { MapPin, Calendar, ArrowRightLeft, Search, Sparkles, Bus, Clock, X } from "lucide-react";
import axios from "axios";

// Helper for fuzzy normalization (handles repeated characters e.g. errattupetta -> eratupeta)
const normalizeFuzzy = (s) => {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/sub-stop|sub stop|junction|bus stand|stand|road|stop/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .replace(/(.)\1+/g, "$1");
};

const filterLocations = (locations, query) => {
  if (!query || !query.trim()) return locations.slice(0, 18);
  const qClean = query.trim().toLowerCase();
  const qFuzzy = normalizeFuzzy(query);

  return locations
    .filter((loc) => {
      const locClean = loc.toLowerCase();
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
  const [availableLocations, setAvailableLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get("/api/locations");
        if (res.data && res.data.success && Array.isArray(res.data.locations)) {
          setAvailableLocations(res.data.locations);
        }
      } catch (err) {
        console.warn("Error fetching stations:", err.message);
      }
    };
    fetchLocations();
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

  const fromMatches = filterLocations(availableLocations, fromLocation);
  const toMatches = filterLocations(availableLocations, toLocation);

  return (
    <div className="smart-search-card">
      <div className="search-card-header">
        <div className="search-card-title">
          <Bus style={{ color: "var(--primary)" }} />
          <span>Search Bus Schedules &amp; Stops</span>
        </div>
        <span className="search-badge-pill">
          <Sparkles style={{ width: 14, height: 14, display: "inline-block", marginRight: 4 }} />
          Main &amp; Sub-Stations
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
                onChange={(e) => setFromLocation(e.target.value)}
                onFocus={() => setFromSuggestions(true)}
                onBlur={() => setTimeout(() => setFromSuggestions(false), 250)}
                placeholder="e.g. Erattupetta, Kanjirappally, Kochi..."
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
              <div className="search-suggestions-drop" style={{ maxHeight: 240, overflowY: "auto" }}>
                {fromMatches.map((city, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => {
                      setFromLocation(city);
                      setFromSuggestions(false);
                    }}
                    className="suggestion-item"
                  >
                    <span>{city}</span>
                    <MapPin size={14} style={{ color: "var(--primary)" }} />
                  </button>
                ))}
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
                onChange={(e) => setToLocation(e.target.value)}
                onFocus={() => setToSuggestions(true)}
                onBlur={() => setTimeout(() => setToSuggestions(false), 250)}
                placeholder="e.g. Erattupetta, Erumely, Kottayam..."
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
              <div className="search-suggestions-drop" style={{ maxHeight: 240, overflowY: "auto" }}>
                {toMatches.map((city, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => {
                      setToLocation(city);
                      setToSuggestions(false);
                    }}
                    className="suggestion-item"
                  >
                    <span>{city}</span>
                    <MapPin size={14} style={{ color: "var(--accent-purple)" }} />
                  </button>
                ))}
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
