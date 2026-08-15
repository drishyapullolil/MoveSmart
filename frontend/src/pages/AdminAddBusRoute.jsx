import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminHeader from "../components/AdminHeader";
import AdminFooter from "../components/AdminFooter";
import RouteMap from "../components/admin/RouteMap";
import { getStoredUser, getStoredToken } from "../utils/session";
import { addMinutesToTime, formatMinutesToDuration, calculateCumulativeOffsets } from "../utils/timeUtils";
import {
  Bus,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Route as RouteIcon,
  Shield,
  Search,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Navigation,
  Star,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Info,
  User,
  Phone,
  FileText,
  DollarSign,
  Tag,
  Wifi,
  Zap,
  RotateCcw,
} from "lucide-react";

// Major Kottayam & Neighbouring District Transit Hubs Catalog
const KERALA_TRANSIT_STOPS = [
  // Kottayam Core
  "Kottayam",
  "Kanjirappally",
  "Erumely",
  "Pala",
  "Erattupetta",
  "Ponkunnam",
  "Podimattom",
  "Manarcadu",
  "Ettumanoor",
  "Changanassery",
  "Vaikom",
  "Mundakayam",
  "Cherpunkal",
  "Bharananganam",
  "Vagamon",
  "Kumarakom",
  "Kuravilangad",
  "Kaduthuruthy",
  "Uzhavoor",
  "Pampady",
  "Poonjar",
  "Teekoy",
  "Kidangoor",

  // Pathanamthitta (Neighbouring)
  "Sabarimala",
  "Nilakkal",
  "Pampa",
  "Ranni",
  "Konni",
  "Pathanamthitta",
  "Thiruvalla",
  "Adoor",

  // Idukki (Neighbouring)
  "Kuttikkanam",
  "Peermade",
  "Kumily",
  "Thodupuzha",
  "Adimali",
  "Kattappana",

  // Alappuzha (Neighbouring)
  "Alappuzha",
  "Cherthala",
  "Chengannur",
  "Mavelikkara",
  "Kayamkulam",

  // Ernakulam (Neighbouring)
  "Kochi",
  "Aluva",
  "Angamaly",
  "Muvattupuzha",
  "Piravom",
  "Perumbavoor",
];

// Pre-configured Intercity Route Presets for Quick Auto-Fill
const defaultRoutePresets = [
  {
    id: "preset-1",
    name: "Kottayam ➔ Kanjirappally ➔ Erumely Pilgrim Express",
    fromLocation: "Kottayam",
    toLocation: "Erumely",
    price: 180,
    base_start_time: "06:15 AM",
    stopsList: [
      { name: "Kottayam", travel_time_from_prev: 0 },
      { name: "Manarcadu", travel_time_from_prev: 15 },
      { name: "Ponkunnam", travel_time_from_prev: 35 },
      { name: "Kanjirappally", travel_time_from_prev: 10 },
      { name: "Erumely", travel_time_from_prev: 25 },
    ],
  },
  {
    id: "preset-2",
    name: "Kottayam ➔ Erumely ➔ Sabarimala / Pampa Direct",
    fromLocation: "Kottayam",
    toLocation: "Pampa",
    price: 250,
    base_start_time: "05:00 AM",
    stopsList: [
      { name: "Kottayam", travel_time_from_prev: 0 },
      { name: "Kanjirappally", travel_time_from_prev: 50 },
      { name: "Erumely", travel_time_from_prev: 25 },
      { name: "Nilakkal", travel_time_from_prev: 60 },
      { name: "Pampa", travel_time_from_prev: 20 },
    ],
  },
  {
    id: "preset-3",
    name: "Kottayam ➔ Pala ➔ Erattupetta Shuttle",
    fromLocation: "Kottayam",
    toLocation: "Erattupetta",
    price: 120,
    base_start_time: "10:00 AM",
    stopsList: [
      { name: "Kottayam", travel_time_from_prev: 0 },
      { name: "Ettumanoor", travel_time_from_prev: 25 },
      { name: "Pala", travel_time_from_prev: 35 },
      { name: "Erattupetta", travel_time_from_prev: 30 },
    ],
  },
  {
    id: "preset-4",
    name: "Kottayam ➔ Mundakayam ➔ Kuttikkanam Hill Express",
    fromLocation: "Kottayam",
    toLocation: "Kuttikkanam",
    price: 200,
    base_start_time: "07:30 AM",
    stopsList: [
      { name: "Kottayam", travel_time_from_prev: 0 },
      { name: "Kanjirappally", travel_time_from_prev: 45 },
      { name: "Mundakayam", travel_time_from_prev: 20 },
      { name: "Kuttikkanam", travel_time_from_prev: 35 },
    ],
  },
  {
    id: "preset-5",
    name: "Kottayam ➔ Changanassery ➔ Thiruvalla Shuttle",
    fromLocation: "Kottayam",
    toLocation: "Thiruvalla",
    price: 90,
    base_start_time: "08:30 AM",
    stopsList: [
      { name: "Kottayam", travel_time_from_prev: 0 },
      { name: "Changanassery", travel_time_from_prev: 30 },
      { name: "Thiruvalla", travel_time_from_prev: 20 },
    ],
  },
  {
    id: "preset-6",
    name: "Kottayam ➔ Vaikom ➔ Kochi Express",
    fromLocation: "Kottayam",
    toLocation: "Kochi",
    price: 160,
    base_start_time: "07:00 AM",
    stopsList: [
      { name: "Kottayam", travel_time_from_prev: 0 },
      { name: "Ettumanoor", travel_time_from_prev: 20 },
      { name: "Vaikom", travel_time_from_prev: 40 },
      { name: "Kochi", travel_time_from_prev: 60 },
    ],
  },
];

const AVAILABLE_AMENITIES = ["Wi-Fi", "Charging Port", "Live Tracking", "AC", "Reclining Seats", "Water Bottle"];

