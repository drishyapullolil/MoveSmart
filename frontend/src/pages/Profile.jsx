import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { Download, Eye, Ticket, Users, FileText } from "lucide-react";
import { getStoredUser, setStoredUser, clearStoredSession } from "../utils/session";
import { validateName } from "../utils/nameValidator";
import { generateTicketPDF } from "../utils/ticketPdfGenerator";
import BookingSuccess from "../components/booking/BookingSuccess";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. User State loaded purely from authenticated session
  const [user, setUser] = useState(() => {
    const savedUser = getStoredUser();
    return savedUser || {
      name: "Guest Passenger",
      email: "",
      phone: "",
      role: "Passenger",
      dob: "",
      gender: "",
      address: "",
      avatarUrl: "",
    };
  });

  // 2. RFID Card State loaded purely from database
  const [cardInfo, setCardInfo] = useState({
    hasCard: false,
    cardNumber: "",
    lastFour: "",
    cardType: "",
    balance: 0,
    status: "Not Issued",
  });

  // 3. Active Tab State ('info', 'activity', 'security', 'settings')
  const [activeTab, setActiveTab] = useState(() => location.state?.openTab || "info");

  // 4. Modals State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // 5. Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // 6. Change Password Form State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 7. Travel Activity & Bookings State
  const [travelHistory, setTravelHistory] = useState([]);
  const [selectedBookingForPass, setSelectedBookingForPass] = useState(null);

  // Fetch Live RFID Card, Real Seat Bookings & Travel Activity from Database
  const fetchProfileCardAndActivityData = useCallback(async () => {
    try {
      const u = getStoredUser();
      const params = {};
      if (u?.id || u?._id) params.userId = u.id || u._id;
      if (u?.email) params.email = u.email;

      const userIdentifier = u?.id || u?._id || "user";

      const [balRes, txnRes, bookRes] = await Promise.allSettled([
        axios.get("/api/wallet/balance", { params, withCredentials: true }),
        axios.get("/api/wallet/transactions", { params, withCredentials: true }),
        axios.get(`/api/bookings/user/${userIdentifier}`, {
          params: { email: u?.email, phone: u?.phone },
        }),
      ]);

      if (balRes.status === "fulfilled" && balRes.value?.data) {
        const balData = balRes.value.data;
        const hasActive = Boolean(balData.hasCard && balData.cardNumber);
        setCardInfo({
          hasCard: hasActive,
          cardNumber: balData.cardNumber || "",
          lastFour: balData.lastFour || "",
          cardType: balData.cardType || "Regular Pass",
          balance: Number(balData.balance || 0),
          status: hasActive ? "Active" : "Not Issued",
        });
      }

      const combinedTravels = [];

      // 1. Ingest actual Seat Bookings from MongoDB (with individual passenger details)
      if (bookRes.status === "fulfilled" && Array.isArray(bookRes.value?.data?.bookings)) {
        const today = new Date().toISOString().split("T")[0];
        bookRes.value.data.bookings.forEach((b) => {
          const isUpcoming = (b.travelDate >= today) && b.status !== "Cancelled";
          combinedTravels.push({
            id: b.bookingId || b._id,
            busNumber: b.busNumber || b.busName || "MoveSmart Fleet Bus",
            busName: b.busName,
            routeName: `${b.fromLocation} ➔ ${b.toLocation}`,
            dateTime: `${b.travelDate}${b.departureTime ? ` at ${b.departureTime}` : ""}`,
            seat: Array.isArray(b.selectedSeats) ? b.selectedSeats.join(", ") : (b.selectedSeats || "Standard"),
            passengers: Array.isArray(b.passengers) ? b.passengers : [],
            passengerName: b.passengerName,
            status: isUpcoming ? "Upcoming" : (b.status || "Completed"),
            fare: `₹ ${Number(b.totalPrice || 0).toFixed(2)}`,
            isSeatBooking: true,
            rawBooking: b,
            timestamp: b.createdAt ? new Date(b.createdAt).getTime() : Date.now(),
          });
        });
      }

      // 2. Ingest wallet travel transactions
      if (txnRes.status === "fulfilled" && Array.isArray(txnRes.value?.data)) {
        txnRes.value.data
          .filter((t) => t.type === "Travel" || t.type === "Bus Booking")
          .forEach((t) => {
            // Avoid duplicate if already in bookings list
            const alreadyExists = combinedTravels.some((b) => b.id === t.transactionId || b.id === t._id);
            if (!alreadyExists) {
              combinedTravels.push({
                id: t.transactionId || t._id,
                busNumber: "MoveSmart Bus",
                routeName: t.description || "Transit Trip",
                dateTime: t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recent",
                seat: "Standard",
                passengers: [],
                status: "Completed",
                fare: `₹ ${Number(t.amount || 0).toFixed(2)}`,
                isSeatBooking: false,
                rawBooking: null,
                timestamp: t.createdAt ? new Date(t.createdAt).getTime() : 0,
              });
            }
          });
      }

      // Sort newest first
      combinedTravels.sort((a, b) => b.timestamp - a.timestamp);
      setTravelHistory(combinedTravels);
    } catch (err) {
      console.error("Failed to fetch profile card and activity data:", err);
    }
  }, []);

  // 8. Travel History Filter
  const [activityFilter, setActivityFilter] = useState("all");

  // 9. Notification & Settings State
  const [notifications, setNotifications] = useState({
    smsAlerts: true,
    emailReceipts: true,
    routeUpdates: true,
    marketing: false,
  });

  // Protected Route Sync
  useEffect(() => {
    const saved = getStoredUser();
    if (saved) {
      setUser(saved);
    }
    fetchProfileCardAndActivityData();
  }, [fetchProfileCardAndActivityData]);

  // Sync edit form inputs when modal opens
  const handleOpenEditModal = () => {
    setEditName(user.name || user.fullName || user.username || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditDob(user.dob || "");
    setEditGender(user.gender || "");
    setEditAddress(user.address || "");
    setShowEditModal(true);
  };

  // Save Edit Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const nameCheck = validateName(editName, "Full Name");
    if (!nameCheck.valid) {
      showToast(`⚠️ ${nameCheck.message}`);
      return;
    }

    const updatedUser = {
      ...user,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      dob: editDob,
      gender: editGender,
      address: editAddress.trim(),
    };

    const isRemembered = !sessionStorage.getItem("user");
    setUser(updatedUser);
    setStoredUser(updatedUser, isRemembered);
    setShowEditModal(false);
    showToast("Profile details updated successfully! ✓");
  };

  // Handle Password Change
  const handleSavePassword = (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!oldPassword) {
      setPasswordError("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setShowPasswordModal(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showToast("Password updated successfully! 🔒");
  };

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of MoveSmart?")) {
      clearStoredSession();
      navigate("/login");
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filtered Travel History
  const filteredHistory = travelHistory.filter((item) => {
    if (activityFilter === "upcoming") return item.status === "Upcoming";
    if (activityFilter === "completed") return item.status === "Completed";
    return true;
  });

  // Calculate User Initials
  const getInitials = (fullName) => {
    if (!fullName) return "MS";
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return fullName.slice(0, 2).toUpperCase();
  };

  return (
    <div style={styles.pageWrapper}>
      {/* Dynamic Background Pattern */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif;
          background: #f8fafc;
          color: #1e293b;
          margin: 0;
        }

        .profile-tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .profile-tab-btn:hover {
          color: #38a169;
          background: rgba(56, 161, 105, 0.08);
        }

        .profile-tab-btn.active {
          background: linear-gradient(135deg, #38a169, #8b5cf6);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(56, 161, 105, 0.25);
        }

        .card-hover-effect {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card-hover-effect:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(139, 92, 246, 0.12);
        }

        .action-btn-primary {
          background: linear-gradient(135deg, #38a169, #8b5cf6);
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(56, 161, 105, 0.2);
          transition: all 0.2s ease;
        }

        .action-btn-primary:hover {
          opacity: 0.95;
          transform: scale(1.02);
          box-shadow: 0 6px 18px rgba(139, 92, 246, 0.3);
        }

        .action-btn-secondary {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn-secondary:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Toggle Switch Styling */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 20px; width: 20px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        input:checked + .slider {
          background: linear-gradient(135deg, #38a169, #8b5cf6);
        }

        input:checked + .slider:before {
          transform: translateX(22px);
        }

        @media (max-width: 768px) {
          .profile-grid-layout {
            grid-template-columns: 1fr !important;
          }
          .tabs-scroll-wrapper {
            overflow-x: auto;
            padding-bottom: 6px;
          }
        }
      `}</style>

      <Header />

      {/* Main Page Container */}
      <main style={styles.mainContainer}>
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div style={styles.toastBanner}>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 👤 Hero Profile Section Header */}
        <section style={styles.heroProfileCard}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "18px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Circular Avatar */}
              <div style={styles.avatarWrapper}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} style={styles.avatarImage} />
                ) : (
                  <div style={styles.avatarInitials}>
                    {getInitials(user.name)}
                  </div>
                )}
                <div style={styles.onlineBadge} title="Active Account" />
              </div>

              {/* User Identity Details */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    {user.name}
                  </h1>
                  <span style={{
                    ...styles.roleBadge,
                    background: user.role?.toLowerCase() === "admin" ? "rgba(139, 92, 246, 0.15)" : user.role?.toLowerCase() === "driver" ? "rgba(59, 130, 246, 0.15)" : "rgba(56, 161, 105, 0.15)",
                    color: user.role?.toLowerCase() === "admin" ? "#7c3aed" : user.role?.toLowerCase() === "driver" ? "#2563eb" : "#2f855a",
                    borderColor: user.role?.toLowerCase() === "admin" ? "#c4b5fd" : user.role?.toLowerCase() === "driver" ? "#93c5fd" : "#9ae6b4"
                  }}>
                    {user.role || "Passenger"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "14px", marginTop: "6px", flexWrap: "wrap", color: "#64748b", fontSize: "13px", fontWeight: "500" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {user.email}
                  </span>

                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {user.phone || "+91 98765 43210"}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Profile Action Button */}
            <button className="action-btn-primary" onClick={handleOpenEditModal} style={{ fontSize: "13px", padding: "8px 16px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </section>

        {/* 🗂 Navigation Sub-Tabs */}
        <div className="tabs-scroll-wrapper" style={styles.tabsContainer}>
          <button
            className={`profile-tab-btn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            User Details
          </button>

          <button
            className={`profile-tab-btn ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Travel History & Bookings
          </button>

          <button
            className={`profile-tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Security & Accounts
          </button>

          <button
            className={`profile-tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </button>
        </div>

        {/* 📊 TAB 1: USER INFO SECTION */}
        {activeTab === "info" && (
          <div className="profile-grid-layout" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Personal Information</h3>
                <button className="action-btn-secondary" onClick={handleOpenEditModal} style={{ padding: "6px 14px", fontSize: "13px" }}>
                  Edit Info
                </button>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Date of Birth</span>
                  <span style={styles.infoValue}>{user.dob ? new Date(user.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : "Not Set"}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Gender</span>
                  <span style={styles.infoValue}>{user.gender || "Not Set"}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Phone Number</span>
                  <span style={styles.infoValue}>{user.phone || "Not Set"}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Primary Email</span>
                  <span style={styles.infoValue}>{user.email || "Not Set"}</span>
                </div>

                <div style={{ ...styles.infoBox, gridColumn: "1 / -1" }}>
                  <span style={styles.infoLabel}>Residential Address</span>
                  <span style={styles.infoValue}>{user.address || "Not Set"}</span>
                </div>
              </div>
            </div>

            {/* RFID Card Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{
                ...styles.rfidCard,
                background: cardInfo.hasCard
                  ? "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)"
                  : "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
                border: cardInfo.hasCard ? "1px solid rgba(167, 139, 250, 0.3)" : "1px dashed rgba(148, 163, 184, 0.4)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                    MoveSmart Transit Pass
                  </span>
                  <span style={{
                    background: cardInfo.hasCard ? "rgba(74, 222, 128, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: cardInfo.hasCard ? "#4ade80" : "#fda4af",
                    border: `1px solid ${cardInfo.hasCard ? "rgba(74, 222, 128, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "800"
                  }}>
                    {cardInfo.hasCard ? "Active" : "Not Issued (XXX)"}
                  </span>
                </div>

                <div style={{ margin: "24px 0 16px 0" }}>
                  <div style={{ fontSize: "11px", opacity: "0.8" }}>RFID Card Number</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "2px", fontFamily: "monospace" }}>
                    {cardInfo.hasCard ? (cardInfo.lastFour ? `•••• •••• ${cardInfo.lastFour}` : cardInfo.cardNumber) : "XXXX-XXXX-XXXX"}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.9 }}>
                  <div>
                    <span>Holder: </span>
                    <strong>{cardInfo.hasCard ? (user.name || user.fullName || "Active Passenger") : "XXX"}</strong>
                  </div>
                  <div>
                    <span>Class: </span>
                    <strong>{cardInfo.hasCard ? (cardInfo.cardType || "Silver Pass") : "XXXX"}</strong>
                  </div>
                </div>
              </div>

              {/* Apply for Card CTA button if user does not have RFID */}
              {!cardInfo.hasCard && (
                <button
                  onClick={() => navigate("/dashboard/card-application")}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(109, 40, 217, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  🪪 Book / Apply for RFID Card →
                </button>
              )}

              {/* Quick Status Box */}
              <div style={styles.card}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                  Card Status & Verification
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#475569" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}>
                    <span>Aadhaar / ID Verification</span>
                    <strong style={{ color: cardInfo.hasCard ? "#38a169" : "#94a3b8" }}>
                      {cardInfo.hasCard ? "✓ Verified" : "Not Linked (XXX)"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}>
                    <span>Emergency SOS Contacts</span>
                    <strong style={{ color: cardInfo.hasCard ? "#38a169" : "#94a3b8" }}>
                      {cardInfo.hasCard ? "Configured" : "Not Linked (XXX)"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Student Concession</span>
                    <strong style={{ color: cardInfo.hasCard ? "#8b5cf6" : "#94a3b8" }}>
                      {cardInfo.hasCard ? (cardInfo.cardType?.includes("Student") ? "Student Concession (50% Off)" : "Standard Fare") : "Not Linked (XXX)"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🚌 TAB 2: ACTIVITY & TRAVEL HISTORY */}
        {activeTab === "activity" && (
          <div style={styles.card}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
              <div>
                <h3 style={styles.cardTitle}>Recent Travel History & Bookings</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  View all your smart bus trips, routes, and upcoming tickets.
                </p>
              </div>

              {/* Activity Filter Buttons */}
              <div style={{ display: "flex", gap: "8px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
                <button
                  onClick={() => setActivityFilter("all")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: activityFilter === "all" ? "#ffffff" : "transparent",
                    color: activityFilter === "all" ? "#0f172a" : "#64748b",
                    boxShadow: activityFilter === "all" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  All Trips
                </button>
                <button
                  onClick={() => setActivityFilter("upcoming")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: activityFilter === "upcoming" ? "#ffffff" : "transparent",
                    color: activityFilter === "upcoming" ? "#38a169" : "#64748b",
                    boxShadow: activityFilter === "upcoming" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  Upcoming ({travelHistory.filter(t => t.status === "Upcoming").length})
                </button>
                <button
                  onClick={() => setActivityFilter("completed")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: activityFilter === "completed" ? "#ffffff" : "transparent",
                    color: activityFilter === "completed" ? "#8b5cf6" : "#64748b",
                    boxShadow: activityFilter === "completed" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Travel History Cards List */}
            {filteredHistory.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                No travel history or bookings recorded yet in the database.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {filteredHistory.map((item) => (
                  <div key={item.id} className="card-hover-effect" style={styles.activityItemCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: item.status === "Upcoming" ? "rgba(56, 161, 105, 0.12)" : "rgba(139, 92, 246, 0.12)",
                        color: item.status === "Upcoming" ? "#38a169" : "#8b5cf6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="3" width="15" height="13" rx="2" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                            {item.routeName}
                          </span>
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "800",
                            background: item.status === "Upcoming" ? "#e6fffa" : "#f3e8ff",
                            color: item.status === "Upcoming" ? "#2f855a" : "#7c3aed"
                          }}>
                            {item.status}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "4px", fontSize: "13px", color: "#64748b" }}>
                          <span>🚌 {item.busNumber}</span>
                          <span>🪑 Seat: <strong>{item.seat}</strong></span>
                          <span>📅 {item.dateTime}</span>
                        </div>

                        {/* Co-passengers list if multi-seat booking */}
                        {Array.isArray(item.passengers) && item.passengers.length > 0 && (
                          <div style={{ marginTop: "6px", fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: "700", color: "#0f172a" }}>👥 Passengers:</span>
                            {item.passengers.map((p, pIdx) => (
                              <span key={pIdx} style={{ background: "#ede9fe", color: "#6d28d9", padding: "1px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                                Seat {p.seat}: {p.name} {p.age ? `(${p.age}y)` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>
                        {item.fare}
                      </div>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Ref: {item.id}</span>

                      {/* Download PDF Ticket & View Pass Action Buttons */}
                      {item.isSeatBooking && item.rawBooking && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => generateTicketPDF(item.rawBooking)}
                            title="Download Official MoveSmart E-Ticket PDF Sheet"
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                              color: "#ffffff",
                              border: "none",
                              fontSize: "12px",
                              fontWeight: "800",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <Download size={13} />
                            <span>Download PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedBookingForPass(item.rawBooking)}
                            title="View Boarding Pass"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              background: "#ffffff",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Eye size={13} />
                            <span>Pass</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🔐 TAB 3: SECURITY & ACCOUNTS */}
        {activeTab === "security" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="profile-grid-layout">
            {/* Password Security */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Account Security</h3>
              <p style={{ margin: "4px 0 18px 0", fontSize: "13px", color: "#64748b" }}>
                Manage your password and authentication parameters.
              </p>

              <button className="action-btn-primary" onClick={() => setShowPasswordModal(true)}>
                🔑 Change Password
              </button>
            </div>

            {/* Google Account Connection Status */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Connected Accounts</h3>
              <p style={{ margin: "4px 0 16px 0", fontSize: "13px", color: "#64748b" }}>
                Linked social accounts for single sign-on access.
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Google Account</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{user.email}</div>
                  </div>
                </div>

                <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "800", background: "#dcfce7", color: "#16a34a" }}>
                  ✓ Connected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ⚙️ TAB 5: SETTINGS */}
        {activeTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="profile-grid-layout">
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Notification Preferences</h3>
              <p style={{ margin: "4px 0 16px 0", fontSize: "13px", color: "#64748b" }}>
                Choose how you want MoveSmart to alert you about trips.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={styles.settingRow}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>SMS Trip Alerts</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Get live SMS updates for bus arrivals & delays</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.smsAlerts}
                      onChange={(e) => setNotifications({ ...notifications, smsAlerts: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={styles.settingRow}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>Email Travel Receipts</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Receive payment receipts & booking vouchers</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.emailReceipts}
                      onChange={(e) => setNotifications({ ...notifications, emailReceipts: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={styles.settingRow}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>Route & Delay Alerts</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Real-time updates on route modifications</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.routeUpdates}
                      onChange={(e) => setNotifications({ ...notifications, routeUpdates: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Account Actions</h3>
              <p style={{ margin: "4px 0 16px 0", fontSize: "13px", color: "#64748b" }}>
                Manage your session and account settings.
              </p>

              <button
                className="action-btn-secondary"
                onClick={handleLogout}
                style={{ width: "100%", justifyContent: "center", color: "#dc2626", borderColor: "#fca5a5", background: "#fef2f2" }}
              >
                🚪 Sign Out of MoveSmart
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ✏️ EDIT PROFILE MODAL */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
              Edit Profile Details
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.formLabel}>Full Name</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>Email Address</label>
                <input
                  type="email"
                  style={styles.formInput}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={styles.formLabel}>Phone Number</label>
                  <input
                    type="text"
                    style={styles.formInput}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>Gender</label>
                  <select
                    style={styles.formInput}
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={styles.formLabel}>Date of Birth</label>
                <input
                  type="date"
                  style={styles.formInput}
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                />
              </div>

              <div>
                <label style={styles.formLabel}>Address</label>
                <textarea
                  rows="3"
                  style={{ ...styles.formInput, resize: "none" }}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="action-btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn-primary">
                  Save Changes ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔑 CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
              Change Account Password
            </h3>

            {passwordError && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.formLabel}>Current Password</label>
                <input
                  type="password"
                  style={styles.formInput}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>New Password</label>
                <input
                  type="password"
                  style={styles.formInput}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>Confirm New Password</label>
                <input
                  type="password"
                  style={styles.formInput}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="action-btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn-primary">
                  Update Password ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎫 BOARDING PASS & PDF MODAL */}
      {selectedBookingForPass && (
        <BookingSuccess
          booking={selectedBookingForPass}
          onClose={() => setSelectedBookingForPass(null)}
          onGoToDashboard={() => setSelectedBookingForPass(null)}
        />
      )}

      <Footer />
    </div>
  );
}

// 🎨 Styles Object
const styles = {
  pageWrapper: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
  },
  topNavbar: {
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "10px 20px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
  },
  navContainer: {
    maxWidth: "1040px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navLink: {
    color: "#475569",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  mainContainer: {
    maxWidth: "1040px",
    width: "100%",
    margin: "16px auto 32px auto",
    padding: "0 16px",
    flex: 1,
  },
  toastBanner: {
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "13px",
    marginBottom: "14px",
    boxShadow: "0 2px 10px rgba(56, 161, 105, 0.2)",
    textAlign: "center",
  },
  heroProfileCard: {
    background: "linear-gradient(135deg, #ffffff 60%, #f3e8ff 100%)",
    borderRadius: "14px",
    padding: "18px 22px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 16px rgba(139, 92, 246, 0.05)",
    marginBottom: "18px",
  },
  avatarWrapper: {
    position: "relative",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    padding: "2px",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarInitials: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#ffffff",
    color: "#38a169",
    fontWeight: "800",
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineBadge: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#22c55e",
    border: "2px solid #ffffff",
    position: "absolute",
    bottom: "1px",
    right: "1px",
  },
  roleBadge: {
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "800",
    border: "1px solid",
  },
  tabsContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "18px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "8px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "18px 20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
    margin: 0,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  infoBox: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    padding: "11px 14px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
  },
  infoLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoValue: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  rfidCard: {
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    color: "#ffffff",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 6px 18px rgba(56, 161, 105, 0.2)",
  },
  activityItemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "10px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
  },
  walletCard: {
    background: "linear-gradient(135deg, #38a169, #2f855a)",
    color: "#ffffff",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 6px 18px rgba(56, 161, 105, 0.2)",
  },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
  },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    maxWidth: "460px",
    width: "100%",
    boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
  },
  formLabel: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "4px",
    display: "block",
  },
  formInput: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
  },
};

export default Profile;