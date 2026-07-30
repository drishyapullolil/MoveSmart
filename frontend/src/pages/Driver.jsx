import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { getStoredUser, setStoredUser, clearStoredSession } from "../utils/session";

function Driver() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. User / Driver Authentication check
  const [user, setUser] = useState(() => {
    const savedUser = getStoredUser();
    if (savedUser) return savedUser;
    return {
      name: "Rajesh Kumar",
      email: "rajesh.driver@movesmart.in",
      phone: "+91 98470 12345",
      role: "Driver",
      driverId: "DRV-88219",
      licenseNumber: "KL-07-2018-99210",
      busNumber: "KL-07-MS-1008",
      avatarUrl: "",
    };
  });

  // 2. Driver Duty & State
  const [isOnline, setIsOnline] = useState(true);
  const [attendanceMarked, setAttendanceMarked] = useState(true);
  const [attendanceTime, setAttendanceTime] = useState("07:30 AM");

  // 3. Navigation Tab State ('dashboard', 'buses', 'leave', 'verification', 'trips', 'payments')
  const [activeTab, setActiveTab] = useState("dashboard");

  // 4. Assigned Bus & Current Trip State
  const [tripStatus, setTripStatus] = useState("idle");
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [gpsActive, setGpsActive] = useState(true);
  const [passengersOnboard, setPassengersOnboard] = useState(32);
  const totalCapacity = 45;

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
    licenseNumber: user.licenseNumber || "KL-07-2018-99210",
    licenseImage: "",
    profilePic: "",
    phone: user.phone || "+91 98470 12345",
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
    { id: 1, type: "warning", text: "Heavy rain reported near Vytilla Junction. Drive safely.", time: "10 mins ago" },
    { id: 2, type: "info", text: "Maintenance check scheduled at Ernakulam Depot at 5:00 PM.", time: "1 hour ago" },
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
    fetchDbBuses();
    fetchDriverLeaves();
    fetchProfileStatus();
    fetchMyBusRequests();
  }, [user]);

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
      showToast("🚀 Trip Started! Live GPS telemetry broadcasted to passengers.");
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

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif; background: #f8fafc; color: #1e293b; margin: 0; }

        .driver-nav-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .driver-nav-tab:hover { color: #38a169; background: rgba(56, 161, 105, 0.08); }
        .driver-nav-tab.active {
          background: linear-gradient(135deg, #38a169, #8b5cf6);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(56, 161, 105, 0.25);
        }

        .card-shadow {
          background: #ffffff;
          border-radius: 18px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }

        .btn-green-gradient {
          background: linear-gradient(135deg, #38a169, #2f855a);
          color: #ffffff; border: none; padding: 12px 22px; border-radius: 12px;
          font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
          box-shadow: 0 4px 14px rgba(56, 161, 105, 0.3); transition: all 0.2s ease;
        }
        .btn-green-gradient:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(56, 161, 105, 0.4); }

        .btn-purple-gradient {
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          color: #ffffff; border: none; padding: 12px 22px; border-radius: 12px;
          font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3); transition: all 0.2s ease;
        }
        .btn-purple-gradient:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(139, 92, 246, 0.4); }

        .btn-red-outline {
          background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5;
          padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer;
        }

        .status-badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 12px; }
        .status-badge-approved { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 12px; }
        .status-badge-rejected { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 12px; }
      `}</style>

      {/* 🧭 Top Navigation Header */}
      <header style={styles.topNavbar}>
        <div style={styles.navContainer}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "linear-gradient(135deg, #38a169, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: "900", fontSize: "18px" }}>
                MS
              </div>
              <span style={{ fontSize: "20px", fontWeight: "800", background: "linear-gradient(135deg, #1e293b, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                MoveSmart <span style={{ fontSize: "12px", background: "#8b5cf6", color: "#fff", padding: "2px 8px", borderRadius: "8px", verticalAlign: "middle" }}>DRIVER</span>
              </span>
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isOnline ? "#e6fffa" : "#fef2f2", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${isOnline ? "#b2f5ea" : "#fecdd3"}` }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isOnline ? "#38a169" : "#e53e3e" }}></span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: isOnline ? "#2f855a" : "#c53030" }}>
                {isOnline ? "ON DUTY" : "OFF DUTY"}
              </span>
            </div>

            <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "6px 14px", fontSize: "13px", fontWeight: "700", color: "#64748b", cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainContainer}>
        {/* Toast Notification Banner */}
        {toastMessage && <div style={styles.toastBanner}>{toastMessage}</div>}

        {/* 🪪 Driver Profile & Assigned Bus Header Card */}
        <section style={styles.heroDriverCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div style={styles.avatarWrapper}>
                {verificationData.profilePic ? (
                  <img src={verificationData.profilePic} alt={user.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={styles.avatarInitials}>{user.name ? user.name.split(" ").map((n) => n[0]).join("") : "DR"}</div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0 }}>{user.name}</h1>
                  <span style={styles.driverIdBadge}>{user.driverId || "DRV-88219"}</span>

                  {verificationData.verificationStatus === "Approved" ? (
                    <span className="status-badge-approved">Admin Verified Driver ✅</span>
                  ) : verificationData.verificationStatus === "Pending" ? (
                    <span className="status-badge-pending">Pending Admin Review ⏳</span>
                  ) : (
                    <span className="status-badge-rejected">Unverified Driver ⚠️</span>
                  )}
                </div>

                <div style={{ fontSize: "13.5px", color: "#64748b", marginTop: "4px", display: "flex", gap: "16px" }}>
                  <span>📧 {user.email}</span>
                  <span>📞 {verificationData.phone || user.phone}</span>
                  <span>🪪 License: <strong>{verificationData.licenseNumber || "KL-07-2018-99210"}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {!attendanceMarked ? (
                <button className="btn-green-gradient" onClick={handleMarkAttendance}>
                  ✓ Mark Today's Attendance
                </button>
              ) : (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 16px", borderRadius: "12px", color: "#166534", fontSize: "13px", fontWeight: "700" }}>
                  ✓ Attendance Checked at {attendanceTime}
                </div>
              )}

              <button className="btn-red-outline" onClick={() => setShowIssueModal(true)}>
                ⚠️ Report Issue
              </button>
            </div>
          </div>
        </section>

        {/* 🗂 Sub-Navigation Tabs */}
        <div style={styles.tabsContainer}>
          <button className={`driver-nav-tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            📊 Dashboard Overview
          </button>
          <button className={`driver-nav-tab ${activeTab === "buses" ? "active" : ""}`} onClick={() => setActiveTab("buses")}>
            🚌 Bus Database ({dbBuses.length})
          </button>
          <button className={`driver-nav-tab ${activeTab === "leave" ? "active" : ""}`} onClick={() => setActiveTab("leave")}>
            🌴 Apply Leave ({driverLeaves.length})
          </button>
          <button className={`driver-nav-tab ${activeTab === "verification" ? "active" : ""}`} onClick={() => setActiveTab("verification")}>
            🪪 Profile &amp; License
          </button>
          <button className={`driver-nav-tab ${activeTab === "trips" ? "active" : ""}`} onClick={() => setActiveTab("trips")}>
            📅 Scheduled Trips
          </button>
          <button className={`driver-nav-tab ${activeTab === "payments" ? "active" : ""}`} onClick={() => setActiveTab("payments")}>
            💳 Collections
          </button>
        </div>

        {/* ==================================================== */}
        {/* 📊 TAB 1: DASHBOARD OVERVIEW */}
        {/* ==================================================== */}
        {activeTab === "dashboard" && (
          <div className="driver-grid-layout" style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card-shadow" style={{ background: "linear-gradient(135deg, #ffffff 70%, #f3e8ff 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#8b5cf6" }}>
                      Active Assigned Bus &amp; Route
                    </span>
                    <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "4px 0 0" }}>
                      {currentTripData.routeName}
                    </h2>
                  </div>

                  <span style={{ padding: "6px 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "800", background: tripStatus === "in_progress" ? "#dcfce7" : "#f1f5f9", color: tripStatus === "in_progress" ? "#16a34a" : "#64748b" }}>
                    {tripStatus === "in_progress" ? "● TRIP LIVE" : "READY FOR DEPARTURE"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", marginBottom: "20px" }}>
                  <div>
                    <div style={styles.metricLabel}>Assigned Bus No</div>
                    <div style={styles.metricVal}>{user.busNumber || "KL-07-MS-1008"}</div>
                  </div>
                  <div>
                    <div style={styles.metricLabel}>Departure Time</div>
                    <div style={styles.metricVal}>{currentTripData.departure}</div>
                  </div>
                  <div>
                    <div style={styles.metricLabel}>Bus Capacity</div>
                    <div style={styles.metricVal}>{totalCapacity} Passengers</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px" }}>
                  {tripStatus !== "in_progress" ? (
                    <button className="btn-green-gradient" onClick={handleToggleTrip} style={{ flex: 1, justifyContent: "center", padding: "14px" }}>
                      🚀 START TRIP NOW
                    </button>
                  ) : (
                    <button className="btn-purple-gradient" onClick={handleToggleTrip} style={{ flex: 1, justifyContent: "center", padding: "14px" }}>
                      🏁 END CURRENT TRIP
                    </button>
                  )}

                  <button onClick={handleSimulateTap} style={{ padding: "12px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "700", fontSize: "13px", color: "#334155", cursor: "pointer" }}>
                    💳 Simulate RFID Pass Tap
                  </button>
                </div>
              </div>

              {/* Onboard Capacity */}
              <div className="card-shadow">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={styles.cardTitle}>Passengers Onboard Tracker</h3>
                  <span style={{ fontSize: "16px", fontWeight: "800", color: occupancyPercent > 90 ? "#dc2626" : "#16a34a" }}>
                    {passengersOnboard} / {totalCapacity} Seats ({occupancyPercent}%)
                  </span>
                </div>

                <div style={{ width: "100%", height: "12px", borderRadius: "6px", background: "#e2e8f0", overflow: "hidden", marginBottom: "14px" }}>
                  <div style={{ width: `${occupancyPercent}%`, height: "100%", background: occupancyPercent > 90 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #38a169, #8b5cf6)", borderRadius: "6px", transition: "width 0.4s ease" }} />
                </div>
              </div>

              {/* Live GPS Map */}
              <div className="card-shadow">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={styles.cardTitle}>📍 Live Telemetry &amp; GPS Dispatch</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>Live bus coordinates synced with passenger portal</p>
                  </div>
                  <button onClick={() => setGpsActive(!gpsActive)} style={{ padding: "6px 14px", borderRadius: "12px", border: "none", fontSize: "12px", fontWeight: "800", cursor: "pointer", background: gpsActive ? "#e6fffa" : "#fef2f2", color: gpsActive ? "#2f855a" : "#dc2626" }}>
                    {gpsActive ? "📡 GPS Active" : "❌ GPS Off"}
                  </button>
                </div>

                <div style={{ height: "140px", borderRadius: "12px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#38a169" }}>42 km/h</div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>Location: Near Kaloor Junction, Ernakulam</div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={styles.earningsCard}>
                <span style={{ fontSize: "11.5px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>Today's Total Collections</span>
                <div style={{ fontSize: "32px", fontWeight: "800", margin: "8px 0 14px" }}>₹ {dailyEarnings.toFixed(2)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", opacity: 0.9, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "10px" }}>
                  <span>Fare Method:</span>
                  <strong>RFID Tap + Ticket Cash</strong>
                </div>
              </div>

              <div className="card-shadow">
                <h3 style={{ ...styles.cardTitle, marginBottom: "14px" }}>🔔 Admin Alerts &amp; Notifications</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {alerts.map((alt) => (
                    <div key={alt.id} style={{ padding: "12px", borderRadius: "10px", background: alt.type === "warning" ? "#fffbeb" : "#f0f9ff", border: `1px solid ${alt.type === "warning" ? "#fef3c7" : "#e0f2fe"}`, fontSize: "13px" }}>
                      <div style={{ fontWeight: "700", color: alt.type === "warning" ? "#b45309" : "#0369a1" }}>{alt.text}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{alt.time}</div>
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
        {activeTab === "buses" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card-shadow">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>MoveSmart Fleet Bus Database</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
                    Select a bus to request Admin assignment. <strong>Note:</strong> Bus selection requests must be submitted at least <strong>2 hours before departure</strong>.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Search bus by name, number, or route..."
                  value={busSearchQuery}
                  onChange={(e) => setBusSearchQuery(e.target.value)}
                  style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", minWidth: "280px", outline: "none" }}
                />
              </div>

              {loadingBuses ? (
                <div style={{ textAlign: "center", padding: "40px" }}>Loading Buses Database...</div>
              ) : filteredBuses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No buses found in database matching your query.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
                  {filteredBuses.map((bus) => {
                    const isLocked = checkIsWithin2Hours(bus.departureTime);
                    const pendingReq = myBusRequests.find((r) => r.busId === bus._id && r.status === "Pending");
                    const isMyBus = bus.driverName === user.name;

                    return (
                      <div key={bus._id} style={{ background: "#f8fafc", borderRadius: "16px", padding: "18px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: "800", background: "#ffffff", padding: "2px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", color: "#6d28d9" }}>
                              {bus.busNumber}
                            </span>

                            {isLocked ? (
                              <span style={{ fontSize: "11px", fontWeight: "800", color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: "10px" }}>
                                🔒 Locked (&lt; 2 hrs to departure)
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", fontWeight: "800", color: "#16a34a", background: "#dcfce7", padding: "2px 10px", borderRadius: "12px" }}>
                                ₹{bus.price}
                              </span>
                            )}
                          </div>

                          <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "10px 0 4px" }}>{bus.busName}</h3>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#2563eb", marginBottom: "10px" }}>
                            📍 {bus.fromLocation} ➔ {bus.toLocation} (<strong>{bus.departureTime}</strong> - {bus.arrivalTime})
                          </div>

                          <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "10px", border: "1px solid #f1f5f9", fontSize: "12px", color: "#475569" }}>
                            <div>🚍 Type: <strong>{bus.busType}</strong></div>
                            <div>🪑 Available Seats: <strong>{bus.availableSeats} / {bus.totalSeats}</strong></div>
                            <div>👨‍✈️ Current Driver: <strong>{bus.driverName || "Not Assigned"}</strong></div>
                          </div>
                        </div>

                        {isMyBus ? (
                          <div style={{ marginTop: "14px", background: "#dcfce7", color: "#15803d", padding: "10px", borderRadius: "12px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>
                            ✅ Currently Assigned Driver
                          </div>
                        ) : pendingReq ? (
                          <div style={{ marginTop: "14px", background: "#fef3c7", color: "#92400e", padding: "10px", borderRadius: "12px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>
                            ⏳ Request Pending Admin Approval
                          </div>
                        ) : (
                          <button
                            className="btn-purple-gradient"
                            onClick={() => handleRequestBus(bus)}
                            disabled={isLocked || submittingBusReq}
                            style={{ marginTop: "14px", width: "100%", justifyContent: "center", padding: "10px", opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            {isLocked ? "🔒 Locked (Must request > 2 hrs before)" : `Request Admin to Drive ${bus.busNumber} 🚌`}
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
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 14px" }}>Your Bus Drive Requests &amp; Status</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {myBusRequests.map((req) => (
                    <div key={req._id} style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                          🚌 Bus {req.busNumber} ({req.busName}) - Route: {req.routeName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          Scheduled Departure: <strong>{req.departureTime}</strong> | Requested: {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      <span className={req.status === "Approved" ? "status-badge-approved" : req.status === "Rejected" ? "status-badge-rejected" : "status-badge-pending"}>
                        {req.status === "Approved" ? "Approved by Admin ✅" : req.status === "Rejected" ? "Rejected by Admin ❌" : "Pending Admin Review ⏳"}
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
        {activeTab === "leave" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
            {/* Leave Application Form */}
            <div className="card-shadow">
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px" }}>Apply for Driver Leave</h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>Select Full Day or Half Day leave and submit for Admin approval.</p>

              <form onSubmit={handleApplyLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={styles.formLabel}>Driver Name &amp; Email</label>
                  <input type="text" value={`${user.name} (${user.email})`} readOnly style={{ ...styles.formInput, background: "#f1f5f9", color: "#64748b" }} />
                </div>

                <div>
                  <label style={styles.formLabel}>Leave Type <span style={{ color: "#e11d48" }}>*</span></label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {["Full Day", "Half Day"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLeaveForm({ ...leaveForm, leaveType: type })}
                        style={{
                          flex: 1,
                          padding: "12px",
                          borderRadius: "12px",
                          border: `2px solid ${leaveForm.leaveType === type ? "#38a169" : "#cbd5e1"}`,
                          background: leaveForm.leaveType === type ? "#f0fdf4" : "#ffffff",
                          color: leaveForm.leaveType === type ? "#166534" : "#475569",
                          fontWeight: "800",
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        {type === "Full Day" ? "☀️ Full Day Leave" : "🌗 Half Day Leave"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Half Day Slot */}
                {leaveForm.leaveType === "Half Day" && (
                  <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <label style={styles.formLabel}>Half-Day Slot <span style={{ color: "#e11d48" }}>*</span></label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      {["Forenoon (AM)", "Afternoon (PM)"].map((slot) => (
                        <label key={slot} style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>
                          <input
                            type="radio"
                            name="halfDaySlot"
                            checked={leaveForm.halfDaySlot === slot}
                            onChange={() => setLeaveForm({ ...leaveForm, halfDaySlot: slot })}
                          />
                          {slot}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label style={styles.formLabel}>Leave Date <span style={{ color: "#e11d48" }}>*</span></label>
                  <input
                    type="date"
                    value={leaveForm.leaveDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveDate: e.target.value })}
                    style={styles.formInput}
                    required
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>Reason for Leave <span style={{ color: "#e11d48" }}>*</span></label>
                  <textarea
                    rows="3"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Enter reason for taking leave..."
                    style={{ ...styles.formInput, resize: "none" }}
                    required
                  />
                </div>

                <button type="submit" className="btn-green-gradient" disabled={submittingLeave} style={{ justifyContent: "center", padding: "14px" }}>
                  {submittingLeave ? "Submitting..." : "Submit Leave Application ✓"}
                </button>
              </form>
            </div>

            {/* Leave Applications History */}
            <div className="card-shadow">
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px" }}>Your Leave History &amp; Status</h2>

              {loadingLeaves ? (
                <div>Loading leave history...</div>
              ) : driverLeaves.length === 0 ? (
                <div style={{ color: "#64748b", padding: "20px 0" }}>No leave requests submitted yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {driverLeaves.map((l) => (
                    <div key={l._id} style={{ background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                          📅 {l.leaveDate} ({l.leaveType})
                        </span>

                        <span className={l.status === "Approved" ? "status-badge-approved" : l.status === "Rejected" ? "status-badge-rejected" : "status-badge-pending"}>
                          {l.status === "Approved" ? "Accepted by Admin ✅" : l.status === "Rejected" ? "Rejected ❌" : "Pending Admin Review ⏳"}
                        </span>
                      </div>

                      {l.leaveType === "Half Day" && (
                        <div style={{ fontSize: "12px", color: "#6d28d9", fontWeight: "700", marginBottom: "4px" }}>
                          Slot: {l.halfDaySlot}
                        </div>
                      )}

                      <div style={{ fontSize: "13px", color: "#475569" }}>Reason: {l.reason}</div>

                      {l.adminComment && (
                        <div style={{ marginTop: "8px", background: "#f1f5f9", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", color: "#334155", fontStyle: "italic" }}>
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
        {activeTab === "verification" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Driver Profile & License Submission Form */}
            <div className="card-shadow">
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px" }}>Driver Profile &amp; Driving License</h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>Provide your driving license details and profile picture so Admin and Passengers can verify you.</p>

              <form onSubmit={handleSubmitProfileVerification} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={styles.formLabel}>Driving License Number <span style={{ color: "#e11d48" }}>*</span></label>
                  <input
                    type="text"
                    value={verificationData.licenseNumber}
                    onChange={(e) => setVerificationData({ ...verificationData, licenseNumber: e.target.value })}
                    placeholder="e.g. KL-07-2018-99210"
                    style={styles.formInput}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={styles.formLabel}>Contact Phone</label>
                    <input
                      type="text"
                      value={verificationData.phone}
                      onChange={(e) => setVerificationData({ ...verificationData, phone: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>

                  <div>
                    <label style={styles.formLabel}>Experience (Years)</label>
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
                  <label style={styles.formLabel}>Profile Picture (Photo)</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "profilePic")} style={{ fontSize: "13px" }} />
                  {verificationData.profilePic && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <img src={verificationData.profilePic} alt="Profile Preview" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }} />
                      <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>Photo Attached ✓</span>
                    </div>
                  )}
                </div>

                {/* Driving License Document Photo Upload */}
                <div>
                  <label style={styles.formLabel}>Driving License Photo Document</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "licenseImage")} style={{ fontSize: "13px" }} />
                  {verificationData.licenseImage && (
                    <div style={{ marginTop: "8px" }}>
                      <img src={verificationData.licenseImage} alt="License Preview" style={{ height: "60px", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
                      <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700", marginLeft: "10px" }}>License Document Attached ✓</span>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-purple-gradient" disabled={submittingVerification} style={{ justifyContent: "center", padding: "14px", marginTop: "10px" }}>
                  {submittingVerification ? "Submitting Details..." : "Submit Profile & License for Admin Approval ✓"}
                </button>
              </form>
            </div>

            {/* Live Verification Status Card */}
            <div className="card-shadow" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px" }}>Verification Status Badge</h2>

                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 12px", overflow: "hidden", background: "#e2e8f0", border: "3px solid #38a169" }}>
                    {verificationData.profilePic ? (
                      <img src={verificationData.profilePic} alt="Driver Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "800", color: "#38a169" }}>
                        {user.name ? user.name[0] : "D"}
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>{user.name}</h3>
                  <div style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 12px" }}>{user.email}</div>

                  {verificationData.verificationStatus === "Approved" ? (
                    <div style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "10px", borderRadius: "12px", fontWeight: "800", fontSize: "14px" }}>
                      ✅ VERIFIED DRIVER (ADMIN APPROVED)
                    </div>
                  ) : verificationData.verificationStatus === "Pending" ? (
                    <div style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", padding: "10px", borderRadius: "12px", fontWeight: "800", fontSize: "14px" }}>
                      ⏳ PENDING ADMIN REVIEW &amp; ACCEPTANCE
                    </div>
                  ) : (
                    <div style={{ background: "#ffe4e6", color: "#be123c", border: "1px solid #fecdd3", padding: "10px", borderRadius: "12px", fontWeight: "800", fontSize: "14px" }}>
                      ⚠️ UNVERIFIED DRIVER
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                  <div><strong>Driving License No:</strong> {verificationData.licenseNumber || "Not Provided"}</div>
                  <div><strong>Experience:</strong> {verificationData.experienceYears} Years</div>
                  <div><strong>Admin Verification Note:</strong> {verificationData.verificationNote || "No notes from admin yet."}</div>
                </div>
              </div>

              <div style={{ background: "#f0fdf4", padding: "14px", borderRadius: "12px", border: "1px solid #bbf7d0", color: "#166534", fontSize: "12.5px" }}>
                🔒 Once Admin verifies your driving license and photo, passengers will see your verified driver badge when booking seats.
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 📅 TAB 5: TRIPS SCHEDULE */}
        {/* ==================================================== */}
        {activeTab === "trips" && (
          <div className="card-shadow">
            <h3 style={{ ...styles.cardTitle, marginBottom: "16px" }}>Today's Scheduled Trips</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {todaySchedule.map((tr, idx) => (
                <div key={tr.id} style={{ padding: "16px 20px", borderRadius: "12px", background: idx === activeTripIndex ? "#f3e8ff" : "#f8fafc", border: `1px solid ${idx === activeTripIndex ? "#c4b5fd" : "#e2e8f0"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>{tr.routeName}</div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Departure: <strong>{tr.departure}</strong> | Arrival: <strong>{tr.arrival}</strong></div>
                  </div>
                  <button className="btn-purple-gradient" onClick={() => { setActiveTripIndex(idx); setActiveTab("dashboard"); showToast(`Selected ${tr.routeName}`); }} style={{ padding: "6px 14px", fontSize: "12px" }}>
                    Select Trip
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
            <h3 style={{ ...styles.cardTitle, marginBottom: "16px" }}>Trip Collections &amp; Payments Log</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {paymentsLog.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{p.trip}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{p.time} • Method: {p.method}</div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a" }}>{p.amount}</div>
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
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>Report Bus Issue / Breakdown</h3>
            <form onSubmit={handleSubmitIssue} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.formLabel}>Issue Category</label>
                <select style={styles.formInput} value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                  <option value="Engine Problem / Breakdown">Engine Problem / Breakdown</option>
                  <option value="Severe Traffic Delay">Severe Route Traffic Delay</option>
                  <option value="Tyre Puncture">Tyre Puncture / Suspension</option>
                  <option value="Medical Emergency">Passenger Medical Emergency</option>
                </select>
              </div>
              <div>
                <label style={styles.formLabel}>Additional Notes / Location</label>
                <textarea rows="3" style={{ ...styles.formInput, resize: "none" }} value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} placeholder="Enter details..." required />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn-red-outline" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn-purple-gradient">Submit Alert ✓</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "30px 5%", borderTop: "3px solid var(--primary)", marginTop: "auto" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center", fontSize: "12px", color: "#717B87" }}>
          © {new Date().getFullYear()} MoveSmart Fleet Operations. Authorized Driver Console.
        </div>
      </footer>
    </div>
  );
}

const styles = {
  pageWrapper: { minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" },
  topNavbar: { background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  navContainer: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mainContainer: { maxWidth: "1150px", width: "100%", margin: "24px auto 40px auto", padding: "0 20px", flex: 1 },
  toastBanner: { background: "linear-gradient(135deg, #38a169, #8b5cf6)", color: "#ffffff", padding: "12px 20px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", marginBottom: "20px", textAlign: "center" },
  heroDriverCard: { background: "linear-gradient(135deg, #ffffff 60%, #f3e8ff 100%)", borderRadius: "20px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "24px" },
  avatarWrapper: { width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #38a169, #8b5cf6)", padding: "2px" },
  avatarInitials: { width: "100%", height: "100%", borderRadius: "50%", background: "#ffffff", color: "#38a169", fontWeight: "800", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center" },
  driverIdBadge: { padding: "4px 10px", borderRadius: "16px", fontSize: "11px", fontWeight: "800", background: "rgba(139, 92, 246, 0.12)", color: "#7c3aed", border: "1px solid #c4b5fd" },
  tabsContainer: { display: "flex", gap: "8px", marginBottom: "24px", overflowX: "auto", paddingBottom: "8px" },
  cardTitle: { fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: 0 },
  metricLabel: { fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  metricVal: { fontSize: "14px", fontWeight: "800", color: "#0f172a", marginTop: "2px" },
  earningsCard: { background: "linear-gradient(135deg, #38a169, #2f855a)", color: "#ffffff", borderRadius: "18px", padding: "22px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { background: "#ffffff", borderRadius: "20px", padding: "28px", maxWidth: "480px", width: "100%" },
  formLabel: { fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px", display: "block" },
  formInput: { width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" },
};

export default Driver;
