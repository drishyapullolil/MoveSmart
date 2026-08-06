import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminHeader from "../components/AdminHeader";
import AdminFooter from "../components/AdminFooter";
import { getStoredUser } from "../utils/session";
import {
  Bus,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Route as RouteIcon,
  Shield,
  Search,
  Filter,
  User,
  Phone,
  CreditCard,
  Wifi,
  Tv,
  Zap,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Check,
  UserCheck,
  Compass,
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

// Pre-configured Intercity Route Presets for Quick Auto-Fill
const routePresets = [
  {
    name: "Kochi ➔ Trivandrum Express",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    price: 450,
    duration: "4h 45m",
    departureTime: "06:30 AM",
    arrivalTime: "11:15 AM",
    stops: "Kochi, Vyttila, Tripunithura, Cherthala, Alappuzha, Ambalapuzha, Haripad, Kayamkulam, Karunagappally, Kollam, Attingal, Kazhakkoottam, Trivandrum",
    busNamePrefix: "MoveSmart Greenline Express",
  },
  {
    name: "Kochi ➔ Calicut Direct",
    fromLocation: "Kochi",
    toLocation: "Calicut",
    price: 320,
    duration: "4h 30m",
    departureTime: "07:00 AM",
    arrivalTime: "11:30 AM",
    stops: "Kochi, Aluva, Angamaly, Chalakkudy, Thrissur, Wadakkanchery, Kuttippuram, Valanchery, Ramanattukara, Calicut",
    busNamePrefix: "Malabar Super Fast Express",
  },
  {
    name: "Kochi ➔ Palakkad Super Fast",
    fromLocation: "Kochi",
    toLocation: "Palakkad",
    price: 380,
    duration: "4h 30m",
    departureTime: "09:00 AM",
    arrivalTime: "01:30 PM",
    stops: "Kochi, Aluva, Angamaly, Chalakkudy, Thrissur, Vadakkencherry, Alathur, Palakkad",
    busNamePrefix: "Palghat Rider Super Fast",
  },
  {
    name: "Kochi ➔ Kannur Multi-Axle",
    fromLocation: "Kochi",
    toLocation: "Kannur",
    price: 750,
    duration: "6h 45m",
    departureTime: "10:15 PM",
    arrivalTime: "05:00 AM",
    stops: "Kochi, Aluva, Thrissur, Kuttippuram, Calicut, Koyilandy, Vadakara, Thalassery, Kannur",
    busNamePrefix: "North Malabar Volvo Line",
  },
  {
    name: "Kochi ➔ Kottayam ➔ Erattupetta Corridor",
    fromLocation: "Kochi",
    toLocation: "Erattupetta",
    price: 280,
    duration: "3h 15m",
    departureTime: "10:00 AM",
    arrivalTime: "01:15 PM",
    stops: "Kochi, Tripunithura, Mulanthuruthy, Piravom, Ettumanoor, Kottayam, Manarcadu, Malam, Anichuvadu, Kidangoor, Pala, Erattupetta",
    busNamePrefix: "Kottayam Royal City Cruiser",
  },
  {
    name: "Kottayam ➔ Erattupetta Regional Shuttle",
    fromLocation: "Kottayam",
    toLocation: "Erattupetta",
    price: 120,
    duration: "1h 30m",
    departureTime: "11:30 AM",
    arrivalTime: "01:00 PM",
    stops: "Kottayam, Manarcadu, Malam, Anichuvadu, Vengotta, Kidangoor, Pala, Bharananganam, Plassanal, Erattupetta",
    busNamePrefix: "Highland Shuttle Express",
  },
];

export default function AdminAddBusRoute() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  const [activeTab, setActiveTab] = useState("buses"); // "buses" | "routes"

  // Feedback messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Lists
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [driversList, setDriversList] = useState(defaultFleetDrivers);
  const [selectedDriverOption, setSelectedDriverOption] = useState("def-1");
  const [selectedPresetOption, setSelectedPresetOption] = useState("");

  // Search & Filter
  const [busSearch, setBusSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");

  // Bus Form State
  const [busEditingId, setBusEditingId] = useState(null);
  const [busForm, setBusForm] = useState({
    busNumber: "",
    busName: "",
    busType: "AC Seater / Sleeper (2+2)",
    operator: "MoveSmart Fleet Ops",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    departureTime: "06:30 AM",
    arrivalTime: "11:15 AM",
    duration: "4h 45m",
    totalSeats: 32,
    price: 450,
    amenities: ["Wi-Fi", "Charging Port", "Live Tracking", "AC"],
    driverName: "Suresh Menon",
    driverPhone: "+91 98471 22334",
    driverLicense: "KL-07-2019-88120",
    driverId: "def-1",
    driverPhoto: "",
    driverVerified: true,
    driverExperience: 8,
    stops: "Kochi, Vyttila, Tripunithura, Cherthala, Alappuzha, Ambalapuzha, Haripad, Kayamkulam, Karunagappally, Kollam, Attingal, Kazhakkoottam, Trivandrum",
  });

  // Available Amenity Options
  const amenityOptions = [
    "Wi-Fi",
    "Charging Port",
    "Live Tracking",
    "Water Bottle",
    "AC",
    "Reclining Seats",
    "Reading Light",
    "Blanket & Pillow",
    "Music System",
    "Emergency Exit",
  ];

  // Route Form State
  const [routeEditingId, setRouteEditingId] = useState(null);
  const [routeForm, setRouteForm] = useState({
    routeId: "",
    routeName: "",
    fromLocation: "",
    toLocation: "",
    distanceKm: 150,
    duration: "3h 30m",
    frequency: "Every 30 mins",
    stops: "",
    fare: 350,
    status: "Active",
  });

  // Verify Admin Access & Fetch Initial Data
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
      fetchDrivers();
    }
  }, [user, navigate]);

  const fetchDrivers = async () => {
    try {
      const res = await axios.get("/api/admin/drivers");
      if (res.data && res.data.drivers && Array.isArray(res.data.drivers)) {
        // Merge DB drivers with default fleet drivers
        const dbDrivers = res.data.drivers.map((d) => ({
          id: d._id,
          _id: d._id,
          name: d.name,
          phone: d.phone || "+91 98470 00000",
          licenseNumber: d.licenseNumber || "KL-07-2020-00100",
          experienceYears: d.experienceYears || 5,
          verificationStatus: d.verificationStatus || "Approved",
          profilePic: d.profilePic || "",
        }));

        const existingNames = new Set(dbDrivers.map((d) => d.name.toLowerCase()));
        const uniqueFleet = defaultFleetDrivers.filter((f) => !existingNames.has(f.name.toLowerCase()));
        const merged = [...dbDrivers, ...uniqueFleet];
        setDriversList(merged);
      }
    } catch (err) {
      console.warn("Could not fetch DB drivers list, using fleet defaults:", err.message);
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
      try {
        const fallbackRes = await axios.get("/api/buses");
        if (fallbackRes.data.success) setBuses(fallbackRes.data.buses || []);
      } catch (e) {
        console.error("Fallback fetch error:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await axios.get("/api/admin/routes");
      if (res.data.success) {
        setRoutes(res.data.routes || []);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

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

  // ---------------- BUS HANDLERS ----------------

  const handleAmenityToggle = (amenity) => {
    setBusForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleDriverSelect = (e) => {
    const selectedVal = e.target.value;
    setSelectedDriverOption(selectedVal);

    if (!selectedVal || selectedVal === "custom") {
      return;
    }

    const found = driversList.find((d) => String(d._id || d.id) === String(selectedVal));
    if (found) {
      setBusForm((prev) => ({
        ...prev,
        driverName: found.name || "",
        driverPhone: found.phone || "",
        driverLicense: found.licenseNumber || "",
        driverId: found._id || found.id || "",
        driverPhoto: found.profilePic || found.licenseImage || "",
        driverVerified: found.verificationStatus === "Approved" || found.verificationStatus === undefined,
        driverExperience: found.experienceYears || 8,
      }));
    }
  };

  const handlePresetSelect = (e) => {
    const val = e.target.value;
    setSelectedPresetOption(val);
    if (!val) return;

    // Check pre-configured presets
    const preset = routePresets.find((p) => p.name === val);
    if (preset) {
      setBusForm((prev) => ({
        ...prev,
        busName: prev.busName || preset.busNamePrefix,
        fromLocation: preset.fromLocation,
        toLocation: preset.toLocation,
        price: preset.price,
        duration: preset.duration,
        departureTime: preset.departureTime,
        arrivalTime: preset.arrivalTime,
        stops: preset.stops,
      }));
      return;
    }

    // Check DB routes
    const dbRoute = routes.find((r) => r.routeName === val || r.routeId === val);
    if (dbRoute) {
      setBusForm((prev) => ({
        ...prev,
        busName: prev.busName || `Express (${dbRoute.routeName})`,
        fromLocation: dbRoute.fromLocation,
        toLocation: dbRoute.toLocation,
        price: dbRoute.fare || 350,
        duration: dbRoute.duration || "4h 00m",
        stops: Array.isArray(dbRoute.stops) ? dbRoute.stops.join(", ") : dbRoute.stops || "",
      }));
    }
  };

  const handleBusSubmit = async (e) => {
    e.preventDefault();
    try {
      if (busEditingId) {
        // Update Bus
        const res = await axios.put(`/api/admin/buses/${busEditingId}`, busForm);
        showNotification(res.data.message || "Bus updated successfully!");
        if (res.data.bus) {
          setBuses((prev) => prev.map((b) => (b._id === busEditingId ? res.data.bus : b)));
        }
        setBusEditingId(null);
      } else {
        // Create Bus
        const res = await axios.post("/api/admin/buses", busForm);
        showNotification(res.data.message || "New bus registered successfully! 🎉");
        if (res.data.bus) {
          setBuses((prev) => [res.data.bus, ...prev]);
        }
      }
      resetBusForm();
      fetchBuses();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to save bus details";
      showNotification(errorMsg, true);
    }
  };

  const handleEditBus = (bus) => {
    setBusEditingId(bus._id);
    const matchedDriver = driversList.find((d) => d.name.toLowerCase() === (bus.driverName || "").toLowerCase());

    setBusForm({
      busNumber: bus.busNumber || "",
      busName: bus.busName || "",
      busType: bus.busType || "AC Seater / Sleeper (2+2)",
      operator: bus.operator || "MoveSmart Fleet Ops",
      fromLocation: bus.fromLocation || "",
      toLocation: bus.toLocation || "",
      departureTime: bus.departureTime || "06:30 AM",
      arrivalTime: bus.arrivalTime || "11:15 AM",
      duration: bus.duration || "4h 45m",
      totalSeats: bus.totalSeats || 32,
      price: bus.price || 450,
      amenities: bus.amenities || ["Wi-Fi", "Charging Port", "AC"],
      driverName: bus.driverName || "Suresh Menon",
      driverPhone: bus.driverPhone || "+91 98471 22334",
      driverLicense: bus.driverLicense || "KL-07-2019-88120",
      driverId: bus.driverId || (matchedDriver ? matchedDriver._id || matchedDriver.id : ""),
      driverPhoto: bus.driverPhoto || "",
      driverVerified: bus.driverVerified !== undefined ? bus.driverVerified : true,
      driverExperience: bus.driverExperience || 8,
      stops: Array.isArray(bus.stops) ? bus.stops.join(", ") : bus.stops || "",
    });

    if (matchedDriver) {
      setSelectedDriverOption(String(matchedDriver._id || matchedDriver.id));
    } else {
      setSelectedDriverOption("custom");
    }

    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleDeleteBus = async (id, busName) => {
    if (!window.confirm(`Are you sure you want to delete bus "${busName}"? This action cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/admin/buses/${id}`);
      showNotification(res.data.message || "Bus deleted.");
      fetchBuses();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete bus", true);
    }
  };

  const resetBusForm = () => {
    setBusEditingId(null);
    setSelectedPresetOption("");
    const firstDriver = driversList[0] || defaultFleetDrivers[0];
    setSelectedDriverOption(String(firstDriver._id || firstDriver.id));
    setBusForm({
      busNumber: "",
      busName: "",
      busType: "AC Seater / Sleeper (2+2)",
      operator: "MoveSmart Fleet Ops",
      fromLocation: "Kochi",
      toLocation: "Trivandrum",
      departureTime: "06:30 AM",
      arrivalTime: "11:15 AM",
      duration: "4h 45m",
      totalSeats: 32,
      price: 450,
      amenities: ["Wi-Fi", "Charging Port", "Live Tracking", "AC"],
      driverName: firstDriver.name,
      driverPhone: firstDriver.phone,
      driverLicense: firstDriver.licenseNumber,
      driverId: firstDriver._id || firstDriver.id,
      driverPhoto: firstDriver.profilePic || "",
      driverVerified: firstDriver.verificationStatus === "Approved",
      driverExperience: firstDriver.experienceYears || 8,
      stops: "Kochi, Vyttila, Tripunithura, Cherthala, Alappuzha, Ambalapuzha, Haripad, Kayamkulam, Karunagappally, Kollam, Attingal, Kazhakkoottam, Trivandrum",
    });
  };

  // ---------------- ROUTE HANDLERS ----------------

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    try {
      if (routeEditingId) {
        // Update Route
        const res = await axios.put(`/api/admin/routes/${routeEditingId}`, routeForm);
        showNotification(res.data.message || "Route updated successfully!");
        setRouteEditingId(null);
      } else {
        // Create Route
        const res = await axios.post("/api/admin/routes", routeForm);
        showNotification(res.data.message || "New route registered successfully! 🛣️");
      }
      resetRouteForm();
      fetchRoutes();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to save route details", true);
    }
  };

  const handleEditRoute = (route) => {
    setRouteEditingId(route._id);
    setRouteForm({
      routeId: route.routeId || "",
      routeName: route.routeName || "",
      fromLocation: route.fromLocation || "",
      toLocation: route.toLocation || "",
      distanceKm: route.distanceKm || 150,
      duration: route.duration || "3h 30m",
      frequency: route.frequency || "Every 30 mins",
      stops: Array.isArray(route.stops) ? route.stops.join(", ") : route.stops || "",
      fare: route.fare || 350,
      status: route.status || "Active",
    });
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleDeleteRoute = async (id, routeId) => {
    if (!window.confirm(`Are you sure you want to delete route "${routeId}"?`)) return;
    try {
      const res = await axios.delete(`/api/admin/routes/${id}`);
      showNotification(res.data.message || "Route deleted.");
      fetchRoutes();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete route", true);
    }
  };

  const handleToggleRouteStatus = async (route) => {
    const newStatus = route.status === "Active" ? "Suspended" : "Active";
    try {
      const res = await axios.put(`/api/admin/routes/${route._id}`, { status: newStatus });
      showNotification(`Route ${route.routeId} status changed to ${newStatus}.`);
      fetchRoutes();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update status", true);
    }
  };

  const resetRouteForm = () => {
    setRouteEditingId(null);
    setRouteForm({
      routeId: "",
      routeName: "",
      fromLocation: "",
      toLocation: "",
      distanceKm: 150,
      duration: "3h 30m",
      frequency: "Every 30 mins",
      stops: "",
      fare: 350,
      status: "Active",
    });
  };

  // Filtered Lists
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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", fontFamily: "var(--font-sans, system-ui)" }}>
      <AdminHeader />

      {/* Hero Banner Header */}
      <section
        style={{
          background: "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)",
          color: "#ffffff",
          padding: "40px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ maxWidth: "1380px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", marginBottom: "12px", border: "1px solid rgba(74, 222, 128, 0.3)" }}>
              <Shield size={16} /> Admin Portal Console
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", letterSpacing: "-0.5px", margin: 0, color: "#4ade80", textShadow: "0 2px 10px rgba(74,222,128,0.3)" }}>
              Bus &amp; Route Management
            </h1>
            <p style={{ color: "#c4b5fd", fontSize: "15px", marginTop: "8px", maxWidth: "600px" }}>
              Add new intercity buses, update vehicle specifications, assign drivers, configure routes, set ticket pricing, and manage operational schedules.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <img src="/logo.png" alt="MoveSmart" style={{ height: "64px", opacity: 0.9, filter: "drop-shadow(0 4px 12px rgba(74, 222, 128, 0.2))" }} />

            <Link
              to="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "700",
                textDecoration: "none",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                transition: "all 0.2s ease",
              }}
            >
              ← Back to Main Admin
            </Link>
            <button
              onClick={() => {
                fetchBuses();
                fetchRoutes();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--primary), #2f855a)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(56, 161, 105, 0.4)",
              }}
            >
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Alerts Banner */}
        {successMsg && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              fontSize: "14px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.1)",
            }}
          >
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "#fef2f2",
              border: "1px solid #fecdd3",
              color: "#b91c1c",
              fontSize: "14px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.1)",
            }}
          >
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Analytics Quick Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Registered Buses</span>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bus size={20} />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>{buses.length}</div>
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>Active in Fleet</span>
          </div>

          <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Active Routes</span>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RouteIcon size={20} />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>{routes.filter((r) => r.status === "Active").length}</div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Out of {routes.length} total</span>
          </div>

          <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Total Capacity</span>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#faf5ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={20} />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>
              {buses.reduce((sum, b) => sum + (b.totalSeats || 0), 0)} Seats
            </div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Across all active buses</span>
          </div>

          <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Avg Ticket Price</span>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={20} />
              </div>
            </div>
            <div style={{ fontSize: "30px", fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>
              ₹{buses.length > 0 ? Math.round(buses.reduce((sum, b) => sum + (b.price || 0), 0) / buses.length) : 0}
            </div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Standard intercity fare</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "28px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
          <button
            onClick={() => setActiveTab("buses")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "800",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: activeTab === "buses" ? "linear-gradient(135deg, var(--primary), #2f855a)" : "transparent",
              color: activeTab === "buses" ? "#ffffff" : "#64748b",
              boxShadow: activeTab === "buses" ? "0 4px 14px rgba(56, 161, 105, 0.3)" : "none",
            }}
          >
            <Bus size={18} /> Add &amp; Manage Bus Details ({buses.length})
          </button>

          <button
            onClick={() => setActiveTab("routes")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "800",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: activeTab === "routes" ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "transparent",
              color: activeTab === "routes" ? "#ffffff" : "#64748b",
              boxShadow: activeTab === "routes" ? "0 4px 14px rgba(14, 165, 233, 0.3)" : "none",
            }}
          >
            <RouteIcon size={18} /> Add &amp; Manage Bus Routes ({routes.length})
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: ADD & MANAGE BUS DETAILS */}
        {/* ==================================================== */}
        {activeTab === "buses" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "32px", alignItems: "start" }}>

            {/* Left Column: Add / Edit Bus Form */}
            <div style={{ background: "#ffffff", padding: "28px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                    {busEditingId ? "Edit Bus Specifications" : "Register New Bus"}
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Enter vehicle details, schedule, pricing &amp; assigned driver information.
                  </p>
                </div>
                {busEditingId && (
                  <button
                    onClick={resetBusForm}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: "#f1f5f9", color: "#64748b", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <form onSubmit={handleBusSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Quick Route Preset Auto-Fill */}
                <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", padding: "14px 16px", borderRadius: "14px", border: "1px solid #bbf7d0", marginBottom: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "800", color: "#166534", marginBottom: "6px" }}>
                    <Zap size={14} style={{ color: "#16a34a" }} />
                    <span>⚡ Quick Route Preset (Auto-Fill Locations &amp; Timings)</span>
                  </label>
                  <select
                    value={selectedPresetOption}
                    onChange={handlePresetSelect}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #86efac", fontSize: "13px", fontWeight: "700", outline: "none", background: "#ffffff", color: "#14532d" }}
                  >
                    <option value="">-- Choose a Preset Route to Auto-Fill --</option>
                    <optgroup label="Popular Intercity Corridor Presets">
                      {routePresets.map((p, idx) => (
                        <option key={`preset-${idx}`} value={p.name}>
                          {p.name} (₹{p.price} | {p.duration})
                        </option>
                      ))}
                    </optgroup>
                    {routes.length > 0 && (
                      <optgroup label="Database Registered Active Routes">
                        {routes.map((r) => (
                          <option key={r._id} value={r.routeName}>
                            {r.routeId}: {r.routeName} (₹{r.fare || 350})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Bus Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KL-07-MS-1008"
                      value={busForm.busNumber}
                      onChange={(e) => setBusForm({ ...busForm, busNumber: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Bus Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MoveSmart Greenline Express"
                      value={busForm.busName}
                      onChange={(e) => setBusForm({ ...busForm, busName: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Bus Type Category *
                    </label>
                    <select
                      value={busForm.busType}
                      onChange={(e) => setBusForm({ ...busForm, busType: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none", background: "#ffffff" }}
                    >
                      <option value="AC Seater / Sleeper (2+2)">AC Seater / Sleeper (2+2)</option>
                      <option value="AC Luxury Seater (2+2)">AC Luxury Seater (2+2)</option>
                      <option value="Non-AC Deluxe Seater (2+2)">Non-AC Deluxe Seater (2+2)</option>
                      <option value="AC Sleeper (2+1)">AC Sleeper (2+1)</option>
                      <option value="AC Pushback Seater (2+2)">AC Pushback Seater (2+2)</option>
                      <option value="AC Executive Seater (2+2)">AC Executive Seater (2+2)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Fleet Operator Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MoveSmart Fleet Ops"
                      value={busForm.operator}
                      onChange={(e) => setBusForm({ ...busForm, operator: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Locations */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      From (Origin Location) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kochi"
                      value={busForm.fromLocation}
                      onChange={(e) => setBusForm({ ...busForm, fromLocation: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      To (Destination Location) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Trivandrum"
                      value={busForm.toLocation}
                      onChange={(e) => setBusForm({ ...busForm, toLocation: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Intermediate Route Stops Input */}
                <div>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                    <span>Route Intermediate Stops (Comma Separated)</span>
                    <span style={{ fontSize: "11px", color: "#0ea5e9", fontWeight: "600" }}>Enables stop-by-stop matching</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kochi, Vyttila, Alappuzha, Kollam, Trivandrum"
                    value={busForm.stops}
                    onChange={(e) => setBusForm({ ...busForm, stops: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "4px" }}>
                    Enter ordered stations along the route. Passengers searching for intermediate stops (e.g. Cherthala to Kollam) will find this bus!
                  </span>
                </div>

                {/* Timings */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Departure Time *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 06:30 AM"
                      value={busForm.departureTime}
                      onChange={(e) => setBusForm({ ...busForm, departureTime: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Arrival Time *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 11:15 AM"
                      value={busForm.arrivalTime}
                      onChange={(e) => setBusForm({ ...busForm, arrivalTime: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Trip Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4h 45m"
                      value={busForm.duration}
                      onChange={(e) => setBusForm({ ...busForm, duration: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Capacity & Price */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Total Seat Capacity *
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="60"
                      required
                      value={busForm.totalSeats}
                      onChange={(e) => setBusForm({ ...busForm, totalSeats: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Ticket Price per Seat (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={busForm.price}
                      onChange={(e) => setBusForm({ ...busForm, price: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Amenities Selection */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "8px" }}>
                    Onboard Amenities
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {amenityOptions.map((item) => {
                      const isChecked = busForm.amenities.includes(item);
                      return (
                        <label
                          key={item}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            border: `1px solid ${isChecked ? "var(--primary)" : "#e2e8f0"}`,
                            background: isChecked ? "#f0fdf4" : "#f8fafc",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: isChecked ? "#15803d" : "#475569",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleAmenityToggle(item)}
                            style={{ accentColor: "var(--primary)" }}
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned Driver Details Section with Dropdown List */}
                <div style={{ borderTop: "2px dashed #e2e8f0", paddingTop: "18px", marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      <UserCheck size={18} style={{ color: "var(--primary)" }} />
                      <span>Assign Registered Driver *</span>
                    </span>
                    <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>
                      Verified Fleet
                    </span>
                  </div>

                  {/* Driver Dropdown Select */}
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Select Driver from System Database:
                    </label>
                    <select
                      value={selectedDriverOption}
                      onChange={handleDriverSelect}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #2563eb",
                        fontSize: "13px",
                        fontWeight: "700",
                        outline: "none",
                        background: "#ffffff",
                        color: "#1e3a8a",
                        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.08)",
                      }}
                    >
                      <option value="">-- Choose Registered Fleet Driver --</option>
                      {driversList.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          👨‍✈️ {d.name} — {d.phone} | Lic: {d.licenseNumber} ({d.verificationStatus || "Approved"})
                        </option>
                      ))}
                      <option value="custom">✏️ Enter Custom / Manual Driver Details...</option>
                    </select>
                  </div>

                  {/* Selected Driver Summary Card Preview */}
                  {busForm.driverName && (
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "12px 16px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800" }}>
                        {busForm.driverName.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>{busForm.driverName}</span>
                          <span style={{ fontSize: "11px", background: busForm.driverVerified ? "#dcfce7" : "#fef3c7", color: busForm.driverVerified ? "#15803d" : "#b45309", padding: "2px 8px", borderRadius: "12px", fontWeight: "800" }}>
                            {busForm.driverVerified ? "Approved Driver ✅" : "Pending Approval ⚠️"}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", display: "flex", gap: "14px" }}>
                          <span>📞 {busForm.driverPhone}</span>
                          <span>💳 Lic: {busForm.driverLicense}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Editable Fields for Fine Tuning or Custom Driver */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px", marginBottom: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Driver Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Driver Name"
                        value={busForm.driverName}
                        onChange={(e) => setBusForm({ ...busForm, driverName: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Phone Number</label>
                      <input
                        type="text"
                        required
                        placeholder="+91 Phone"
                        value={busForm.driverPhone}
                        onChange={(e) => setBusForm({ ...busForm, driverPhone: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Driving License Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KL-07-2018-99210"
                      value={busForm.driverLicense}
                      onChange={(e) => setBusForm({ ...busForm, driverLicense: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, var(--primary), #2f855a)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "800",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(56, 161, 105, 0.4)",
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Plus size={18} />
                  <span>{busEditingId ? "Save Bus Changes" : "Register Bus in MongoDB"}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Existing Bus Directory */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  Active Fleet Buses ({filteredBuses.length})
                </h3>

                <div style={{ position: "relative", width: "220px" }}>
                  <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search bus..."
                    value={busSearch}
                    onChange={(e) => setBusSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                  />
                </div>
              </div>

              {filteredBuses.length === 0 ? (
                <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", textTransform: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  <Bus size={40} style={{ opacity: 0.3, marginBottom: "10px" }} />
                  <p style={{ margin: 0, fontWeight: "600" }}>No registered buses found matching search criteria.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {filteredBuses.map((b) => (
                    <div
                      key={b._id}
                      style={{
                        background: "#ffffff",
                        padding: "20px",
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>{b.busName}</span>
                            <span style={{ fontSize: "12px", fontWeight: "700", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", color: "#475569", fontFamily: "monospace" }}>
                              {b.busNumber}
                            </span>
                          </div>
                          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                            {b.busType} · <strong style={{ color: "var(--primary)" }}>{b.operator}</strong>
                          </div>
                        </div>

                        <div style={{ fontSize: "18px", fontWeight: "900", color: "#16a34a" }}>
                          ₹{b.price}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", marginBottom: "12px" }}>
                        <MapPin size={15} style={{ color: "#ef4444" }} />
                        <span style={{ fontWeight: "700" }}>{b.fromLocation}</span>
                        <ArrowRight size={14} style={{ color: "#94a3b8" }} />
                        <span style={{ fontWeight: "700" }}>{b.toLocation}</span>
                        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b" }}>
                          <Clock size={13} style={{ display: "inline", marginRight: "4px" }} />
                          {b.departureTime} - {b.arrivalTime} ({b.duration})
                        </span>
                      </div>

                      {/* Amenities chips */}
                      {b.amenities && b.amenities.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                          {b.amenities.map((am) => (
                            <span key={am} style={{ fontSize: "11px", fontWeight: "600", background: "#ecfdf5", color: "#047857", padding: "3px 8px", borderRadius: "6px" }}>
                              ✓ {am}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer Info & Actions */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Seats: <strong style={{ color: "#0f172a" }}>{b.availableSeats || b.totalSeats}/{b.totalSeats} Available</strong>
                          {b.driverName && (
                            <span style={{ marginLeft: "12px" }}>Driver: <strong>{b.driverName}</strong></span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleEditBus(b)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              fontSize: "12px",
                              fontWeight: "700",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBus(b._id, b.busName)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#fef2f2",
                              color: "#dc2626",
                              fontSize: "12px",
                              fontWeight: "700",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: ADD & MANAGE BUS ROUTES */}
        {/* ==================================================== */}
        {activeTab === "routes" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "32px", alignItems: "start" }}>

            {/* Left Column: Add / Edit Route Form */}
            <div style={{ background: "#ffffff", padding: "28px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                    {routeEditingId ? "Edit Bus Route Settings" : "Configure New Route"}
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Define route ID, origin, destination, intermediate stops, distance &amp; frequency.
                  </p>
                </div>
                {routeEditingId && (
                  <button
                    onClick={resetRouteForm}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: "#f1f5f9", color: "#64748b", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleRouteSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Route ID Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RT-101"
                      value={routeForm.routeId}
                      onChange={(e) => setRouteForm({ ...routeForm, routeId: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none", textTransform: "uppercase" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Route Descriptive Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kochi ➔ Trivandrum Express"
                      value={routeForm.routeName}
                      onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Starting Stop / Origin *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kochi"
                      value={routeForm.fromLocation}
                      onChange={(e) => setRouteForm({ ...routeForm, fromLocation: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Ending Stop / Destination *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Trivandrum"
                      value={routeForm.toLocation}
                      onChange={(e) => setRouteForm({ ...routeForm, toLocation: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Distance (km) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={routeForm.distanceKm}
                      onChange={(e) => setRouteForm({ ...routeForm, distanceKm: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4h 45m"
                      value={routeForm.duration}
                      onChange={(e) => setRouteForm({ ...routeForm, duration: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Departure Frequency
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Every 30 mins"
                      value={routeForm.frequency}
                      onChange={(e) => setRouteForm({ ...routeForm, frequency: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Intermediate Stops */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                    Intermediate Bus Stops (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alappuzha, Kollam, Kazhakkoottam"
                    value={routeForm.stops}
                    onChange={(e) => setRouteForm({ ...routeForm, stops: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginTop: "4px" }}>
                    Separate each intermediate stop with a comma.
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Base Fare Standard (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={routeForm.fare}
                      onChange={(e) => setRouteForm({ ...routeForm, fare: Number(e.target.value) })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "6px" }}>
                      Route Status
                    </label>
                    <select
                      value={routeForm.status}
                      onChange={(e) => setRouteForm({ ...routeForm, status: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600", outline: "none", background: "#ffffff" }}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "800",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Plus size={18} />
                  <span>{routeEditingId ? "Save Route Settings" : "Add Route to MongoDB"}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Route Directory */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  Configured Routes ({filteredRoutes.length})
                </h3>

                <div style={{ position: "relative", width: "220px" }}>
                  <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search route..."
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                  />
                </div>
              </div>

              {filteredRoutes.length === 0 ? (
                <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  <RouteIcon size={40} style={{ opacity: 0.3, marginBottom: "10px" }} />
                  <p style={{ margin: 0, fontWeight: "600" }}>No route configurations found matching search criteria.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {filteredRoutes.map((r) => (
                    <div
                      key={r._id}
                      style={{
                        background: "#ffffff",
                        padding: "20px",
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "800", background: "#e0f2fe", color: "#0369a1", padding: "3px 10px", borderRadius: "8px" }}>
                              {r.routeId}
                            </span>
                            <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>{r.routeName}</span>
                          </div>
                          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                            Distance: <strong>{r.distanceKm} km</strong> · Duration: <strong>{r.duration}</strong> · Frequency: <strong>{r.frequency}</strong>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            color: r.status === "Active" ? "#15803d" : "#b91c1c",
                            background: r.status === "Active" ? "#dcfce7" : "#fee2e2",
                          }}
                        >
                          {r.status}
                        </span>
                      </div>

                      {/* Stops list chips */}
                      {r.stops && r.stops.length > 0 && (
                        <div style={{ marginTop: "10px", background: "#f8fafc", padding: "10px", borderRadius: "10px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "4px" }}>
                            STOPS INCLUDED:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e293b", background: "#ffffff", padding: "2px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                              🟢 {r.fromLocation}
                            </span>
                            {r.stops.map((st, idx) => (
                              <span key={idx} style={{ fontSize: "11px", fontWeight: "600", color: "#475569", background: "#ffffff", padding: "2px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                                📍 {st}
                              </span>
                            ))}
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e293b", background: "#ffffff", padding: "2px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                              🏁 {r.toLocation}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginTop: "14px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                          Base Fare: <span style={{ color: "#16a34a" }}>₹{r.fare}</span>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleToggleRouteStatus(r)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: r.status === "Active" ? "#fef3c7" : "#dcfce7",
                              color: r.status === "Active" ? "#b45309" : "#15803d",
                              fontSize: "12px",
                              fontWeight: "700",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {r.status === "Active" ? "Suspend" : "Reactivate"}
                          </button>
                          <button
                            onClick={() => handleEditRoute(r)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              fontSize: "12px",
                              fontWeight: "700",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(r._id, r.routeId)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#fef2f2",
                              color: "#dc2626",
                              fontSize: "12px",
                              fontWeight: "700",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AdminFooter />
    </div>
  );
}
