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

// Calculate total length of polyline coordinates array [[lat, lng], ...]
function calculatePolylineTotalDistance(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineDistance(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1]
    );
  }
  return total;
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

    // Vector projection in lat/lng degrees
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

// Custom DivIcons for Leaflet
function createCustomIcon(label, color = "#2563eb", iconType = "number", source = "automatic") {
  let inner = label;
  let bg = color;
  let textColor = "#ffffff";
  let border = "2px solid #ffffff";
  let shadow = "0 3px 8px rgba(0,0,0,0.3)";

  if (iconType === "start") {
    bg = "#10b981"; // Emerald
    inner = "🚩";
  } else if (iconType === "end") {
    bg = "#ef4444"; // Red
    inner = "🏁";
  } else if (source === "admin") {
    bg = "#8b5cf6"; // Purple
    border = "2px solid #f59e0b";
  }

  const html = `
    <div style="
      background-color: ${bg};
      color: ${textColor};
      border: ${border};
      box-shadow: ${shadow};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: transform 0.2s ease;
    ">
      ${inner}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: "custom-leaflet-div-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMap({
  fromLocationName = "",
  toLocationName = "",
  onLocationsChange = () => {},
  onRouteSelected = () => {},
  stops = [],
  onStopsChange = () => {},
  selectedStopIndex = null,
  onSelectStopIndex = () => {},
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const polylineGroupRef = useRef(null);

  // States
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

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Map Add Stop Mode
  const [isAddingStopMode, setIsAddingStopMode] = useState(false);
  const [pendingNewStop, setPendingNewStop] = useState(null); // { lat, lng, defaultName }
  const [newStopModalOpen, setNewStopModalOpen] = useState(false);
  const [modalStopName, setModalStopName] = useState("");

  // Sync prop changes for from/to
  useEffect(() => {
    if (fromLocationName && fromLocationName !== fromQuery) setFromQuery(fromLocationName);
  }, [fromLocationName]);

  useEffect(() => {
    if (toLocationName && toLocationName !== toQuery) setToQuery(toLocationName);
  }, [toLocationName]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center Kerala (Kanjirappally/Kottayam area)
    const map = L.map(mapContainerRef.current, {
      center: [9.5544, 76.7865],
      zoom: 11,
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

// Comprehensive Kerala Towns, Cities, Districts & Bus Hubs Dataset
const KERALA_ALL_PLACES = [
  { name: "Kanjirappally", category: "Town", district: "Kottayam", lat: 9.5544, lng: 76.7865 },
  { name: "Pala", category: "Town", district: "Kottayam", lat: 9.7081, lng: 76.6837 },
  { name: "Ponkunnam", category: "Town", district: "Kottayam", lat: 9.5667, lng: 76.7583 },
  { name: "Erattupetta", category: "Town", district: "Kottayam", lat: 9.6833, lng: 76.7833 },
  { name: "Kottayam", category: "District HQ", district: "Kottayam", lat: 9.5916, lng: 76.5222 },
  { name: "Changanassery", category: "Town", district: "Kottayam", lat: 9.4452, lng: 76.5385 },
  { name: "Ettumanoor", category: "Town", district: "Kottayam", lat: 9.6644, lng: 76.5625 },
  { name: "Vaikom", category: "Town", district: "Kottayam", lat: 9.7478, lng: 76.3956 },
  { name: "Mundakayam", category: "Town", district: "Kottayam", lat: 9.5424, lng: 76.8833 },
  { name: "Kuttikkanam", category: "Hill Station", district: "Idukki", lat: 9.5850, lng: 76.9680 },
  { name: "Kumily", category: "Town", district: "Idukki", lat: 9.6083, lng: 77.1611 },
  { name: "Peermade", category: "Town", district: "Idukki", lat: 9.5667, lng: 76.9833 },
  { name: "Thodupuzha", category: "Town", district: "Idukki", lat: 9.8947, lng: 76.7161 },
  { name: "Munnar", category: "Hill Station", district: "Idukki", lat: 10.0889, lng: 77.0597 },
  { name: "Adimali", category: "Town", district: "Idukki", lat: 10.0125, lng: 76.9536 },
  { name: "Kattappana", category: "Town", district: "Idukki", lat: 9.7740, lng: 77.1186 },
  { name: "Pathanamthitta", category: "District HQ", district: "Pathanamthitta", lat: 9.2648, lng: 76.7870 },
  { name: "Ranni", category: "Town", district: "Pathanamthitta", lat: 9.3800, lng: 76.7800 },
  { name: "Konni", category: "Town", district: "Pathanamthitta", lat: 9.2433, lng: 76.8533 },
  { name: "Thiruvalla", category: "Town", district: "Pathanamthitta", lat: 9.3834, lng: 76.5744 },
  { name: "Chengannur", category: "Town", district: "Alappuzha", lat: 9.3175, lng: 76.6117 },
  { name: "Pandalam", category: "Town", district: "Pathanamthitta", lat: 9.2333, lng: 76.6833 },
  { name: "Adoor", category: "Town", district: "Pathanamthitta", lat: 9.1558, lng: 76.7324 },
  { name: "Mavelikkara", category: "Town", district: "Alappuzha", lat: 9.2570, lng: 76.5490 },
  { name: "Kayamkulam", category: "Town", district: "Alappuzha", lat: 9.1724, lng: 76.5008 },
  { name: "Alappuzha", category: "District HQ", district: "Alappuzha", lat: 9.4981, lng: 76.3388 },
  { name: "Cherthala", category: "Town", district: "Alappuzha", lat: 9.6847, lng: 76.3315 },
  { name: "Haripad", category: "Town", district: "Alappuzha", lat: 9.2797, lng: 76.4633 },
  { name: "Kollam", category: "District HQ", district: "Kollam", lat: 8.8932, lng: 76.6141 },
  { name: "Karunagappally", category: "Town", district: "Kollam", lat: 9.0533, lng: 76.5367 },
  { name: "Kottarakkara", category: "Town", district: "Kollam", lat: 9.0000, lng: 76.7667 },
  { name: "Punalur", category: "Town", district: "Kollam", lat: 9.0167, lng: 76.9333 },
  { name: "Thiruvananthapuram", category: "Capital City", district: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
  { name: "Neyyattinkara", category: "Town", district: "Thiruvananthapuram", lat: 8.4000, lng: 77.0833 },
  { name: "Attingal", category: "Town", district: "Thiruvananthapuram", lat: 8.6961, lng: 76.8142 },
  { name: "Varkala", category: "Town", district: "Thiruvananthapuram", lat: 8.7379, lng: 76.7163 },
  { name: "Nedumangad", category: "Town", district: "Thiruvananthapuram", lat: 8.6044, lng: 76.9961 },
  { name: "Kochi / Ernakulam", category: "Major City", district: "Ernakulam", lat: 9.9312, lng: 76.2673 },
  { name: "Aluva", category: "Town", district: "Ernakulam", lat: 10.1076, lng: 76.3516 },
  { name: "Angamaly", category: "Town", district: "Ernakulam", lat: 10.1960, lng: 76.3860 },
  { name: "Muvattupuzha", category: "Town", district: "Ernakulam", lat: 9.9814, lng: 76.5786 },
  { name: "Kothamangalam", category: "Town", district: "Ernakulam", lat: 10.0825, lng: 76.6272 },
  { name: "Perumbavoor", category: "Town", district: "Ernakulam", lat: 10.1147, lng: 76.4789 },
  { name: "Piravom", category: "Town", district: "Ernakulam", lat: 9.8700, lng: 76.4900 },
  { name: "Thrissur", category: "District HQ", district: "Thrissur", lat: 10.5276, lng: 76.2144 },
  { name: "Chalakudy", category: "Town", district: "Thrissur", lat: 10.3070, lng: 76.3333 },
  { name: "Irinjalakuda", category: "Town", district: "Thrissur", lat: 10.3422, lng: 76.2064 },
  { name: "Kodungallur", category: "Town", district: "Thrissur", lat: 10.2200, lng: 76.2000 },
  { name: "Guruvayur", category: "Town", district: "Thrissur", lat: 10.5946, lng: 76.0408 },
  { name: "Kunnamkulam", category: "Town", district: "Thrissur", lat: 10.6500, lng: 76.0667 },
  { name: "Wadakkanchery", category: "Town", district: "Thrissur", lat: 10.6667, lng: 76.2500 },
  { name: "Palakkad", category: "District HQ", district: "Palakkad", lat: 10.7867, lng: 76.6548 },
  { name: "Ottapalam", category: "Town", district: "Palakkad", lat: 10.7700, lng: 76.3800 },
  { name: "Shornur", category: "Town", district: "Palakkad", lat: 10.7600, lng: 76.2700 },
  { name: "Mannarkkad", category: "Town", district: "Palakkad", lat: 10.9880, lng: 76.4633 },
  { name: "Pattambi", category: "Town", district: "Palakkad", lat: 10.8080, lng: 76.1830 },
  { name: "Chittur", category: "Town", district: "Palakkad", lat: 10.7000, lng: 76.7500 },
  { name: "Malappuram", category: "District HQ", district: "Malappuram", lat: 11.0720, lng: 76.0740 },
  { name: "Manjeri", category: "Town", district: "Malappuram", lat: 11.1200, lng: 76.1200 },
  { name: "Perinthalmanna", category: "Town", district: "Malappuram", lat: 10.9758, lng: 76.2256 },
  { name: "Tirur", category: "Town", district: "Malappuram", lat: 10.9167, lng: 75.9167 },
  { name: "Ponnani", category: "Town", district: "Malappuram", lat: 10.7667, lng: 75.9167 },
  { name: "Nilambur", category: "Town", district: "Malappuram", lat: 11.2758, lng: 76.2256 },
  { name: "Kozhikode", category: "District HQ", district: "Kozhikode", lat: 11.2588, lng: 75.7804 },
  { name: "Vadakara", category: "Town", district: "Kozhikode", lat: 11.6083, lng: 75.5917 },
  { name: "Koyilandy", category: "Town", district: "Kozhikode", lat: 11.4333, lng: 75.7000 },
  { name: "Thamarassery", category: "Town", district: "Kozhikode", lat: 11.4167, lng: 75.9333 },
  { name: "Kalpetta", category: "District HQ", district: "Wayanad", lat: 11.6103, lng: 76.0828 },
  { name: "Sultan Bathery", category: "Town", district: "Wayanad", lat: 11.6644, lng: 76.2581 },
  { name: "Mananthavady", category: "Town", district: "Wayanad", lat: 11.8000, lng: 76.0000 },
  { name: "Kannur", category: "District HQ", district: "Kannur", lat: 11.8745, lng: 75.3704 },
  { name: "Thalassery", category: "Town", district: "Kannur", lat: 11.7480, lng: 75.4894 },
  { name: "Payyanur", category: "Town", district: "Kannur", lat: 12.1000, lng: 75.2000 },
  { name: "Mattannur", category: "Town", district: "Kannur", lat: 11.9333, lng: 75.5667 },
  { name: "Taliparamba", category: "Town", district: "Kannur", lat: 12.0400, lng: 75.3600 },
  { name: "Kasaragod", category: "District HQ", district: "Kasaragod", lat: 12.5000, lng: 74.9833 },
  { name: "Kanhangad", category: "Town", district: "Kasaragod", lat: 12.3167, lng: 75.0833 },
  { name: "Nileshwaram", category: "Town", district: "Kasaragod", lat: 12.2500, lng: 75.1333 },
];

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

    // 1. Instant local filter (0ms delay)
    const localMatches = KERALA_ALL_PLACES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q)
    ).map((p) => ({
      name: p.name,
      fullName: `${p.name}, ${p.district} District, Kerala`,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      district: p.district,
    }));

    // 2. Fetch Nominatim matches asynchronously if query length >= 2
    let remoteMatches = [];
    if (q.length >= 2) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ", Kerala, India")}&addressdetails=1&limit=6`;
        const res = await fetch(url);
        const data = await res.json();
        remoteMatches = data.map((item) => ({
          name: item.display_name.split(",")[0] || item.display_name,
          fullName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          category: "Map Landmark",
          district: "Kerala",
        }));
      } catch (err) {
        console.warn("Geocoding failed:", err);
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

    return combined.slice(0, 12);
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

    if (destPoint) {
      fetchOSRMAlternativeRoutes(point, destPoint);
    }
  };

  const selectToLocation = (item) => {
    setToQuery(item.name);
    const point = { name: item.name, lat: item.lat, lng: item.lng };
    setDestPoint(point);
    setShowToDrop(false);
    onLocationsChange(fromQuery, item.name);

    if (startPoint) {
      fetchOSRMAlternativeRoutes(startPoint, point);
    }
  };

  // Fetch driving routes from OSRM (Multi-Corridor Discovery)
  const fetchOSRMAlternativeRoutes = useCallback(async (start, end) => {
    if (!start || !end) return;
    setLoadingRoute(true);
    setStatusMessage("Searching all possible road routes on map...");

    try {
      const candidatesMap = new Map();

      // 1. Primary OSRM alternatives query (alternatives=3)
      const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=3&steps=true&annotations=true`;
      const primaryRes = await fetch(primaryUrl);
      const primaryData = await primaryRes.json();

      if (primaryData.routes && primaryData.routes.length > 0) {
        primaryData.routes.forEach((r, idx) => {
          candidatesMap.set(`primary-${idx}`, r);
        });
      }

      // 2. Discover intermediate town waypoints in bounding box using Overpass
      const minLat = Math.min(start.lat, end.lat) - 0.06;
      const maxLat = Math.max(start.lat, end.lat) + 0.06;
      const minLng = Math.min(start.lng, end.lng) - 0.06;
      const maxLng = Math.max(start.lng, end.lng) + 0.06;

      try {
        const townQuery = `
          [out:json][timeout:5];
          (
            node["place"="town"](${minLat},${minLng},${maxLat},${maxLng});
            node["place"="village"](${minLat},${minLng},${maxLat},${maxLng});
            node["place"="suburb"](${minLat},${minLng},${maxLat},${maxLng});
          );
          out body 8;
        `;
        const townRes = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: townQuery,
        });

        if (townRes.ok) {
          const townData = await townRes.json();
          if (townData.elements && townData.elements.length > 0) {
            // Pick up to 8 intermediate waypoints between start and destination
            const candidateWaypoints = townData.elements.filter((el) => {
              const dStart = haversineDistance(start.lat, start.lng, el.lat, el.lon);
              const dEnd = haversineDistance(end.lat, end.lng, el.lat, el.lon);
              return dStart > 1.8 && dEnd > 1.8;
            }).slice(0, 8);

            // Query OSRM via each candidate waypoint
            await Promise.all(
              candidateWaypoints.map(async (wp, wIdx) => {
                try {
                  const wpUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${wp.lon},${wp.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
                  const wpRes = await fetch(wpUrl);
                  const wpData = await wpRes.json();
                  if (wpData.routes && wpData.routes[0]) {
                    const r = wpData.routes[0];
                    r.waypointName = wp.tags?.name || wp.tags?.["name:en"] || wp.tags?.local_name || `Via Waypoint ${wIdx + 1}`;
                    candidatesMap.set(`via-${wIdx}`, r);
                  }
                } catch (e) {
                  // Ignore waypoint failure
                }
              })
            );
          }
        }
      } catch (err) {
        console.warn("Intermediate waypoint lookup skipped:", err);
      }

      const allRawRoutes = Array.from(candidatesMap.values());
      if (allRawRoutes.length === 0) {
        setStatusMessage("No driving route found between specified points.");
        setLoadingRoute(false);
        return;
      }

      // Filter distinct routes (preserves all reachable road corridors)
      const distinctRoutes = [];
      allRawRoutes.forEach((r) => {
        const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const distKm = Number((r.distance / 1000).toFixed(1));
        const midIdx = Math.floor(coords.length / 2);
        const midPoint = coords[midIdx] || coords[0];

        // Only exclude if distDiff < 0.3km AND midDist < 0.5km
        const isDuplicate = distinctRoutes.some((existing) => {
          const distDiff = Math.abs(existing.distanceKm - distKm);
          const midDist = haversineDistance(existing.midPoint[0], existing.midPoint[1], midPoint[0], midPoint[1]);
          return distDiff < 0.3 && midDist < 0.5;
        });

        if (!isDuplicate) {
          const durMins = Math.round(r.duration / 60);
          const hours = Math.floor(durMins / 60);
          const mins = durMins % 60;
          const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

          // Extract intermediate street/place step names
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
            viaSummary = `Corridor Option ${distinctRoutes.length + 1}`;
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

      setRoutesList(distinctRoutes);
      setSelectedRouteId(distinctRoutes[0].id);
      setStatusMessage(`Found ${distinctRoutes.length} distinct road route options on map! Extracting bus stops...`);

      // Trigger automatic stop extraction for default route
      extractBusStopsForRoute(distinctRoutes[0], start, end);
    } catch (err) {
      console.error("OSRM Route Error:", err);
      setStatusMessage("Failed to connect to route server.");
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  // Automatically fetch ALL bus stops along polyline using Overpass API + OSRM Annotations
  const extractBusStopsForRoute = async (routeObj, start, end) => {
    if (!routeObj || !routeObj.geometry || routeObj.geometry.length === 0) return;
    setLoadingStops(true);
    setStatusMessage("Extracting all passenger bus stops along selected route...");

    const coords = routeObj.geometry;
    const lats = coords.map((c) => c[0]);
    const lngs = coords.map((c) => c[1]);
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;

    let detectedStops = [];

    // 1. Add Start point as Order 1
    detectedStops.push({
      stopName: start.name,
      name: start.name,
      latitude: start.lat,
      longitude: start.lng,
      pathDistance: 0,
      source: "automatic",
      isFixedEnd: true,
    });

    // 2. Fetch Overpass API bus stops and transit nodes along selected route polyline
    try {
      const overpassQuery = `
        [out:json][timeout:10];
        (
          node["highway"="bus_stop"](${minLat},${minLng},${maxLat},${maxLng});
          node["public_transport"="platform"](${minLat},${minLng},${maxLat},${maxLng});
          node["public_transport"="stop_position"](${minLat},${minLng},${maxLat},${maxLng});
          node["amenity"="bus_station"](${minLat},${minLng},${maxLat},${maxLng});
          node["highway"="traffic_signals"](${minLat},${minLng},${maxLat},${maxLng});
          node["junction"="roundabout"](${minLat},${minLng},${maxLat},${maxLng});
          node["place"="village"](${minLat},${minLng},${maxLat},${maxLng});
          node["place"="suburb"](${minLat},${minLng},${maxLat},${maxLng});
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
            const lat = node.lat;
            const lng = node.lon;
            const tags = node.tags || {};

            let rawName = (tags.name || tags["name:en"] || tags["name:ml"] || tags.local_name || tags["addr:street"] || tags["addr:suburb"] || tags["addr:place"] || tags.place || "").trim();
            const isGeneric = !rawName || /^bus\s*stop$/i.test(rawName) || /^stop$/i.test(rawName) || rawName.toLowerCase() === "bus_stop" || rawName.toLowerCase().includes("unnamed");

            if (isGeneric) {
              let closestStepName = "";
              let minDist = Infinity;
              if (routeObj.steps && routeObj.steps.length > 0) {
                routeObj.steps.forEach((st) => {
                  if (st.name && st.name.trim() && st.maneuver && st.maneuver.location) {
                    const d = haversineDistance(lat, lng, st.maneuver.location[1], st.maneuver.location[0]);
                    if (d < minDist) {
                      minDist = d;
                      closestStepName = st.name.trim();
                    }
                  }
                });
              }

              if (closestStepName && !/^bus\s*stop$/i.test(closestStepName)) {
                rawName = `${closestStepName} Sub-Stop`;
              } else {
                rawName = `${start.name} - ${end.name} Sub-Stop ${detectedStops.length + 1}`;
              }
            }

            const proj = projectPointOntoPolyline(lat, lng, coords);
            // Include if within 0.6km (600m) of route polyline
            if (proj.offPolylineDistance <= 0.6) {
              detectedStops.push({
                stopName: rawName,
                name: rawName,
                latitude: proj.projLat,
                longitude: proj.projLng,
                pathDistance: proj.pathDistance,
                source: "automatic",
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn("Overpass API query failed, using step waypoints for sub-stops:", err);
    }

    // 3. OSRM step waypoints for intermediate sub-stops along selected road route
    if (routeObj.steps && routeObj.steps.length > 0) {
      routeObj.steps.forEach((step) => {
        if (step.name && step.name.trim()) {
          const stepName = step.name.trim();
          if (!/^bus\s*stop$/i.test(stepName)) {
            const stepLat = step.maneuver.location[1];
            const stepLng = step.maneuver.location[0];
            const proj = projectPointOntoPolyline(stepLat, stepLng, coords);
            if (proj.offPolylineDistance <= 0.8) {
              detectedStops.push({
                stopName: stepName,
                name: stepName,
                latitude: proj.projLat,
                longitude: proj.projLng,
                pathDistance: proj.pathDistance,
                source: "automatic",
              });
            }
          }
        }
      });
    }

    // 4. Regular trajectory sampling sub-stops for long road segments (>5 km)
    if (routeObj.distanceKm > 5 && coords.length > 6) {
      const sampleCount = Math.min(6, Math.floor(routeObj.distanceKm / 5));
      const stepSize = Math.floor(coords.length / (sampleCount + 1));
      for (let i = 1; i <= sampleCount; i++) {
        const pt = coords[i * stepSize];
        if (pt) {
          const proj = projectPointOntoPolyline(pt[0], pt[1], coords);
          let sampleName = `${start.name} - ${end.name} Sub-Stop (${proj.pathDistance} km)`;
          if (routeObj.stepNames && routeObj.stepNames[i - 1]) {
            sampleName = `${routeObj.stepNames[i - 1]} Sub-Stop`;
          }
          detectedStops.push({
            stopName: sampleName,
            name: sampleName,
            latitude: proj.projLat,
            longitude: proj.projLng,
            pathDistance: proj.pathDistance,
            source: "automatic",
          });
        }
      }
    }

    // 4. Add Destination point
    const destProj = projectPointOntoPolyline(end.lat, end.lng, coords);
    detectedStops.push({
      stopName: end.name,
      name: end.name,
      latitude: end.lat,
      longitude: end.lng,
      pathDistance: destProj.pathDistance > 0 ? destProj.pathDistance : routeObj.distanceKm,
      source: "automatic",
      isFixedEnd: true,
    });

    // 5. Sort all stops by pathDistance along polyline
    detectedStops.sort((a, b) => a.pathDistance - b.pathDistance);

    // 6. Deduplicate stop names & very close coordinates (within 0.1km)
    const filteredStops = [];
    detectedStops.forEach((st) => {
      if (filteredStops.length === 0) {
        filteredStops.push(st);
      } else {
        const prev = filteredStops[filteredStops.length - 1];
        const distGap = haversineDistance(prev.latitude, prev.longitude, st.latitude, st.longitude);
        const sameName = prev.stopName.toLowerCase() === st.stopName.toLowerCase();
        
        if (distGap > 0.1 && !sameName) {
          filteredStops.push(st);
        } else if (st.isFixedEnd) {
          // Ensure Destination is preserved at the end
          filteredStops.push(st);
        }
      }
    });

    // 7. Calculate order, distanceFromPreviousStop, and cumulativeDistance
    let totalCum = 0;
    const finalStopsList = filteredStops.map((st, idx) => {
      const prevDist = idx === 0 ? 0 : haversineDistance(filteredStops[idx - 1].latitude, filteredStops[idx - 1].longitude, st.latitude, st.longitude);
      totalCum += prevDist;

      let cleanStopName = (st.stopName || st.name || "").trim();
      if (!cleanStopName || /^bus\s*stop$/i.test(cleanStopName) || cleanStopName.toLowerCase() === "bus_stop") {
        cleanStopName = `${start.name} - ${end.name} Stop ${idx + 1}`;
      }

      return {
        order: idx + 1,
        stopName: cleanStopName,
        name: cleanStopName,
        latitude: Number(st.latitude.toFixed(5)),
        longitude: Number(st.longitude.toFixed(5)),
        distanceFromPreviousStop: Number(prevDist.toFixed(1)),
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

    setLoadingStops(false);
    setStatusMessage(`Loaded ${finalStopsList.length} bus stops along route!`);
  };

  // Perform geocode and route fetch for ANY arbitrary origin and destination typed by admin
  const handleSearchAndDrawRoute = useCallback(async () => {
    if (!fromQuery || !fromQuery.trim() || !toQuery || !toQuery.trim()) {
      setStatusMessage("Please enter both Starting Point (Origin) and Destination.");
      return;
    }

    setLoadingRoute(true);
    setStatusMessage(`Searching all road routes for ${fromQuery.trim()} ➔ ${toQuery.trim()}...`);

    let start = startPoint;
    let end = destPoint;

    if (!start || start.name.toLowerCase() !== fromQuery.trim().toLowerCase()) {
      const res = await getKeralaLocationSuggestions(fromQuery);
      if (res.length > 0) {
        start = { name: res[0].name, lat: res[0].lat, lng: res[0].lng };
        setStartPoint(start);
      } else {
        setStatusMessage(`Could not locate origin place "${fromQuery}". Try selecting from dropdown.`);
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
        setStatusMessage(`Could not locate destination place "${toQuery}". Try selecting from dropdown.`);
        setLoadingRoute(false);
        return;
      }
    }

    fetchOSRMAlternativeRoutes(start, end);
  }, [fromQuery, toQuery, startPoint, destPoint, fetchOSRMAlternativeRoutes]);

  // Initial route search trigger for initial locations
  useEffect(() => {
    if (fromQuery && toQuery && routesList.length === 0) {
      handleSearchAndDrawRoute();
    }
  }, [fromQuery, toQuery, routesList.length, handleSearchAndDrawRoute]);

  // Switch selected candidate route option
  const handleSelectRouteOption = (routeId) => {
    setSelectedRouteId(routeId);
    const selectedObj = routesList.find((r) => r.id === routeId);
    if (selectedObj && startPoint && destPoint) {
      extractBusStopsForRoute(selectedObj, startPoint, destPoint);
    }
  };

  // Handle map click when in "+ Add Stop Mode"
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e) => {
      if (!isAddingStopMode) return;

      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // Reverse geocode clicked location
      let placeName = `Stop at ${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}`);
        const data = await res.json();
        if (data.display_name) {
          const parts = data.display_name.split(",");
          placeName = parts[0] || parts[1] || placeName;
        }
      } catch (err) {
        console.warn("Reverse geocode failed:", err);
      }

      setPendingNewStop({
        lat: Number(clickLat.toFixed(5)),
        lng: Number(clickLng.toFixed(5)),
        defaultName: placeName,
      });
      setModalStopName(placeName);
      setNewStopModalOpen(true);
      setIsAddingStopMode(false);
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [isAddingStopMode]);

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

    // Combine with current stops and re-sort by pathDistance / projection
    const updatedRaw = [...stops.map((st) => ({
      ...st,
      pathDistance: projectPointOntoPolyline(st.latitude, st.longitude, coords).pathDistance,
    })), newStopObj];

    updatedRaw.sort((a, b) => a.pathDistance - b.pathDistance);

    // Recalculate order and distances
    let totalCum = 0;
    const finalStopsList = updatedRaw.map((st, idx) => {
      const prevDist = idx === 0 ? 0 : haversineDistance(updatedRaw[idx - 1].latitude, updatedRaw[idx - 1].longitude, st.latitude, st.longitude);
      totalCum += prevDist;

      return {
        order: idx + 1,
        stopName: st.stopName || st.name,
        name: st.stopName || st.name,
        latitude: st.latitude,
        longitude: st.longitude,
        distanceFromPreviousStop: Number(prevDist.toFixed(1)),
        cumulativeDistance: Number(totalCum.toFixed(1)),
        travel_time_from_prev: Math.round(prevDist * 1.8),
        offset_minutes: Math.round(totalCum * 1.8),
        source: st.source || "admin",
      };
    });

    onStopsChange(finalStopsList);
    setNewStopModalOpen(false);
    setPendingNewStop(null);
    setStatusMessage(`Added custom stop "${modalStopName.trim()}" to route at position ${finalStopsList.findIndex(s => s.latitude === pendingNewStop.lat) + 1}!`);
  };

  // Expose global window handler for route selection inside Leaflet HTML popups
  useEffect(() => {
    window.selectMapRouteOption = (id) => {
      handleSelectRouteOption(id);
    };
    return () => {
      delete window.selectMapRouteOption;
    };
  }, [handleSelectRouteOption]);

  // Render Polylines and Markers on Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersGroupRef.current.clearLayers();
    polylineGroupRef.current.clearLayers();

    if (routesList.length === 0) return;

    const routeColors = ["#2563eb", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#06b6d4", "#6366f1", "#d97706"];

    // Draw Candidate Routes with Interactive Polyline Popups
    routesList.forEach((r, idx) => {
      const isSelected = r.id === selectedRouteId;
      const color = isSelected ? "#2563eb" : routeColors[(idx + 1) % routeColors.length];

      const polyline = L.polyline(r.geometry, {
        color: color,
        weight: isSelected ? 7 : 5,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray: isSelected ? null : "8, 10",
      });

      const routePopupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px; text-align: center; min-width: 190px;">
          <div style="font-size: 11px; font-weight: 800; color: ${isSelected ? '#2563eb' : '#8b5cf6'}; text-transform: uppercase; margin-bottom: 2px;">
            ${isSelected ? '✅ Active Selected Route' : `🛣️ Candidate Route Option ${idx + 1}`}
          </div>
          <h4 style="margin: 4px 0; font-size: 14px; font-weight: 800; color: #0f172a;">${r.name}</h4>
          <p style="margin: 4px 0 10px 0; font-size: 12px; color: #475569;">
            Distance: <b>${r.distanceKm} km</b> · Est. Time: <b>${r.durationStr}</b>
          </p>
          ${!isSelected ? `
            <button
              onclick="window.selectMapRouteOption('${r.id}')"
              style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);"
            >
              Select This Road Route ✓
            </button>
          ` : `
            <span style="font-size: 12px; font-weight: 800; color: #10b981;">✓ Selected &amp; Active</span>
          `}
        </div>
      `;

      polyline.bindPopup(routePopupHtml);

      polyline.on("click", () => {
        handleSelectRouteOption(r.id);
      });

      polyline.addTo(polylineGroupRef.current);
    });

    // Fit map bounds to active polyline
    const activeRoute = routesList.find((r) => r.id === selectedRouteId);
    if (activeRoute && activeRoute.geometry.length > 0) {
      map.fitBounds(activeRoute.geometry, { padding: [40, 40] });
    }

    // Render Stop Markers
    stops.forEach((st, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === stops.length - 1;

      let iconType = "number";
      if (isStart) iconType = "start";
      else if (isEnd) iconType = "end";

      const icon = createCustomIcon(
        st.order,
        isStart ? "#10b981" : isEnd ? "#ef4444" : st.source === "admin" ? "#8b5cf6" : "#2563eb",
        iconType,
        st.source
      );

      const marker = L.marker([st.latitude, st.longitude], { icon: icon });

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 160px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 700; background: ${st.source === 'admin' ? '#8b5cf6' : '#2563eb'}; color: white; padding: 2px 6px; border-radius: 10px;">
              Stop #${st.order} (${st.source === 'admin' ? 'Admin Added' : 'Auto Detected'})
            </span>
          </div>
          <h4 style="margin: 4px 0; font-size: 14px; font-weight: 700; color: #1e293b;">${st.stopName || st.name}</h4>
          <p style="margin: 2px 0; font-size: 12px; color: #64748b;">
            Dist from Prev: <b>${st.distanceFromPreviousStop} km</b><br/>
            Cumulative: <b>${st.cumulativeDistance} km</b>
          </p>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("click", () => {
        onSelectStopIndex(idx);
      });

      marker.addTo(markersGroupRef.current);
    });
  }, [routesList, selectedRouteId, stops, onSelectStopIndex]);

  // Pan & Zoom to selected stop when clicked from table
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedStopIndex === null || !stops[selectedStopIndex]) return;

    const targetStop = stops[selectedStopIndex];
    map.setView([targetStop.latitude, targetStop.longitude], 15, { animate: true });

    markersGroupRef.current.eachLayer((layer) => {
      const latlng = layer.getLatLng();
      if (
        Math.abs(latlng.lat - targetStop.latitude) < 0.0001 &&
        Math.abs(latlng.lng - targetStop.longitude) < 0.0001
      ) {
        layer.openPopup();
      }
    });
  }, [selectedStopIndex, stops]);

  return (
    <div className="route-map-wrapper" style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      {/* Map Control Header Bar */}
      <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Navigation size={22} style={{ color: "#38bdf8" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Interactive Bus Route & Stop Selector</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Search locations, select road routes & auto-detect all Kerala passenger bus stops</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}>
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
                placeholder="e.g. Kanjirappally"
                style={{ background: "transparent", border: "none", outline: "none", color: "#ffffff", padding: "8px 0", fontSize: 13, width: "100%" }}
              />
            </div>
            {showFromDrop && fromSuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#ffffff", color: "#1e293b", borderRadius: 10, marginTop: 4, zIndex: 2000, boxShadow: "0 12px 30px rgba(0,0,0,0.25)", maxHeight: 240, overflowY: "auto", border: "1px solid #cbd5e1" }}>
                <div style={{ padding: "6px 12px", background: "#f8fafc", fontSize: 10, fontWeight: 800, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                  🌴 All Kerala Places & Transit Hubs
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
                  🌴 All Kerala Places & Transit Hubs
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

          {/* Search Button */}
          <div>
            <button
              type="button"
              onClick={handleSearchAndDrawRoute}
              disabled={loadingRoute || loadingStops}
              style={{
                width: "100%",
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
              }}
            >
              <Search size={16} />
              <span>{loadingRoute ? "Searching Route..." : "Search & Draw Route"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alternative Routes Selector Bar */}
      {routesList.length > 0 && (
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
            <Layers size={14} /> Available Road Routes:
          </span>
          {routesList.map((r, idx) => {
            const isSelected = r.id === selectedRouteId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectRouteOption(r.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: isSelected ? "#eff6ff" : "#ffffff",
                  color: isSelected ? "#1d4ed8" : "#475569",
                  transition: "all 0.2s ease",
                }}
              >
                Route {idx + 1}: {r.name} ({r.distanceKm} km, {r.durationStr})
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
                placeholder="Enter bus stop name (e.g. Manimala Junction)"
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
                Confirm & Insert Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
