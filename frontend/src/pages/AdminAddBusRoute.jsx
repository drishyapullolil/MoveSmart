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
} from "lucide-react";

// Standard Verified Fleet Drivers List
const defaultFleetDrivers = [
  { id: "def-1", name: "Suresh Menon", phone: "+91 98471 22334", licenseNumber: "KL-07-2019-88120", experienceYears: 8, verificationStatus: "Approved" },
  { id: "def-2", name: "Anil Kumar", phone: "+91 98472 55667", licenseNumber: "KL-14-2017-44321", experienceYears: 10, verificationStatus: "Approved" },
  { id: "def-3", name: "Ramesh Pillai", phone: "+91 98473 88990", licenseNumber: "KL-11-2016-11223", experienceYears: 12, verificationStatus: "Approved" },
  { id: "def-4", name: "Vijayan Nair", phone: "+91 98474 33445", licenseNumber: "KL-01-2015-77889", experienceYears: 15, verificationStatus: "Approved" },
  { id: "def-5", name: "Mohan Varghese", phone: "+91 98475 66778", licenseNumber: "KL-08-2020-55667", experienceYears: 6, verificationStatus: "Approved" },
  { id: "def-6", name: "Joseph Thomas", phone: "+91 98476 99001", licenseNumber: "KL-05-2018-33445", experienceYears: 9, verificationStatus: "Approved" },
  { id: "def-7", name: "Mathew Jacob", phone: "+91 98477 11223", licenseNumber: "KL-05-2016-99887", experienceYears: 11, verificationStatus: "Approved" },
  { id: "def-8", name: "Unnikrishnan P", phone: "+91 98478 44556", licenseNumber: "KL-09-2019-12345", experienceYears: 10, verificationStatus: "Approved" },
  { id: "def-9", name: "Santhosh Kumar", phone: "+91 98479 77889", licenseNumber: "KL-13-2017-67890", experienceYears: 14, verificationStatus: "Approved" },
];

// Major Kerala Transit Stops Catalog
const KERALA_TRANSIT_STOPS = [
  "Thrissur",
  "Angamaly",
  "Kottayam",
  "Kochi",
  "Aluva",
  "Trivandrum",
  "Calicut",
  "Palakkad",
  "Kanjirappally",
  "Cherthala",
  "Alappuzha",
  "Kollam",
  "Kayamkulam",
  "Karunagappally",
  "Changanassery",
  "Thiruvalla",
  "Ettumanoor",
  "Pala",
  "Erattupetta",
  "Chalakkudy",
  "Wadakkanchery",
  "Kuttippuram",
  "Valanchery",
  "Koyilandy",
  "Vadakara",
  "Thalassery",
  "Kannur",
];