export default function AdminAddBusRoute({ isEmbedded = false }) {
  const navigate = useNavigate();
  const [user] = useState(() => getStoredUser());

  const [activeTab, setActiveTab] = useState("routes"); // "routes" | "schedules" | "buses"

  // Feedback messages & Loading state
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lists
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [driverLeaves, setDriverLeaves] = useState([]);
  const [scheduleEditingId, setScheduleEditingId] = useState(null);

  // Search & Filter
  const [busSearch, setBusSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");

  // Custom User Presets (Saved in LocalStorage)
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem("moveSmart_customRoutePresets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal / Confirmation State
  const [confirmationModal, setConfirmationModal] = useState(null); // { type: "route" | "bus", data: object, onConfirm: fn }

  // Custom Stop Adding State
  const [showCustomStopInput, setShowCustomStopInput] = useState(false);
  const [newCustomStopName, setNewCustomStopName] = useState("");

  // ---------------- ROUTE & TIMING FORM STATE ----------------
  const [routeEditingId, setRouteEditingId] = useState(null);
  const [routeId, setRouteId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [baseStartTime, setBaseStartTime] = useState("");
  const [ratePerKm, setRatePerKm] = useState(5);
  const [fare, setFare] = useState("");
  const [status, setStatus] = useState("Active");

  // Auto-calculate Standard Fare based on ratePerKm (default ₹5/km) and total distance (distanceKm)
  useEffect(() => {
    if (distanceKm && ratePerKm > 0) {
      const calculated = Math.round(Number(distanceKm) * Number(ratePerKm));
      setFare(calculated > 0 ? calculated : 10);
    }
  }, [distanceKm, ratePerKm]);

  // Interactive Map & Detailed Bus Stop Panel States
  const [mapRouteData, setMapRouteData] = useState({
    startingPoint: { name: "", latitude: null, longitude: null },
    destination: { name: "", latitude: null, longitude: null },
    totalDistance: 0,
    estimatedTravelTime: "",
    routeGeometry: [],
    selectedRouteId: null,
  });

  const [mapStopsList, setMapStopsList] = useState([]);

  const [selectedMapStopIndex, setSelectedMapStopIndex] = useState(null);
  const [editingStopIdx, setEditingStopIdx] = useState(null);
  const [editingStopNameInput, setEditingStopNameInput] = useState("");

  // Dynamic Stop Builder list
  const [stopBuilderList, setStopBuilderList] = useState([
    { name: "", travel_time_from_prev: 0 },
    { name: "", travel_time_from_prev: 0 },
  ]);

  // Live calculation of offsets and total duration
  const { stops: computedStops, totalDurationMinutes, durationStr } = calculateCumulativeOffsets(stopBuilderList);

  // Live timeline preview start time input
  const [previewStartTime, setPreviewStartTime] = useState("");

  // ---------------- SCHEDULE DEPARTURES FORM STATE ----------------
  const [scheduleErrors, setScheduleErrors] = useState({});
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleRouteId, setScheduleRouteId] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("08:30 AM");
  const [scheduleBusId, setScheduleBusId] = useState("");
  const [scheduleDriverId, setScheduleDriverId] = useState("");
  const [scheduleDelayBuffer, setScheduleDelayBuffer] = useState(0);

  // ---------------- SCHEDULE BUS & DRIVER CONFLICT FILTERING ----------------
  const availableBusesForSchedule = useMemo(() => {
    if (!scheduleStartTime) return buses;
    const normStart = scheduleStartTime.trim().toLowerCase().replace(/^0/, "");

    // Find all bus IDs already assigned to a schedule at this exact departure time
    const busyBusIds = new Set(
      schedules
        .filter((s) => (s.start_time || "").trim().toLowerCase().replace(/^0/, "") === normStart)
        .map((s) => {
          if (typeof s.bus_id === "object" && s.bus_id?._id) return String(s.bus_id._id);
          return String(s.bus_id || s.busNumber || "");
        })
        .filter(Boolean)
    );

    return buses.filter((b) => {
      const bId = String(b._id || b.id || "");
      const bNum = String(b.busNumber || "");
      return !busyBusIds.has(bId) && !busyBusIds.has(bNum);
    });
  }, [buses, schedules, scheduleStartTime]);

  const availableDriversForSchedule = useMemo(() => {
    const normStart = scheduleStartTime ? scheduleStartTime.trim().toLowerCase().replace(/^0/, "") : "";

    // Find all driver IDs / names assigned to a schedule at this exact departure time
    const busyDriverIds = new Set(
      schedules
        .filter((s) => normStart && (s.start_time || "").trim().toLowerCase().replace(/^0/, "") === normStart)
        .map((s) => {
          if (typeof s.driver_id === "object" && s.driver_id?._id) return String(s.driver_id._id);
          return String(s.driver_id || s.driverName || "");
        })
        .filter(Boolean)
    );

    // Find all driver IDs / names / emails with APPROVED LEAVE
    const onLeaveIdentifiers = new Set();
    driverLeaves.forEach((lv) => {
      const isApproved = lv.status?.toLowerCase() === "approved" || lv.leaveStatus?.toLowerCase() === "approved";
      if (isApproved) {
        if (lv.driverId) onLeaveIdentifiers.add(String(lv.driverId));
        if (lv.driverName) onLeaveIdentifiers.add(String(lv.driverName).toLowerCase().trim());
        if (lv.driverEmail) onLeaveIdentifiers.add(String(lv.driverEmail).toLowerCase().trim());
      }
    });

    return driversList.filter((d) => {
      const dId = String(d._id || d.id || "");
      const dName = String(d.name || "").toLowerCase().trim();
      const dEmail = String(d.email || "").toLowerCase().trim();

      const isBusy = busyDriverIds.has(dId) || busyDriverIds.has(dName);
      const isOnApprovedLeave = onLeaveIdentifiers.has(dId) || onLeaveIdentifiers.has(dName) || onLeaveIdentifiers.has(dEmail);

      return !isBusy && !isOnApprovedLeave;
    });
  }, [driversList, schedules, scheduleStartTime, driverLeaves]);

  // ---------------- BUS FORM STATE ----------------
  const [busEditingId, setBusEditingId] = useState(null);
  const [selectedDriverOption, setSelectedDriverOption] = useState("unassigned");
  const [selectedRouteOption, setSelectedRouteOption] = useState("");

  const [busForm, setBusForm] = useState({
    busNumber: "",
    busName: "",
    busType: "Normal Bus",
    operator: "MoveSmart Fleet Ops",
    fromLocation: "",
    toLocation: "",
    departureTime: "",
    arrivalTime: "",
    duration: "",
    totalSeats: 32,
    price: "",
    amenities: [],
    driverName: "",
    driverPhone: "",
    driverLicense: "",
    driverId: "",
    driverPhoto: "",
    driverVerified: false,
    driverExperience: 0,
    stops: "",
  });

  const isGenericDriverName = (n) => {
    if (!n) return true;
    const s = String(n).toLowerCase().trim();
    return (
      ["unassigned", "not assigned", "driver assigned", "assigned driver", "driver user", "driver", "n/a", "none"].includes(s) ||
      s.includes("unassigned") ||
      s.includes("not assigned") ||
      s.includes("replacement driver required")
    );
  };

  // Combined list of DB drivers + any drivers assigned to existing buses
  const combinedDriversList = useMemo(() => {
    const list = [...driversList];
    const seenIds = new Set(list.map((d) => String(d._id || d.id)));
    const seenNames = new Set(list.map((d) => String(d.name).toLowerCase().trim()));

    buses.forEach((b) => {
      const bDrvName = (b.driverName || "").trim();
      const bDrvId = b.driverId ? String(b.driverId) : null;

      if (!isGenericDriverName(bDrvName) && !seenNames.has(bDrvName.toLowerCase())) {
        const newId = bDrvId && bDrvId.match(/^[0-9a-fA-F]{24}$/) ? bDrvId : `bus-drv-${b._id || b.id}`;
        if (!seenIds.has(newId)) {
          seenIds.add(newId);
          seenNames.add(bDrvName.toLowerCase());
          list.push({
            id: newId,
            _id: newId,
            name: bDrvName,
            phone: b.driverPhone || "N/A",
            licenseNumber: b.driverLicense || "N/A",
            experienceYears: b.driverExperience || 0,
            verificationStatus: b.driverVerified ? "Approved" : "Unverified",
            profilePic: b.driverPhoto || "",
            isDbDriver: false,
          });
        }
      }
    });

    return list;
  }, [driversList, buses]);

  // Unassigned drivers from database (hides drivers already assigned to active fleet buses by ID only)
  const availableUnassignedDrivers = useMemo(() => {
    // Gather MongoDB IDs of drivers currently assigned to registered buses (excluding current editing bus)
    // We use ID-ONLY matching to avoid false exclusions based on name matching.
    const assignedIds = new Set(
      buses
        .filter((b) => !busEditingId || String(b._id || b.id) !== String(busEditingId))
        .map((b) => (b.driverId ? String(b.driverId) : null))
        .filter((id) => id && id !== "null" && id !== "undefined" && id.match(/^[0-9a-fA-F]{24}$/))
    );

    return combinedDriversList.filter((d) => {
      const dId = String(d._id || d.id || "");
      // Only exclude if we have a real MongoDB ObjectId match — never exclude by name alone
      const isAssignedById = dId && assignedIds.has(dId);
      return !isAssignedById;
    });
  }, [combinedDriversList, buses, busEditingId]);

  // Driver options to display in dropdown — all drivers, with assigned ones labelled clearly
  const dropdownDriverOptions = useMemo(() => {
    // Build set of IDs already assigned to other buses
    const assignedIds = new Set(
      buses
        .filter((b) => !busEditingId || String(b._id || b.id) !== String(busEditingId))
        .map((b) => (b.driverId ? String(b.driverId) : null))
        .filter((id) => id && id !== "null" && id !== "undefined" && id.match(/^[0-9a-fA-F]{24}$/))
    );

    // Build map of driverId -> bus name for labelling assigned drivers
    const assignedToBus = {};
    buses
      .filter((b) => !busEditingId || String(b._id || b.id) !== String(busEditingId))
      .forEach((b) => {
        if (b.driverId && String(b.driverId).match(/^[0-9a-fA-F]{24}$/)) {
          assignedToBus[String(b.driverId)] = b.busName || b.busNumber || "a bus";
        }
      });

    return combinedDriversList.map((d) => ({
      ...d,
      isAssigned: assignedIds.has(String(d._id || d.id || "")),
      assignedBusName: assignedToBus[String(d._id || d.id || "")] || null,
    }));
  }, [combinedDriversList, buses, busEditingId]);

  // Validation Errors State
  const [routeErrors, setRouteErrors] = useState({});
  const [busErrors, setBusErrors] = useState({});

  // Combine default and custom presets
  const allPresets = useMemo(() => [...defaultRoutePresets, ...customPresets], [customPresets]);

  // Save custom presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("moveSmart_customRoutePresets", JSON.stringify(customPresets));
    } catch (err) {
      console.warn("Failed to persist custom presets:", err);
    }
  }, [customPresets]);

  // ---------------- VERIFY ADMIN ACCESS & INITIAL FETCH ----------------
  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== "admin") {
      localStorage.setItem(
        "moveSmart_loginWarning",
        "Admin access required. Please sign in with an administrator account."
      );
      navigate("/login");
    } else {
      fetchBuses();
      fetchRoutes();
      fetchSchedules();
      fetchDrivers();
      fetchDriverLeaves();
    }
  }, [user, navigate]);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }
    setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 5000);
  };

  const fetchDriverLeaves = async () => {
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get("/api/admin/leaves", { headers, timeout: 8000 });
      if (res.data && res.data.leaves && Array.isArray(res.data.leaves)) {
        setDriverLeaves(res.data.leaves);
      }
    } catch (err) {
      console.warn("Could not fetch driver leaves for schedule assignment:", err.message);
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get("/api/admin/drivers", { headers, timeout: 8000 });
      if (res.data && res.data.drivers && Array.isArray(res.data.drivers)) {
        const dbDrivers = res.data.drivers
          // Safety filter: only show users whose role is strictly 'driver'
          .filter((d) => String(d.role || "").toLowerCase().trim() === "driver")
          .map((d) => ({
            id: d._id || d.id,
            _id: d._id || d.id,
            name: d.name || "Driver User",
            phone: d.phone || "N/A",
            licenseNumber: d.licenseNumber || "N/A",
            experienceYears: d.experienceYears || 0,
            verificationStatus: d.verificationStatus || "Approved",
            profilePic: d.profilePic || "",
            isDbDriver: true,
          }));
        setDriversList(dbDrivers);
      } else {
        setDriversList([]);
      }
    } catch (err) {
      console.warn("Error fetching driver users from database:", err.message);
      setDriversList([]);
    }
  };

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/buses");
      if (res.data.success) {
        setBuses(res.data.buses || []);
      }
    } catch (err) {
      console.error("Error fetching buses:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await axios.get("/api/admin/routes");
      if (res.data.success) {
        setRoutes(res.data.routes || []);
        if (!scheduleRouteId && res.data.routes.length > 0) {
          setScheduleRouteId(res.data.routes[0]._id);
        }
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  const fetchSchedules = async () => {
    try {
      setSchedulesLoading(true);
      const res = await axios.get("/api/admin/schedules");
      if (res.data.success) {
        setSchedules(res.data.schedules || []);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
      showNotification("Failed to fetch departure schedules: " + (err.response?.data?.message || err.message), true);
    } finally {
      setSchedulesLoading(false);
    }
  };

  // ---------------- STOP BUILDER HANDLERS ----------------

  const handleAddStop = () => {
    // Find first unused stop from catalog
    const usedStopNames = new Set(stopBuilderList.map((st) => st.name.toLowerCase()));
    const nextAvailableStop = KERALA_TRANSIT_STOPS.find((s) => !usedStopNames.has(s.toLowerCase())) || "Intermediate Stop";

    setStopBuilderList((prev) => [
      ...prev,
      { name: nextAvailableStop, travel_time_from_prev: 30 },
    ]);
  };

  const handleRemoveStop = (index) => {
    if (stopBuilderList.length <= 2) {
      showNotification("Route must contain at least 2 stops (Source and Destination).", true);
      return;
    }
    setStopBuilderList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStopChange = (index, field, value) => {
    setStopBuilderList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "travel_time_from_prev" ? Math.max(0, Number(value) || 0) : value,
      };

      if (index === 0 && field === "name") setFromLocation(value);
      if (index === updated.length - 1 && field === "name") setToLocation(value);

      return updated;
    });
  };

  const handleMoveStop = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === stopBuilderList.length - 1)) return;
    setStopBuilderList((prev) => {
      const updated = [...prev];
      const targetIndex = index + direction;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      updated[0].travel_time_from_prev = 0;

      setFromLocation(updated[0].name);
      setToLocation(updated[updated.length - 1].name);

      return updated;
    });
  };

  const handleAddCustomStopToCatalog = () => {
    if (!newCustomStopName.trim()) return;
    const cleanName = newCustomStopName.trim();
    if (!KERALA_TRANSIT_STOPS.includes(cleanName)) {
      KERALA_TRANSIT_STOPS.push(cleanName);
    }
    setNewCustomStopName("");
    setShowCustomStopInput(false);
    showNotification(`Custom stop "${cleanName}" added to stop catalog!`);
  };

  // ---------------- PRESET HANDLERS ----------------

  const handlePresetSelect = (presetObj) => {
    if (!presetObj) return;

    setRouteId(`RT-MS-${Math.floor(100 + Math.random() * 900)}`);
    setRouteName(presetObj.name);
    setFromLocation(presetObj.fromLocation);
    setToLocation(presetObj.toLocation);
    setFare(presetObj.price);
    setBaseStartTime(presetObj.base_start_time || "08:00 AM");
    setPreviewStartTime(presetObj.base_start_time || "08:00 AM");
    setStopBuilderList(presetObj.stopsList.map((s) => ({ ...s })));

    let cumDist = 0;
    let cumTime = 0;
    const formattedPresetStops = presetObj.stopsList.map((s, idx) => {
      const prevTime = s.travel_time_from_prev || 0;
      cumTime += prevTime;
      const prevDist = idx === 0 ? 0 : Number((prevTime * 0.6).toFixed(1));
      cumDist += prevDist;
      return {
        order: idx + 1,
        stopName: s.name,
        name: s.name,
        latitude: null,
        longitude: null,
        distanceFromPreviousStop: prevDist,
        cumulativeDistance: Number(cumDist.toFixed(1)),
        travel_time_from_prev: prevTime,
        offset_minutes: cumTime,
        source: "preset",
      };
    });
    setMapStopsList(formattedPresetStops);
    if (cumDist > 0) setDistanceKm(Number(cumDist.toFixed(1)));
    showNotification(`Loaded preset: ${presetObj.name}`);
  };

  const handleSaveCustomPreset = () => {
    if (stopBuilderList.length < 2) {
      showNotification("Cannot save preset with less than 2 stops.", true);
      return;
    }
    const generatedName = `${stopBuilderList[0].name} ➔ ${stopBuilderList[stopBuilderList.length - 1].name} (${durationStr})`;
    const customTitle = window.prompt("Enter a title for this custom route preset:", generatedName);
    if (!customTitle) return;

    const newPreset = {
      id: `custom-${Date.now()}`,
      name: customTitle.trim(),
      fromLocation: stopBuilderList[0].name,
      toLocation: stopBuilderList[stopBuilderList.length - 1].name,
      price: fare,
      base_start_time: baseStartTime,
      stopsList: stopBuilderList.map((s) => ({ ...s })),
      isCustom: true,
    };

    setCustomPresets((prev) => [newPreset, ...prev]);
    showNotification("Custom route preset saved to your browser! 💾");
  };

  const handleDeleteCustomPreset = (id, e) => {
    e.stopPropagation();
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    showNotification("Custom preset deleted.");
  };

  // ---------------- ROUTE SUBMIT HANDLER WITH CONFIRMATION ----------------

  const validateRouteForm = () => {
    const errs = {};
    if (!routeId.trim()) errs.routeId = "Route ID Code is required (e.g. RT-101)";
    const activeStops = mapStopsList.length > 0 ? mapStopsList : computedStops;
    if (activeStops.length < 2) errs.stops = "At least 2 stops (Starting Point & Destination) are required.";

    // Check duplicate stop names
    const names = activeStops.map((s) => (s.stopName || s.name || "").trim().toLowerCase()).filter(Boolean);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errs.stops = `Duplicate stop found: "${duplicates[0]}". Each stop along the route must be unique.`;
    }

    if (names[0] && names[names.length - 1] && names[0] === names[names.length - 1]) {
      errs.stops = "Starting point and Destination stops cannot be identical.";
    }

    setRouteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRouteSubmitClick = (e) => {
    e.preventDefault();
    if (!validateRouteForm()) {
      showNotification("Please resolve form validation errors before saving.", true);
      return;
    }

    const activeStops = mapStopsList.length > 0 ? mapStopsList : computedStops;
    const startStop = activeStops[0];
    const destStop = activeStops[activeStops.length - 1];

    const startName = startStop.stopName || startStop.name || fromLocation;
    const destName = destStop.stopName || destStop.name || toLocation;

    const payload = {
      routeId: routeId.trim().toUpperCase(),
      routeName: routeName.trim() || `${startName} ➔ ${destName}`,
      fromLocation: startName,
      toLocation: destName,
      startingPoint: mapRouteData.startingPoint || { name: startName, latitude: startStop.latitude, longitude: startStop.longitude },
      destination: mapRouteData.destination || { name: destName, latitude: destStop.latitude, longitude: destStop.longitude },
      routeGeometry: mapRouteData.routeGeometry || [],
      totalDistance: Number(distanceKm) || mapRouteData.totalDistance || 35.4,
      distanceKm: Number(distanceKm) || mapRouteData.totalDistance || 35.4,
      duration: mapRouteData.estimatedTravelTime || durationStr,
      estimatedTravelTime: mapRouteData.estimatedTravelTime || durationStr,
      total_duration_minutes: totalDurationMinutes,
      base_start_time: baseStartTime,
      fare: Number(fare) || 120,
      status,
      stops: activeStops.map((st, idx) => ({
        order: idx + 1,
        stopName: st.stopName || st.name,
        name: st.stopName || st.name,
        latitude: st.latitude,
        longitude: st.longitude,
        distanceFromPreviousStop: st.distanceFromPreviousStop || 0,
        cumulativeDistance: st.cumulativeDistance || 0,
        travel_time_from_prev: st.travel_time_from_prev || 0,
        offset_minutes: st.offset_minutes || 0,
        source: st.source || "automatic",
      })),
    };

    // Trigger Confirmation Modal
    setConfirmationModal({
      type: "route",
      title: routeEditingId ? "Confirm Route Update" : "Confirm Route Registration",
      data: payload,
      onConfirm: () => executeRouteSubmit(payload),
    });
  };

  const executeRouteSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      if (routeEditingId) {
        const res = await axios.put(`/api/admin/routes/${routeEditingId}`, payload);
        showNotification(res.data.message || "Route & timing configuration updated!");
        setRouteEditingId(null);
      } else {
        const res = await axios.post("/api/admin/routes", payload);
        showNotification(res.data.message || "Offset Route registered successfully! 🛣️");
      }
      resetRouteForm();
      fetchRoutes();
      setConfirmationModal(null);
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to save route details", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRoute = (route) => {
    setRouteEditingId(route._id);
    setRouteId(route.routeId || "");
    setRouteName(route.routeName || "");
    setFromLocation(route.fromLocation || "");
    setToLocation(route.toLocation || "");
    setDistanceKm(route.distanceKm || 0);
    setBaseStartTime(route.base_start_time || "");
    setPreviewStartTime(route.base_start_time || "");
    setFare(route.fare || "");
    setStatus(route.status || "Active");

    if (route.stops && route.stops.length > 0 && typeof route.stops[0] === "object") {
      setStopBuilderList(
        route.stops.map((st) => ({
          name: st.name,
          travel_time_from_prev: st.travel_time_from_prev || 0,
        }))
      );
    } else if (Array.isArray(route.stops) && route.stops.length > 0) {
      setStopBuilderList(
        route.stops.map((stName, idx) => ({
          name: stName,
          travel_time_from_prev: idx === 0 ? 0 : 0,
        }))
      );
    }

    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleToggleRoute = async (id, currentStatus) => {
    const action = currentStatus === "Active" ? "suspend" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this route? Its associated departure schedules will still exist but won't serve passengers while suspended.`)) return;
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.patch(`/api/admin/routes/${id}/toggle`, {}, { headers });
      showNotification(res.data.message || `Route ${action}d successfully.`);
      fetchRoutes();
      fetchSchedules();
    } catch (err) {
      showNotification(err.response?.data?.message || `Failed to ${action} route`, true);
    }
  };

  const resetRouteForm = () => {
    setRouteEditingId(null);
    setRouteId("");
    setRouteName("");
    setFromLocation("");
    setToLocation("");
    setDistanceKm("");
    setBaseStartTime("");
    setPreviewStartTime("");
    setFare("");
    setStatus("Active");
    setRouteErrors({});
    setStopBuilderList([
      { name: "", travel_time_from_prev: 0 },
      { name: "", travel_time_from_prev: 0 },
    ]);
    setMapStopsList([]);
    setMapRouteData({
      startingPoint: { name: "", latitude: null, longitude: null },
      destination: { name: "", latitude: null, longitude: null },
      totalDistance: 0,
      estimatedTravelTime: "",
      routeGeometry: [],
      selectedRouteId: null,
    });
  };

  // ---------------- SCHEDULE DEPARTURES HANDLERS ----------------

  const checkDuplicateTime = (timeStr, excludeId = null) => {
    if (!timeStr) return null;
    try {
      const normalizedNew = addMinutesToTime(timeStr, 0);

      const duplicate = schedules.find((s) => {
        if (excludeId && String(s._id || s.id) === String(excludeId)) {
          return false;
        }
        return addMinutesToTime(s.start_time, 0) === normalizedNew;
      });

      if (duplicate) {
        return "A route is already scheduled at this time. Please select a different time.";
      }
    } catch (e) {
      // Incomplete or unparseable time format, ignore until it is typed completely
    }
    return null;
  };

  useEffect(() => {
    if (!scheduleStartTime) {
      setScheduleErrors((prev) => ({ ...prev, startTime: "" }));
      return;
    }

    const cleanStr = scheduleStartTime.trim().toUpperCase();
    const hasCol = cleanStr.includes(":");
    const hasPeriod = cleanStr.includes("AM") || cleanStr.includes("PM");

    if (hasCol && hasPeriod) {
      const dupMsg = checkDuplicateTime(scheduleStartTime, scheduleEditingId);
      if (dupMsg) {
        setScheduleErrors((prev) => ({ ...prev, startTime: dupMsg }));
      } else {
        setScheduleErrors((prev) => ({ ...prev, startTime: "" }));
      }
    } else {
      setScheduleErrors((prev) => ({ ...prev, startTime: "" }));
    }
  }, [scheduleStartTime, scheduleEditingId, schedules]);

  const handleSwitchToSchedulesTab = () => {
    setActiveTab("schedules");
    if (!scheduleRouteId && routes.length > 0) {
      setScheduleRouteId(routes[0]._id);
    }
    fetchSchedules();
  };

  const validateScheduleForm = () => {
    const errs = {};
    if (!scheduleRouteId) errs.route = "Please select a route for this schedule.";
    if (!scheduleStartTime.trim()) {
      errs.startTime = "Departure Start Time is required.";
    } else {
      const duplicateMsg = checkDuplicateTime(scheduleStartTime, scheduleEditingId);
      if (duplicateMsg) {
        errs.startTime = duplicateMsg;
      }
    }
    setScheduleErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleScheduleBusSelect = (busIdVal) => {
    setScheduleBusId(busIdVal);
    if (!busIdVal) return;

    const selectedBusObj = buses.find((b) => String(b._id || b.id) === String(busIdVal));
    if (selectedBusObj) {
      const linkedDriver = driversList.find(
        (d) =>
          (selectedBusObj.driverId && String(d._id || d.id) === String(selectedBusObj.driverId)) ||
          (selectedBusObj.driverName && String(d.name).toLowerCase().trim() === String(selectedBusObj.driverName).toLowerCase().trim())
      );

      if (linkedDriver) {
        setScheduleDriverId(String(linkedDriver._id || linkedDriver.id));
      } else {
        setScheduleDriverId("");
      }

      const linkedRoute = routes.find(
        (r) =>
          String(r._id) === String(selectedBusObj.route_id) ||
          (selectedBusObj.routeName && String(r.routeName).toLowerCase().trim() === String(selectedBusObj.routeName).toLowerCase().trim()) ||
          (selectedBusObj.fromLocation && selectedBusObj.toLocation &&
            selectedBusObj.fromLocation.toLowerCase() === r.fromLocation.toLowerCase() &&
            selectedBusObj.toLocation.toLowerCase() === r.toLocation.toLowerCase())
      );

      if (linkedRoute) {
        setScheduleRouteId(String(linkedRoute._id));
      }

      const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(n).toLowerCase().trim());
      const driverNameDisp = linkedDriver?.name || (!isGeneric(selectedBusObj.driverName) ? selectedBusObj.driverName : "Unassigned");
      const routeNameDisp = linkedRoute?.routeName || selectedBusObj.routeName || "Assigned Route";
      showNotification(`⚡ Bus ${selectedBusObj.busNumber} (${selectedBusObj.busName}) selected! Assigned Driver: "${driverNameDisp}" & Route: "${routeNameDisp}" 🚌`);
    }
  };

  const handleScheduleRouteSelect = (routeIdVal) => {
    setScheduleRouteId(routeIdVal);
    if (!routeIdVal) return;

    const selectedRouteObj = routes.find((r) => String(r._id) === String(routeIdVal));
    if (selectedRouteObj) {
      const linkedBus = buses.find(
        (b) =>
          String(b.route_id) === String(selectedRouteObj._id) ||
          (b.routeName && String(b.routeName).toLowerCase().trim() === String(selectedRouteObj.routeName).toLowerCase().trim()) ||
          (b.fromLocation && b.toLocation &&
            b.fromLocation.toLowerCase() === selectedRouteObj.fromLocation.toLowerCase() &&
            b.toLocation.toLowerCase() === selectedRouteObj.toLocation.toLowerCase())
      );

      if (linkedBus) {
        setScheduleBusId(String(linkedBus._id || linkedBus.id));
        const linkedDriver = driversList.find(
          (d) =>
            (linkedBus.driverId && String(d._id || d.id) === String(linkedBus.driverId)) ||
            (linkedBus.driverName && String(d.name).toLowerCase().trim() === String(linkedBus.driverName).toLowerCase().trim())
        );
        if (linkedDriver) {
          setScheduleDriverId(String(linkedDriver._id || linkedDriver.id));
        } else {
          setScheduleDriverId("");
        }
      }
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!validateScheduleForm()) return;

    const selectedBus = buses.find((b) => String(b._id || b.id) === String(scheduleBusId));
    const selectedDriver = driversList.find((d) => String(d._id || d.id) === String(scheduleDriverId));

    const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(n).toLowerCase().trim());
    const driverNameFinal = selectedDriver?.name || (!isGeneric(selectedBus?.driverName) ? selectedBus.driverName : "Not Assigned");
    const driverIdFinal = selectedDriver?._id || selectedDriver?.id || (selectedBus?.driverId ? selectedBus.driverId : null);

    const payload = {
      route_id: scheduleRouteId,
      start_time: scheduleStartTime,
      bus_id: scheduleBusId || null,
      busNumber: selectedBus?.busNumber || "",
      driver_id: driverIdFinal,
      driverName: driverNameFinal,
      delay_buffer_minutes: Number(scheduleDelayBuffer) || 0,
      is_active: true,
    };

    try {
      setIsSubmitting(true);
      if (scheduleEditingId) {
        const res = await axios.put(`/api/admin/schedules/${scheduleEditingId}`, payload);
        showNotification(res.data.message || "Departure schedule updated successfully!");
        setScheduleEditingId(null);
      } else {
        const res = await axios.post("/api/admin/schedules", payload);
        showNotification(res.data.message || "Departure schedule created!");
      }
      fetchSchedules();
      setScheduleStartTime("08:30 AM");
      setScheduleErrors({});
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to save schedule departure", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSchedule = (sch) => {
    setScheduleEditingId(sch._id);
    const rId = typeof sch.route_id === "object" ? sch.route_id._id : sch.route_id || "";
    setScheduleRouteId(rId);
    setScheduleStartTime(sch.start_time || "08:30 AM");
    setScheduleDelayBuffer(sch.delay_buffer_minutes || 0);

    if (sch.bus_id) {
      setScheduleBusId(typeof sch.bus_id === "object" ? sch.bus_id._id : sch.bus_id);
    }
    if (sch.driver_id) {
      setScheduleDriverId(typeof sch.driver_id === "object" ? sch.driver_id._id : sch.driver_id);
    }

    showNotification(`✏️ Editing schedule at ${sch.start_time}. Update fields above and click Save ✓`);
  };

  const handleCancelScheduleEdit = () => {
    setScheduleEditingId(null);
    setScheduleStartTime("08:30 AM");
    setScheduleDelayBuffer(0);
    setScheduleErrors({});
    showNotification("Cancelled schedule editing mode.");
  };

  const handleToggleSchedule = async (id, currentlyActive) => {
    const action = currentlyActive ? "disable" : "enable";
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.patch(`/api/admin/schedules/${id}/toggle`, {}, { headers });
      showNotification(res.data.message || `Schedule ${action}d successfully.`);
      fetchSchedules();
    } catch (err) {
      showNotification(err.response?.data?.message || `Failed to ${action} schedule`, true);
    }
  };

  // ---------------- BUS FORM HANDLERS & AUTO-FILL ----------------

  // Driver Dropdown Auto-Fill Handler
  const handleDriverSelectChange = (driverIdVal) => {
    setSelectedDriverOption(driverIdVal);
    if (!driverIdVal || driverIdVal === "unassigned") {
      setBusForm((prev) => ({
        ...prev,
        driverName: "Not Assigned",
        driverPhone: "N/A",
        driverLicense: "N/A",
        driverExperience: 0,
        driverId: null,
      }));
      return;
    }
    const driverObj = driversList.find((d) => String(d._id || d.id) === String(driverIdVal));
    if (driverObj) {
      setBusForm((prev) => ({
        ...prev,
        driverName: driverObj.name,
        driverPhone: driverObj.phone || "N/A",
        driverLicense: driverObj.licenseNumber || "N/A",
        driverExperience: driverObj.experienceYears || 0,
        driverId: driverObj._id || driverObj.id,
      }));
    }
  };

  // Route Dropdown Auto-Fill Handler
  const handleRouteSelectChangeForBus = (routeIdVal) => {
    setSelectedRouteOption(routeIdVal);
    const routeObj = routes.find((r) => r._id === routeIdVal);
    if (routeObj) {
      const depTime = routeObj.base_start_time || "";
      const arrTime = depTime ? addMinutesToTime(depTime, routeObj.total_duration_minutes || 120) : "";
      const stopsStr = Array.isArray(routeObj.stops)
        ? routeObj.stops.map((s) => (typeof s === "object" ? s.name : s)).join(", ")
        : `${routeObj.fromLocation}, ${routeObj.toLocation}`;

      setBusForm((prev) => ({
        ...prev,
        fromLocation: routeObj.fromLocation || "",
        toLocation: routeObj.toLocation || "",
        duration: routeObj.duration || "",
        price: routeObj.fare || "",
        departureTime: depTime,
        arrivalTime: arrTime,
        stops: stopsStr,
      }));
      showNotification(`Auto-filled bus specs from route "${routeObj.routeName}"!`);
    }
  };

  // Toggle Amenity Checkbox
  const handleAmenityToggle = (amenityName) => {
    setBusForm((prev) => {
      const current = prev.amenities || [];
      const updated = current.includes(amenityName)
        ? current.filter((a) => a !== amenityName)
        : [...current, amenityName];
      return { ...prev, amenities: updated };
    });
  };

  const validateBusForm = () => {
    const errs = {};
    if (!busForm.busNumber.trim()) errs.busNumber = "Number Plate Number (Bus Reg) is required (e.g. KL-07-MS-1008)";
    if (!busForm.busName.trim()) errs.busName = "Bus Name is required";
    if (Number(busForm.totalSeats) < 1) errs.totalSeats = "Seat capacity must be at least 1";
    setBusErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBusSubmitClick = (e) => {
    e.preventDefault();
    if (!validateBusForm()) {
      showNotification("Please resolve bus form validation errors.", true);
      return;
    }

    setConfirmationModal({
      type: "bus",
      title: busEditingId ? "Confirm Bus Specifications Update" : "Confirm Fleet Bus Registration",
      data: busForm,
      onConfirm: () => executeBusSubmit(),
    });
  };

  const executeBusSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (busEditingId) {
        const res = await axios.put(`/api/admin/buses/${busEditingId}`, busForm);
        showNotification(res.data.message || "Bus updated successfully!");
        setBusEditingId(null);
      } else {
        const res = await axios.post("/api/admin/buses", busForm);
        showNotification(res.data.message || "New bus registered in fleet! 🎉");
      }
      resetBusForm();
      fetchBuses();
      setConfirmationModal(null);
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to save bus details", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBusForm = () => {
    setBusEditingId(null);
    setSelectedRouteOption("");
    setSelectedDriverOption("unassigned");
    setBusErrors({});
    setBusForm({
      busNumber: "",
      busName: "",
      busType: "Normal Bus",
      operator: "MoveSmart Fleet Ops",
      fromLocation: "",
      toLocation: "",
      departureTime: "",
      arrivalTime: "",
      duration: "",
      totalSeats: 32,
      price: "",
      amenities: [],
      driverName: "",
      driverPhone: "",
      driverLicense: "",
      driverId: null,
      driverPhoto: "",
      driverVerified: false,
      driverExperience: 0,
      stops: "",
    });
  };

  const handleEditBus = (bus) => {
    const isGenericName = (n) => !n || ["unassigned", "not assigned", "driver assigned", "assigned driver", "driver user", "driver"].includes(String(n).toLowerCase().trim());
    const validDriverId = bus.driverId && String(bus.driverId).match(/^[0-9a-fA-F]{24}$/) ? String(bus.driverId) : null;
    const resolvedDriverName = !isGenericName(bus.driverName) ? bus.driverName : "Not Assigned";

    const matchedDriver = combinedDriversList.find(
      (d) =>
        (validDriverId && String(d._id || d.id) === validDriverId) ||
        (!isGenericName(bus.driverName) && String(d.name).toLowerCase().trim() === String(bus.driverName).toLowerCase().trim())
    );

    const driverIdToUse = matchedDriver ? String(matchedDriver._id || matchedDriver.id) : validDriverId;

    setBusEditingId(bus._id);
    setBusForm({
      busNumber: bus.busNumber || "",
      busName: bus.busName || "",
      busType: bus.busType || "Normal Bus",
      operator: bus.operator || "MoveSmart Fleet Ops",
      fromLocation: bus.fromLocation || "",
      toLocation: bus.toLocation || "",
      departureTime: bus.departureTime || "",
      arrivalTime: bus.arrivalTime || "",
      duration: bus.duration || "",
      totalSeats: bus.totalSeats || 32,
      price: bus.price || "",
      amenities: bus.amenities || [],
      driverName: matchedDriver ? matchedDriver.name : resolvedDriverName,
      driverPhone: matchedDriver?.phone || bus.driverPhone || "",
      driverLicense: matchedDriver?.licenseNumber || bus.driverLicense || "",
      driverId: driverIdToUse,
      driverPhoto: matchedDriver?.profilePic || bus.driverPhoto || "",
      driverVerified: matchedDriver ? matchedDriver.verificationStatus === "Approved" : Boolean(bus.driverVerified),
      driverExperience: matchedDriver?.experienceYears || bus.driverExperience || 0,
      stops: Array.isArray(bus.stops) ? bus.stops.join(", ") : (bus.stops || ""),
    });

    if (driverIdToUse) {
      setSelectedDriverOption(driverIdToUse);
    } else {
      setSelectedDriverOption("unassigned");
    }
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleToggleBus = async (id, currentlyActive) => {
    const action = currentlyActive ? "deactivate" : "activate";
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.patch(`/api/admin/buses/${id}/toggle`, {}, { headers });
      showNotification(res.data.message || `Bus ${action}d successfully.`);
      fetchBuses();
    } catch (err) {
      showNotification(err.response?.data?.message || `Failed to ${action} bus`, true);
    }
  };

  // Filtered lists for search with safe property access
  const safeBusQuery = (busSearch || "").toLowerCase().trim();
  const filteredBuses = buses.filter(
    (b) =>
      !safeBusQuery ||
      (b.busName || "").toLowerCase().includes(safeBusQuery) ||
      (b.busNumber || "").toLowerCase().includes(safeBusQuery) ||
      (b.fromLocation || "").toLowerCase().includes(safeBusQuery) ||
      (b.toLocation || "").toLowerCase().includes(safeBusQuery) ||
      (b.driverName || "").toLowerCase().includes(safeBusQuery) ||
      (b.busType || "").toLowerCase().includes(safeBusQuery)
  );

  const safeRouteQuery = (routeSearch || "").toLowerCase().trim();
  const filteredRoutes = routes.filter(
    (r) =>
      !safeRouteQuery ||
      (r.routeName || "").toLowerCase().includes(safeRouteQuery) ||
      (r.routeId || "").toLowerCase().includes(safeRouteQuery) ||
      (r.fromLocation || "").toLowerCase().includes(safeRouteQuery) ||
      (r.toLocation || "").toLowerCase().includes(safeRouteQuery)
  );

  const mainContent = (
    <div style={{ maxWidth: isEmbedded ? "100%" : "1380px", margin: "0 auto", padding: isEmbedded ? "0" : "28px 24px", flex: 1, width: "100%" }}>

      {/* Notifications */}
      {successMsg && (
        <div style={{ padding: "14px 18px", borderRadius: "12px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: "14px 18px", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fecdd3", color: "#b91c1c", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Guided Linear Flow Step Banner */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", color: "#ffffff", padding: "16px 20px", borderRadius: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Guided Setup Workflow:
          </div>

          <div
            onClick={() => setActiveTab("routes")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: activeTab === "routes" ? "#0ea5e9" : "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ffffff", color: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>1</span>
            <span>Define Route &amp; Offsets</span>
            {routes.length > 0 && <Check size={14} style={{ color: "#4ade80" }} />}
          </div>

          <ArrowRight size={14} style={{ color: "rgba(255,255,255,0.3)" }} />

          <div
            onClick={handleSwitchToSchedulesTab}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: activeTab === "schedules" ? "#8b5cf6" : "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ffffff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>2</span>
            <span>Add Departure Schedules</span>
            {schedules.length > 0 && <Check size={14} style={{ color: "#4ade80" }} />}
          </div>

          <ArrowRight size={14} style={{ color: "rgba(255,255,255,0.3)" }} />

          <div
            onClick={() => setActiveTab("buses")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: activeTab === "buses" ? "#10b981" : "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ffffff", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>3</span>
            <span>Register Fleet Bus</span>
            {buses.length > 0 && <Check size={14} style={{ color: "#4ade80" }} />}
          </div>
        </div>

        <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
          <Info size={14} /> Complete steps in order for fast setup
        </div>
      </div>

      {/* Quick Analytics Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Configured Routes</span>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#0ea5e9", marginTop: "4px" }}>{routes.length} Routes</div>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>Smart Offsets Active</span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Active Schedules</span>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#8b5cf6", marginTop: "4px" }}>{schedules.length} Departures</div>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Daily Departure Times</span>
        </div>

        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Registered Buses</span>
          <div style={{ fontSize: "26px", fontWeight: "900", color: "#10b981", marginTop: "4px" }}>{buses.length} Buses</div>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Fleet Management</span>
        </div>
      </div>

      {/* 3 Main Navigation Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("routes")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 22px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "800",
            border: "none",
            cursor: "pointer",
            background: activeTab === "routes" ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "#ffffff",
            color: activeTab === "routes" ? "#ffffff" : "#64748b",
            boxShadow: activeTab === "routes" ? "0 4px 12px rgba(14, 165, 233, 0.3)" : "none",
          }}
        >
          <RouteIcon size={18} /> 1. Smart Route &amp; Offset Timing Entry ({routes.length})
        </button>

        <button
          type="button"
          onClick={handleSwitchToSchedulesTab}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 22px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "800",
            border: "none",
            cursor: "pointer",
            background: activeTab === "schedules" ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "#ffffff",
            color: activeTab === "schedules" ? "#ffffff" : "#64748b",
            boxShadow: activeTab === "schedules" ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "none",
          }}
        >
          <Clock size={18} /> 2. Departure Schedules ({schedules.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("buses")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 22px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "800",
            border: "none",
            cursor: "pointer",
            background: activeTab === "buses" ? "linear-gradient(135deg, #10b981, #047857)" : "#ffffff",
            color: activeTab === "buses" ? "#ffffff" : "#64748b",
            boxShadow: activeTab === "buses" ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none",
          }}
        >
          <Bus size={18} /> 3. Bus Fleet Management ({buses.length})
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: ROUTE & OFFSET TIMING ENTRY */}
      {/* ==================================================== */}
      {activeTab === "routes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Quick Presets Section for Fast Stress-Free Admin Setup */}
          <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: "18px", padding: "18px 22px", color: "#ffffff", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={18} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>⚡ 1-Click Fast Inter-City Presets (Stress-Free Route Setup)</span>
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700" }}>Click any preset to auto-fill origin, destination &amp; fare</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
              {allPresets.map((preset) => {
                const safeFrom = (fromLocation || "").toLowerCase();
                const safeTo = (toLocation || "").toLowerCase();
                const presetFrom = (preset.fromLocation || "").toLowerCase();
                const presetTo = (preset.toLocation || "").toLowerCase();
                const isActive = safeFrom === presetFrom && safeTo === presetTo;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    style={{
                      background: isActive ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(255, 255, 255, 0.08)",
                      border: isActive ? "2px solid #60a5fa" : "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "800", color: isActive ? "#dbeafe" : "#94a3b8" }}>
                      <span>{preset.fromLocation} ➔ {preset.toLocation}</span>
                      <span style={{ color: isActive ? "#ffffff" : "#4ade80" }}>₹{preset.price}</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                      {preset.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1. Interactive Route Map Component */}
          <RouteMap
            fromLocationName={fromLocation}
            toLocationName={toLocation}
            onLocationsChange={(fromVal, toVal) => {
              setFromLocation(fromVal);
              setToLocation(toVal);
              if (fromVal && toVal) setRouteName(`${fromVal} ➔ ${toVal}`);
            }}
            onRouteSelected={(routeMeta) => {
              setMapRouteData(routeMeta);
              if (routeMeta.startingPoint) setFromLocation(routeMeta.startingPoint.name);
              if (routeMeta.destination) setToLocation(routeMeta.destination.name);
              if (routeMeta.totalDistance) setDistanceKm(routeMeta.totalDistance);
              if (routeMeta.routeName) setRouteName(routeMeta.routeName);
            }}
            stops={mapStopsList}
            onStopsChange={(newStops) => {
              setMapStopsList(newStops);
              setStopBuilderList(
                newStops.map((st) => ({
                  name: st.stopName || st.name,
                  travel_time_from_prev: st.travel_time_from_prev || 0,
                }))
              );
            }}
            selectedStopIndex={selectedMapStopIndex}
            onSelectStopIndex={(idx) => setSelectedMapStopIndex(idx)}
          />

          {/* 2. Main Two-Column Layout: Stop Management Table & Route Info Form */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "start" }}>

            {/* Left Column: STOP MANAGEMENT PANEL TABLE */}
            <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={20} style={{ color: "#2563eb" }} /> Route Stops Management Panel
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                    Automatically detected + admin-added bus stops. Click row to highlight on map!
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const newStopName = window.prompt("Enter missing stop name:");
                      if (newStopName && newStopName.trim()) {
                        const cleanName = newStopName.trim();
                        const insertIdx = Math.max(1, mapStopsList.length - 1);
                        const prev = mapStopsList[insertIdx - 1];
                        const next = mapStopsList[insertIdx];
                        const newLat = prev ? Number(((prev.latitude + (next ? next.latitude : prev.latitude)) / 2).toFixed(5)) : 9.5544;
                        const newLng = prev ? Number(((prev.longitude + (next ? next.longitude : prev.longitude)) / 2).toFixed(5)) : 76.7865;

                        const newStopObj = {
                          order: insertIdx + 1,
                          stopName: cleanName,
                          name: cleanName,
                          latitude: newLat,
                          longitude: newLng,
                          distanceFromPreviousStop: 2.0,
                          cumulativeDistance: prev ? Number((prev.cumulativeDistance + 2.0).toFixed(1)) : 2.0,
                          travel_time_from_prev: 5,
                          offset_minutes: prev ? prev.offset_minutes + 5 : 5,
                          source: "admin",
                        };

                        const updated = [...mapStopsList];
                        updated.splice(insertIdx, 0, newStopObj);

                        let cum = 0;
                        const reordered = updated.map((st, i) => {
                          const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(st.latitude - updated[i - 1].latitude, 2) + Math.pow(st.longitude - updated[i - 1].longitude, 2)) * 111).toFixed(1));
                          cum += pDist;
                          return {
                            ...st,
                            order: i + 1,
                            distanceFromPreviousStop: pDist,
                            cumulativeDistance: Number(cum.toFixed(1)),
                            travel_time_from_prev: Math.round(pDist * 1.8),
                            offset_minutes: Math.round(cum * 1.8),
                          };
                        });

                        setMapStopsList(reordered);
                        setStopBuilderList(reordered.map((s) => ({ name: s.stopName || s.name, travel_time_from_prev: s.travel_time_from_prev || 0 })));
                        showNotification(`Added custom stop "${cleanName}"!`);
                      }
                    }}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: "#8b5cf6", color: "#ffffff", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}
                  >
                    + Add Stop
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>
                      <th style={{ padding: "10px" }}>Order</th>
                      <th style={{ padding: "10px" }}>Stop Name</th>
                      <th style={{ padding: "10px" }}>Source</th>
                      <th style={{ padding: "10px" }}>Distance</th>
                      <th style={{ padding: "10px" }}>Cumulative</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapStopsList.map((st, idx) => {
                      const isSelected = selectedMapStopIndex === idx;
                      const isEditing = editingStopIdx === idx;
                      const isFirst = idx === 0;
                      const isLast = idx === mapStopsList.length - 1;

                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedMapStopIndex(idx)}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isSelected ? "#eff6ff" : isEditing ? "#fefce8" : idx % 2 === 0 ? "#ffffff" : "#fafafa",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "10px", fontWeight: "800" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: isFirst ? "#dcfce7" : isLast ? "#fee2e2" : "#f1f5f9",
                              color: isFirst ? "#15803d" : isLast ? "#b91c1c" : "#475569",
                              fontSize: 11,
                              fontWeight: 800,
                            }}>
                              {st.order}
                            </span>
                          </td>
                          <td style={{ padding: "10px" }}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                <input
                                  type="text"
                                  value={editingStopNameInput}
                                  onChange={(e) => setEditingStopNameInput(e.target.value)}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #3b82f6", fontSize: 12, fontWeight: 700 }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!editingStopNameInput.trim()) return;
                                    const cleanName = editingStopNameInput.trim();
                                    const updated = [...mapStopsList];
                                    updated[idx] = { ...updated[idx], stopName: cleanName, name: cleanName };
                                    setMapStopsList(updated);
                                    setEditingStopIdx(null);
                                    showNotification(`Stop renamed to "${cleanName}".`);
                                  }}
                                  style={{ padding: "4px 8px", borderRadius: 6, background: "#10b981", color: "#fff", border: "none", fontSize: 11, fontWeight: 700 }}
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div>
                                <span style={{ fontWeight: 700, color: "#1e293b" }}>{st.stopName || st.name}</span>
                                {isFirst && (
                                  <span style={{ fontSize: 10, color: "#166534", fontWeight: 800, marginLeft: 8, background: "#dcfce7", padding: "2px 8px", borderRadius: 10, border: "1px solid #86efac" }}>
                                    🚩 Starting Point
                                  </span>
                                )}
                                {isLast && (
                                  <span style={{ fontSize: 10, color: "#991b1b", fontWeight: 800, marginLeft: 8, background: "#fee2e2", padding: "2px 8px", borderRadius: 10, border: "1px solid #fca5a5" }}>
                                    🏁 Destination
                                  </span>
                                )}
                                {!isFirst && !isLast && (
                                  <span style={{ fontSize: 10, color: "#1e40af", fontWeight: 700, marginLeft: 8, background: "#eff6ff", padding: "2px 8px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                                    🚏 Sub-Station
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 10,
                              fontSize: 10,
                              fontWeight: 800,
                              background: st.source === "admin" ? "#f3e8ff" : "#e0f2fe",
                              color: st.source === "admin" ? "#7e22ce" : "#0369a1",
                            }}>
                              {st.source === "admin" ? "⭐ Admin" : "🤖 Automatic"}
                            </span>
                          </td>
                          <td style={{ padding: "10px", fontWeight: 600, color: "#475569" }}>
                            {st.distanceFromPreviousStop} km
                          </td>
                          <td style={{ padding: "10px", fontWeight: 800, color: "#0f172a" }}>
                            {st.cumulativeDistance} km
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx === 0) return;
                                  const updated = [...mapStopsList];
                                  const temp = updated[idx];
                                  updated[idx] = updated[idx - 1];
                                  updated[idx - 1] = temp;
                                  let cum = 0;
                                  const reordered = updated.map((item, i) => {
                                    const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(item.latitude - updated[i - 1].latitude, 2) + Math.pow(item.longitude - updated[i - 1].longitude, 2)) * 111).toFixed(1));
                                    cum += pDist;
                                    return {
                                      ...item,
                                      order: i + 1,
                                      distanceFromPreviousStop: pDist,
                                      cumulativeDistance: Number(cum.toFixed(1)),
                                    };
                                  });
                                  setMapStopsList(reordered);
                                }}
                                style={{ padding: "4px 6px", borderRadius: 4, border: "none", background: "#f1f5f9", cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.3 : 1 }}
                                title="Move Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx === mapStopsList.length - 1) return;
                                  const updated = [...mapStopsList];
                                  const temp = updated[idx];
                                  updated[idx] = updated[idx + 1];
                                  updated[idx + 1] = temp;
                                  let cum = 0;
                                  const reordered = updated.map((item, i) => {
                                    const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(item.latitude - updated[i - 1].latitude, 2) + Math.pow(item.longitude - updated[i - 1].longitude, 2)) * 111).toFixed(1));
                                    cum += pDist;
                                    return {
                                      ...item,
                                      order: i + 1,
                                      distanceFromPreviousStop: pDist,
                                      cumulativeDistance: Number(cum.toFixed(1)),
                                    };
                                  });
                                  setMapStopsList(reordered);
                                }}
                                style={{ padding: "4px 6px", borderRadius: 4, border: "none", background: "#f1f5f9", cursor: isLast ? "default" : "pointer", opacity: isLast ? 0.3 : 1 }}
                                title="Move Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStopIdx(idx);
                                  setEditingStopNameInput(st.stopName || st.name);
                                }}
                                style={{ padding: "4px 6px", borderRadius: 4, border: "none", background: "#eff6ff", color: "#2563eb", cursor: "pointer" }}
                                title="Edit Stop Name"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (mapStopsList.length <= 2) {
                                    showNotification("Route must contain at least 2 stops.", true);
                                    return;
                                  }
                                  const updated = mapStopsList.filter((_, i) => i !== idx);
                                  let cum = 0;
                                  const reordered = updated.map((item, i) => {
                                    const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(item.latitude - updated[i - 1].latitude, 2) + Math.pow(item.longitude - updated[i - 1].longitude, 2)) * 111).toFixed(1));
                                    cum += pDist;
                                    return {
                                      ...item,
                                      order: i + 1,
                                      distanceFromPreviousStop: pDist,
                                      cumulativeDistance: Number(cum.toFixed(1)),
                                    };
                                  });
                                  setMapStopsList(reordered);
                                  showNotification("Stop removed.");
                                }}
                                style={{ padding: "4px 6px", borderRadius: 4, border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer" }}
                                title="Delete Stop"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: ROUTE INFORMATION SUMMARY & SAVE FORM */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Route Summary Card */}
              <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "#ffffff", padding: "22px", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", margin: "0 0 12px 0", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Navigation size={18} /> Selected Route Information
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Starting Point</span>
                    <strong style={{ fontSize: "14px", color: "#10b981" }}>{fromLocation}</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Destination</span>
                    <strong style={{ fontSize: "14px", color: "#ef4444" }}>{toLocation}</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Total Distance</span>
                    <strong style={{ fontSize: "14px", color: "#ffffff" }}>{distanceKm} km</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>Passenger Stops</span>
                    <strong style={{ fontSize: "14px", color: "#f59e0b" }}>{mapStopsList.length} Stops</strong>
                  </div>
                </div>

                <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.2)", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Estimated Travel Time:</span>
                  <strong style={{ color: "#38bdf8", fontSize: "14px" }}>{mapRouteData.estimatedTravelTime || durationStr}</strong>
                </div>
              </div>

              {/* Save Route Form Details */}
              <div style={{ background: "#ffffff", padding: "22px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                <form onSubmit={handleRouteSubmitClick} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                      Route ID Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RT-101"
                      value={routeId}
                      onChange={(e) => setRouteId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "10px",
                        border: `1px solid ${routeErrors.routeId ? "#ef4444" : "#cbd5e1"}`,
                        fontSize: "13px",
                        fontWeight: "700",
                        outline: "none",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                      Route Title
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. ${fromLocation} ➔ ${toLocation}`}
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                        Per KM Rate (₹/km) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        required
                        value={ratePerKm}
                        onChange={(e) => setRatePerKm(Number(e.target.value))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", color: "#2563eb" }}
                      />
                      <span style={{ fontSize: "10px", color: "#64748b" }}>Default: ₹5 / km</span>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                        Total Fare (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={fare}
                        onChange={(e) => setFare(Number(e.target.value))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "800", color: "#0f172a" }}
                      />
                      <span style={{ fontSize: "10px", color: "#0284c7", fontWeight: "700" }}>
                        ({distanceKm} km × ₹{ratePerKm}/km)
                      </span>
                    </div>
                  </div>

                  {routeErrors.stops && (
                    <div style={{ padding: "8px 12px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }}>
                      ⚠️ {routeErrors.stops}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        padding: "13px",
                        borderRadius: "12px",
                        background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: "800",
                        border: "none",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 12px rgba(14, 165, 233, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="spin" size={16} /> Saving Route...
                        </>
                      ) : routeEditingId ? (
                        "Save Route Settings ✓"
                      ) : (
                        "Save Route to Database ✓"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetRouteForm}
                      title="Reset and clear route form"
                      style={{
                        padding: "13px 18px",
                        borderRadius: "12px",
                        background: "#f1f5f9",
                        color: "#475569",
                        fontSize: "13px",
                        fontWeight: "700",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <RotateCcw size={15} />
                      <span>Reset</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Configured Routes Table Directory */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: "0 0 10px 0" }}>
                  Existing Configured Routes ({filteredRoutes.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                  {filteredRoutes.map((r) => (
                    <div key={r._id} style={{ padding: "10px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>{r.routeId} - {r.routeName}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{r.distanceKm} km · {r.stops?.length || 0} stops</div>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button type="button" onClick={() => handleEditRoute(r)} style={{ padding: "3px 6px", borderRadius: "4px", background: "#eff6ff", color: "#2563eb", fontSize: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>Edit</button>
                        <button
                          type="button"
                          onClick={() => handleToggleRoute(r._id, r.status)}
                          style={{
                            padding: "3px 6px", borderRadius: "4px",
                            background: r.status === "Active" ? "#fffbeb" : "#f0fdf4",
                            color: r.status === "Active" ? "#b45309" : "#16a34a",
                            fontSize: "10px", fontWeight: "700", border: "none", cursor: "pointer"
                          }}
                        >
                          {r.status === "Active" ? "⏸ Suspend" : "▶ Activate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SCHEDULE DEPARTURES MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === "schedules" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "28px", alignItems: "start" }}>

          {/* Left Column: Create Departure Schedule */}
          <div style={{ background: "#ffffff", padding: "26px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ marginBottom: "18px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                Add Route Departure Schedule
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
                Create daily start times for any route. System auto-generates stop timetables!
              </p>
            </div>

            {/* EMPTY STATE GUIDANCE BOX */}
            {routes.length === 0 ? (
              <div style={{ background: "#fffbebf5", padding: "20px", borderRadius: "14px", border: "1px solid #fef3c7", color: "#92400e", textAlign: "center" }}>
                <Info size={32} style={{ color: "#d97706", marginBottom: "8px" }} />
                <h4 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 6px 0" }}>No Configured Routes Found</h4>
                <p style={{ fontSize: "13px", margin: "0 0 16px 0", color: "#b45309" }}>
                  You must create at least one bus route in Step 1 before creating departure schedules.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("routes")}
                  style={{ padding: "10px 18px", borderRadius: "10px", background: "#d97706", color: "#ffffff", fontSize: "13px", fontWeight: "800", border: "none", cursor: "pointer" }}
                >
                  Go to Step 1: Create Route →
                </button>
              </div>
            ) : (
              <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                    Select Route *
                  </label>
                  <select
                    required
                    value={scheduleRouteId}
                    onChange={(e) => handleScheduleRouteSelect(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${scheduleErrors.route ? "#ef4444" : "#cbd5e1"}`, fontSize: "14px", fontWeight: "700", outline: "none" }}
                  >
                    <option value="">-- Select Route --</option>
                    {routes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.routeId} - {r.routeName} ({r.duration})
                      </option>
                    ))}
                  </select>
                  {scheduleErrors.route && (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700", marginTop: "3px", display: "block" }}>
                      ⚠️ {scheduleErrors.route}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Departure Start Time *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 08:30 AM"
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "700" }}
                    />
                    {scheduleErrors.startTime && (
                      <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700", marginTop: "3px", display: "block" }}>
                        ⚠️ {scheduleErrors.startTime}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Traffic Delay Buffer (mins)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scheduleDelayBuffer}
                      onChange={(e) => setScheduleDelayBuffer(Number(e.target.value))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "700" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                    Assigned Bus (Optional)
                    {scheduleStartTime && (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: availableBusesForSchedule.length === buses.length ? "#10b981" : "#f59e0b", marginLeft: "6px" }}>
                        ({availableBusesForSchedule.length} available at {scheduleStartTime})
                      </span>
                    )}
                  </label>
                  <select
                    value={scheduleBusId}
                    onChange={(e) => handleScheduleBusSelect(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                  >
                    <option value="">-- Select Available Bus --</option>
                    {availableBusesForSchedule.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.busName} ({b.busNumber})
                      </option>
                    ))}
                  </select>
                  {buses.length > availableBusesForSchedule.length && (
                    <span style={{ fontSize: "10px", color: "#d97706", display: "block", marginTop: "4px", fontWeight: "600" }}>
                      🔒 {buses.length - availableBusesForSchedule.length} bus(es) driving another route at {scheduleStartTime} are hidden.
                    </span>
                  )}
                </div>

                {/* ⚡ CLEAR VISUAL AUTO-LINKED SUMMARY BADGE / BANNER */}
                {scheduleBusId && (
                  <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "2px solid #86efac", borderRadius: "14px", padding: "14px 18px", marginTop: "4px", boxShadow: "0 4px 14px rgba(22, 163, 74, 0.12)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "900", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                        ⚡ AUTO-LINKED BUS TO ROUTE
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "#ffffff", color: "#15803d", padding: "3px 10px", borderRadius: "10px", border: "1px solid #86efac" }}>
                        Fixed Route Binding
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", color: "#14532d", fontWeight: "700" }}>
                      <div>🚌 <strong>Bus:</strong> {buses.find(b => String(b._id || b.id) === String(scheduleBusId))?.busNumber || "Selected Bus"}</div>
                      <div>📍 <strong>Route:</strong> {routes.find(r => String(r._id) === String(scheduleRouteId))?.routeName || "Selected Route"}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: "13px",
                      borderRadius: "12px",
                      background: isSubmitting ? "#94a3b8" : scheduleEditingId ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "800",
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="spin" size={16} /> Saving Schedule...
                      </>
                    ) : scheduleEditingId ? (
                      "Save Schedule Changes ✓"
                    ) : (
                      "Create Departure Schedule ✓"
                    )}
                  </button>

                  {scheduleEditingId && (
                    <button
                      type="button"
                      onClick={handleCancelScheduleEdit}
                      style={{ padding: "13px 18px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", fontSize: "13px", fontWeight: "800", border: "1.5px solid #cbd5e1", cursor: "pointer" }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Active Schedule Timetables List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Active Departure Timetables ({schedules.length})
              </h3>
              <button
                type="button"
                onClick={fetchSchedules}
                disabled={schedulesLoading}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "10px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              >
                <RefreshCw size={14} className={schedulesLoading ? "spin" : ""} /> {schedulesLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {schedulesLoading ? (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                <RefreshCw size={32} className="spin" style={{ color: "#8b5cf6", marginBottom: "10px" }} />
                <p style={{ margin: 0, fontWeight: "700", color: "#475569" }}>Loading Departure Schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                <Calendar size={36} style={{ opacity: 0.3, marginBottom: "8px" }} />
                <p style={{ margin: 0, fontWeight: "600" }}>No departure schedules created yet. Add departure times above!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {schedules.map((sch) => {
                  const matchedRoute = typeof sch.route_id === "object" ? sch.route_id : routes.find((r) => r._id === sch.route_id);
                  const routeStops = matchedRoute?.stops || [];

                  const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver"].includes(String(n).toLowerCase().trim());

                  // Failsafe match bus object by ID or busNumber (stripping spaces & hyphens)
                  const matchedBus = buses.find(
                    (b) =>
                      (sch.bus_id && String(b._id || b.id) === String(typeof sch.bus_id === "object" ? sch.bus_id._id : sch.bus_id)) ||
                      (sch.busNumber && String(b.busNumber).replace(/[\s\-]+/g, "").toLowerCase() === String(sch.busNumber).replace(/[\s\-]+/g, "").toLowerCase())
                  );

                  // Failsafe match driver object by ID or Name
                  const matchedDriver = driversList.find(
                    (d) =>
                      (sch.driver_id && String(d._id || d.id) === String(sch.driver_id)) ||
                      (matchedBus?.driverId && String(d._id || d.id) === String(matchedBus.driverId)) ||
                      (!isGeneric(sch.driverName) && String(d.name).toLowerCase().trim() === String(sch.driverName).toLowerCase().trim()) ||
                      (!isGeneric(matchedBus?.driverName) && String(d.name).toLowerCase().trim() === String(matchedBus.driverName).toLowerCase().trim())
                  );

                  const displayBusNumber = sch.busNumber || matchedBus?.busNumber || "Unassigned";
                  const displayDriverName =
                    matchedDriver?.name ||
                    (!isGeneric(sch.driverName) ? sch.driverName : null) ||
                    (!isGeneric(matchedBus?.driverName) ? matchedBus.driverName : null) ||
                    "Not Assigned";

                  return (
                    <div key={sch._id} style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "16px", fontWeight: "900", color: "#8b5cf6" }}>{sch.start_time}</span>
                            <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                              {matchedRoute?.routeName || sch.routeName}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            Bus: <strong>{displayBusNumber}</strong>
                            {sch.delay_buffer_minutes > 0 && <span style={{ color: "#eab308", fontWeight: "700", marginLeft: "8px" }}>+{sch.delay_buffer_minutes}m Traffic Buffer</span>}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleEditSchedule(sch)}
                            style={{ padding: "8px 14px", borderRadius: "10px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#ffffff", fontSize: "12px", fontWeight: "800", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 3px 10px rgba(139, 92, 246, 0.3)" }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSchedule(sch._id, sch.is_active !== false)}
                            style={{
                              padding: "8px 14px", borderRadius: "10px",
                              background: sch.is_active !== false
                                ? "linear-gradient(135deg, #fbbf24, #d97706)"
                                : "linear-gradient(135deg, #10b981, #047857)",
                              color: "#ffffff", fontSize: "12px", fontWeight: "800",
                              border: "none", cursor: "pointer", display: "inline-flex",
                              alignItems: "center", gap: "6px",
                              boxShadow: sch.is_active !== false
                                ? "0 3px 10px rgba(251,191,36,0.35)"
                                : "0 3px 10px rgba(16,185,129,0.35)"
                            }}
                          >
                            {sch.is_active !== false ? "⏸ Disable" : "▶ Enable"}
                          </button>
                        </div>
                      </div>

                      {/* Calculated Stop Arrival Timetable */}
                      {routeStops.length > 0 && (
                        <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "10px", marginTop: "10px" }}>
                          <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", marginBottom: "6px" }}>
                            CALCULATED STOP ARRIVAL TIMETABLE:
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {routeStops.map((st, idx) => {
                              const stopName = typeof st === "object" ? st.name : st;
                              const offset = typeof st === "object" ? st.offset_minutes : idx * 25;
                              const arrTime = addMinutesToTime(sch.start_time, offset, sch.delay_buffer_minutes);

                              return (
                                <div key={idx} style={{ background: "#ffffff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px" }}>
                                  <span style={{ fontWeight: "800", color: "#0f172a" }}>{stopName}:</span>{" "}
                                  <span style={{ fontWeight: "700", color: "#2563eb" }}>{arrTime}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: BUS FLEET MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === "buses" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "28px", alignItems: "start" }}>

          {/* Left Column: Register / Edit Bus Form */}
          <div style={{ background: "#ffffff", padding: "26px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                  {busEditingId ? "Edit Bus Specifications" : "Register Fleet Bus"}
                </h2>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
                  Set bus name, vehicle number plate &amp; assigned driver.
                </p>
              </div>
              {busEditingId && (
                <button
                  type="button"
                  onClick={resetBusForm}
                  style={{ padding: "6px 12px", borderRadius: "8px", background: "#f1f5f9", color: "#64748b", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}
                >
                  Cancel Editing
                </button>
              )}
            </div>

            <form onSubmit={handleBusSubmitClick} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Bus Name & Number Plate Number */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                    Bus Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MoveSmart Express"
                    value={busForm.busName}
                    onChange={(e) => setBusForm({ ...busForm, busName: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${busErrors.busName ? "#ef4444" : "#cbd5e1"}`, fontSize: "13px", fontWeight: "700" }}
                  />
                  {busErrors.busName && (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700", marginTop: "2px", display: "block" }}>
                      ⚠️ {busErrors.busName}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                    Number Plate Number (Bus Reg) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KL-07-MS-1008"
                    value={busForm.busNumber}
                    onChange={(e) => setBusForm({ ...busForm, busNumber: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${busErrors.busNumber ? "#ef4444" : "#cbd5e1"}`, fontSize: "13px", fontWeight: "700" }}
                  />
                  {busErrors.busNumber && (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700", marginTop: "2px", display: "block" }}>
                      ⚠️ {busErrors.busNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Seat Capacity & Bus Type (Normal Bus / AC Bus) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                    Seat Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 32"
                    value={busForm.totalSeats}
                    onChange={(e) => setBusForm({ ...busForm, totalSeats: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${busErrors.totalSeats ? "#ef4444" : "#cbd5e1"}`, fontSize: "13px", fontWeight: "700" }}
                  />
                  {busErrors.totalSeats && (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700", marginTop: "2px", display: "block" }}>
                      ⚠️ {busErrors.totalSeats}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                    Bus Type *
                  </label>
                  <select
                    value={busForm.busType}
                    onChange={(e) => setBusForm({ ...busForm, busType: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", background: "#ffffff" }}
                  >
                    <option value="Normal Bus">Normal Bus</option>
                    <option value="AC Bus">AC Bus</option>
                  </select>
                </div>
              </div>

              {/* Driver Selection Dropdown (Only Displays Unassigned Drivers from DB) */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                  <User size={14} style={{ color: "#0ea5e9" }} /> Assigned Driver *
                </label>
                <select
                  value={selectedDriverOption}
                  onChange={(e) => handleDriverSelectChange(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", background: "#ffffff" }}
                >
                  <option value="unassigned">Select Driver / Unassigned</option>
                  {dropdownDriverOptions.map((d) => (
                    <option key={String(d._id || d.id)} value={String(d._id || d.id)}>
                      {d.isAssigned
                        ? `⚠️ ${d.name} (Assigned to: ${d.assignedBusName || "another bus"}) · ${d.phone}`
                        : `✅ ${d.name} (${d.phone} · License: ${d.licenseNumber})`}
                    </option>
                  ))}
                </select>

                {dropdownDriverOptions.filter((d) => !d.isAssigned).length === 0 ? (
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#d97706", fontWeight: "700" }}>
                    ⚠️ All verified drivers are currently assigned to buses. You can still re-assign one by selecting them above (marked with ⚠️).
                  </div>
                ) : (
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#059669", fontWeight: "700" }}>
                    ✅ {dropdownDriverOptions.filter((d) => !d.isAssigned).length} free driver(s) available · {dropdownDriverOptions.filter((d) => d.isAssigned).length} already assigned (selectable).
                  </div>
                )}

                {/* Driver Details Preview */}
                {busForm.driverName && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div>Driver Name: <strong style={{ color: "#0f172a" }}>{busForm.driverName}</strong></div>
                    <div>Phone: <strong style={{ color: "#0f172a" }}>{busForm.driverPhone}</strong></div>
                    <div>License: <strong style={{ color: "#0f172a" }}>{busForm.driverLicense}</strong></div>
                    <div>Experience: <strong style={{ color: "#16a34a" }}>{busForm.driverExperience} Years</strong></div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "12px",
                  background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #10b981, #047857)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "800",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                  marginTop: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="spin" size={16} /> Registering Bus...
                  </>
                ) : busEditingId ? (
                  "Save Bus Changes ✓"
                ) : (
                  "Preview & Register Fleet Bus in MongoDB ✓"
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Fleet Directory */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Active Fleet Buses ({filteredBuses.length})
              </h3>
              <input
                type="text"
                placeholder="Search bus..."
                value={busSearch}
                onChange={(e) => setBusSearch(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>

            {filteredBuses.length === 0 ? (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                No registered buses found.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredBuses.map((b) => (
                  <div key={b._id} style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{b.busName}</span>
                          <span style={{ fontSize: "11px", fontWeight: "700", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {b.busNumber}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          {b.busType} · Seats: <strong>{b.totalSeats}</strong>
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "4px" }}>
                          Driver: {(!b.driverName || ["unassigned", "not assigned"].includes(String(b.driverName).toLowerCase().trim())) ? (
                            <span style={{ color: "#be123c", fontWeight: "800", background: "#ffe4e6", padding: "2px 8px", borderRadius: "6px", border: "1px solid #fecdd3" }}>
                              🔴 Not Assigned
                            </span>
                          ) : (
                            <>
                              <strong>{b.driverName}</strong> {b.driverPhone && b.driverPhone !== "Not Assigned" ? `(${b.driverPhone})` : ""}
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleEditBus(b)}
                          style={{ padding: "4px 8px", borderRadius: "6px", background: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: "700", border: "none", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBus(b._id, b.is_active !== false)}
                          style={{
                            padding: "4px 8px", borderRadius: "6px",
                            background: b.is_active !== false ? "#fffbeb" : "#f0fdf4",
                            color: b.is_active !== false ? "#b45309" : "#16a34a",
                            fontSize: "11px", fontWeight: "700", border: "none", cursor: "pointer"
                          }}
                        >
                          {b.is_active !== false ? "⏸ Disable" : "▶ Enable"}
                        </button>
                      </div>
                    </div>

                    {/* Amenities badges */}
                    {b.amenities && b.amenities.length > 0 && (
                      <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {b.amenities.map((am) => (
                          <span key={am} style={{ fontSize: "10px", background: "#ecfdf5", color: "#047857", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION PREVIEW MODAL */}
      {confirmationModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "26px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Shield size={20} style={{ color: "#0ea5e9" }} /> {confirmationModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* ROUTE PREVIEW SUMMARY */}
            {confirmationModal.type === "route" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#334155" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px" }}>
                  <div>Route ID: <strong style={{ color: "#0ea5e9" }}>{confirmationModal.data.routeId}</strong></div>
                  <div>Route Title: <strong>{confirmationModal.data.routeName}</strong></div>
                  <div>Origin &amp; Terminus: <strong>{confirmationModal.data.fromLocation} ➔ {confirmationModal.data.toLocation}</strong></div>
                  <div>Distance &amp; Duration: <strong>{confirmationModal.data.distanceKm} km · {confirmationModal.data.duration}</strong></div>
                  <div>Standard Fare: <strong style={{ color: "#16a34a" }}>₹{confirmationModal.data.fare}</strong></div>
                </div>

                <div>
                  <strong style={{ fontSize: "12px", color: "#64748b" }}>Stops &amp; Calculated Offsets:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                    {confirmationModal.data.stops?.map((st, i) => (
                      <span key={i} style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Navigation size={10} /> {st.name} (+{st.offset_minutes}m)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BUS PREVIEW SUMMARY */}
            {confirmationModal.type === "bus" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#334155" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px" }}>
                  <div>Bus Registration: <strong style={{ color: "#10b981" }}>{confirmationModal.data.busNumber}</strong></div>
                  <div>Bus Service Name: <strong>{confirmationModal.data.busName}</strong></div>
                  <div>Bus Type: <strong>{confirmationModal.data.busType}</strong></div>
                  <div>Seat Capacity: <strong>{confirmationModal.data.totalSeats} Seats</strong></div>
                  <div>Driver: <strong>{confirmationModal.data.driverName} ({confirmationModal.data.driverPhone})</strong></div>
                  <div>License: <strong>{confirmationModal.data.driverLicense}</strong></div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "#f1f5f9", color: "#64748b", fontSize: "13px", fontWeight: "700", border: "none", cursor: "pointer" }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmationModal.onConfirm}
                style={{
                  flex: 1.5,
                  padding: "11px",
                  borderRadius: "10px",
                  background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "800",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isSubmitting ? <RefreshCw className="spin" size={16} /> : "Confirm & Save to MongoDB ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (isEmbedded) {
    return mainContent;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", fontFamily: "var(--font-sans, system-ui)" }}>
      <AdminHeader />

      {/* Hero Banner Header */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
          color: "#ffffff",
          padding: "36px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ maxWidth: "1380px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", marginBottom: "10px", border: "1px solid rgba(74, 222, 128, 0.3)" }}>
              <Shield size={16} /> MoveSmart Admin Console · Smart Bus Timing Engine
            </div>
            <h1 style={{ fontSize: "30px", fontWeight: "900", letterSpacing: "-0.5px", margin: 0, color: "#4ade80" }}>
              Bus Route Entry &amp; Offset Timing System
            </h1>
            <p style={{ color: "#c4b5fd", fontSize: "14px", marginTop: "6px", maxWidth: "650px" }}>
              Configure intercity routes with offset times. Define minutes between stops and auto-calculate arrival schedules for any departure time.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              to="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              ← Back to Admin
            </Link>
            <button
              onClick={() => {
                fetchBuses();
                fetchRoutes();
                fetchSchedules();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              <RefreshCw size={15} /> Refresh Data
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      {mainContent}

      <AdminFooter />
    </div>
  );
}
