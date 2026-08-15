import React, { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Navigation,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Compass,
  ArrowRight,
  LocateFixed,
  HelpCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

// Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Project a point [lat, lng] onto polyline coords [[lat, lng], ...]
// Returns { pathDistance, offPolylineDistance, projLat, projLng, segmentIndex }
function projectPointOntoPolyline(lat, lng, coords) {
  if (!coords || coords.length === 0) {
    return { pathDistance: 0, offPolylineDistance: 0, projLat: lat, projLng: lng, segmentIndex: 0 };
  }
  if (coords.length === 1) {
    const dist = haversineDistance(lat, lng, coords[0][0], coords[0][1]);
    return { pathDistance: 0, offPolylineDistance: dist, projLat: coords[0][0], projLng: coords[0][1], segmentIndex: 0 };
  }

  let cumDist = 0;
  let minOffDist = Infinity;
  let bestPathDist = 0;
  let bestProj = { lat: coords[0][0], lng: coords[0][1] };
  let bestSegment = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const segDist = haversineDistance(p1[0], p1[1], p2[0], p2[1]);

    const dx = p2[1] - p1[1];
    const dy = p2[0] - p1[0];
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = ((lng - p1[1]) * dx + (lat - p1[0]) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projLat = p1[0] + t * dy;
    const projLng = p1[1] + t * dx;
    const offDist = haversineDistance(lat, lng, projLat, projLng);
    const distOnSeg = haversineDistance(p1[0], p1[1], projLat, projLng);

    if (offDist < minOffDist) {
      minOffDist = offDist;
      bestPathDist = cumDist + distOnSeg;
      bestProj = { lat: projLat, lng: projLng };
      bestSegment = i;
    }

    cumDist += segDist;
  }

  return {
    pathDistance: Number(bestPathDist.toFixed(2)),
    offPolylineDistance: Number(minOffDist.toFixed(3)),
    projLat: bestProj.lat,
    projLng: bestProj.lng,
    segmentIndex: bestSegment,
  };
}

// Custom DivIcons for Leaflet (Compact, Modern & Collision-Free)
function createCustomIcon(label, color = "#2563eb", iconType = "number", source = "automatic") {
  let inner = label;
  let bg = color;
  let textColor = "#ffffff";
  let border = "2px solid #ffffff";
  let shadow = "0 2px 6px rgba(0,0,0,0.25)";
  let size = 26;

  if (iconType === "start") {
    bg = "#10b981"; // Emerald
    inner = "🚩";
    size = 28;
  } else if (iconType === "end") {
    bg = "#ef4444"; // Red
    inner = "🏁";
    size = 28;
  } else if (source === "admin") {
    bg = "#8b5cf6"; // Purple
    border = "2px solid #f59e0b";
    inner = `⭐${label}`;
    size = 28;
  }

  const html = `
    <div style="
      background-color: ${bg};
      color: ${textColor};
      border: ${border};
      box-shadow: ${shadow};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: ${typeof inner === 'string' && inner.length > 2 ? '10px' : '11px'};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transform: translate(-50%, -50%);
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease;
    ">
      ${inner}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: "custom-leaflet-div-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Verified Comprehensive Kerala Transit Hubs, Sub-Stations & Junctions Catalog
const KERALA_ALL_PLACES = [
  // Kottayam Central Hubs & Sub-Stations
  { name: "Kottayam", category: "District HQ / KSRTC Stand", district: "Kottayam", lat: 9.5916, lng: 76.5222 },
  { name: "Nagampadam", category: "Sub-Station / Bus Stand", district: "Kottayam", lat: 9.6010, lng: 76.5265 },
  { name: "Kumaranalloor", category: "Sub-Station", district: "Kottayam", lat: 9.6234, lng: 76.5340 },
  { name: "Medical College / Gandhi Nagar", category: "Major Hub", district: "Kottayam", lat: 9.6450, lng: 76.5280 },
  { name: "Caritas Junction", category: "Sub-Station", district: "Kottayam", lat: 9.6480, lng: 76.5450 },
  { name: "Thellakom", category: "Sub-Station", district: "Kottayam", lat: 9.6520, lng: 76.5510 },
  { name: "Ettumanoor", category: "Major Sub-Station", district: "Kottayam", lat: 9.6644, lng: 76.5625 },
  { name: "Kidangoor", category: "Sub-Station", district: "Kottayam", lat: 9.6800, lng: 76.6000 },
  { name: "Cherpunkal", category: "Sub-Station", district: "Kottayam", lat: 9.6580, lng: 76.6250 },
  { name: "Pala", category: "Major Bus Terminal", district: "Kottayam", lat: 9.7081, lng: 76.6837 },
  { name: "Murikkumpuzha", category: "Sub-Station", district: "Kottayam", lat: 9.6950, lng: 76.7120 },
  { name: "Bharananganam", category: "Pilgrim Sub-Station", district: "Kottayam", lat: 9.6880, lng: 76.7200 },
  { name: "Kizhaparayar", category: "Sub-Station", district: "Kottayam", lat: 9.6910, lng: 76.7550 },
  { name: "Plassanal", category: "Sub-Station", district: "Kottayam", lat: 9.6700, lng: 76.7700 },
  { name: "Choondacherry", category: "Sub-Station", district: "Kottayam", lat: 9.6650, lng: 76.6750 },
  { name: "Pravithanam", category: "Sub-Station", district: "Kottayam", lat: 9.7200, lng: 76.6500 },
  { name: "Poovarani", category: "Sub-Station", district: "Kottayam", lat: 9.6600, lng: 76.7000 },
  { name: "Paika", category: "Sub-Station", district: "Kottayam", lat: 9.6400, lng: 76.7200 },
  { name: "Ponkunnam", category: "Major Sub-Station", district: "Kottayam", lat: 9.5667, lng: 76.7583 },
  { name: "Podimattom", category: "Sub-Station", district: "Kottayam", lat: 9.5600, lng: 76.7700 },
  { name: "Kanjirappally", category: "Major Bus Terminal", district: "Kottayam", lat: 9.5544, lng: 76.7865 },
  { name: "Manarcadu", category: "Sub-Station", district: "Kottayam", lat: 9.5850, lng: 76.5750 },
  { name: "Pampady", category: "Sub-Station", district: "Kottayam", lat: 9.5583, lng: 76.6417 },
  { name: "Vazhoor", category: "Sub-Station", district: "Kottayam", lat: 9.5500, lng: 76.7150 },
  { name: "19th Mile / Elikulam", category: "Sub-Station", district: "Kottayam", lat: 9.5900, lng: 76.7300 },
  { name: "Puthuppally", category: "Sub-Station", district: "Kottayam", lat: 9.5600, lng: 76.5600 },
  { name: "Karukachal", category: "Sub-Station", district: "Kottayam", lat: 9.5100, lng: 76.6300 },
  { name: "Mundakayam", category: "Major Sub-Station", district: "Kottayam", lat: 9.5424, lng: 76.8833 },
  { name: "Erumely", category: "Pilgrim Bus Terminal", district: "Kottayam", lat: 9.4716, lng: 76.7865 },
  { name: "Erattupetta", category: "Major Bus Terminal", district: "Kottayam", lat: 9.6833, lng: 76.7833 },
  { name: "Poonjar", category: "Sub-Station", district: "Kottayam", lat: 9.6700, lng: 76.8100 },
  { name: "Teekoy", category: "Sub-Station", district: "Kottayam", lat: 9.7100, lng: 76.8300 },
  { name: "Vagamon", category: "Hill Station", district: "Kottayam", lat: 9.6870, lng: 76.9050 },
  { name: "Kuravilangad", category: "Sub-Station", district: "Kottayam", lat: 9.7540, lng: 76.5680 },
  { name: "Kaduthuruthy", category: "Sub-Station", district: "Kottayam", lat: 9.7330, lng: 76.4950 },
  { name: "Uzhavoor", category: "Sub-Station", district: "Kottayam", lat: 9.7820, lng: 76.6120 },
  { name: "Kadaplamattom", category: "Sub-Station", district: "Kottayam", lat: 9.7200, lng: 76.5900 },
  { name: "Marangattupilly", category: "Sub-Station", district: "Kottayam", lat: 9.7400, lng: 76.6200 },
  { name: "Kuruppanthara", category: "Sub-Station", district: "Kottayam", lat: 9.7100, lng: 76.5300 },
  { name: "Monippally", category: "Sub-Station", district: "Kottayam", lat: 9.8050, lng: 76.5850 },
  { name: "Ramapuram", category: "Sub-Station", district: "Kottayam", lat: 9.7850, lng: 76.6500 },
  { name: "Ayarkunnam", category: "Sub-Station", district: "Kottayam", lat: 9.6200, lng: 76.6000 },
  { name: "Vaikom", category: "Bus Terminal", district: "Kottayam", lat: 9.7478, lng: 76.3956 },
  { name: "Changanassery", category: "Major Bus Terminal", district: "Kottayam", lat: 9.4452, lng: 76.5385 },
  { name: "Chingavanam", category: "Sub-Station", district: "Kottayam", lat: 9.5280, lng: 76.5350 },
  { name: "Kumarakom", category: "Tourist Hub", district: "Kottayam", lat: 9.6175, lng: 76.4300 },

  // Pathanamthitta Sub-Stations & Hubs
  { name: "Sabarimala", category: "Pilgrim Shrine", district: "Pathanamthitta", lat: 9.4350, lng: 77.0811 },
  { name: "Pampa", category: "Pilgrim River Terminal", district: "Pathanamthitta", lat: 9.4120, lng: 77.0700 },
  { name: "Chalakkayam", category: "Sub-Station", district: "Pathanamthitta", lat: 9.4000, lng: 77.0450 },
  { name: "Nilakkal", category: "Pilgrim Base Station", district: "Pathanamthitta", lat: 9.3850, lng: 77.0120 },
  { name: "Plappally", category: "Sub-Station", district: "Pathanamthitta", lat: 9.3650, lng: 76.9550 },
  { name: "Lahai", category: "Sub-Station", district: "Pathanamthitta", lat: 9.3400, lng: 76.9100 },
  { name: "Perunad", category: "Sub-Station", district: "Pathanamthitta", lat: 9.3550, lng: 76.8450 },
  { name: "Vadasserikkara", category: "Sub-Station", district: "Pathanamthitta", lat: 9.3480, lng: 76.8150 },
  { name: "Ranni", category: "Major Bus Terminal", district: "Pathanamthitta", lat: 9.3800, lng: 76.7800 },
  { name: "Ranni Ittymoove", category: "Sub-Station", district: "Pathanamthitta", lat: 9.3850, lng: 76.7900 },
  { name: "Kozhencherry", category: "Sub-Station", district: "Pathanamthitta", lat: 9.3400, lng: 76.7050 },
  { name: "Pathanamthitta", category: "District HQ / KSRTC", district: "Pathanamthitta", lat: 9.2648, lng: 76.7870 },
  { name: "Konni", category: "Sub-Station", district: "Pathanamthitta", lat: 9.2433, lng: 76.8533 },
  { name: "Thiruvalla", category: "Major Bus Terminal", district: "Pathanamthitta", lat: 9.3834, lng: 76.5744 },
  { name: "Adoor", category: "Major Bus Terminal", district: "Pathanamthitta", lat: 9.1558, lng: 76.7324 },
  { name: "Pandalam", category: "Pilgrim Sub-Station", district: "Pathanamthitta", lat: 9.2333, lng: 76.6833 },
  { name: "Mallappally", category: "Sub-Station", district: "Pathanamthitta", lat: 9.4450, lng: 76.6500 },

  // Idukki Sub-Stations & Hubs
  { name: "Kuttikkanam", category: "Hill Station / Hub", district: "Idukki", lat: 9.5850, lng: 76.9680 },
  { name: "Peermade", category: "Sub-Station", district: "Idukki", lat: 9.5667, lng: 76.9833 },
  { name: "Vandiperiyar", category: "Sub-Station", district: "Idukki", lat: 9.5800, lng: 77.0850 },
  { name: "Kumily", category: "Major Bus Terminal", district: "Idukki", lat: 9.6083, lng: 77.1611 },
  { name: "Thekkady", category: "Tourist Hub", district: "Idukki", lat: 9.6000, lng: 77.1700 },
  { name: "Elappara", category: "Sub-Station", district: "Idukki", lat: 9.6380, lng: 76.9750 },
  { name: "Kattappana", category: "Major Bus Terminal", district: "Idukki", lat: 9.7740, lng: 77.1186 },
  { name: "Nedumkandam", category: "Sub-Station", district: "Idukki", lat: 9.8350, lng: 77.1650 },
  { name: "Thodupuzha", category: "Major Bus Terminal", district: "Idukki", lat: 9.8947, lng: 76.7161 },
  { name: "Adimali", category: "Sub-Station", district: "Idukki", lat: 10.0125, lng: 76.9536 },
  { name: "Munnar", category: "Hill Station / KSRTC", district: "Idukki", lat: 10.0889, lng: 77.0595 },

  // Alappuzha Sub-Stations & Hubs
  { name: "Alappuzha", category: "District HQ / KSRTC", district: "Alappuzha", lat: 9.4981, lng: 76.3388 },
  { name: "Cherthala", category: "Major Bus Terminal", district: "Alappuzha", lat: 9.6847, lng: 76.3315 },
  { name: "Chengannur", category: "Major Railway / Bus Hub", district: "Alappuzha", lat: 9.3175, lng: 76.6117 },
  { name: "Mavelikkara", category: "Sub-Station", district: "Alappuzha", lat: 9.2570, lng: 76.5490 },
  { name: "Kayamkulam", category: "Major Bus Terminal", district: "Alappuzha", lat: 9.1724, lng: 76.5008 },
  { name: "Haripad", category: "Sub-Station", district: "Alappuzha", lat: 9.2797, lng: 76.4633 },

  // Ernakulam Sub-Stations & Hubs
  { name: "Kochi / Ernakulam", category: "Vyttila Mobility Hub", district: "Ernakulam", lat: 9.9680, lng: 76.3180 },
  { name: "Kaloor", category: "Bus Stand", district: "Ernakulam", lat: 9.9920, lng: 76.2940 },
  { name: "Aluva", category: "Major Bus & Metro Hub", district: "Ernakulam", lat: 10.1076, lng: 76.3516 },
  { name: "Angamaly", category: "Major Bus Terminal", district: "Ernakulam", lat: 10.1960, lng: 76.3860 },
  { name: "Muvattupuzha", category: "Major Bus Terminal", district: "Ernakulam", lat: 9.9814, lng: 76.5786 },
  { name: "Piravom", category: "Sub-Station", district: "Ernakulam", lat: 9.8700, lng: 76.4900 },
  { name: "Perumbavoor", category: "Major Bus Terminal", district: "Ernakulam", lat: 10.1147, lng: 76.4789 },
  { name: "Kolenchery", category: "Sub-Station", district: "Ernakulam", lat: 9.9750, lng: 76.4700 },
  { name: "Kothamangalam", category: "Major Bus Terminal", district: "Ernakulam", lat: 10.0650, lng: 76.6250 },
];

export default function RouteMap({
  fromLocationName = "",
  toLocationName = "",
  onLocationsChange = () => { },
  onRouteSelected = () => { },
  stops = [],
  onStopsChange = () => { },
  selectedStopIndex = null,
  onSelectStopIndex = () => { },
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const polylineGroupRef = useRef(null);

  // States for query inputs
  const [fromQuery, setFromQuery] = useState(fromLocationName);
  const [toQuery, setToQuery] = useState(toLocationName);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDrop, setShowFromDrop] = useState(false);
  const [showToDrop, setShowToDrop] = useState(false);

  const [startPoint, setStartPoint] = useState(null); // { name, lat, lng }
  const [destPoint, setDestPoint] = useState(null); // { name, lat, lng }

  const [routesList, setRoutesList] = useState([]); // [{ id, name, geometry, distanceKm, durationStr, durationMins }]
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Map Add Stop Mode
  const [isAddingStopMode, setIsAddingStopMode] = useState(false);
  const [pendingNewStop, setPendingNewStop] = useState(null); // { lat, lng, defaultName }
  const [newStopModalOpen, setNewStopModalOpen] = useState(false);
  const [modalStopName, setModalStopName] = useState("");

  // Sync text inputs when parent props change, without triggering auto-search
  useEffect(() => {
    if (fromLocationName && fromLocationName !== fromQuery) {
      setFromQuery(fromLocationName);
    }
  }, [fromLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (toLocationName && toLocationName !== toQuery) {
      setToQuery(toLocationName);
    }
  }, [toLocationName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center Kerala (Kottayam / Kanjirappally area)
    const map = L.map(mapContainerRef.current, {
      center: [9.5916, 76.6500],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    polylineGroupRef.current = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Geocode & Instant Local Place Suggestions (Kerala)
  const getKeralaLocationSuggestions = async (inputQuery) => {
    if (!inputQuery || inputQuery.trim().length === 0) {
      return KERALA_ALL_PLACES.slice(0, 10).map((p) => ({
        name: p.name,
        fullName: `${p.name}, ${p.district} District, Kerala`,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
        district: p.district,
      }));
    }

    const q = inputQuery.trim().toLowerCase();
    const cleanQ = q.replace(/[-\s]/g, "");

    // 1. Instant local filter (0ms delay)
    const localMatches = KERALA_ALL_PLACES.filter((p) => {
      const name = p.name.toLowerCase().replace(/[-\s]/g, "");
      const district = p.district.toLowerCase().replace(/[-\s]/g, "");
      const category = (p.category || "").toLowerCase().replace(/[-\s]/g, "");
      return name.includes(cleanQ) || district.includes(cleanQ) || category.includes(cleanQ);
    }).map((p) => ({
      name: p.name,
      fullName: `${p.name}, ${p.district} District, Kerala`,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      district: p.district,
    }));

    // 2. Fetch Nominatim matches asynchronously with timeout
    let remoteMatches = [];
    if (q.length >= 2) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ", Kerala, India")}&addressdetails=1&limit=6`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          remoteMatches = data.map((item) => ({
            name: item.display_name.split(",")[0] || item.display_name,
            fullName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            category: "Map Landmark",
            district: "Kerala",
          }));
        }
      } catch {
        // Fallback to local in-memory dataset
      }
    }

    // Combine without duplicates
    const combined = [...localMatches];
    remoteMatches.forEach((rm) => {
      const exists = combined.some(
        (c) => c.name.toLowerCase() === rm.name.toLowerCase() || haversineDistance(c.lat, c.lng, rm.lat, rm.lng) < 0.5
      );
      if (!exists) {
        combined.push(rm);
      }
    });

    return combined.slice(0, 10);
  };

  // Instant input change handlers for From & To inputs
  const handleFromInputChange = async (val) => {
    setFromQuery(val);
    onLocationsChange(val, toQuery);
    const results = await getKeralaLocationSuggestions(val);
    setFromSuggestions(results);
    setShowFromDrop(true);
  };

  const handleToInputChange = async (val) => {
    setToQuery(val);
    onLocationsChange(fromQuery, val);
    const results = await getKeralaLocationSuggestions(val);
    setToSuggestions(results);
    setShowToDrop(true);
  };

  const selectFromLocation = (item) => {
    setFromQuery(item.name);
    const point = { name: item.name, lat: item.lat, lng: item.lng };
    setStartPoint(point);
    setShowFromDrop(false);
    onLocationsChange(item.name, toQuery);
  };

  const selectToLocation = (item) => {
    setToQuery(item.name);
    const point = { name: item.name, lat: item.lat, lng: item.lng };
    setDestPoint(point);
    setShowToDrop(false);
    onLocationsChange(fromQuery, item.name);
  };

  // Helper: Direct corridor polyline fallback if OSRM service is unreachable
  const generateFallbackRoute = useCallback((start, end) => {
    const intermediates = KERALA_ALL_PLACES.filter((p) => {
      const dStart = haversineDistance(start.lat, start.lng, p.lat, p.lng);
      const dEnd = haversineDistance(end.lat, end.lng, p.lat, p.lng);
      const totalDirect = haversineDistance(start.lat, start.lng, end.lat, end.lng);
      return dStart > 1.5 && dEnd > 1.5 && (dStart + dEnd) < (totalDirect * 1.3);
    }).sort((a, b) => haversineDistance(start.lat, start.lng, a.lat, a.lng) - haversineDistance(start.lat, start.lng, b.lat, b.lng));

    const waypoints = [start, ...intermediates, end];
    const coords = waypoints.map((w) => [w.lat, w.lng]);

    let totalDist = 0;
    for (let i = 1; i < waypoints.length; i++) {
      totalDist += haversineDistance(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
    }
    totalDist = Number((totalDist * 1.15).toFixed(1));
    const durMins = Math.round(totalDist * 1.8);
    const hours = Math.floor(durMins / 60);
    const mins = durMins % 60;
    const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    return {
      id: "route-opt-fallback",
      name: `${start.name} ➔ ${end.name} (Direct Corridor)`,
      geometry: coords,
      midPoint: coords[Math.floor(coords.length / 2)] || coords[0],
      distanceKm: totalDist,
      durationStr: durStr,
      durationMins: durMins,
      steps: [],
      stepNames: waypoints.map((w) => w.name),
    };
  }, []);

  // Extract clean, collision-free Kerala bus stops along the road polyline
  const extractBusStopsForRoute = useCallback(async (routeObj, start, end) => {
    if (!routeObj || !routeObj.geometry || routeObj.geometry.length === 0) return;
    setStatusMessage("Extracting passenger bus stops along selected route...");

    const coords = routeObj.geometry;
    let detectedStops = [];

    // 1. Add Start Point as Stop #1
    detectedStops.push({
      stopName: start.name,
      name: start.name,
      latitude: start.lat,
      longitude: start.lng,
      pathDistance: 0,
      source: "automatic",
      isStart: true,
    });

    // 2. Identify all intermediate sub-stations & junctions located along the road corridor between start and destination
    KERALA_ALL_PLACES.forEach((p) => {
      const dStart = haversineDistance(start.lat, start.lng, p.lat, p.lng);
      const dEnd = haversineDistance(end.lat, end.lng, p.lat, p.lng);
      if (dStart > 0.2 && dEnd > 0.2) {
        const proj = projectPointOntoPolyline(p.lat, p.lng, coords);
        // Include if within 1.2 km of the road polyline and between origin and destination path
        if (proj.offPolylineDistance <= 1.2 && proj.pathDistance > 0.1 && proj.pathDistance < (routeObj.distanceKm - 0.1)) {
          detectedStops.push({
            stopName: p.name,
            name: p.name,
            latitude: proj.projLat,
            longitude: proj.projLng,
            pathDistance: proj.pathDistance,
            source: "automatic",
            category: p.category || "Sub-Station",
          });
        }
      }
    });

    // 3. Query Overpass API for real named bus stops & bus stations strictly along polyline
    try {
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      const minLat = Math.min(...lats) - 0.005;
      const maxLat = Math.max(...lats) + 0.005;
      const minLng = Math.min(...lngs) - 0.005;
      const maxLng = Math.max(...lngs) + 0.005;

      const overpassQuery = `
        [out:json][timeout:6];
        (
          node["highway"="bus_stop"](${minLat},${minLng},${maxLat},${maxLng});
          node["amenity"="bus_station"](${minLat},${minLng},${maxLat},${maxLng});
          node["public_transport"="platform"](${minLat},${minLng},${maxLat},${maxLng});
        );
        out body;
      `;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.elements && data.elements.length > 0) {
          data.elements.forEach((node) => {
            const tags = node.tags || {};
            const rawName = (tags.name || tags["name:en"] || tags["name:ml"] || tags.local_name || "").trim();
            // Exclude unnamed or generic "bus stop" tags
            if (rawName && !/^bus\s*stop$/i.test(rawName) && !/^stop$/i.test(rawName) && rawName.toLowerCase() !== "bus_stop") {
              const proj = projectPointOntoPolyline(node.lat, node.lon, coords);
              if (proj.offPolylineDistance <= 0.35) {
                detectedStops.push({
                  stopName: rawName,
                  name: rawName,
                  latitude: proj.projLat,
                  longitude: proj.projLng,
                  pathDistance: proj.pathDistance,
                  source: "automatic",
                });
              }
            }
          });
        }
      }
    } catch {
      // Overpass API fallback handled gracefully
    }

    // 4. Add Destination Point as Final Stop
    const destProj = projectPointOntoPolyline(end.lat, end.lng, coords);
    detectedStops.push({
      stopName: end.name,
      name: end.name,
      latitude: end.lat,
      longitude: end.lng,
      pathDistance: destProj.pathDistance > 0 ? destProj.pathDistance : routeObj.distanceKm,
      source: "automatic",
      isEnd: true,
    });

    // 5. Sort strictly by projection path distance along polyline (from start 0km to end N km)
    detectedStops.sort((a, b) => a.pathDistance - b.pathDistance);

    // 6. Intelligent spacing deduplication (minimum 0.4 km between consecutive sub-stations)
    const spacedStops = [detectedStops[0]];
    for (let i = 1; i < detectedStops.length; i++) {
      const candidate = detectedStops[i];
      const isFinal = candidate.isEnd || i === detectedStops.length - 1;

      if (isFinal) {
        spacedStops.push(candidate);
      } else {
        const lastAdded = spacedStops[spacedStops.length - 1];
        const distFromLast = candidate.pathDistance - lastAdded.pathDistance;
        const sameName = candidate.stopName.toLowerCase().replace(/[^a-z0-9]/g, "") === lastAdded.stopName.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Only include if spaced at least 0.4 km apart and different name
        if (distFromLast >= 0.4 && !sameName) {
          spacedStops.push(candidate);
        }
      }
    }

    // 7. Calculate clean order, distances, and offset timings
    let totalCum = 0;
    const finalStopsList = spacedStops.map((st, idx) => {
      const prevDist = idx === 0 ? 0 : Number(haversineDistance(spacedStops[idx - 1].latitude, spacedStops[idx - 1].longitude, st.latitude, st.longitude).toFixed(1));
      totalCum += prevDist;

      return {
        order: idx + 1,
        stopName: st.stopName || st.name,
        name: st.stopName || st.name,
        latitude: Number(st.latitude.toFixed(5)),
        longitude: Number(st.longitude.toFixed(5)),
        distanceFromPreviousStop: prevDist,
        cumulativeDistance: Number(totalCum.toFixed(1)),
        travel_time_from_prev: Math.round(prevDist * 1.8),
        offset_minutes: Math.round(totalCum * 1.8),
        source: st.source || "automatic",
      };
    });

    onStopsChange(finalStopsList);
    onRouteSelected({
      selectedRouteId: routeObj.id,
      routeName: routeObj.name,
      startingPoint: { name: start.name, latitude: start.lat, longitude: start.lng },
      destination: { name: end.name, latitude: end.lat, longitude: end.lng },
      totalDistance: routeObj.distanceKm,
      estimatedTravelTime: routeObj.durationStr,
      estimatedTravelTimeMins: routeObj.durationMins,
      routeGeometry: coords,
    });

    setStatusMessage(`Loaded ${finalStopsList.length} passenger bus stops for ${start.name} ➔ ${end.name}`);
  }, [onStopsChange, onRouteSelected]);

  // Fetch all possible alternative road driving routes from OSRM & Corridor Discovery
  const fetchOSRMAlternativeRoutes = useCallback(async (start, end) => {
    if (!start || !end) return;
    setLoadingRoute(true);
    setStatusMessage("Searching all possible road routes on map...");

    try {
      const candidatesMap = new Map();

      // 1. Primary OSRM driving fetch with alternatives=3
      try {
        const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=3&steps=true&annotations=true`;
        const primaryRes = await fetch(primaryUrl);
        if (primaryRes.ok) {
          const primaryData = await primaryRes.json();
          if (primaryData.routes && primaryData.routes.length > 0) {
            primaryData.routes.forEach((r, idx) => {
              candidatesMap.set(`primary-${idx}`, r);
            });
          }
        }
      } catch (err) {
        console.warn("Primary OSRM endpoint error:", err);
      }

      // 2. Discover alternative road corridors through intermediate major transit hubs
      const totalDirect = haversineDistance(start.lat, start.lng, end.lat, end.lng);
      const intermediateHubs = KERALA_ALL_PLACES.filter((p) => {
        const dStart = haversineDistance(start.lat, start.lng, p.lat, p.lng);
        const dEnd = haversineDistance(end.lat, end.lng, p.lat, p.lng);
        return dStart > 2.0 && dEnd > 2.0 && (dStart + dEnd) < (totalDirect * 1.45);
      }).sort((a, b) => {
        const dSumA = haversineDistance(start.lat, start.lng, a.lat, a.lng) + haversineDistance(end.lat, end.lng, a.lat, a.lng);
        const dSumB = haversineDistance(start.lat, start.lng, b.lat, b.lng) + haversineDistance(end.lat, end.lng, b.lat, b.lng);
        return dSumA - dSumB;
      });

      // Query via-hub routes (top 3 alternative highway branches)
      for (const hub of intermediateHubs.slice(0, 3)) {
        try {
          const viaUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${hub.lng},${hub.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
          const viaRes = await fetch(viaUrl);
          if (viaRes.ok) {
            const viaData = await viaRes.json();
            if (viaData.routes && viaData.routes.length > 0) {
              const bestVia = viaData.routes[0];
              bestVia.waypointName = hub.name;
              candidatesMap.set(`via-${hub.name}`, bestVia);
            }
          }
        } catch {
          // Graceful fallback per via-corridor
        }
      }

      const allRawRoutes = Array.from(candidatesMap.values());
      if (allRawRoutes.length === 0) {
        const fallback = generateFallbackRoute(start, end);
        setRoutesList([fallback]);
        setSelectedRouteId(fallback.id);
        setSelectedRoute(fallback);
        extractBusStopsForRoute(fallback, start, end);
        setLoadingRoute(false);
        return;
      }

      // Filter distinct reachable road routes
      const distinctRoutes = [];
      allRawRoutes.forEach((r) => {
        const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const distKm = Number((r.distance / 1000).toFixed(1));
        const midIdx = Math.floor(coords.length / 2);
        const midPoint = coords[midIdx] || coords[0];

        // Deduplicate very identical geometries (within 0.4km dist and 0.4km midpoint)
        const isDuplicate = distinctRoutes.some((existing) => {
          const distDiff = Math.abs(existing.distanceKm - distKm);
          const midDist = haversineDistance(existing.midPoint[0], existing.midPoint[1], midPoint[0], midPoint[1]);
          return distDiff < 0.4 && midDist < 0.4;
        });

        if (!isDuplicate) {
          const durMins = Math.round(r.duration / 60);
          const hours = Math.floor(durMins / 60);
          const mins = durMins % 60;
          const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

          // Extract intermediate street/landmark step names
          const stepNames = [];
          if (r.legs) {
            r.legs.forEach((leg) => {
              if (leg.steps) {
                leg.steps.forEach((st) => {
                  if (st.name && st.name.trim() && !stepNames.includes(st.name.trim()) && !/^bus\s*stop$/i.test(st.name)) {
                    stepNames.push(st.name.trim());
                  }
                });
              }
            });
          }

          let viaSummary = r.waypointName || stepNames.slice(0, 2).join(", ");
          if (!viaSummary || /^bus\s*stop$/i.test(viaSummary)) {
            viaSummary = `Route Corridor Option ${distinctRoutes.length + 1}`;
          }

          const name = `${start.name} ➔ via ${viaSummary} ➔ ${end.name}`;

          distinctRoutes.push({
            id: `route-opt-${distinctRoutes.length}`,
            name: name,
            geometry: coords,
            midPoint: midPoint,
            distanceKm: distKm,
            durationStr: durStr,
            durationMins: durMins,
            steps: r.legs ? r.legs.flatMap((l) => l.steps || []) : [],
            stepNames: stepNames,
          });
        }
      });

      const finalRoutes = distinctRoutes.length > 0 ? distinctRoutes : [generateFallbackRoute(start, end)];
      setRoutesList(finalRoutes);
      setSelectedRouteId(finalRoutes[0].id);
      setSelectedRoute(finalRoutes[0]);
      extractBusStopsForRoute(finalRoutes[0], start, end);
    } catch (err) {
      console.error("Route search error:", err);
      const fallback = generateFallbackRoute(start, end);
      setRoutesList([fallback]);
      setSelectedRouteId(fallback.id);
      setSelectedRoute(fallback);
      extractBusStopsForRoute(fallback, start, end);
    } finally {
      setLoadingRoute(false);
    }
  }, [generateFallbackRoute, extractBusStopsForRoute]);

  // Perform geocode and route fetch ONLY when user explicitly clicks "Search & Draw Route"
  const handleSearchAndDrawRoute = useCallback(async () => {
    if (!fromQuery || !fromQuery.trim() || !toQuery || !toQuery.trim()) {
      setStatusMessage("Please enter both Starting Point and Destination.");
      return;
    }

    setLoadingRoute(true);
    setStatusMessage(`Searching road route for ${fromQuery.trim()} ➔ ${toQuery.trim()}...`);

    let start = startPoint;
    let end = destPoint;

    if (!start || start.name.toLowerCase() !== fromQuery.trim().toLowerCase()) {
      const res = await getKeralaLocationSuggestions(fromQuery);
      if (res.length > 0) {
        start = { name: res[0].name, lat: res[0].lat, lng: res[0].lng };
        setStartPoint(start);
      } else {
        setStatusMessage(`Could not locate origin place "${fromQuery}". Please pick from suggestions.`);
        setLoadingRoute(false);
        return;
      }
    }

    if (!end || end.name.toLowerCase() !== toQuery.trim().toLowerCase()) {
      const res = await getKeralaLocationSuggestions(toQuery);
      if (res.length > 0) {
        end = { name: res[0].name, lat: res[0].lat, lng: res[0].lng };
        setDestPoint(end);
      } else {
        setStatusMessage(`Could not locate destination place "${toQuery}". Please pick from suggestions.`);
        setLoadingRoute(false);
        return;
      }
    }

    fetchOSRMAlternativeRoutes(start, end);
  }, [fromQuery, toQuery, startPoint, destPoint, fetchOSRMAlternativeRoutes]);

  // Switch selected candidate route option
  const handleSelectRouteOption = (routeId) => {
    setSelectedRouteId(routeId);
    const selectedObj = routesList.find((r) => r.id === routeId);
    if (selectedObj && startPoint && destPoint) {
      setSelectedRoute(selectedObj);
      extractBusStopsForRoute(selectedObj, startPoint, destPoint);
    }
  };

  // Handle interactive map clicks (Set Start, Set Destination, or Add Stop)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // 1. Check for closest known Kerala place within 2.5km
      let placeName = "";
      let minPlaceDist = 999;
      KERALA_ALL_PLACES.forEach((p) => {
        const d = haversineDistance(clickLat, clickLng, p.lat, p.lng);
        if (d < 2.5 && d < minPlaceDist) {
          minPlaceDist = d;
          placeName = p.name;
        }
      });

      // 2. If not in catalog, reverse geocode via Nominatim
      if (!placeName) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}`);
          const data = await res.json();
          if (data.display_name) {
            const parts = data.display_name.split(",");
            placeName = (parts[0] || parts[1] || "").trim();
          }
        } catch {
          // fallback
        }
      }

      if (!placeName) {
        placeName = `Location (${clickLat.toFixed(4)}, ${clickLng.toFixed(4)})`;
      }

      // If user is specifically in "+ Add Missing Stop Mode"
      if (isAddingStopMode) {
        setPendingNewStop({
          lat: Number(clickLat.toFixed(5)),
          lng: Number(clickLng.toFixed(5)),
          defaultName: placeName,
        });
        setModalStopName(placeName);
        setNewStopModalOpen(true);
        setIsAddingStopMode(false);
        return;
      }

      // Otherwise show clean Action Popup at clicked position
      const popupContent = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 4px; min-width: 190px;">
          <div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-bottom: 2px;">
            📍 Selected Location
          </div>
          <h4 style="margin: 2px 0 6px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${placeName}</h4>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">
            Coords: ${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button
              onclick="window.setMapLocationAsStart(${clickLat}, ${clickLng}, '${placeName.replace(/'/g, "\\'")}')"
              style="background: #10b981; color: white; border: none; padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
            >
              🚩 Set as Starting Point
            </button>
            <button
              onclick="window.setMapLocationAsDest(${clickLat}, ${clickLng}, '${placeName.replace(/'/g, "\\'")}')"
              style="background: #ef4444; color: white; border: none; padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
            >
              🏁 Set as Destination
            </button>
            ${routesList.length > 0 ? `
              <button
                onclick="window.addMapLocationAsStop(${clickLat}, ${clickLng}, '${placeName.replace(/'/g, "\\'")}')"
                style="background: #8b5cf6; color: white; border: none; padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
              >
                ➕ Add as Bus Stop
              </button>
            ` : ''}
          </div>
        </div>
      `;

      L.popup()
        .setLatLng([clickLat, clickLng])
        .setContent(popupContent)
        .openOn(map);
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [isAddingStopMode, routesList]);

  // Confirm manual stop addition
  const handleConfirmAddStopModal = () => {
    if (!pendingNewStop || !modalStopName.trim()) return;

    const currentRouteObj = routesList.find((r) => r.id === selectedRouteId);
    const coords = currentRouteObj ? currentRouteObj.geometry : [];

    const proj = projectPointOntoPolyline(pendingNewStop.lat, pendingNewStop.lng, coords);

    const newStopObj = {
      stopName: modalStopName.trim(),
      name: modalStopName.trim(),
      latitude: pendingNewStop.lat,
      longitude: pendingNewStop.lng,
      pathDistance: proj.pathDistance,
      source: "admin",
    };

    // Combine with current stops and re-sort by pathDistance
    const updatedRaw = [...stops.map((st) => ({
      ...st,
      pathDistance: projectPointOntoPolyline(st.latitude, st.longitude, coords).pathDistance,
    })), newStopObj];

    updatedRaw.sort((a, b) => a.pathDistance - b.pathDistance);

    // Recalculate order and distances
    let totalCum = 0;
    const finalStopsList = updatedRaw.map((st, idx) => {
      const prevDist = idx === 0 ? 0 : Number(haversineDistance(updatedRaw[idx - 1].latitude, updatedRaw[idx - 1].longitude, st.latitude, st.longitude).toFixed(1));
      totalCum += prevDist;

      return {
        order: idx + 1,
        stopName: st.stopName || st.name,
        name: st.stopName || st.name,
        latitude: st.latitude,
        longitude: st.longitude,
        distanceFromPreviousStop: prevDist,
        cumulativeDistance: Number(totalCum.toFixed(1)),
        travel_time_from_prev: Math.round(prevDist * 1.8),
        offset_minutes: Math.round(totalCum * 1.8),
        source: st.source || "admin",
      };
    });

    onStopsChange(finalStopsList);
    setNewStopModalOpen(false);
    setPendingNewStop(null);
    setStatusMessage(`Added custom stop "${modalStopName.trim()}"!`);
  };

  // Reset and clear map selections & markers
  const handleResetMap = useCallback(() => {
    setFromQuery("");
    setToQuery("");
    setStartPoint(null);
    setDestPoint(null);
    setRoutesList([]);
    setSelectedRouteId(null);
    setSelectedRoute(null);
    setIsAddingStopMode(false);
    setStatusMessage("Map search refreshed.");
    onLocationsChange("", "");
    onStopsChange([]);
    onRouteSelected({
      selectedRouteId: null,
      routeName: "",
      startingPoint: { name: "", latitude: null, longitude: null },
      destination: { name: "", latitude: null, longitude: null },
      totalDistance: 0,
      estimatedTravelTime: "",
      routeGeometry: [],
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([9.5916, 76.6500], 10, { animate: true });
    }
    if (markersGroupRef.current) markersGroupRef.current.clearLayers();
    if (polylineGroupRef.current) polylineGroupRef.current.clearLayers();
  }, [onLocationsChange, onStopsChange, onRouteSelected]);

  // Expose global window handlers for actions triggered inside Leaflet HTML popups
  useEffect(() => {
    window.setMapLocationAsStart = (lat, lng, name) => {
      setFromQuery(name);
      setStartPoint({ name, lat, lng });
      onLocationsChange(name, toQuery);
      setStatusMessage(`Selected Starting Point: ${name}`);
      if (mapInstanceRef.current) mapInstanceRef.current.closePopup();
    };

    window.setMapLocationAsDest = (lat, lng, name) => {
      setToQuery(name);
      setDestPoint({ name, lat, lng });
      onLocationsChange(fromQuery, name);
      setStatusMessage(`Selected Destination: ${name}`);
      if (mapInstanceRef.current) mapInstanceRef.current.closePopup();
    };

    window.addMapLocationAsStop = (lat, lng, name) => {
      setPendingNewStop({ lat, lng, defaultName: name });
      setModalStopName(name);
      setNewStopModalOpen(true);
      if (mapInstanceRef.current) mapInstanceRef.current.closePopup();
    };

    window.selectMapRouteOption = (id) => {
      handleSelectRouteOption(id);
    };

    return () => {
      delete window.setMapLocationAsStart;
      delete window.setMapLocationAsDest;
      delete window.addMapLocationAsStop;
      delete window.selectMapRouteOption;
    };
  }, [fromQuery, toQuery, onLocationsChange, handleSelectRouteOption]);

  // Render Polylines and Markers on Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersGroupRef.current.clearLayers();
    polylineGroupRef.current.clearLayers();

    // 1. Draw Polyline routes if available
    if (routesList.length > 0) {
      const routeColors = ["#2563eb", "#8b5cf6", "#f59e0b", "#10b981", "#06b6d4"];

      routesList.forEach((r, idx) => {
        const isSelected = r.id === selectedRouteId;
        const color = isSelected ? "#2563eb" : routeColors[(idx + 1) % routeColors.length];

        const polyline = L.polyline(r.geometry, {
          color: color,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.95 : 0.6,
          dashArray: isSelected ? null : "6, 8",
        });

        const routePopupHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 6px; text-align: center; min-width: 180px;">
            <div style="font-size: 11px; font-weight: 800; color: ${isSelected ? '#2563eb' : '#64748b'}; text-transform: uppercase; margin-bottom: 2px;">
              ${isSelected ? '✅ Active Road Route' : `🛣️ Route Option ${idx + 1}`}
            </div>
            <h4 style="margin: 4px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${r.name}</h4>
            <p style="margin: 4px 0 10px 0; font-size: 12px; color: #475569;">
              Distance: <b>${r.distanceKm} km</b> · Est: <b>${r.durationStr}</b>
            </p>
            ${!isSelected ? `
              <button
                onclick="window.selectMapRouteOption('${r.id}')"
                style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;"
              >
                Select This Route ✓
              </button>
            ` : `
              <span style="font-size: 12px; font-weight: 800; color: #10b981;">✓ Selected</span>
            `}
          </div>
        `;

        polyline.bindPopup(routePopupHtml);
        polyline.on("click", () => handleSelectRouteOption(r.id));
        polyline.addTo(polylineGroupRef.current);
      });

      // Fit map bounds to active polyline
      const activeRoute = routesList.find((r) => r.id === selectedRouteId);
      if (activeRoute && activeRoute.geometry.length > 0) {
        map.fitBounds(activeRoute.geometry, { padding: [40, 40] });
      }
    }

    // 2. Render Stop Markers (Clean, Collision-Free)
    if (stops && stops.length > 0) {
      stops.forEach((st, idx) => {
        if (!st.latitude || !st.longitude) return;

        const isStart = idx === 0;
        const isEnd = idx === stops.length - 1;

        let iconType = "number";
        if (isStart) iconType = "start";
        else if (isEnd) iconType = "end";

        const icon = createCustomIcon(
          st.order || idx + 1,
          isStart ? "#10b981" : isEnd ? "#ef4444" : st.source === "admin" ? "#8b5cf6" : "#2563eb",
          iconType,
          st.source
        );

        const marker = L.marker([st.latitude, st.longitude], { icon: icon });

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 150px;">
            <div style="margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; background: ${isStart ? '#10b981' : isEnd ? '#ef4444' : st.source === 'admin' ? '#8b5cf6' : '#2563eb'}; color: white; padding: 2px 6px; border-radius: 10px;">
                ${isStart ? '🚩 Origin' : isEnd ? '🏁 Destination' : `Stop #${st.order || idx + 1}`}
              </span>
            </div>
            <h4 style="margin: 4px 0; font-size: 13px; font-weight: 800; color: #1e293b;">${st.stopName || st.name}</h4>
            <p style="margin: 2px 0; font-size: 11px; color: #64748b;">
              Dist from Prev: <b>${st.distanceFromPreviousStop || 0} km</b><br/>
              Cumulative: <b>${st.cumulativeDistance || 0} km</b>
            </p>
          </div>
        `;

        marker.bindPopup(popupHtml);
        marker.on("click", () => onSelectStopIndex(idx));
        marker.addTo(markersGroupRef.current);
      });
    } else {
      // If no full route is loaded yet, render individual start / destination pins when selected from map click
      if (startPoint && startPoint.lat && startPoint.lng) {
        const startIcon = createCustomIcon("🚩", "#10b981", "start", "automatic");
        const startMarker = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon });
        startMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 4px;">
            <span style="font-size: 10px; font-weight: 800; background: #10b981; color: white; padding: 2px 6px; borderRadius: 8px;">🚩 Starting Point</span>
            <h4 style="margin: 4px 0 0 0; font-size: 13px; font-weight: 800; color: #0f172a;">${startPoint.name}</h4>
          </div>
        `).openPopup();
        startMarker.addTo(markersGroupRef.current);
      }
      if (destPoint && destPoint.lat && destPoint.lng) {
        const destIcon = createCustomIcon("🏁", "#ef4444", "end", "automatic");
        const destMarker = L.marker([destPoint.lat, destPoint.lng], { icon: destIcon });
        destMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 4px;">
            <span style="font-size: 10px; font-weight: 800; background: #ef4444; color: white; padding: 2px 6px; borderRadius: 8px;">🏁 Destination</span>
            <h4 style="margin: 4px 0 0 0; font-size: 13px; font-weight: 800; color: #0f172a;">${destPoint.name}</h4>
          </div>
        `);
        destMarker.addTo(markersGroupRef.current);
      }
    }
  }, [routesList, selectedRouteId, stops, startPoint, destPoint, onSelectStopIndex]);

  // Pan & Zoom to selected stop when clicked from table
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedStopIndex === null || !stops[selectedStopIndex]) return;

    const targetStop = stops[selectedStopIndex];
    if (targetStop.latitude && targetStop.longitude) {
      map.setView([targetStop.latitude, targetStop.longitude], 15, { animate: true });

      markersGroupRef.current.eachLayer((layer) => {
        if (layer.getLatLng) {
          const latlng = layer.getLatLng();
          if (
            Math.abs(latlng.lat - targetStop.latitude) < 0.0001 &&
            Math.abs(latlng.lng - targetStop.longitude) < 0.0001
          ) {
            layer.openPopup();
          }
        }
      });
    }
  }, [selectedStopIndex, stops]);

  return (
    <div className="route-map-wrapper" style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      {/* Map Control Header Bar */}
      <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Navigation size={22} style={{ color: "#38bdf8" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Interactive Bus Route &amp; Stop Selector</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Search locations, select road routes &amp; detect Kerala passenger bus stops</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleResetMap}
              title="Reset origin, destination and clear drawn routes on map"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                transition: "all 0.2s ease",
              }}
            >
              <RefreshCw size={15} />
              <span>Refresh Map</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingStopMode(!isAddingStopMode)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: isAddingStopMode ? "#f59e0b" : "#8b5cf6",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                transition: "all 0.2s ease",
              }}
            >
              <Plus size={16} />
              <span>{isAddingStopMode ? "Cancel Add Stop Mode" : "+ Add Missing Stop"}</span>
            </button>
          </div>
        </div>

        {/* Inputs Form */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "end" }}>
          {/* Starting Point Input */}
          <div style={{ position: "relative" }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Starting Point
            </label>
            <div style={{ display: "flex", alignItems: "center", background: "#334155", borderRadius: 8, padding: "0 10px" }}>
              <MapPin size={16} style={{ color: "#10b981", marginRight: 6 }} />
              <input
                type="text"
                value={fromQuery}
                onChange={(e) => handleFromInputChange(e.target.value)}
                onFocus={async () => {
                  const results = await getKeralaLocationSuggestions(fromQuery);
                  setFromSuggestions(results);
                  setShowFromDrop(true);
                }}
                placeholder="e.g. Kottayam"
                style={{ background: "transparent", border: "none", outline: "none", color: "#ffffff", padding: "8px 0", fontSize: 13, width: "100%" }}
              />
            </div>
            {showFromDrop && fromSuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#ffffff", color: "#1e293b", borderRadius: 10, marginTop: 4, zIndex: 2000, boxShadow: "0 12px 30px rgba(0,0,0,0.25)", maxHeight: 240, overflowY: "auto", border: "1px solid #cbd5e1" }}>
                <div style={{ padding: "6px 12px", background: "#f8fafc", fontSize: 10, fontWeight: 800, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                  🌴 Kerala Places &amp; Transit Hubs
                </div>
                {fromSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectFromLocation(item)}
                    style={{ padding: "9px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div>
                      <strong style={{ color: "#0f172a", fontSize: 13 }}>📍 {item.name}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{item.fullName}</div>
                    </div>
                    {item.category && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#eff6ff", color: "#2563eb", padding: "2px 6px", borderRadius: 12, border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destination Input */}
          <div style={{ position: "relative" }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Destination
            </label>
            <div style={{ display: "flex", alignItems: "center", background: "#334155", borderRadius: 8, padding: "0 10px" }}>
              <MapPin size={16} style={{ color: "#ef4444", marginRight: 6 }} />
              <input
                type="text"
                value={toQuery}
                onChange={(e) => handleToInputChange(e.target.value)}
                onFocus={async () => {
                  const results = await getKeralaLocationSuggestions(toQuery);
                  setToSuggestions(results);
                  setShowToDrop(true);
                }}
                placeholder="e.g. Pala"
                style={{ background: "transparent", border: "none", outline: "none", color: "#ffffff", padding: "8px 0", fontSize: 13, width: "100%" }}
              />
            </div>
            {showToDrop && toSuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#ffffff", color: "#1e293b", borderRadius: 10, marginTop: 4, zIndex: 2000, boxShadow: "0 12px 30px rgba(0,0,0,0.25)", maxHeight: 240, overflowY: "auto", border: "1px solid #cbd5e1" }}>
                <div style={{ padding: "6px 12px", background: "#f8fafc", fontSize: 10, fontWeight: 800, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                  🌴 Kerala Places &amp; Transit Hubs
                </div>
                {toSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectToLocation(item)}
                    style={{ padding: "9px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div>
                      <strong style={{ color: "#0f172a", fontSize: 13 }}>📍 {item.name}</strong>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{item.fullName}</div>
                    </div>
                    {item.category && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#ef4444", padding: "2px 6px", borderRadius: 12, border: "1px solid #fecaca", whiteSpace: "nowrap" }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Search + Refresh */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleSearchAndDrawRoute}
              disabled={loadingRoute}
              style={{
                flex: 1,
                padding: "9px 16px",
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              <Search size={16} />
              <span>{loadingRoute ? "Searching..." : "Search & Draw Route"}</span>
            </button>

            <button
              type="button"
              onClick={handleResetMap}
              title="Reset Search"
              style={{
                padding: "9px 12px",
                background: "#475569",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Map Click Helper Banner */}
        <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
          <span>💡 <b>Map Selection:</b> You can search locations above, OR <b>click anywhere directly on the map</b> to set your Starting Point (🚩) or Destination (🏁).</span>
        </div>
      </div>

      {/* Alternative Routes Selector Bar */}
      {routesList.length > 0 && (
        <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#334155", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <Layers size={15} style={{ color: "#0284c7" }} /> All Available Routes ({routesList.length}):
          </span>
          {routesList.map((r, idx) => {
            const isSelected = r.id === selectedRouteId;
            const routeColors = ["#2563eb", "#8b5cf6", "#f59e0b", "#10b981", "#06b6d4"];
            const dotColor = isSelected ? "#2563eb" : routeColors[(idx + 1) % routeColors.length];

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectRouteOption(r.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: isSelected ? "#eff6ff" : "#ffffff",
                  color: isSelected ? "#1d4ed8" : "#475569",
                  boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: dotColor,
                    display: "inline-block",
                  }}
                />
                <span>
                  <b>Option {idx + 1}:</b> {r.name} · <span style={{ color: isSelected ? "#2563eb" : "#64748b" }}>{r.distanceKm} km ({r.durationStr})</span>
                </span>
                {isSelected && <span style={{ color: "#16a34a", fontWeight: 800 }}>✓ Active</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Add Stop Mode Active Banner */}
      {isAddingStopMode && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "8px 20px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>📍 MAP CLICK MODE ACTIVE: Click anywhere along the road on the map to add a missing local bus stop.</span>
          <button type="button" onClick={() => setIsAddingStopMode(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#92400e" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Status Bar */}
      {statusMessage && (
        <div style={{ padding: "6px 20px", fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
          ℹ️ {statusMessage}
        </div>
      )}

      {/* Map Element */}
      <div
        ref={mapContainerRef}
        style={{
          height: 420,
          width: "100%",
          cursor: isAddingStopMode ? "crosshair" : "grab",
        }}
      />

      {/* Manual Add Stop Modal */}
      {newStopModalOpen && pendingNewStop && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#ffffff", borderRadius: 16, maxWidth: 440, width: "100%", padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>📍 Add Missing Bus Stop</h3>
              <button type="button" onClick={() => setNewStopModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>
                Stop Name
              </label>
              <input
                type="text"
                value={modalStopName}
                onChange={(e) => setModalStopName(e.target.value)}
                placeholder="Enter bus stop name"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none" }}
                autoFocus
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 2 }}>Latitude</label>
                <input type="text" value={pendingNewStop.lat} readOnly style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, color: "#475569" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 2 }}>Longitude</label>
                <input type="text" value={pendingNewStop.lng} readOnly style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, color: "#475569" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setNewStopModalOpen(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddStopModal}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#8b5cf6", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Confirm &amp; Insert Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