// Pre-configured Intercity Route Presets for Quick Auto-Fill
const defaultRoutePresets = [
  {
    id: "preset-1",
    name: "Thrissur ➔ Angamaly ➔ Kottayam Express",
    fromLocation: "Thrissur",
    toLocation: "Kottayam",
    price: 320,
    base_start_time: "08:00 AM",
    stopsList: [
      { name: "Thrissur", travel_time_from_prev: 0 },
      { name: "Angamaly", travel_time_from_prev: 45 },
      { name: "Kottayam", travel_time_from_prev: 75 },
    ],
  },
  {
    id: "preset-2",
    name: "Kochi ➔ Trivandrum Express",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    price: 450,
    base_start_time: "06:30 AM",
    stopsList: [
      { name: "Kochi", travel_time_from_prev: 0 },
      { name: "Alappuzha", travel_time_from_prev: 90 },
      { name: "Kollam", travel_time_from_prev: 105 },
      { name: "Trivandrum", travel_time_from_prev: 90 },
    ],
  },
  {
    id: "preset-3",
    name: "Kochi ➔ Calicut Direct",
    fromLocation: "Kochi",
    toLocation: "Calicut",
    price: 320,
    base_start_time: "07:00 AM",
    stopsList: [
      { name: "Kochi", travel_time_from_prev: 0 },
      { name: "Aluva", travel_time_from_prev: 35 },
      { name: "Thrissur", travel_time_from_prev: 65 },
      { name: "Calicut", travel_time_from_prev: 170 },
    ],
  },
  {
    id: "preset-4",
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
  const [routeName, setRouteName] = useState("Kanjirappally ➔ Pala");
  const [fromLocation, setFromLocation] = useState("Kanjirappally");
  const [toLocation, setToLocation] = useState("Pala");
  const [distanceKm, setDistanceKm] = useState(35.4);
  const [baseStartTime, setBaseStartTime] = useState("08:00 AM");
  const [ratePerKm, setRatePerKm] = useState(5);
  const [fare, setFare] = useState(177); // 35.4 * 5 = 177
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
    startingPoint: { name: "Kanjirappally", latitude: 9.5544, longitude: 76.7865 },
    destination: { name: "Pala", latitude: 9.7081, longitude: 76.6837 },
    totalDistance: 35.4,
    estimatedTravelTime: "50 mins",
    routeGeometry: [],
    selectedRouteId: null,
  });

  const [mapStopsList, setMapStopsList] = useState([
    { order: 1, stopName: "Kanjirappally", name: "Kanjirappally", latitude: 9.5544, longitude: 76.7865, distanceFromPreviousStop: 0, cumulativeDistance: 0, travel_time_from_prev: 0, offset_minutes: 0, source: "automatic" },
    { order: 2, stopName: "Ponkunnam", name: "Ponkunnam", latitude: 9.5667, longitude: 76.7583, distanceFromPreviousStop: 5.8, cumulativeDistance: 5.8, travel_time_from_prev: 10, offset_minutes: 10, source: "automatic" },
    { order: 3, stopName: "Pala", name: "Pala", latitude: 9.7081, longitude: 76.6837, distanceFromPreviousStop: 29.6, cumulativeDistance: 35.4, travel_time_from_prev: 40, offset_minutes: 50, source: "automatic" },
  ]);

  const [selectedMapStopIndex, setSelectedMapStopIndex] = useState(null);
  const [editingStopIdx, setEditingStopIdx] = useState(null);
  const [editingStopNameInput, setEditingStopNameInput] = useState("");

  // Dynamic Stop Builder list
  const [stopBuilderList, setStopBuilderList] = useState([
    { name: "Thrissur", travel_time_from_prev: 0 },
    { name: "Angamaly", travel_time_from_prev: 45 },
    { name: "Kottayam", travel_time_from_prev: 75 },
  ]);

  // Live calculation of offsets and total duration
  const { stops: computedStops, totalDurationMinutes, durationStr } = calculateCumulativeOffsets(stopBuilderList);

  // Live timeline preview start time input
  const [previewStartTime, setPreviewStartTime] = useState("08:00 AM");

  // ---------------- SCHEDULE DEPARTURES FORM STATE ----------------
  const [scheduleRouteId, setScheduleRouteId] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("08:30 AM");
  const [scheduleBusId, setScheduleBusId] = useState("");
  const [scheduleDriverId, setScheduleDriverId] = useState("");
  const [scheduleDelayBuffer, setScheduleDelayBuffer] = useState(0);

  // ---------------- BUS FORM STATE ----------------
  const [busEditingId, setBusEditingId] = useState(null);
  const [selectedDriverOption, setSelectedDriverOption] = useState("");
  const [selectedRouteOption, setSelectedRouteOption] = useState("");

  const [busForm, setBusForm] = useState({
    busNumber: "",
    busName: "",
    busType: "Normal Bus",
    operator: "MoveSmart Fleet Ops",
    fromLocation: "Thrissur",
    toLocation: "Kottayam",
    departureTime: "08:00 AM",
    arrivalTime: "10:00 AM",
    duration: "2h 00m",
    totalSeats: 32,
    price: 320,
    amenities: ["Wi-Fi", "Charging Port", "Live Tracking", "AC"],
    driverName: "",
    driverPhone: "",
    driverLicense: "",
    driverId: "",
    driverPhoto: "",
    driverVerified: true,
    driverExperience: 0,
    stops: "Thrissur, Angamaly, Kottayam",
  });

  // Validation Errors State
  const [routeErrors, setRouteErrors] = useState({});
  const [busErrors, setBusErrors] = useState({});
  const [scheduleErrors, setScheduleErrors] = useState({});

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

  const fetchDrivers = async () => {
    try {
      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get("/api/admin/drivers", { headers, timeout: 8000 });
      if (res.data && res.data.drivers && Array.isArray(res.data.drivers)) {
        // STRICT: ONLY load users from MongoDB User collection where role === "driver" OR verificationStatus === "Approved"
        const userRoleDriversOnly = res.data.drivers
          .filter((d) => d.role?.toLowerCase() === "driver" || d.verificationStatus?.toLowerCase() === "approved")
          .map((d) => ({
            id: d._id,
            _id: d._id,
            name: d.name || "Driver User",
            phone: d.phone || "N/A",
            licenseNumber: d.licenseNumber || "N/A",
            experienceYears: d.experienceYears || 0,
            verificationStatus: d.verificationStatus || "Approved",
            profilePic: d.profilePic || "",
            isDbDriver: true,
          }));

        setDriversList(userRoleDriversOnly);
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
      const res = await axios.get("/api/admin/schedules");
      if (res.data.success) {
        setSchedules(res.data.schedules || []);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
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
    setDistanceKm(route.distanceKm || 120);
    setBaseStartTime(route.base_start_time || "08:00 AM");
    setPreviewStartTime(route.base_start_time || "08:00 AM");
    setFare(route.fare || 320);
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
          travel_time_from_prev: idx === 0 ? 0 : 30,
        }))
      );
    }

    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleDeleteRoute = async (id, rCode) => {
    if (!window.confirm(`Are you sure you want to delete route "${rCode}" and all associated departure schedules?`)) return;
    try {
      const res = await axios.delete(`/api/admin/routes/${id}`);
      showNotification(res.data.message || "Route deleted.");
      fetchRoutes();
      fetchSchedules();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete route", true);
    }
  };

  const resetRouteForm = () => {
    setRouteEditingId(null);
    setRouteId("");
    setRouteName("");
    setFromLocation("Thrissur");
    setToLocation("Kottayam");
    setDistanceKm(120);
    setBaseStartTime("08:00 AM");
    setPreviewStartTime("08:00 AM");
    setFare(320);
    setStatus("Active");
    setRouteErrors({});
    setStopBuilderList([
      { name: "Thrissur", travel_time_from_prev: 0 },
      { name: "Angamaly", travel_time_from_prev: 45 },
      { name: "Kottayam", travel_time_from_prev: 75 },
    ]);
  };

  // ---------------- SCHEDULE DEPARTURES HANDLERS ----------------

  const validateScheduleForm = () => {
    const errs = {};
    if (!scheduleRouteId) errs.route = "Please select a route for this schedule.";
    if (!scheduleStartTime.trim()) errs.startTime = "Departure Start Time is required.";
    setScheduleErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!validateScheduleForm()) return;

    const selectedBus = buses.find((b) => b._id === scheduleBusId);
    const selectedDriver = driversList.find((d) => String(d._id || d.id) === String(scheduleDriverId));

    const payload = {
      route_id: scheduleRouteId,
      start_time: scheduleStartTime,
      bus_id: scheduleBusId || null,
      busNumber: selectedBus?.busNumber || "",
      driver_id: scheduleDriverId || null,
      driverName: selectedDriver?.name || "",
      delay_buffer_minutes: Number(scheduleDelayBuffer) || 0,
      is_active: true,
    };

    try {
      setIsSubmitting(true);
      const res = await axios.post("/api/admin/schedules", payload);
      showNotification(res.data.message || "Departure schedule created!");
      fetchSchedules();
      setScheduleStartTime("08:30 AM");
      setScheduleErrors({});
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to create schedule departure", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this departure schedule?")) return;
    try {
      const res = await axios.delete(`/api/admin/schedules/${id}`);
      showNotification(res.data.message || "Schedule deleted.");
      fetchSchedules();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete schedule", true);
    }
  };

  // ---------------- BUS FORM HANDLERS & AUTO-FILL ----------------

  // Driver Dropdown Auto-Fill Handler
  const handleDriverSelectChange = (driverIdVal) => {
    setSelectedDriverOption(driverIdVal);
    const driverObj = driversList.find((d) => String(d._id || d.id) === String(driverIdVal));
    if (driverObj) {
      setBusForm((prev) => ({
        ...prev,
        driverName: driverObj.name,
        driverPhone: driverObj.phone || "+91 98470 00000",
        driverLicense: driverObj.licenseNumber || "KL-07-2020-00100",
        driverExperience: driverObj.experienceYears || 5,
        driverId: driverObj._id || driverObj.id,
      }));
    }
  };

  // Route Dropdown Auto-Fill Handler
  const handleRouteSelectChangeForBus = (routeIdVal) => {
    setSelectedRouteOption(routeIdVal);
    const routeObj = routes.find((r) => r._id === routeIdVal);
    if (routeObj) {
      const arrTime = addMinutesToTime(routeObj.base_start_time || "08:00 AM", 120);
      const stopsStr = Array.isArray(routeObj.stops)
        ? routeObj.stops.map((s) => (typeof s === "object" ? s.name : s)).join(", ")
        : `${routeObj.fromLocation}, ${routeObj.toLocation}`;

      setBusForm((prev) => ({
        ...prev,
        fromLocation: routeObj.fromLocation,
        toLocation: routeObj.toLocation,
        duration: routeObj.duration || "2h 00m",
        price: routeObj.fare || 320,
        departureTime: routeObj.base_start_time || "08:00 AM",
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
    const firstDriver = driversList[0] || defaultFleetDrivers[0];
    setSelectedDriverOption(String(firstDriver._id || firstDriver.id));
    setBusErrors({});
    setBusForm({
      busNumber: "",
      busName: "",
      busType: "AC Seater / Sleeper (2+2)",
      operator: "MoveSmart Fleet Ops",
      fromLocation: "Thrissur",
      toLocation: "Kottayam",
      departureTime: "08:00 AM",
      arrivalTime: "10:00 AM",
      duration: "2h 00m",
      totalSeats: 32,
      price: 320,
      amenities: ["Wi-Fi", "Charging Port", "Live Tracking", "AC"],
      driverName: firstDriver.name,
      driverPhone: firstDriver.phone,
      driverLicense: firstDriver.licenseNumber,
      driverId: firstDriver._id || firstDriver.id,
      driverPhoto: firstDriver.profilePic || "",
      driverVerified: true,
      driverExperience: 8,
      stops: "Thrissur, Angamaly, Kottayam",
    });
  };

  const handleEditBus = (bus) => {
    setBusEditingId(bus._id);
    setBusForm({
      busNumber: bus.busNumber || "",
      busName: bus.busName || "",
      busType: bus.busType || "AC Seater / Sleeper (2+2)",
      operator: bus.operator || "MoveSmart Fleet Ops",
      fromLocation: bus.fromLocation || "Thrissur",
      toLocation: bus.toLocation || "Kottayam",
      departureTime: bus.departureTime || "08:00 AM",
      arrivalTime: bus.arrivalTime || "10:00 AM",
      duration: bus.duration || "2h 00m",
      totalSeats: bus.totalSeats || 32,
      price: bus.price || 320,
      amenities: bus.amenities || ["Wi-Fi", "Charging Port", "Live Tracking", "AC"],
      driverName: bus.driverName || "Suresh Menon",
      driverPhone: bus.driverPhone || "+91 98471 22334",
      driverLicense: bus.driverLicense || "KL-07-2019-88120",
      driverId: bus.driverId || "def-1",
      driverPhoto: bus.driverPhoto || "",
      driverVerified: bus.driverVerified !== false,
      driverExperience: bus.driverExperience || 8,
      stops: bus.stops || "Thrissur, Angamaly, Kottayam",
    });

    if (bus.driverId) {
      setSelectedDriverOption(String(bus.driverId));
    }
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleDeleteBus = async (id, bNum) => {
    if (!window.confirm(`Are you sure you want to remove bus "${bNum}" from fleet?`)) return;
    try {
      const res = await axios.delete(`/api/admin/buses/${id}`);
      showNotification(res.data.message || "Bus removed from fleet.");
      fetchBuses();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete bus", true);
    }
  };

  // Filtered lists for search
  const filteredBuses = buses.filter(
    (b) =>
      b.busName?.toLowerCase().includes(busSearch.toLowerCase()) ||
      b.busNumber?.toLowerCase().includes(busSearch.toLowerCase()) ||
      b.fromLocation?.toLowerCase().includes(busSearch.toLowerCase()) ||
      b.toLocation?.toLowerCase().includes(busSearch.toLowerCase())
  );

  const filteredRoutes = routes.filter(
    (r) =>
      r.routeName?.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.routeId?.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.fromLocation?.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.toLocation?.toLowerCase().includes(routeSearch.toLowerCase())
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
            onClick={() => setActiveTab("schedules")}
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
          onClick={() => setActiveTab("schedules")}
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
                          const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(st.latitude - updated[i-1].latitude, 2) + Math.pow(st.longitude - updated[i-1].longitude, 2)) * 111).toFixed(1));
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
                                {isFirst && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700, marginLeft: 6 }}>(Origin)</span>}
                                {isLast && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginLeft: 6 }}>(Destination)</span>}
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
                                    const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(item.latitude - updated[i-1].latitude, 2) + Math.pow(item.longitude - updated[i-1].longitude, 2)) * 111).toFixed(1));
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
                                    const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(item.latitude - updated[i-1].latitude, 2) + Math.pow(item.longitude - updated[i-1].longitude, 2)) * 111).toFixed(1));
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
                                    const pDist = i === 0 ? 0 : Number((Math.sqrt(Math.pow(item.latitude - updated[i-1].latitude, 2) + Math.pow(item.longitude - updated[i-1].longitude, 2)) * 111).toFixed(1));
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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                        Base Departure Time
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 08:00 AM"
                        value={baseStartTime}
                        onChange={(e) => setBaseStartTime(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                      />
                    </div>

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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      padding: "13px",
                      borderRadius: "12px",
                      background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "800",
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(14, 165, 233, 0.4)",
                      marginTop: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="spin" size={16} /> Saving Route to Database...
                      </>
                    ) : routeEditingId ? (
                      "Save Route & Timing Settings ✓"
                    ) : (
                      "Save Route to Database ✓"
                    )}
                  </button>
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
                        <button type="button" onClick={() => handleDeleteRoute(r._id, r.routeId)} style={{ padding: "3px 6px", borderRadius: "4px", background: "#fee2e2", color: "#dc2626", fontSize: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>Delete</button>
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
                    onChange={(e) => setScheduleRouteId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${scheduleErrors.route ? "#ef4444" : "#cbd5e1"}`, fontSize: "14px", fontWeight: "700", outline: "none" }}
                  >
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Assigned Bus (Optional)
                    </label>
                    <select
                      value={scheduleBusId}
                      onChange={(e) => setScheduleBusId(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                    >
                      <option value="">-- No Bus Assigned --</option>
                      {buses.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.busName} ({b.busNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Assigned Driver (Optional)
                    </label>
                    <select
                      value={scheduleDriverId}
                      onChange={(e) => setScheduleDriverId(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                    >
                      <option value="">-- No Driver Assigned --</option>
                      {driversList.map((d) => (
                        <option key={String(d._id || d.id)} value={String(d._id || d.id)}>
                          {d.name} ({d.licenseNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "12px",
                    background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "800",
                    border: "none",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)",
                    marginTop: "8px",
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
                  ) : (
                    "Create Departure Schedule ✓"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Active Schedule Timetables List */}
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginBottom: "14px" }}>
              Active Departure Timetables ({schedules.length})
            </h3>

            {schedules.length === 0 ? (
              <div style={{ background: "#ffffff", padding: "30px", borderRadius: "16px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                <Calendar size={36} style={{ opacity: 0.3, marginBottom: "8px" }} />
                <p style={{ margin: 0, fontWeight: "600" }}>No departure schedules created yet. Add departure times above!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {schedules.map((sch) => {
                  const matchedRoute = typeof sch.route_id === "object" ? sch.route_id : routes.find((r) => r._id === sch.route_id);
                  const routeStops = matchedRoute?.stops || [];

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
                            Bus: <strong>{sch.busNumber || "Unassigned"}</strong> · Driver: <strong>{sch.driverName || "Unassigned"}</strong>
                            {sch.delay_buffer_minutes > 0 && <span style={{ color: "#eab308", fontWeight: "700", marginLeft: "8px" }}>+{sch.delay_buffer_minutes}m Traffic Buffer</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sch._id)}
                          style={{ padding: "6px 12px", borderRadius: "8px", background: "#fee2e2", color: "#dc2626", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}
                        >
                          Delete
                        </button>
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

              {/* Driver Selection Dropdown */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                  <User size={14} style={{ color: "#0ea5e9" }} /> Assigned Driver *
                </label>
                <select
                  value={selectedDriverOption}
                  onChange={(e) => handleDriverSelectChange(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700", background: "#ffffff" }}
                >
                  <option value="">-- Select Driver --</option>
                  {driversList.map((d) => (
                    <option key={String(d._id || d.id)} value={String(d._id || d.id)}>
                      {d.name} ({d.phone} · License: {d.licenseNumber}){d.isDbDriver ? " (Approved Driver)" : ""}
                    </option>
                  ))}
                </select>

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
                          Driver: <strong>{b.driverName || "Suresh Menon"}</strong> ({b.driverPhone || "+91 98471 22334"})
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
                          onClick={() => handleDeleteBus(b._id, b.busNumber)}
                          style={{ padding: "4px 8px", borderRadius: "6px", background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: "700", border: "none", cursor: "pointer" }}
                        >
                          Delete
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
