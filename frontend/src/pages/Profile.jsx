import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { processRazorpayPayment } from "../utils/razorpay";

function Profile() {
  const navigate = useNavigate();

  // 1. User State from localStorage or default demo user
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      name: "Drishya Jose",
      email: "drishyajose03@gmail.com",
      phone: "+91 98765 43210",
      role: "User",
      dob: "2000-08-15",
      gender: "Female",
      address: "House 42, Green Park, Ernakulam, Kerala - 682001",
      rfidCardId: "RFID-MS-8839201",
      isGoogleConnected: true,
      avatarUrl: "",
    };
  });

  // 2. Active Tab State ('info', 'activity', 'payments', 'security', 'settings')
  const [activeTab, setActiveTab] = useState("info");

  // 3. Modals State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // 4. Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // 5. Change Password Form State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 6. Wallet & Transactions State
  const [walletBalance, setWalletBalance] = useState(250.0);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactions, setTransactions] = useState([
    { id: "TXN-9021", title: "Bus 102 — Kochi Fort ➔ Aluva Terminal", date: "Today, 09:30 AM", amount: "- ₹ 35.00", isDebit: true },
    { id: "TXN-8812", title: "Wallet Recharge via Google Pay", date: "Yesterday, 06:15 PM", amount: "+ ₹ 200.00", isDebit: false },
    { id: "TXN-7629", title: "Express Line 4 — Thiruvananthapuram ➔ Ernakulam", date: "24 Jul 2026, 08:00 AM", amount: "- ₹ 120.00", isDebit: true },
    { id: "TXN-6510", title: "Metro Connect Feed Bus", date: "22 Jul 2026, 05:45 PM", amount: "- ₹ 15.00", isDebit: true },
  ]);

  // 7. Travel History & Activity State
  const [activityFilter, setActivityFilter] = useState("all");
  const [travelHistory, setTravelHistory] = useState([
    {
      id: "BKG-8841",
      busNumber: "Bus 102",
      routeName: "Kochi Fort ➔ Aluva Terminal",
      dateTime: "26 Jul 2026, 09:30 AM",
      seat: "A12",
      status: "Upcoming",
      fare: "₹ 35.00",
    },
    {
      id: "BKG-7629",
      busNumber: "Express Line 4",
      routeName: "Thiruvananthapuram ➔ Ernakulam",
      dateTime: "24 Jul 2026, 08:00 AM",
      seat: "B04",
      status: "Completed",
      fare: "₹ 120.00",
    },
    {
      id: "BKG-6510",
      busNumber: "Feeder Bus 8",
      routeName: "Kaloor Metro ➔ InfoPark Tech",
      dateTime: "22 Jul 2026, 05:45 PM",
      seat: "Standing",
      status: "Completed",
      fare: "₹ 15.00",
    },
    {
      id: "BKG-5412",
      busNumber: "City Shuttle 14",
      routeName: "Vytilla Mobility Hub ➔ Kakkanad",
      dateTime: "20 Jul 2026, 10:15 AM",
      seat: "A08",
      status: "Completed",
      fare: "₹ 20.00",
    },
  ]);

  // 8. Notification & Settings State
  const [notifications, setNotifications] = useState({
    smsAlerts: true,
    emailReceipts: true,
    routeUpdates: true,
    marketing: false,
  });

  // Protected Route Sync
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      // Save default user for demo if empty
      const demoUser = {
        name: "Drishya Jose",
        email: "drishyajose03@gmail.com",
        phone: "+91 98765 43210",
        role: "User",
        dob: "2000-08-15",
        gender: "Female",
        address: "House 42, Green Park, Ernakulam, Kerala - 682001",
        rfidCardId: "RFID-MS-8839201",
        isGoogleConnected: true,
      };
      localStorage.setItem("user", JSON.stringify(demoUser));
      setUser(demoUser);
    }
  }, []);

  // Sync edit form inputs when modal opens
  const handleOpenEditModal = () => {
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "+91 98765 43210");
    setEditDob(user.dob || "2000-08-15");
    setEditGender(user.gender || "Female");
    setEditAddress(user.address || "House 42, Green Park, Ernakulam, Kerala");
    setShowEditModal(true);
  };

  // Save Edit Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      dob: editDob,
      gender: editGender,
      address: editAddress.trim(),
    };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
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

  // Handle Wallet Recharge via Razorpay
  const handleRechargeWallet = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(rechargeAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    processRazorpayPayment({
      amount: amountNum,
      description: `MoveSmart Wallet Recharge`,
      userEmail: user?.email || "",
      userName: user?.name || "Transit Passenger",
      userPhone: user?.phone || "",
      paymentType: "wallet",
      onSuccess: (res) => {
        const newBalance = walletBalance + amountNum;
        setWalletBalance(newBalance);

        const newTxn = {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `Wallet Top-Up via Razorpay (${res.paymentId || "Success"})`,
          date: "Just now",
          amount: `+ ₹ ${amountNum.toFixed(2)}`,
          isDebit: false,
        };

        setTransactions([newTxn, ...transactions]);
        setShowRechargeModal(false);
        showToast(`Successfully added ₹ ${amountNum.toFixed(2)} to your MoveSmart Wallet! 💳`);
      },
      onError: (err) => {
        if (!err.message?.includes("cancelled")) {
          showToast(`⚠️ Payment error: ${err.message}`);
        }
      },
    });
  };

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of MoveSmart?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
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

      {/* Top Navbar */}
      <header style={styles.topNavbar}>
        <div style={styles.navContainer}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.png"
              alt="MoveSmart Logo"
              style={{ height: "40px", width: "auto", objectFit: "contain" }}
            />
            <span style={{ fontSize: "20px", fontWeight: "800", background: "linear-gradient(135deg, #38a169, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MoveSmart
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link to="/dashboard" style={styles.navLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </Link>
            <Link to="/dashboard/card-application" style={styles.navLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Apply Card
            </Link>
            <button onClick={handleLogout} className="action-btn-secondary" style={{ padding: "8px 14px", fontSize: "13px", color: "#ef4444", borderColor: "#fca5a5" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </header>

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
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
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

                <div style={{ display: "flex", gap: "18px", marginTop: "8px", flexWrap: "wrap", color: "#64748b", fontSize: "14px", fontWeight: "500" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {user.email}
                  </span>

                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {user.phone || "+91 98765 43210"}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Profile Action Button */}
            <button className="action-btn-primary" onClick={handleOpenEditModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            className={`profile-tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Wallet & Payments
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
                  <span style={styles.infoValue}>{user.dob ? new Date(user.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : "15 Aug 2000"}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Gender</span>
                  <span style={styles.infoValue}>{user.gender || "Female"}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Phone Number</span>
                  <span style={styles.infoValue}>{user.phone || "+91 98765 43210"}</span>
                </div>

                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Primary Email</span>
                  <span style={styles.infoValue}>{user.email}</span>
                </div>

                <div style={{ ...styles.infoBox, gridColumn: "1 / -1" }}>
                  <span style={styles.infoLabel}>Residential Address</span>
                  <span style={styles.infoValue}>{user.address || "House 42, Green Park, Ernakulam, Kerala - 682001"}</span>
                </div>
              </div>
            </div>

            {/* RFID Card Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={styles.rfidCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                    MoveSmart Transit Pass
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.25)", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                    Active
                  </span>
                </div>

                <div style={{ margin: "24px 0 16px 0" }}>
                  <div style={{ fontSize: "11px", opacity: "0.8" }}>RFID Card Number</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "2px", fontFamily: "monospace" }}>
                    {user.rfidCardId || "RFID-MS-8839201"}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.9 }}>
                  <div>
                    <span>Holder: </span>
                    <strong>{user.name}</strong>
                  </div>
                  <div>
                    <span>Class: </span>
                    <strong>Silver Pass</strong>
                  </div>
                </div>
              </div>

              {/* Quick Status Box */}
              <div style={styles.card}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                  Card Status & Verification
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#475569" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}>
                    <span>Aadhaar / ID Verification</span>
                    <strong style={{ color: "#38a169" }}>✓ Verified</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}>
                    <span>Emergency SOS Contacts</span>
                    <strong style={{ color: "#38a169" }}>Configured (2 Contacts)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Student Concession</span>
                    <strong style={{ color: "#8b5cf6" }}>Standard Fare</strong>
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
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
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

                      <div style={{ display: "flex", gap: "16px", marginTop: "4px", fontSize: "13px", color: "#64748b" }}>
                        <span>🚌 {item.busNumber}</span>
                        <span>🪑 Seat: {item.seat}</span>
                        <span>📅 {item.dateTime}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>
                      {item.fare}
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Ticket ID: {item.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💳 TAB 3: WALLET & PAYMENTS */}
        {activeTab === "payments" && (
          <div className="profile-grid-layout" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
            {/* Wallet Summary Card */}
            <div style={styles.walletCard}>
              <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                MoveSmart Wallet Balance
              </span>
              <div style={{ fontSize: "36px", fontWeight: "800", margin: "12px 0 18px 0" }}>
                ₹ {walletBalance.toFixed(2)}
              </div>

              <button
                className="action-btn-primary"
                onClick={() => setShowRechargeModal(true)}
                style={{ width: "100%", justifyContent: "center", background: "#ffffff", color: "#2f855a", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              >
                + Top Up Wallet
              </button>
            </div>

            {/* Recent Transactions List */}
            <div style={styles.card}>
              <h3 style={{ ...styles.cardTitle, marginBottom: "16px" }}>Recent Transactions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "10px",
                        background: tx.isDebit ? "#fee2e2" : "#dcfce7",
                        color: tx.isDebit ? "#ef4444" : "#16a34a",
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800"
                      }}>
                        {tx.isDebit ? "↓" : "↑"}
                      </div>
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#0f172a" }}>{tx.title}</div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>{tx.date} • ID: {tx.id}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: tx.isDebit ? "#dc2626" : "#16a34a" }}>
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🔐 TAB 4: SECURITY & ACCOUNTS */}
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
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
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

      {/* Footer Branding */}
      <footer style={{ backgroundColor: "#0f172a", color: "#94a3b8", padding: "40px 5% 24px", borderTop: "3px solid #38a169", marginTop: "auto" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "30px" }}>
          <div>
            <div className="rta-logo" style={{ marginBottom: "12px", display: "inline-flex", alignItems: "center", gap: "12px" }}>
              <img 
                src="/logo.png" 
                alt="MoveSmart Logo" 
                style={{ 
                  height: "44px", 
                  width: "auto", 
                  objectFit: "contain", 
                  background: "#ffffff", 
                  padding: "4px 10px", 
                  borderRadius: "10px"
                }} 
              />
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff" }}>
                MoveSmart Kerala
              </span>
            </div>
            <p style={{ fontSize: "13px", maxWidth: "340px", lineHeight: "1.6", color: "#94a3b8", margin: 0 }}>
              Smart Private Bus Fleet Management &amp; Passenger Portal for Kerala. Real-time bus tracking, RFID pass management, and digital ticketing.
            </p>
          </div>
          <div style={{ display: "flex", gap: "40px" }}>
            <div>
              <h4 style={{ color: "#ffffff", marginBottom: "12px", fontSize: "14px", fontWeight: "700" }}>Transit Services</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><Link to="/dashboard" style={{ color: "#94a3b8", textDecoration: "none" }}>Private Bus City Routes</Link></li>
                <li><Link to="/dashboard/card-application" style={{ color: "#94a3b8", textDecoration: "none" }}>MoveSmart RFID Pass</Link></li>
                <li><Link to="/dashboard" style={{ color: "#94a3b8", textDecoration: "none" }}>Intercity Express Routes</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "#ffffff", marginBottom: "12px", fontSize: "14px", fontWeight: "700" }}>Support</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <li><Link to="/profile" style={{ color: "#94a3b8", textDecoration: "none" }}>Help Center</Link></li>
                <li><span style={{ color: "#94a3b8" }}>Kerala Transit Helpline: 1800-425-4747</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "24px", paddingTop: "16px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
          © {new Date().getFullYear()} MoveSmart Kerala. Smart Urban Transit System. All rights reserved.
        </div>
      </footer>

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

      {/* 💳 RECHARGE WALLET MODAL */}
      {showRechargeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRechargeModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
              Top Up MoveSmart Wallet
            </h3>

            <form onSubmit={handleRechargeWallet} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.formLabel}>Recharge Amount (₹)</label>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: rechargeAmount === amt ? "#38a169" : "#cbd5e1",
                        background: rechargeAmount === amt ? "#e6fffa" : "#ffffff",
                        color: rechargeAmount === amt ? "#2f855a" : "#475569",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      ₹ {amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  style={styles.formInput}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Enter custom amount"
                  required
                />
              </div>

              <div>
                <label style={styles.formLabel}>Payment Method</label>
                <select
                  style={styles.formInput}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="UPI">UPI / Google Pay / PhonePe</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="action-btn-secondary" onClick={() => setShowRechargeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn-primary">
                  Pay & Add Funds ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    padding: "14px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  navContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navLink: {
    color: "#475569",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  mainContainer: {
    maxWidth: "1100px",
    width: "100%",
    margin: "32px auto 40px auto",
    padding: "0 20px",
    flex: 1,
  },
  toastBanner: {
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "14px",
    marginBottom: "20px",
    boxShadow: "0 4px 14px rgba(56, 161, 105, 0.25)",
    textAlign: "center",
  },
  heroProfileCard: {
    background: "linear-gradient(135deg, #ffffff 60%, #f3e8ff 100%)",
    borderRadius: "20px",
    padding: "32px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(139, 92, 246, 0.08)",
    marginBottom: "28px",
  },
  avatarWrapper: {
    position: "relative",
    width: "76px",
    height: "76px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    padding: "3px",
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
    fontSize: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineBadge: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "#22c55e",
    border: "2px solid #ffffff",
    position: "absolute",
    bottom: "2px",
    right: "2px",
  },
  roleBadge: {
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "800",
    border: "1px solid",
  },
  tabsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "24px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "12px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    margin: 0,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  infoBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoValue: {
    fontSize: "14.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  rfidCard: {
    background: "linear-gradient(135deg, #38a169, #8b5cf6)",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 10px 25px rgba(56, 161, 105, 0.25)",
  },
  activityItemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
  },
  walletCard: {
    background: "linear-gradient(135deg, #38a169, #2f855a)",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 10px 25px rgba(56, 161, 105, 0.25)",
  },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: "12px",
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
    padding: "20px",
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  formLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "6px",
    display: "block",
  },
  formInput: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
  },
};

export default Profile;