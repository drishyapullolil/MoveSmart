import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { getStoredUser, setStoredUser, clearStoredSession, getStoredToken } from "../utils/session";

// ----------------------------------------------------
// TRANSLATIONS DICTIONARY (English & Malayalam)
// ----------------------------------------------------
const TRANSLATIONS = {
  en: {
    langToggle: "മലയാളം (ML)",
    brandTitle: "MoveSmart",
    driverBadge: "DRIVER PORTAL",
    subTitle: "Kerala Private Transit Portal",
    onDuty: "🟢 ON DUTY",
    offDuty: "🔴 OFF DUTY",
    signOut: "Sign Out",
    welcome: "Hello, Driver 👋",
    verifiedDriver: "Admin Verified Driver ✅",
    pendingReview: "Pending Admin Review ⏳",
    unverifiedDriver: "Unverified Driver ⚠️",
    markAttendance: "✓ Mark Today's Attendance",
    attendanceDone: "✓ Attendance Marked at",
    reportIssue: "⚠️ Report Issue",
    
    // Nav Tabs
    tabDashboard: "📊 Dashboard",
    tabBuses: "🚌 Bus Database",
    tabLeave: "🌴 Apply Leave",
    tabProfile: "🪪 Profile & License",
    tabTrips: "📅 Scheduled Trips",
    tabPayments: "💳 Collections",

    // Dashboard Overview
    activeBusRoute: "Active Bus & Route",
    tripLive: "● TRIP LIVE",
    readyDeparture: "READY FOR DEPARTURE",
    busNo: "Assigned Bus No",
    depTime: "Departure Time",
    capacity: "Bus Capacity",
    passengers: "Passengers",
    startTrip: "🚀 START TRIP NOW",
    endTrip: "🏁 END CURRENT TRIP",
    simulateRfid: "💳 Simulate RFID Pass Tap",
    passengersTracker: "Passengers Onboard Tracker",
    seats: "Seats",
    gpsTelemetry: "📍 Live GPS Telemetry & Map Tracker",
    gpsActive: "📡 GPS Active",
    gpsOff: "❌ GPS Off",
    speed: "Speed",
    todayCollections: "Today's Total Collections",
    fareMethod: "Fare Method",
    rfidCash: "RFID Tap + Ticket Cash",
    adminAlerts: "🔔 Admin Alerts & Notifications",
    delayWarning: "Delay Warning! Traffic Ahead",
    trafficNotice: "Heavy traffic reported near Vytilla Junction. Drive carefully.",
    passengerAlert: "Passenger Waiting Alert",
    rfidPassengersWaiting: "2 passengers waiting with prepaid Smart RFID Passes.",

    // Uber-Style GPS Section
    liveGpsTitle: "📍 Real-Time Bus GPS Tracker (Uber-Style)",
    liveGpsSubtitle: "Live GPS coordinates broadcasted directly to MoveSmart Passenger App",
    startGps: "📡 Start Live GPS Broadcast",
    pauseGps: "⏸️ Pause GPS Broadcast",
    centerMap: "🎯 Center Map on Bus",
    simulationMode: "🎮 Demo Route Simulation",
    realGpsMode: "📡 Real Device GPS",
    gpsAccuracy: "Accuracy",
    liveBroadcasting: "🔴 LIVE BROADCASTING TO PASSENGERS",
    currentLocation: "Current Location",

    // Bus Database
    busDbTitle: "MoveSmart Fleet Bus Database",
    busDbSubtitle: "Select a bus to request Admin assignment (min 2 hrs before departure).",
    searchPlaceholder: "Search bus by name, number, or route...",
    loadingBuses: "Loading Buses Database...",
    noBusesFound: "No buses found in database.",
    lockedBus: "🔒 Locked (< 2 hrs to departure)",
    assignedDriver: "✅ Currently Assigned Driver",
    pendingReq: "⏳ Request Pending Admin Approval",
    requestToDrive: "Request Admin to Drive",
    lockedNotice: "🔒 Locked (Must request > 2 hrs before)",
    myBusRequests: "Your Bus Drive Requests & Status",
    approvedByAdmin: "Approved by Admin ✅",
    rejectedByAdmin: "Rejected by Admin ❌",

    // Leave
    applyLeaveTitle: "Apply for Driver Leave",
    applyLeaveSubtitle: "Select Full Day or Half Day leave and submit for Admin approval.",
    driverNameEmail: "Driver Name & Email",
    leaveType: "Leave Type",
    fullDay: "☀️ Full Day Leave",
    halfDay: "🌗 Half Day Leave",
    halfDaySlot: "Half-Day Slot",
    forenoon: "Forenoon (AM)",
    afternoon: "Afternoon (PM)",
    leaveDate: "Leave Date",
    leaveReason: "Reason for Leave",
    reasonPlaceholder: "Enter reason for taking leave...",
    submitLeaveBtn: "Submit Leave Application ✓",
    submitting: "Submitting...",
    leaveHistoryTitle: "Your Leave History & Status",
    noLeaves: "No leave requests submitted yet.",

    // Profile & Verification
    profileTitle: "Driver Profile & Driving License",
    profileSubtitle: "Provide your driving license details and profile picture for verification.",
    licenseNo: "Driving License Number",
    licensePlaceholder: "e.g. KL-07-2018-99210",
    phone: "Contact Phone",
    experience: "Experience (Years)",
    profilePic: "Profile Picture (Photo)",
    photoAttached: "Photo Attached ✓",
    licenseDoc: "Driving License Photo Document",
    docAttached: "License Document Attached ✓",
    submitProfileBtn: "Submit Profile & License for Admin Approval ✓",
    verificationStatusBadge: "Verification Status Badge",
    verifiedNotice: "🔒 Once Admin verifies your driving license and photo, passengers will see your verified badge.",

    // Trips & Payments
    scheduledTripsTitle: "Today's Scheduled Trips",
    selectTrip: "Select Trip",
    collectionsTitle: "Trip Collections & Payments Log",

    // Modal
    reportIssueTitle: "🚨 Report Bus Issue / Breakdown",
    selectIssueCategory: "Select Issue Category",
    issueBreakdown: "Engine Problem / Breakdown",
    issueTraffic: "Severe Route Traffic Delay",
    issuePuncture: "Tyre Puncture / Suspension",
    issueMedical: "Passenger Medical Emergency",
    notesDetails: "Notes / Location Details",
    notesPlaceholder: "Type location or notes...",
    cancel: "Cancel",
    submitAlert: "Submit Alert ✓",

    // Auth Screens
    loadingDashboard: "Loading Dashboard...",
    accountPendingTitle: "Account Pending Approval",
    accountPendingMsg: "Your account is waiting for admin approval. Please check back later.",
    accountRejectedTitle: "Account Rejected",
    accountRejectedMsg: "Your account has been rejected. Please contact admin.",
    logout: "Logout"
  },
  ml: {
    langToggle: "English (EN)",
    brandTitle: "മൂവ്സ്മാർട്ട്",
    driverBadge: "ഡ്രൈവർ പോർട്ടൽ",
    subTitle: "കേരള പ്രൈവറ്റ് ബസ്സ് സിസ്റ്റം",
    onDuty: "🟢 ഡ്യൂട്ടിയിൽ (ON)",
    offDuty: "🔴 ഓഫ് ഡ്യൂട്ടി (OFF)",
    signOut: "ലോഗ്ഔട്ട് (Sign Out)",
    welcome: "നമസ്കാരം, ഡ്രൈവർ 👋",
    verifiedDriver: "അഡ്മിൻ അംഗീകരിച്ച ഡ്രൈവർ ✅",
    pendingReview: "അഡ്മിൻ പരിശോധനയിൽ ⏳",
    unverifiedDriver: "സ്ഥിരീകരിക്കാത്ത ഡ്രൈവർ ⚠️",
    markAttendance: "✓ അറ്റൻഡൻസ് രേഖപ്പെടുത്തുക",
    attendanceDone: "✓ അറ്റൻഡൻസ് പൂർത്തിയായി സമയം:",
    reportIssue: "⚠️ പരാതി/പ്രശ്നം അറിയിക്കുക",
    
    // Nav Tabs
    tabDashboard: "📊 ഡാഷ്ബോർഡ്",
    tabBuses: "🚌 ബസ് വിവരങ്ങൾ",
    tabLeave: "🌴 ലീവ് അപേക്ഷ",
    tabProfile: "🪪 പ്രൊഫൈൽ & ലൈസൻസ്",
    tabTrips: "📅 യാത്ര ഷെഡ്യൂൾ",
    tabPayments: "💳 കളക്ഷൻ വിവരങ്ങൾ",

    // Dashboard Overview
    activeBusRoute: "നിലവിലെ ബസ്സും റൂട്ടും",
    tripLive: "● യാത്ര പുരോഗമിക്കുന്നു",
    readyDeparture: "പുറപ്പെടാൻ തയ്യാറാണ്",
    busNo: "ബസ്സ് നമ്പർ",
    depTime: "പുറപ്പെടുന്ന സമയം",
    capacity: "ആകെ സീറ്റുകൾ",
    passengers: "യാത്രക്കാർ",
    startTrip: "🚀 യാത്ര ആരംഭിക്കുക",
    endTrip: "🏁 യാത്ര അവസാനിപ്പിക്കുക",
    simulateRfid: "💳 RFID കാർഡ് ടാപ്പ് ചെയ്യുക",
    passengersTracker: "ബസ്സിലെ യാത്രക്കാരുടെ എണ്ണം",
    seats: "സീറ്റുകൾ",
    gpsTelemetry: "📍 ലൈവ് ജി.പി.എസ് (GPS) മാപ്പ് ട്രാക്കർ",
    gpsActive: "📡 ജി.പി.എസ് ഓൺ (ON)",
    gpsOff: "❌ ജി.പി.എസ് ഓഫ് (OFF)",
    speed: "വേഗത",
    todayCollections: "ഇന്നത്തെ ആകെ കളക്ഷൻ",
    fareMethod: "വരുമാന മാർഗ്ഗം",
    rfidCash: "RFID കാർഡ് + ക്യാഷ് ടിക്കറ്റ്",
    adminAlerts: "🔔 അറിയിപ്പുകളും മുന്നറിയിപ്പുകളും",
    delayWarning: "ട്രാഫിക് ബ്ലോക്ക് മുന്നറിയിപ്പ്!",
    trafficNotice: "വൈറ്റില ജംഗ്ഷനിൽ കനത്ത ട്രാഫിക്. ശ്രദ്ധിച്ച് ഡ്രൈവ് ചെയ്യുക.",
    passengerAlert: "യാത്രക്കാർ കാത്തുനിൽക്കുന്നു",
    rfidPassengersWaiting: "2 യാത്രക്കാർ സ്മാർട്ട് RFID പാസുമായി അടുത്ത സ്റ്റോപ്പിൽ ഉണ്ട്.",

    // Uber-Style GPS Section
    liveGpsTitle: "📍 ബസ്സിന്റെ തത്സമയ ജി.പി.എസ് (Real-Time GPS Tracker)",
    liveGpsSubtitle: "യാത്രക്കാർക്ക് കാണാൻ തത്സമയ ലൊക്കേഷൻ സംപ്രേക്ഷണം ചെയ്യുന്നു",
    startGps: "📡 ജി.പി.എസ് സംപ്രേക്ഷണം ആരംഭിക്കുക",
    pauseGps: "⏸️ ജി.പി.എസ് നിർത്തുക",
    centerMap: "🎯 ബസ്സ് ലൊക്കേഷനിലേക്ക് മാപ്പ് മാറ്റുക",
    simulationMode: "🎮 ഡെമോ റൂട്ട് ട്രാക്കിംഗ്",
    realGpsMode: "📡 ഉപകരണത്തിലെ യഥാർത്ഥ ജി.പി.എസ്",
    gpsAccuracy: "കൃത്യത",
    liveBroadcasting: "🔴 യാത്രക്കാർക്ക് തത്സമയം കാണാം (LIVE)",
    currentLocation: "നിലവിലെ സ്ഥലം",

    // Bus Database
    busDbTitle: "മൂവ്സ്മാർട്ട് ബസ്സ് ശൃംഖല",
    busDbSubtitle: "ഡ്രൈവ് ചെയ്യേണ്ട ബസ്സ് തിരഞ്ഞെടുക്കുക (പുറപ്പെടുന്നതിന് 2 മണിക്കൂർ മുൻപ് അപേക്ഷിക്കണം).",
    searchPlaceholder: "ബസ്സ് പേര്, നമ്പർ, റൂട്ട് തിരയുക...",
    loadingBuses: "ബസ്സ് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു...",
    noBusesFound: "ബസ്സുകൾ ഒന്നും കണ്ടെത്തിയില്ല.",
    lockedBus: "🔒 സമയം കഴിഞ്ഞു (2 മണിക്കൂറിനുള്ളിൽ പുറപ്പെടും)",
    assignedDriver: "✅ നിലവിലെ ഡ്രൈവർ",
    pendingReq: "⏳ അഡ്മിൻ അനുമതിക്കായി കാത്തിരിക്കുന്നു",
    requestToDrive: "ബസ്സ് ഡ്രൈവ് ചെയ്യാൻ അപേക്ഷിക്കുക",
    lockedNotice: "🔒 പൂട്ടിയിരിക്കുന്നു (2 മണിക്കൂർ മുൻപ് അപേക്ഷിക്കണം)",
    myBusRequests: "നിങ്ങളുടെ ബസ്സ് അപേക്ഷകളുടെ വിവരങ്ങൾ",
    approvedByAdmin: "അഡ്മിൻ അംഗീകരിച്ചു ✅",
    rejectedByAdmin: "അഡ്മിൻ നിരസിച്ചു ❌",

    // Leave
    applyLeaveTitle: "ഡ്രൈവർ ലീവ് അപേക്ഷ",
    applyLeaveSubtitle: "മുഴുവൻ ദിവസത്തെ അല്ലെങ്കിൽ പകുതി ദിവസത്തെ ലീവിനായി അപേക്ഷിക്കുക.",
    driverNameEmail: "ഡ്രൈവറുടെ പേരും ഇമെയിലും",
    leaveType: "ലീവ് തരം",
    fullDay: "☀️ മുഴുവൻ ദിവസം (Full Day)",
    halfDay: "🌗 പകുതി ദിവസം (Half Day)",
    halfDaySlot: "പകുതി ദിവസ സമയം",
    forenoon: "രാവിലെ (AM)",
    afternoon: "ഉച്ചയ്ക്ക് ശേഷം (PM)",
    leaveDate: "ലീവ് തീയതി",
    leaveReason: "ലീവ് എടുക്കാനുള്ള കാരണം",
    reasonPlaceholder: "കാരണം ഇവിടെ എഴുതുക...",
    submitLeaveBtn: "ലീവ് അപേക്ഷ സമർപ്പിക്കുക ✓",
    submitting: "സമർപ്പിക്കുന്നു...",
    leaveHistoryTitle: "നിങ്ങളുടെ ലീവ് ചരിത്രം",
    noLeaves: "ലീവ് അപേക്ഷകൾ ഒന്നും ഇല്ല.",

    // Profile & Verification
    profileTitle: "ഡ്രൈവർ പ്രൊഫൈലും ലൈസൻസും",
    profileSubtitle: "നിങ്ങളുടെ ഡ്രൈവിംഗ് ലൈസൻസ് നമ്പറും ഫോട്ടോയും നൽകുക.",
    licenseNo: "ഡ്രൈവിംഗ് ലൈസൻസ് നമ്പർ",
    licensePlaceholder: "ഉദാഹരണത്തിന്: KL-07-2018-99210",
    phone: "ഫോൺ നമ്പർ",
    experience: "പരിചയം (വർഷം)",
    profilePic: "ഡ്രൈവറുടെ ഫോട്ടോ (Photo)",
    photoAttached: "ഫോട്ടോ ചേർത്തുവച്ചു ✓",
    licenseDoc: "ലൈസൻസ് കാർഡിന്റെ ഫോട്ടോ",
    docAttached: "ലൈസൻസ് രേഖ ചേർത്തുവച്ചു ✓",
    submitProfileBtn: "പ്രൊഫൈൽ അഡ്മിന് സമർപ്പിക്കുക ✓",
    verificationStatusBadge: "അംഗീകാര അവസ്ഥ (Verification Status)",
    verifiedNotice: "🔒 ലൈസൻസും ഫോട്ടോയും അഡ്മിൻ പരിശോധിച്ചു അംഗീകരിച്ചാൽ യാത്രക്കാർക്ക് അത് കാണാൻ സാധിക്കും.",

    // Trips & Payments
    scheduledTripsTitle: "ഇന്നത്തെ ട്രിപ്പുകൾ",
    selectTrip: "ട്രിപ്പ് തിരഞ്ഞെടുക്കുക",
    collectionsTitle: "വരുമാന കണക്കുകൾ (Collections)",

    // Modal
    reportIssueTitle: "🚨 വാഹനം/റൂട്ട് തകരാറുകൾ അറിയിക്കുക",
    selectIssueCategory: "തകരാറിന്റെ തരം തിരഞ്ഞെടുക്കുക",
    issueBreakdown: "എഞ്ചിൻ തകരാർ / ബസ്സ് കേടായി",
    issueTraffic: "വലിയ ട്രാഫിക് തടസ്സം",
    issuePuncture: "ടയർ പങ്ചർ / സസ്പെൻഷൻ",
    issueMedical: "യാത്രക്കാരന് ആരോഗ്യ പ്രശ്നം",
    notesDetails: "കൂടുതൽ വിവരങ്ങൾ / സ്ഥലം",
    notesPlaceholder: "സ്ഥലവും വിവരങ്ങളും എഴുതുക...",
    cancel: "റദ്ദാക്കുക (Cancel)",
    submitAlert: "അറിയിപ്പ് സമർപ്പിക്കുക ✓",

    // Auth Screens
    loadingDashboard: "ഡാഷ്ബോർഡ് ലോഡ് ചെയ്യുന്നു...",
    accountPendingTitle: "അക്കൗണ്ട് അനുമതിക്കായി കാത്തിരിക്കുന്നു",
    accountPendingMsg: "നിങ്ങളുടെ അക്കൗണ്ട് അഡ്മിൻ പരിശോധിച്ചു വരികയാണ്. ദയവായി പിന്നീട് ശ്രമിക്കുക.",
    accountRejectedTitle: "അക്കൗണ്ട് നിരസിച്ചു",
    accountRejectedMsg: "നിങ്ങളുടെ അക്കൗണ്ട് നിരസിക്കപ്പെട്ടു. ദയവായി അഡ്മിനുമായി ബന്ധപ്പെടുക.",
    logout: "ലോഗ്ഔട്ട് (Logout)"
  }
};

