import React, { useState, useEffect } from "react";
import { MapPin, Calendar, ArrowRightLeft, Search, Sparkles, Bus, Clock } from "lucide-react";
import axios from "axios";

export default function SearchBar({ onSearch, initialFrom = "Kochi", initialTo = "Trivandrum", initialDate = "" }) {
  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [travelDate, setTravelDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [fromSuggestions, setFromSuggestions] = useState(false);
  const [toSuggestions, setToSuggestions] = useState(false);

  const defaultCities = [
    "Kochi",
    "Trivandrum",
    "Calicut",
    "Kottayam",
    "Thrissur",
    "Palakkad",
    "Alappuzha",
    "Kannur",
    "Erattupetta",
    "Pala",
    "Changanassery",
    "Vengotta",
    "Manarcadu",
    "Malam",
    "Anichuvadu",
    "Koothattukulam",
    "Kanjirappally",
    "Chenappady"
  ];

  const [availableLocations, setAvailableLocations] = useState(defaultCities);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get("/api/locations");
        if (res.data && res.data.success && Array.isArray(res.data.locations) && res.data.locations.length > 0) {
          const merged = Array.from(new Set([...res.data.locations, ...defaultCities])).sort();
          setAvailableLocations(merged);
        }
      } catch (err) {
        console.warn("Using default locations list for search bar:", err.message);
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
    e.preventDefault();
    onSearch({ from: fromLocation, to: toLocation, date: travelDate });
  };

  return (
    <div className="smart-search-card">
      <div className="search-card-header">
        <div className="search-card-title">
          <Bus style={{ color: "var(--primary)" }} />
          <span>Search Smart Bus Routes</span>
        </div>
        <span className="search-badge-pill">
          <Sparkles style={{ width: 14, height: 14, display: "inline-block", marginRight: 4 }} />
          Live IoT Occupancy
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="search-form-row">
          {/* From Location */}
          <div className="input-field-group">
            <label>From Location</label>
            <div className="input-with-icon">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                onFocus={() => setFromSuggestions(true)}
                onBlur={() => setTimeout(() => setFromSuggestions(false), 200)}
                placeholder="Leaving from..."
                required
                className="search-input"
              />
            </div>
            {fromSuggestions && (
              <div className="search-suggestions-drop">
                {availableLocations
                  .filter((city) => city.toLowerCase().includes(fromLocation.toLowerCase()))
                  .slice(0, 10)
                  .map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => setFromLocation(city)}
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
            <label>To Location</label>
            <div className="input-with-icon">
              <MapPin className="input-icon purple-icon" size={18} />
              <input
                type="text"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                onFocus={() => setToSuggestions(true)}
                onBlur={() => setTimeout(() => setToSuggestions(false), 200)}
                placeholder="Going to..."
                required
                className="search-input"
              />
            </div>
            {toSuggestions && (
              <div className="search-suggestions-drop">
                {availableLocations
                  .filter((city) => city.toLowerCase().includes(toLocation.toLowerCase()))
                  .slice(0, 10)
                  .map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => setToLocation(city)}
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
                required
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

          <button type="submit" className="submit-search-btn">
            <Search size={18} />
            <span>Search Buses</span>
          </button>
        </div>
      </form>
    </div>
  );
}