// Route Waypoints across Kerala (Kochi Fort -> M.G. Road -> Kaloor -> Kakkanad -> Aluva)
const KERALA_ROUTE_WAYPOINTS = [
  { lat: 9.9658, lng: 76.2427, name: "Kochi Fort Terminal", x: 12, y: 75 },
  { lat: 9.9723, lng: 76.2801, name: "M.G. Road North", x: 30, y: 55 },
  { lat: 9.9984, lng: 76.2999, name: "Kaloor Junction", x: 50, y: 40 },
  { lat: 10.0159, lng: 76.3419, name: "Kakkanad Civil Station", x: 72, y: 30 },
  { lat: 10.1076, lng: 76.3516, name: "Aluva Bus Stand Terminal", x: 90, y: 15 },
];

function Driver() {
  const navigate = useNavigate();
  const location = useLocation();

  // Language Toggle State ('en' or 'ml')
  const [lang, setLang] = useState("en");

  const t = (key) => {
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      return TRANSLATIONS[lang][key];
    }
    return TRANSLATIONS.en[key] || key;
  };

  // 1. User / Driver Authentication check
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const res = await axios.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const fetchedUser = res.data.user;
        if (fetchedUser.role !== "driver" && fetchedUser.role !== "Driver") {
          clearStoredSession();
          navigate("/login");
          return;
        }
        setUser(fetchedUser);
        setAuthStatus(fetchedUser.verificationStatus || "Unverified");
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch (err) {
        console.error("Auth error:", err);
        clearStoredSession();
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  // 2. Driver Duty & State
  const [isOnline, setIsOnline] = useState(true);
  const [attendanceMarked, setAttendanceMarked] = useState(true);
  const [attendanceTime, setAttendanceTime] = useState("07:30 AM");

  // 3. Navigation Tab State ('dashboard', 'buses', 'leave', 'verification', 'trips', 'payments')
  const [activeTab, setActiveTab] = useState("dashboard");

  // 4. Assigned Bus & Current Trip State
  const [tripStatus, setTripStatus] = useState("idle");
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [passengersOnboard, setPassengersOnboard] = useState(32);
  const totalCapacity = 45;

  // ----------------------------------------------------
  // 📍 UBER-STYLE REAL-TIME GPS TRACKER STATE & REFS
  // ----------------------------------------------------
  const [gpsActive, setGpsActive] = useState(true);
  const [useRealDeviceGps, setUseRealDeviceGps] = useState(false);
  const [currentGps, setCurrentGps] = useState({
    lat: 9.9984,
    lng: 76.2999,
    speed: 42,
    heading: 45,
    accuracy: 4,
    address: "Kaloor Junction, Ernakulam",
    stepIndex: 2,
  });
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const watchPositionIdRef = useRef(null);
  const simIntervalRef = useRef(null);

  // Initialize Leaflet Map safely when activeTab is 'dashboard'
  const initLeafletMap = () => {
    if (!mapContainerRef.current || !window.L) return;

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = window.L;
      const map = L.map(mapContainerRef.current, {
        center: [currentGps.lat, currentGps.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Route Polyline
      const routeCoords = KERALA_ROUTE_WAYPOINTS.map((w) => [w.lat, w.lng]);
      L.polyline(routeCoords, {
        color: "#8b5cf6",
        weight: 6,
        opacity: 0.85,
        dashArray: "8, 8",
      }).addTo(map);

      // Stop Markers
      KERALA_ROUTE_WAYPOINTS.forEach((wp, i) => {
        const isTerminal = i === 0 || i === KERALA_ROUTE_WAYPOINTS.length - 1;
        const stopIcon = L.divIcon({
          className: "custom-stop-marker",
          html: `<div style="background: ${isTerminal ? '#6d28d9' : '#38a169'}; color: #fff; padding: 4px 8px; border-radius: 10px; font-weight: 900; font-size: 11px; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); white-space: nowrap;">📍 ${wp.name}</div>`,
          iconSize: [120, 28],
          iconAnchor: [60, 14],
        });
        L.marker([wp.lat, wp.lng], { icon: stopIcon }).addTo(map);
      });

      // Animated Bus Marker
      const busHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(56, 161, 105, 0.35); animation: pulseRadar 2s infinite ease-out;"></div>
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid #ffffff; box-shadow: 0 6px 18px rgba(0,0,0,0.3); z-index: 10;">
            🚌
          </div>
        </div>
      `;
      const busIcon = L.divIcon({
        className: "custom-bus-marker",
        html: busHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([currentGps.lat, currentGps.lng], { icon: busIcon }).addTo(map);
      busMarkerRef.current = marker;
      mapInstanceRef.current = map;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    } catch (e) {
      console.error("Leaflet map initialization error:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard" && authStatus !== "Unverified") {
      const timer = setTimeout(() => {
        initLeafletMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, authStatus]);

  // Real GPS & Simulation Tracker Effect
  useEffect(() => {
    if (!gpsActive) {
      if (watchPositionIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    if (useRealDeviceGps && navigator.geolocation) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }

      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, accuracy } = pos.coords;
          const speedKmh = speed ? Math.round(speed * 3.6) : 38;
          const updatedGps = {
            lat: latitude,
            lng: longitude,
            speed: speedKmh,
            heading: 90,
            accuracy: Math.round(accuracy) || 5,
            address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            stepIndex: 2,
          };
          setCurrentGps(updatedGps);
          updateMapMarker(updatedGps.lat, updatedGps.lng);
        },
        (err) => {
          console.warn("Real GPS access error/denied:", err.message);
          setUseRealDeviceGps(false);
          showToast("⚠️ Device GPS offline/denied. Switched to Route Demo Tracking.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );
    } else {
      if (watchPositionIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }

      simIntervalRef.current = setInterval(() => {
        setCurrentGps((prev) => {
          const nextIndex = (prev.stepIndex + 1) % KERALA_ROUTE_WAYPOINTS.length;
          const targetWp = KERALA_ROUTE_WAYPOINTS[nextIndex];
          const nextSpeed = Math.floor(Math.random() * 15) + 35; // 35 to 50 km/h

          const updated = {
            lat: targetWp.lat,
            lng: targetWp.lng,
            speed: nextSpeed,
            heading: 90,
            accuracy: 3,
            address: targetWp.name,
            stepIndex: nextIndex,
          };
          updateMapMarker(updated.lat, updated.lng);
          return updated;
        });
      }, 4000);
    }

    return () => {
      if (watchPositionIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, [gpsActive, useRealDeviceGps]);

  const updateMapMarker = (lat, lng) => {
    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([lat, lng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng]);
    }
  };

  const handleCenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentGps.lat, currentGps.lng], 15);
      showToast("🎯 Map centered on active bus position.");
    }
  };

  // 5. Database Buses State
  const [dbBuses, setDbBuses] = useState([]);
  const [busSearchQuery, setBusSearchQuery] = useState("");
  const [loadingBuses, setLoadingBuses] = useState(false);

  // 6. Driver Leave Management State
  const [driverLeaves, setDriverLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveDate: "",
    leaveType: "Full Day",
    halfDaySlot: "Forenoon (AM)",
    reason: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // 7. Profile & License Verification State
  const [verificationData, setVerificationData] = useState({
    licenseNumber: user?.licenseNumber || "KL-07-2018-99210",
    licenseImage: "",
    profilePic: "",
    phone: user?.phone || "+91 98470 12345",
    experienceYears: 5,
    verificationStatus: "Unverified",
    verificationNote: "",
  });
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // 8. Schedules State
  const [todaySchedule, setTodaySchedule] = useState([
    {
      id: "TRIP-101",
      departure: "08:00 AM",
      arrival: "09:15 AM",
      routeName: "Kochi Fort ➔ Aluva Terminal",
      stops: ["Kochi Fort", "M.G. Road", "Kaloor", "Kakkanad", "Aluva"],
      status: "InProgress",
      passengers: 32,
      fareEarned: 1120,
    },
    {
      id: "TRIP-102",
      departure: "10:30 AM",
      arrival: "11:45 AM",
      routeName: "Aluva Terminal ➔ Kochi Fort",
      stops: ["Aluva", "Kakkanad", "Kaloor", "M.G. Road", "Kochi Fort"],
      status: "Upcoming",
      passengers: 0,
      fareEarned: 0,
    },
    {
      id: "TRIP-103",
      departure: "02:00 PM",
      arrival: "03:15 PM",
      routeName: "Kochi Fort ➔ Thrippunithura",
      stops: ["Kochi Fort", "Vytilla Mobility Hub", "Thrippunithura"],
      status: "Upcoming",
      passengers: 0,
      fareEarned: 0,
    },
  ]);

  // Earnings & Log
  const [dailyEarnings, setDailyEarnings] = useState(2450.0);
  const [paymentsLog, setPaymentsLog] = useState([
    { id: "PAY-901", trip: "Trip 101 (Kochi Fort)", time: "08:15 AM", amount: "₹ 1,120.00", method: "RFID Card Tap", status: "Paid" },
    { id: "PAY-902", trip: "Trip 101 (Passenger Cash)", time: "08:45 AM", amount: "₹ 430.00", method: "Cash Ticket", status: "Paid" },
    { id: "PAY-903", trip: "Trip 100 (Early Express)", time: "06:30 AM", amount: "₹ 900.00", method: "Online UPI", status: "Paid" },
  ]);

  // Notifications
  const [alerts, setAlerts] = useState([
    { id: 1, type: "warning", keyTitle: "delayWarning", keyText: "trafficNotice", time: "10 mins ago" },
    { id: 2, type: "info", keyTitle: "passengerAlert", keyText: "rfidPassengersWaiting", time: "1 hour ago" },
  ]);

  // Issue Reporting Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState("Engine Problem / Breakdown");
  const [issueNotes, setIssueNotes] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // ----------------------------------------------------
  // FETCH DATA FROM BACKEND API
  // ----------------------------------------------------
  const fetchDbBuses = async () => {
    setLoadingBuses(true);
    try {
      const res = await axios.get("/api/driver/buses");
      setDbBuses(res.data.buses || []);
    } catch (err) {
      console.error("Error fetching buses database:", err);
    } finally {
      setLoadingBuses(false);
    }
  };

  const fetchDriverLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await axios.get(`/api/driver/leave/my?driverEmail=${encodeURIComponent(user.email)}`);
      setDriverLeaves(res.data.leaves || []);
    } catch (err) {
      console.error("Error fetching driver leaves:", err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const fetchProfileStatus = async () => {
    try {
      const res = await axios.get(`/api/driver/profile-status?email=${encodeURIComponent(user.email)}`);
      if (res.data?.user) {
        const u = res.data.user;
        setVerificationData((prev) => ({
          ...prev,
          licenseNumber: u.licenseNumber || prev.licenseNumber,
          licenseImage: u.licenseImage || prev.licenseImage,
          profilePic: u.profilePic || prev.profilePic,
          phone: u.phone || prev.phone,
          experienceYears: u.experienceYears || prev.experienceYears,
          verificationStatus: u.verificationStatus || "Unverified",
          verificationNote: u.verificationNote || "",
        }));
      }
    } catch (err) {
      console.error("Error fetching driver verification status:", err);
    }
  };

  // Driver Bus Requests State
  const [myBusRequests, setMyBusRequests] = useState([]);
  const [submittingBusReq, setSubmittingBusReq] = useState(false);

  const checkIsWithin2Hours = (departureTimeStr, targetDateStr) => {
    if (!departureTimeStr) return false;
    const now = new Date();
    let departureDate = new Date();

    if (targetDateStr) {
      const [year, month, day] = targetDateStr.split("-").map(Number);
      if (year && month && day) {
        departureDate = new Date(year, month - 1, day);
      }
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetStart = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate());

    if (targetStart.getTime() === todayStart.getTime()) {
      let hours = 0;
      let minutes = 0;
      const timeMatch = departureTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3];
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
          if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
        }
      }
      departureDate.setHours(hours, minutes, 0, 0);

      const diffMs = departureDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return diffHours < 2;
    } else if (targetStart.getTime() < todayStart.getTime()) {
      return true;
    }
    return false;
  };

  const fetchMyBusRequests = async () => {
    try {
      const res = await axios.get(`/api/driver/bus-requests/my?driverEmail=${encodeURIComponent(user.email)}`);
      setMyBusRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching driver bus requests:", err);
    }
  };

  useEffect(() => {
    if (user && authStatus === "Approved") {
      fetchDbBuses();
      fetchDriverLeaves();
      fetchProfileStatus();
      fetchMyBusRequests();
    }
  }, [user, authStatus]);

  // ----------------------------------------------------
  // HANDLERS FOR DRIVER ACTIONS
  // ----------------------------------------------------
  const handleRequestBus = async (bus) => {
    if (checkIsWithin2Hours(bus.departureTime)) {
      alert(`⚠️ Cannot request bus within 2 hours of scheduled departure (${bus.departureTime}). Requests must be made at least 2 hours in advance.`);
      return;
    }

    setSubmittingBusReq(true);
    try {
      const res = await axios.post("/api/driver/request-bus", {
        busId: bus._id,
        driverId: user.id || user._id,
        driverName: user.name,
        driverEmail: user.email,
        driverPhone: verificationData.phone || user.phone,
        driverLicense: verificationData.licenseNumber || user.licenseNumber,
        driverPhoto: verificationData.profilePic || "",
      });

      showToast(`🚌 Request to drive Bus ${bus.busNumber} submitted to Admin! Awaiting approval.`);
      fetchMyBusRequests();
      fetchDbBuses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to request bus assignment");
    } finally {
      setSubmittingBusReq(false);
    }
  };

  const handleAssignBus = async (bus) => {
    if (checkIsWithin2Hours(bus.departureTime)) {
      alert(`⚠️ Cannot assign bus within 2 hours of scheduled departure (${bus.departureTime}). Minimum 2-hour notice required.`);
      return;
    }

    try {
      const res = await axios.post("/api/driver/assign-bus", {
        busId: bus._id,
        driverId: user.id || user._id,
        driverName: user.name,
        driverPhone: verificationData.phone || user.phone,
        driverLicense: verificationData.licenseNumber || user.licenseNumber,
        driverPhoto: verificationData.profilePic || "",
      });
      showToast(`🚌 Assigned to Bus ${bus.busNumber} (${bus.busName})!`);
      setUser((prev) => ({ ...prev, busNumber: bus.busNumber }));
      fetchDbBuses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign bus");
    }
  };

  const handleApplyLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveForm.leaveDate || !leaveForm.reason) {
      alert("Please fill in leave date and reason.");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await axios.post("/api/driver/leave", {
        driverId: user.id || user._id || "60d0fe4f5311236168a109ca",
        driverName: user.name,
        driverEmail: user.email,
        leaveDate: leaveForm.leaveDate,
        leaveType: leaveForm.leaveType,
        halfDaySlot: leaveForm.leaveType === "Half Day" ? leaveForm.halfDaySlot : "N/A",
        reason: leaveForm.reason,
      });

      showToast(`🌴 Leave request (${leaveForm.leaveType}) submitted! Awaiting Admin Approval.`);
      setLeaveForm({ leaveDate: "", leaveType: "Full Day", halfDaySlot: "Forenoon (AM)", reason: "" });
      fetchDriverLeaves();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit leave application");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size is too large! Please select an image under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setVerificationData((prev) => ({ ...prev, [field]: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProfileVerification = async (e) => {
    e.preventDefault();
    if (!verificationData.licenseNumber) {
      alert("Driving license number is required!");
      return;
    }

    setSubmittingVerification(true);
    try {
      const res = await axios.post("/api/driver/profile-verification", {
        name: user.name,
        email: user.email,
        userId: user.id || user._id,
        licenseNumber: verificationData.licenseNumber,
        licenseImage: verificationData.licenseImage,
        profilePic: verificationData.profilePic,
        phone: verificationData.phone,
        experienceYears: verificationData.experienceYears,
      });

      if (res.data?.user) {
        const updatedUser = {
          ...user,
          id: res.data.user.id,
          _id: res.data.user.id,
          licenseNumber: res.data.user.licenseNumber,
          profilePic: res.data.user.profilePic || user.profilePic,
          phone: res.data.user.phone || user.phone,
        };
        setUser(updatedUser);
        setStoredUser(updatedUser);
      }

      showToast("🪪 Driving License & Profile Pic submitted! Status is now Pending Admin Approval.");
      fetchProfileStatus();
    } catch (err) {
      console.error("Error submitting profile verification:", err);
      alert(err.response?.data?.message || "Failed to submit profile for verification");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleToggleTrip = () => {
    if (tripStatus === "idle" || tripStatus === "completed") {
      setTripStatus("in_progress");
      setGpsActive(true);
      showToast("🚀 Trip Started! Real GPS telemetry broadcasted to passengers.");
    } else {
      setTripStatus("completed");
      showToast("🏁 Trip Completed! Earnings logged.");
      const updated = [...todaySchedule];
      updated[activeTripIndex].status = "Completed";
      setTodaySchedule(updated);
    }
  };

  const handleMarkAttendance = () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAttendanceMarked(true);
    setAttendanceTime(nowTime);
    showToast(`✓ Attendance marked for today at ${nowTime}!`);
  };

  const handleSimulateTap = () => {
    if (passengersOnboard >= totalCapacity) {
      showToast("⚠️ Bus is at maximum full capacity (45/45)!");
      return;
    }
    setPassengersOnboard((prev) => prev + 1);
    setDailyEarnings((prev) => prev + 35.0);
    showToast("💳 Passenger tapped RFID Pass (+₹ 35.00 logged)");
  };

  const handleSubmitIssue = (e) => {
    e.preventDefault();
    setShowIssueModal(false);
    showToast("⚠️ Issue reported to MoveSmart Fleet Control Desk!");
    setIssueNotes("");
  };

  const handleLogout = () => {
    if (window.confirm("Sign out of MoveSmart Driver Portal?")) {
      clearStoredSession();
      navigate("/login");
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const currentTripData = todaySchedule[activeTripIndex] || todaySchedule[0];
  const occupancyPercent = Math.round((passengersOnboard / totalCapacity) * 100);

  const filteredBuses = dbBuses.filter(
    (b) =>
      b.busName?.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
      b.busNumber?.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
      b.fromLocation?.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
      b.toLocation?.toLowerCase().includes(busSearchQuery.toLowerCase())
  );

  if (authStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#38a169", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>⏳</span> {t("loadingDashboard")}
        </div>
      </div>
    );
  }

  if (authStatus === "Pending") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "24px", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "#ffffff", padding: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/logo.png" alt="MoveSmart Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#1e293b", marginBottom: "12px" }}>{t("accountPendingTitle")}</h2>
        <p style={{ color: "#64748b", marginBottom: "24px", maxWidth: "420px", fontSize: "15px", fontWeight: "600" }}>{t("accountPendingMsg")}</p>
        <button onClick={handleLogout} style={{ padding: "14px 32px", background: "linear-gradient(135deg, #38a169, #2f855a)", color: "#fff", borderRadius: "14px", border: "none", cursor: "pointer", fontWeight: "800", fontSize: "16px", boxShadow: "0 6px 18px rgba(56, 161, 105, 0.3)" }}>{t("logout")}</button>
      </div>
    );
  }

  if (authStatus === "Rejected") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "24px", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "#ffffff", padding: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/logo.png" alt="MoveSmart Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#dc2626", marginBottom: "12px" }}>{t("accountRejectedTitle")}</h2>
        <p style={{ color: "#64748b", marginBottom: "24px", maxWidth: "420px", fontSize: "15px", fontWeight: "600" }}>{t("accountRejectedMsg")}</p>
        <button onClick={handleLogout} style={{ padding: "14px 32px", background: "#dc2626", color: "#fff", borderRadius: "14px", border: "none", cursor: "pointer", fontWeight: "800", fontSize: "16px", boxShadow: "0 6px 18px rgba(220, 38, 38, 0.3)" }}>{t("logout")}</button>
      </div>
    );
  }

  // Force Unverified drivers to the verification tab
  const currentTab = authStatus === "Unverified" ? "verification" : activeTab;
  const currentWp = KERALA_ROUTE_WAYPOINTS[currentGps.stepIndex || 0];

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Manjari:wght@400;700&display=swap');
        
        * { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', 'Manjari', sans-serif; background: #f8fafc; color: #1e293b; margin: 0; }

        @keyframes pulseRadar {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .header-logo-badge {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          box-shadow: 0 4px 16px rgba(109, 40, 217, 0.15);
          border: 1.5px solid #e9d5ff;
          transition: transform 0.2s ease;
        }
        .header-logo-badge:hover {
          transform: scale(1.05);
        }

        .lang-toggle-btn {
          background: linear-gradient(135deg, #6d28d9 0%, #2e1065 100%);
          color: #ffffff;
          border: 2px solid #a78bfa;
          padding: 8px 18px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 14.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(109, 40, 217, 0.35);
          transition: all 0.2s ease;
        }
        .lang-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(109, 40, 217, 0.5);
          border-color: #4ade80;
        }

        .driver-nav-tab {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }

        .driver-nav-tab:hover { color: #38a169; background: #f0fdf4; border-color: #86efac; }
        .driver-nav-tab.active {
          background: linear-gradient(135deg, #38a169 0%, #8b5cf6 100%);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 6px 18px rgba(56, 161, 105, 0.35);
        }

        .card-shadow {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px;
          border: 1.5px solid #cbd5e1;
          box-shadow: 0 8px 24px rgba(0,0,0,0.04);
        }

        .btn-green-gradient {
          background: linear-gradient(135deg, #38a169 0%, #15803d 100%);
          color: #ffffff;
          border: none;
          padding: 16px 24px;
          border-radius: 16px;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 6px 18px rgba(56, 161, 105, 0.35);
          transition: all 0.2s ease;
        }
        .btn-green-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(56, 161, 105, 0.45); }

        .btn-purple-gradient {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: #ffffff;
          border: none;
          padding: 16px 24px;
          border-radius: 16px;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 6px 18px rgba(139, 92, 246, 0.35);
          transition: all 0.2s ease;
        }
        .btn-purple-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(139, 92, 246, 0.45); }

        .btn-red-outline {
          background: #fef2f2;
          color: #dc2626;
          border: 2px solid #fca5a5;
          padding: 12px 20px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .btn-red-outline:hover { background: #fee2e2; border-color: #f87171; }

        .status-badge-pending { background: #fef3c7; color: #92400e; border: 2px solid #fcd34d; padding: 6px 14px; border-radius: 20px; font-weight: 900; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
        .status-badge-approved { background: #dcfce7; color: #15803d; border: 2px solid #86efac; padding: 6px 14px; border-radius: 20px; font-weight: 900; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
        .status-badge-rejected { background: #ffe4e6; color: #be123c; border: 2px solid #fecdd3; padding: 6px 14px; border-radius: 20px; font-weight: 900; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
      `}</style>

      {/* 🧭 PREMIUM USER-FRIENDLY HEADER WITH MOVESMART LOGO */}
      <header style={styles.topNavbar}>
        <div style={styles.navContainer}>
          {/* Left: MoveSmart Logo & Brand Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link to="/driver" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "14px" }}>
              <div className="header-logo-badge">
                <img src="/logo.png" alt="MoveSmart Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "24px", fontWeight: "900", background: "linear-gradient(135deg, #1e1b4b 0%, #6d28d9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                    {t("brandTitle")}
                  </span>
                  <span style={{ fontSize: "11px", background: "linear-gradient(135deg, #6d28d9, #38a169)", color: "#ffffff", padding: "3px 10px", borderRadius: "10px", fontWeight: "900", letterSpacing: "0.5px" }}>
                    {t("driverBadge")}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", marginTop: "1px" }}>
                  {t("subTitle")}
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Language Toggle, Duty Status Badge, & Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            {/* 🌐 Malayalam / English Language Switcher */}
            <button
              type="button"
              className="lang-toggle-btn"
              onClick={() => setLang(lang === "en" ? "ml" : "en")}
              title="Switch Language / ഭാഷ മാറ്റുക"
            >
              <span>🌐</span> {t("langToggle")}
            </button>

            {/* Duty Status Badge Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isOnline;
                setIsOnline(nextState);
                showToast(nextState ? t("onDuty") : t("offDuty"));
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: isOnline ? "#dcfce7" : "#fee2e2",
                padding: "10px 18px",
                borderRadius: "999px",
                border: `2px solid ${isOnline ? "#86efac" : "#fca5a5"}`,
                fontWeight: "900",
                fontSize: "14.5px",
                color: isOnline ? "#15803d" : "#dc2626",
                cursor: "pointer",
                boxShadow: isOnline ? "0 4px 12px rgba(22, 163, 74, 0.2)" : "0 4px 12px rgba(220, 38, 38, 0.2)",
              }}
            >
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: isOnline ? "#16a34a" : "#dc2626" }}></span>
              {isOnline ? t("onDuty") : t("offDuty")}
            </button>

            <button onClick={handleLogout} style={{ background: "#f1f5f9", border: "1.5px solid #cbd5e1", borderRadius: "14px", padding: "10px 18px", fontSize: "14px", fontWeight: "900", color: "#475569", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              🚪 {t("signOut")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainContainer}>
        {/* Toast Notification Banner */}
        {toastMessage && <div style={styles.toastBanner}>✨ {toastMessage}</div>}

        {/* 🪪 Driver Profile & Assigned Bus Header Card */}
        <section style={styles.heroDriverCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={styles.avatarWrapper}>
                {verificationData.profilePic ? (
                  <img src={verificationData.profilePic} alt={user.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={styles.avatarInitials}>{user.name ? user.name.split(" ").map((n) => n[0]).join("") : "DR"}</div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", margin: 0 }}>{user.name}</h1>
                  <span style={styles.driverIdBadge}>🪪 {user.driverId || "DRV-88219"}</span>

                  {verificationData.verificationStatus === "Approved" ? (
                    <span className="status-badge-approved">{t("verifiedDriver")}</span>
                  ) : verificationData.verificationStatus === "Pending" ? (
                    <span className="status-badge-pending">{t("pendingReview")}</span>
                  ) : (
                    <span className="status-badge-rejected">{t("unverifiedDriver")}</span>
                  )}
                </div>

                <div style={{ fontSize: "14px", color: "#64748b", marginTop: "6px", display: "flex", gap: "18px", flexWrap: "wrap", fontWeight: "700" }}>
                  <span>📧 {user.email}</span>
                  <span>📞 {verificationData.phone || user.phone}</span>
                  <span>🪪 {t("licenseNo")}: <strong style={{ color: "#2e1065" }}>{verificationData.licenseNumber || "KL-07-2018-99210"}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              {!attendanceMarked ? (
                <button className="btn-green-gradient" onClick={handleMarkAttendance}>
                  {t("markAttendance")}
                </button>
              ) : (
                <div style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", padding: "12px 20px", borderRadius: "16px", color: "#166534", fontSize: "14px", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{t("attendanceDone")}</span> <strong>{attendanceTime}</strong>
                </div>
              )}

              <button className="btn-red-outline" onClick={() => setShowIssueModal(true)}>
                {t("reportIssue")}
              </button>
            </div>
          </div>
        </section>

        {/* 🗂 Icon-First Sub-Navigation Tabs */}
        <div style={styles.tabsContainer}>
          {authStatus !== "Unverified" && (
            <>
              <button className={`driver-nav-tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
                {t("tabDashboard")}
              </button>
              <button className={`driver-nav-tab ${activeTab === "buses" ? "active" : ""}`} onClick={() => setActiveTab("buses")}>
                {t("tabBuses")} ({dbBuses.length})
              </button>
              <button className={`driver-nav-tab ${activeTab === "leave" ? "active" : ""}`} onClick={() => setActiveTab("leave")}>
                {t("tabLeave")} ({driverLeaves.length})
              </button>
            </>
          )}
          <button className={`driver-nav-tab ${currentTab === "verification" ? "active" : ""}`} onClick={() => setActiveTab("verification")}>
            {t("tabProfile")}
          </button>
          {authStatus !== "Unverified" && (
            <>
              <button className={`driver-nav-tab ${activeTab === "trips" ? "active" : ""}`} onClick={() => setActiveTab("trips")}>
                {t("tabTrips")}
              </button>
              <button className={`driver-nav-tab ${activeTab === "payments" ? "active" : ""}`} onClick={() => setActiveTab("payments")}>
                {t("tabPayments")}
              </button>
            </>
          )}
        </div>

        {/* ==================================================== */}
        {/* 📊 TAB 1: DASHBOARD OVERVIEW */}
        {/* ==================================================== */}
        {currentTab === "dashboard" && (
          <div className="driver-grid-layout" style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card-shadow" style={{ background: "linear-gradient(135deg, #ffffff 70%, #f3e8ff 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", color: "#6d28d9" }}>
                      🚌 {t("activeBusRoute")}
                    </span>
                    <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", margin: "4px 0 0" }}>
                      {currentTripData.routeName}
                    </h2>
                  </div>

                  <span style={{ padding: "8px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: "900", background: tripStatus === "in_progress" ? "#dcfce7" : "#f1f5f9", color: tripStatus === "in_progress" ? "#16a34a" : "#64748b", border: `1.5px solid ${tripStatus === "in_progress" ? "#86efac" : "#cbd5e1"}` }}>
                    {tripStatus === "in_progress" ? t("tripLive") : t("readyDeparture")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", background: "#f8fafc", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "22px" }}>
                  <div>
                    <div style={styles.metricLabel}>🚌 {t("busNo")}</div>
                    <div style={styles.metricVal}>{user.busNumber || "KL-07-MS-1008"}</div>
                  </div>
                  <div>
                    <div style={styles.metricLabel}>⏰ {t("depTime")}</div>
                    <div style={styles.metricVal}>{currentTripData.departure}</div>
                  </div>
                  <div>
                    <div style={styles.metricLabel}>👥 {t("capacity")}</div>
                    <div style={styles.metricVal}>{totalCapacity} {t("passengers")}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {tripStatus !== "in_progress" ? (
                    <button className="btn-green-gradient" onClick={handleToggleTrip} style={{ flex: 1, justifyContent: "center", padding: "18px" }}>
                      {t("startTrip")}
                    </button>
                  ) : (
                    <button className="btn-purple-gradient" onClick={handleToggleTrip} style={{ flex: 1, justifyContent: "center", padding: "18px" }}>
                      {t("endTrip")}
                    </button>
                  )}

                  <button onClick={handleSimulateTap} style={{ padding: "16px 20px", borderRadius: "16px", border: "2px solid #cbd5e1", background: "#ffffff", fontWeight: "900", fontSize: "15px", color: "#334155", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    {t("simulateRfid")}
                  </button>
                </div>
              </div>

              {/* Onboard Capacity */}
              <div className="card-shadow">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={styles.cardTitle}>👥 {t("passengersTracker")}</h3>
                  <span style={{ fontSize: "18px", fontWeight: "900", color: occupancyPercent > 90 ? "#dc2626" : "#16a34a" }}>
                    {passengersOnboard} / {totalCapacity} {t("seats")} ({occupancyPercent}%)
                  </span>
                </div>

                <div style={{ width: "100%", height: "16px", borderRadius: "8px", background: "#e2e8f0", overflow: "hidden", marginBottom: "14px" }}>
                  <div style={{ width: `${occupancyPercent}%`, height: "100%", background: occupancyPercent > 90 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #38a169, #8b5cf6)", borderRadius: "8px", transition: "width 0.4s ease" }} />
                </div>
              </div>

              {/* 📍 REAL-TIME UBER-STYLE GPS TRACKER CARD */}
              <div className="card-shadow" style={{ position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h3 style={styles.cardTitle}>{t("liveGpsTitle")}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", fontWeight: "600" }}>{t("liveGpsSubtitle")}</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {/* GPS Source Selector (Device GPS vs Demo Route) */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !useRealDeviceGps;
                        setUseRealDeviceGps(nextState);
                        showToast(nextState ? "📡 Activated Real Device HTML5 GPS" : "🎮 Activated Demo Route Simulation");
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid #cbd5e1",
                        background: useRealDeviceGps ? "#f0fdf4" : "#f8fafc",
                        color: useRealDeviceGps ? "#166534" : "#475569",
                        fontWeight: "800",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {useRealDeviceGps ? t("realGpsMode") : t("simulationMode")}
                    </button>

                    {/* GPS Broadcast Power Button */}
                    <button
                      type="button"
                      onClick={() => setGpsActive(!gpsActive)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "14px",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: "900",
                        cursor: "pointer",
                        background: gpsActive ? "#dcfce7" : "#fee2e2",
                        color: gpsActive ? "#15803d" : "#dc2626",
                        boxShadow: gpsActive ? "0 4px 12px rgba(22, 163, 74, 0.2)" : "0 4px 12px rgba(220, 38, 38, 0.2)",
                      }}
                    >
                      {gpsActive ? t("gpsActive") : t("gpsOff")}
                    </button>
                  </div>
                </div>

                {/* 🗺️ INTERACTIVE MAP CONTAINER WITH DUAL LAYER (LEAFLET + SVG VECTOR MAP FALLBACK) */}
                <div style={{ position: "relative", width: "100%", height: "360px", borderRadius: "20px", overflow: "hidden", border: "2px solid #cbd5e1", background: "#0f172a", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)" }}>
                  {/* Leaflet Dynamic OpenStreetMap Container */}
                  <div ref={mapContainerRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1 }}></div>

                  {/* High-Class Vector GPS Map Layer (Always visible fallback & overlay) */}
                  <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, opacity: 0.95 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="mapBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                      <linearGradient id="routePathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38a169" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#4ade80" />
                      </linearGradient>
                    </defs>

                    {/* Dark Map Background Grid */}
                    <rect width="100" height="100" fill="url(#mapBgGrad)" />
                    <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#334155" strokeWidth="0.3" strokeDasharray="1,1" />
                    </pattern>
                    <rect width="100" height="100" fill="url(#gridPattern)" />

                    {/* Kerala Route Path Line */}
                    <path d="M 12 75 L 30 55 L 50 40 L 72 30 L 90 15" fill="none" stroke="url(#routePathGrad)" strokeWidth="2.5" strokeDasharray="2,1" strokeLinecap="round" />

                    {/* Route Stops */}
                    {KERALA_ROUTE_WAYPOINTS.map((wp, i) => (
                      <g key={wp.name}>
                        <circle cx={wp.x} cy={wp.y} r="2" fill={i === 0 || i === KERALA_ROUTE_WAYPOINTS.length - 1 ? "#8b5cf6" : "#38a169"} stroke="#ffffff" strokeWidth="0.8" />
                        <text x={wp.x} y={wp.y + 4} fill="#cbd5e1" fontSize="2.8" fontWeight="800" textAnchor="middle">{wp.name.split(" ")[0]}</text>
                      </g>
                    ))}

                    {/* Active Bus Marker on Vector Map */}
                    {currentWp && (
                      <g transform={`translate(${currentWp.x}, ${currentWp.y})`}>
                        <circle r="4" fill="rgba(56, 161, 105, 0.4)" stroke="#4ade80" strokeWidth="0.5">
                          <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle r="2.5" fill="#16a34a" stroke="#ffffff" strokeWidth="0.6" />
                        <text y="-4" fill="#4ade80" fontSize="3.2" fontWeight="900" textAnchor="middle">🚌 Bus {user?.busNumber || "KL-07"}</text>
                      </g>
                    )}
                  </svg>

                  {/* Uber-Style Live Telemetry HUD Overlay */}
                  <div style={{ position: "absolute", top: "14px", left: "14px", zIndex: 1000, background: "rgba(15, 23, 42, 0.88)", backdropFilter: "blur(6px)", color: "#ffffff", padding: "12px 18px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 12px #4ade80" }}></span>
                      <span style={{ fontSize: "13px", fontWeight: "900", color: "#4ade80", letterSpacing: "0.5px" }}>{t("liveBroadcasting")}</span>
                    </div>

                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: "14px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800", textTransform: "uppercase" }}>{t("speed")}</div>
                      <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>⚡ {currentGps.speed} km/h</div>
                    </div>

                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: "14px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800", textTransform: "uppercase" }}>{t("gpsAccuracy")}</div>
                      <div style={{ fontSize: "14px", fontWeight: "900", color: "#a78bfa" }}>🎯 ± {currentGps.accuracy} m</div>
                    </div>
                  </div>

                  {/* Center Map Quick Button */}
                  <button
                    type="button"
                    onClick={handleCenterMap}
                    style={{
                      position: "absolute",
                      bottom: "16px",
                      right: "16px",
                      zIndex: 1000,
                      background: "#ffffff",
                      color: "#6d28d9",
                      border: "2px solid #a78bfa",
                      padding: "10px 16px",
                      borderRadius: "14px",
                      fontWeight: "900",
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                    }}
                  >
                    {t("centerMap")}
                  </button>
                </div>

                {/* Current Location Address Strip */}
                <div style={{ marginTop: "14px", background: "#f8fafc", padding: "14px 18px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "22px" }}>📍</span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>{t("currentLocation")}</div>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "1px" }}>{currentGps.address}</div>
                    </div>
                  </div>

                  <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#6d28d9", background: "rgba(109, 40, 217, 0.1)", padding: "6px 14px", borderRadius: "12px" }}>
                    🛰️ Lat: {currentGps.lat.toFixed(4)}, Lng: {currentGps.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={styles.earningsCard}>
                <span style={{ fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.95 }}>💰 {t("todayCollections")}</span>
                <div style={{ fontSize: "36px", fontWeight: "900", margin: "10px 0 16px" }}>₹ {dailyEarnings.toFixed(2)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", opacity: 0.95, borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: "12px", fontWeight: "700" }}>
                  <span>{t("fareMethod")}:</span>
                  <strong>{t("rfidCash")}</strong>
                </div>
              </div>

              <div className="card-shadow">
                <h3 style={{ ...styles.cardTitle, marginBottom: "16px" }}>{t("adminAlerts")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {alerts.map((alt) => (
                    <div key={alt.id} style={{ padding: "14px 18px", borderRadius: "16px", background: alt.type === "warning" ? "#fffbeb" : "#f0f9ff", border: `2px solid ${alt.type === "warning" ? "#fcd34d" : "#bae6fd"}`, fontSize: "14px" }}>
                      <div style={{ fontWeight: "900", color: alt.type === "warning" ? "#b45309" : "#0369a1" }}>{t(alt.keyTitle)}</div>
                      <div style={{ fontSize: "13px", color: alt.type === "warning" ? "#78350f" : "#0c4a6e", marginTop: "4px", fontWeight: "700" }}>{t(alt.keyText)}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", fontWeight: "600" }}>⏰ {alt.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 🚌 TAB 2: BUS DATABASE VIEW */}
        {/* ==================================================== */}
        {currentTab === "buses" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card-shadow">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: 0 }}>🚌 {t("busDbTitle")}</h2>
                  <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0", fontWeight: "600" }}>
                    {t("busDbSubtitle")}
                  </p>
                </div>

                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={busSearchQuery}
                  onChange={(e) => setBusSearchQuery(e.target.value)}
                  style={{ padding: "12px 18px", borderRadius: "14px", border: "2px solid #cbd5e1", fontSize: "15px", minWidth: "300px", outline: "none", fontWeight: "700" }}
                />
              </div>

              {loadingBuses ? (
                <div style={{ textAlign: "center", padding: "40px", fontSize: "16px", fontWeight: "800", color: "#64748b" }}>⏳ {t("loadingBuses")}</div>
              ) : filteredBuses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontSize: "15px", fontWeight: "700" }}>🔍 {t("noBusesFound")}</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                  {filteredBuses.map((bus) => {
                    const isLocked = checkIsWithin2Hours(bus.departureTime);
                    const pendingReq = myBusRequests.find((r) => r.busId === bus._id && r.status === "Pending");
                    const isMyBus = bus.driverName === user.name;

                    return (
                      <div key={bus._id} style={{ background: "#f8fafc", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: "900", background: "#ffffff", padding: "4px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", color: "#6d28d9" }}>
                              🚌 {bus.busNumber}
                            </span>

                            {isLocked ? (
                              <span style={{ fontSize: "12px", fontWeight: "900", color: "#dc2626", background: "#fee2e2", padding: "4px 10px", borderRadius: "12px", border: "1px solid #fca5a5" }}>
                                {t("lockedBus")}
                              </span>
                            ) : (
                              <span style={{ fontSize: "13px", fontWeight: "900", color: "#16a34a", background: "#dcfce7", padding: "4px 12px", borderRadius: "14px", border: "1px solid #86efac" }}>
                                ₹{bus.price}
                              </span>
                            )}
                          </div>

                          <h3 style={{ fontSize: "19px", fontWeight: "900", color: "#0f172a", margin: "12px 0 6px" }}>{bus.busName}</h3>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: "#2563eb", marginBottom: "12px" }}>
                            📍 {bus.fromLocation} ➔ {bus.toLocation} (<strong>⏰ {bus.departureTime}</strong> - {bus.arrivalTime})
                          </div>

                          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "14px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#475569", fontWeight: "700", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div>🚍 Type: <strong>{bus.busType}</strong></div>
                            <div>🪑 Seats: <strong>{bus.availableSeats} / {bus.totalSeats}</strong></div>
                            <div>👨‍✈️ Driver: <strong>{bus.driverName || "Not Assigned"}</strong></div>
                          </div>
                        </div>

                        {isMyBus ? (
                          <div style={{ marginTop: "16px", background: "#dcfce7", color: "#15803d", border: "2px solid #86efac", padding: "12px", borderRadius: "14px", textAlign: "center", fontWeight: "900", fontSize: "14px" }}>
                            {t("assignedDriver")}
                          </div>
                        ) : pendingReq ? (
                          <div style={{ marginTop: "16px", background: "#fef3c7", color: "#92400e", border: "2px solid #fcd34d", padding: "12px", borderRadius: "14px", textAlign: "center", fontWeight: "900", fontSize: "14px" }}>
                            {t("pendingReq")}
                          </div>
                        ) : (
                          <button
                            className="btn-purple-gradient"
                            onClick={() => handleRequestBus(bus)}
                            disabled={isLocked || submittingBusReq}
                            style={{ marginTop: "16px", width: "100%", justifyContent: "center", padding: "12px", opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            {isLocked ? t("lockedNotice") : `${t("requestToDrive")} ${bus.busNumber} 🚌`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Submitted Bus Requests */}
            {myBusRequests.length > 0 && (
              <div className="card-shadow">
                <h3 style={{ fontSize: "19px", fontWeight: "900", color: "#0f172a", margin: "0 0 16px" }}>📋 {t("myBusRequests")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {myBusRequests.map((req) => (
                    <div key={req._id} style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "16px", border: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                          🚌 Bus {req.busNumber} ({req.busName}) - Route: {req.routeName}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", fontWeight: "700" }}>
                          ⏰ Departure: <strong>{req.departureTime}</strong> | Requested: {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      <span className={req.status === "Approved" ? "status-badge-approved" : req.status === "Rejected" ? "status-badge-rejected" : "status-badge-pending"}>
                        {req.status === "Approved" ? t("approvedByAdmin") : req.status === "Rejected" ? t("rejectedByAdmin") : t("pendingReq")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 🌴 TAB 3: APPLY FOR LEAVE (FULL DAY / HALF DAY) */}
        {/* ==================================================== */}
        {currentTab === "leave" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
            {/* Leave Application Form */}
            <div className="card-shadow">
              <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: "0 0 6px" }}>🌴 {t("applyLeaveTitle")}</h2>
              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "22px", fontWeight: "600" }}>{t("applyLeaveSubtitle")}</p>

              <form onSubmit={handleApplyLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={styles.formLabel}>👨‍✈️ {t("driverNameEmail")}</label>
                  <input type="text" value={`${user.name} (${user.email})`} readOnly style={{ ...styles.formInput, background: "#f1f5f9", color: "#64748b", fontWeight: "800" }} />
                </div>

                <div>
                  <label style={styles.formLabel}>📅 {t("leaveType")} <span style={{ color: "#e11d48" }}>*</span></label>
                  <div style={{ display: "flex", gap: "14px" }}>
                    {["Full Day", "Half Day"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLeaveForm({ ...leaveForm, leaveType: type })}
                        style={{
                          flex: 1,
                          padding: "14px",
                          borderRadius: "14px",
                          border: `2.5px solid ${leaveForm.leaveType === type ? "#38a169" : "#cbd5e1"}`,
                          background: leaveForm.leaveType === type ? "#f0fdf4" : "#ffffff",
                          color: leaveForm.leaveType === type ? "#166534" : "#475569",
                          fontWeight: "900",
                          fontSize: "15px",
                          cursor: "pointer",
                        }}
                      >
                        {type === "Full Day" ? t("fullDay") : t("halfDay")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Half Day Slot */}
                {leaveForm.leaveType === "Half Day" && (
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1.5px solid #cbd5e1" }}>
                    <label style={styles.formLabel}>⏰ {t("halfDaySlot")} <span style={{ color: "#e11d48" }}>*</span></label>
                    <div style={{ display: "flex", gap: "12px" }}>
                      {["Forenoon (AM)", "Afternoon (PM)"].map((slot) => (
                        <label key={slot} style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "#fff", padding: "12px", borderRadius: "12px", border: "1.5px solid #cbd5e1", cursor: "pointer", fontSize: "14px", fontWeight: "800" }}>
                          <input
                            type="radio"
                            name="halfDaySlot"
                            checked={leaveForm.halfDaySlot === slot}
                            onChange={() => setLeaveForm({ ...leaveForm, halfDaySlot: slot })}
                          />
                          {slot === "Forenoon (AM)" ? t("forenoon") : t("afternoon")}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label style={styles.formLabel}>🗓️ {t("leaveDate")} <span style={{ color: "#e11d48" }}>*</span></label>
                  <input
                    type="date"
                    value={leaveForm.leaveDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveDate: e.target.value })}
                    style={styles.formInput}
                    required
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>✍️ {t("leaveReason")} <span style={{ color: "#e11d48" }}>*</span></label>
                  <textarea
                    rows="3"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder={t("reasonPlaceholder")}
                    style={{ ...styles.formInput, resize: "none" }}
                    required
                  />
                </div>

                <button type="submit" className="btn-green-gradient" disabled={submittingLeave} style={{ justifyContent: "center", padding: "16px" }}>
                  {submittingLeave ? t("submitting") : t("submitLeaveBtn")}
                </button>
              </form>
            </div>

            {/* Leave Applications History */}
            <div className="card-shadow">
              <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: "0 0 18px" }}>📜 {t("leaveHistoryTitle")}</h2>

              {loadingLeaves ? (
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#64748b" }}>⏳ Loading leave history...</div>
              ) : driverLeaves.length === 0 ? (
                <div style={{ color: "#64748b", padding: "20px 0", fontSize: "15px", fontWeight: "700" }}>🌴 {t("noLeaves")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {driverLeaves.map((l) => (
                    <div key={l._id} style={{ background: "#f8fafc", padding: "18px", borderRadius: "16px", border: "1.5px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "10px" }}>
                        <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                          📅 {l.leaveDate} ({l.leaveType})
                        </span>

                        <span className={l.status === "Approved" ? "status-badge-approved" : l.status === "Rejected" ? "status-badge-rejected" : "status-badge-pending"}>
                          {l.status === "Approved" ? t("approvedByAdmin") : l.status === "Rejected" ? t("rejectedByAdmin") : t("pendingReq")}
                        </span>
                      </div>

                      {l.leaveType === "Half Day" && (
                        <div style={{ fontSize: "13px", color: "#6d28d9", fontWeight: "800", marginBottom: "6px" }}>
                          ⏰ {t("halfDaySlot")}: {l.halfDaySlot}
                        </div>
                      )}

                      <div style={{ fontSize: "14px", color: "#475569", fontWeight: "700" }}>📝 {t("leaveReason")}: {l.reason}</div>

                      {l.adminComment && (
                        <div style={{ marginTop: "10px", background: "#f1f5f9", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", color: "#334155", fontStyle: "italic", fontWeight: "700" }}>
                          💬 Admin Note: {l.adminComment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 🪪 TAB 4: PROFILE & DRIVING LICENSE VERIFICATION */}
        {/* ==================================================== */}
        {currentTab === "verification" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Driver Profile & License Submission Form */}
            <div className="card-shadow">
              <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: "0 0 6px" }}>🪪 {t("profileTitle")}</h2>
              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "22px", fontWeight: "600" }}>{t("profileSubtitle")}</p>

              <form onSubmit={handleSubmitProfileVerification} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={styles.formLabel}>🪪 {t("licenseNo")} <span style={{ color: "#e11d48" }}>*</span></label>
                  <input
                    type="text"
                    value={verificationData.licenseNumber}
                    onChange={(e) => setVerificationData({ ...verificationData, licenseNumber: e.target.value })}
                    placeholder={t("licensePlaceholder")}
                    style={styles.formInput}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={styles.formLabel}>📞 {t("phone")}</label>
                    <input
                      type="text"
                      value={verificationData.phone}
                      onChange={(e) => setVerificationData({ ...verificationData, phone: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>

                  <div>
                    <label style={styles.formLabel}>⭐ {t("experience")}</label>
                    <input
                      type="number"
                      value={verificationData.experienceYears}
                      onChange={(e) => setVerificationData({ ...verificationData, experienceYears: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>
                </div>

                {/* Profile Picture Upload */}
                <div>
                  <label style={styles.formLabel}>📷 {t("profilePic")}</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "profilePic")} style={{ fontSize: "14px", fontWeight: "700" }} />
                  {verificationData.profilePic && (
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <img src={verificationData.profilePic} alt="Profile Preview" style={{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover", border: "2px solid #38a169" }} />
                      <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: "900" }}>{t("photoAttached")}</span>
                    </div>
                  )}
                </div>

                {/* Driving License Document Photo Upload */}
                <div>
                  <label style={styles.formLabel}>📄 {t("licenseDoc")}</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "licenseImage")} style={{ fontSize: "14px", fontWeight: "700" }} />
                  {verificationData.licenseImage && (
                    <div style={{ marginTop: "10px" }}>
                      <img src={verificationData.licenseImage} alt="License Preview" style={{ height: "70px", borderRadius: "10px", border: "2px solid #cbd5e1" }} />
                      <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: "900", marginLeft: "12px" }}>{t("docAttached")}</span>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-purple-gradient" disabled={submittingVerification} style={{ justifyContent: "center", padding: "16px", marginTop: "8px" }}>
                  {submittingVerification ? t("submitting") : t("submitProfileBtn")}
                </button>
              </form>
            </div>

            {/* Live Verification Status Card */}
            <div className="card-shadow" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: "0 0 18px" }}>🎖️ {t("verificationStatusBadge")}</h2>

                <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "20px", border: "1.5px solid #e2e8f0", textAlign: "center", marginBottom: "22px" }}>
                  <div style={{ width: "90px", height: "90px", borderRadius: "50%", margin: "0 auto 14px", overflow: "hidden", background: "#e2e8f0", border: "4px solid #38a169" }}>
                    {verificationData.profilePic ? (
                      <img src={verificationData.profilePic} alt="Driver Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "900", color: "#38a169" }}>
                        {user.name ? user.name[0] : "D"}
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: 0 }}>{user.name}</h3>
                  <div style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 16px", fontWeight: "700" }}>{user.email}</div>

                  {verificationData.verificationStatus === "Approved" ? (
                    <div style={{ background: "#dcfce7", color: "#15803d", border: "2px solid #86efac", padding: "12px", borderRadius: "16px", fontWeight: "900", fontSize: "15px" }}>
                      {t("verifiedDriver")}
                    </div>
                  ) : verificationData.verificationStatus === "Pending" ? (
                    <div style={{ background: "#fef3c7", color: "#92400e", border: "2px solid #fcd34d", padding: "12px", borderRadius: "16px", fontWeight: "900", fontSize: "15px" }}>
                      {t("pendingReview")}
                    </div>
                  ) : (
                    <div style={{ background: "#ffe4e6", color: "#be123c", border: "2px solid #fecdd3", padding: "12px", borderRadius: "16px", fontWeight: "900", fontSize: "15px" }}>
                      {t("unverifiedDriver")}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "14px", color: "#475569", lineHeight: "1.8", fontWeight: "700" }}>
                  <div><strong>🪪 {t("licenseNo")}:</strong> {verificationData.licenseNumber || "Not Provided"}</div>
                  <div><strong>⭐ {t("experience")}:</strong> {verificationData.experienceYears} Years</div>
                  <div><strong>💬 Admin Note:</strong> {verificationData.verificationNote || "No notes from admin yet."}</div>
                </div>
              </div>

              <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "16px", border: "1.5px solid #bbf7d0", color: "#166534", fontSize: "13.5px", fontWeight: "700", marginTop: "20px" }}>
                {t("verifiedNotice")}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 📅 TAB 5: TRIPS SCHEDULE */}
        {/* ==================================================== */}
        {activeTab === "trips" && (
          <div className="card-shadow">
            <h3 style={{ ...styles.cardTitle, marginBottom: "18px" }}>📅 {t("scheduledTripsTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {todaySchedule.map((tr, idx) => (
                <div key={tr.id} style={{ padding: "18px 22px", borderRadius: "16px", background: idx === activeTripIndex ? "#f3e8ff" : "#f8fafc", border: `2px solid ${idx === activeTripIndex ? "#a78bfa" : "#e2e8f0"}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a" }}>🚌 {tr.routeName}</div>
                    <div style={{ fontSize: "14px", color: "#64748b", marginTop: "6px", fontWeight: "700" }}>⏰ {t("depTime")}: <strong>{tr.departure}</strong> | Arrival: <strong>{tr.arrival}</strong></div>
                  </div>
                  <button className="btn-purple-gradient" onClick={() => { setActiveTripIndex(idx); setActiveTab("dashboard"); showToast(`Selected ${tr.routeName}`); }} style={{ padding: "10px 20px", fontSize: "14px" }}>
                    {t("selectTrip")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 💳 TAB 6: PAYMENTS LOG */}
        {/* ==================================================== */}
        {activeTab === "payments" && (
          <div className="card-shadow">
            <h3 style={{ ...styles.cardTitle, marginBottom: "18px" }}>💳 {t("collectionsTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {paymentsLog.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: "16px", background: "#f8fafc", border: "1.5px solid #f1f5f9", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>🚌 {p.trip}</div>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "700", marginTop: "2px" }}>⏰ {p.time} • {t("fareMethod")}: {p.method}</div>
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#16a34a" }}>{p.amount}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ⚠️ REPORT ISSUE MODAL */}
      {showIssueModal && (
        <div style={styles.modalOverlay} onClick={() => setShowIssueModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#ea580c", margin: "0 0 18px 0" }}>{t("reportIssueTitle")}</h3>
            <form onSubmit={handleSubmitIssue} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={styles.formLabel}>🚨 {t("selectIssueCategory")}</label>
                <select style={styles.formInput} value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                  <option value="Engine Problem / Breakdown">{t("issueBreakdown")}</option>
                  <option value="Severe Traffic Delay">{t("issueTraffic")}</option>
                  <option value="Tyre Puncture">{t("issuePuncture")}</option>
                  <option value="Medical Emergency">{t("issueMedical")}</option>
                </select>
              </div>
              <div>
                <label style={styles.formLabel}>📍 {t("notesDetails")}</label>
                <textarea rows="3" style={{ ...styles.formInput, resize: "none" }} value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} placeholder={t("notesPlaceholder")} required />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn-red-outline" onClick={() => setShowIssueModal(false)}>{t("cancel")}</button>
                <button type="submit" className="btn-purple-gradient">{t("submitAlert")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "30px 5%", borderTop: "3px solid var(--primary)", marginTop: "auto" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center", fontSize: "13px", color: "#717B87", fontWeight: "700" }}>
          © {new Date().getFullYear()} MoveSmart Fleet Operations. Authorized Driver Console.
        </div>
      </footer>
    </div>
  );
}

const styles = {
  pageWrapper: { minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" },
  topNavbar: { background: "#ffffff", borderBottom: "2px solid #e2e8f0", padding: "16px 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  navContainer: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mainContainer: { maxWidth: "1150px", width: "100%", margin: "24px auto 40px auto", padding: "0 20px", flex: 1 },
  toastBanner: { background: "linear-gradient(135deg, #38a169, #8b5cf6)", color: "#ffffff", padding: "14px 22px", borderRadius: "16px", fontWeight: "900", fontSize: "15px", marginBottom: "22px", textAlign: "center", boxShadow: "0 6px 18px rgba(56, 161, 105, 0.3)" },
  heroDriverCard: { background: "linear-gradient(135deg, #ffffff 60%, #f3e8ff 100%)", borderRadius: "24px", padding: "28px", border: "1.5px solid #cbd5e1", marginBottom: "24px", boxShadow: "0 8px 24px rgba(0,0,0,0.04)" },
  avatarWrapper: { width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #38a169, #8b5cf6)", padding: "3px", boxShadow: "0 4px 14px rgba(56, 161, 105, 0.3)" },
  avatarInitials: { width: "100%", height: "100%", borderRadius: "50%", background: "#ffffff", color: "#38a169", fontWeight: "900", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center" },
  driverIdBadge: { padding: "6px 14px", borderRadius: "18px", fontSize: "12px", fontWeight: "900", background: "rgba(139, 92, 246, 0.12)", color: "#7c3aed", border: "1.5px solid #c4b5fd" },
  tabsContainer: { display: "flex", gap: "12px", marginBottom: "24px", overflowX: "auto", paddingBottom: "8px" },
  cardTitle: { fontSize: "19px", fontWeight: "900", color: "#0f172a", margin: 0 },
  metricLabel: { fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" },
  metricVal: { fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "4px" },
  earningsCard: { background: "linear-gradient(135deg, #38a169, #2f855a)", color: "#ffffff", borderRadius: "22px", padding: "24px", boxShadow: "0 8px 24px rgba(56, 161, 105, 0.3)" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { background: "#ffffff", borderRadius: "24px", padding: "32px", maxWidth: "500px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" },
  formLabel: { fontSize: "13px", fontWeight: "800", color: "#475569", marginBottom: "8px", display: "block" },
  formInput: { width: "100%", padding: "12px 16px", borderRadius: "14px", border: "1.5px solid #cbd5e1", fontSize: "15px", outline: "none", fontWeight: "700" },
};

export default Driver;
