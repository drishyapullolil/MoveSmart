import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getStoredUser, clearStoredSession } from "../../utils/session";
import DriverMenu from "./DriverMenu";

export default function DriverHeader({
  activeNav,
  user: propUser,
  assignedBus,
  isOnline = true,
  setIsOnline,
  unreadCount = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => propUser || getStoredUser() || { name: "Driver", role: "driver" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(unreadCount);
  const [isMalayalam, setIsMalayalam] = useState(false);
  const notifDropdownRef = useRef(null);
  const menuContainerRef = useRef(null);

  // Sync user state
  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    } else {
      const current = getStoredUser();
      if (current) setUser(current);
    }
  }, [propUser]);

  // Load and listen for notifications
  useEffect(() => {
    const loadAlerts = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("moveSmart_driverNotifications") || "[]");
        const readIds = JSON.parse(localStorage.getItem("moveSmart_readNotifIds") || "[]");
        setNotificationsList(stored);
        const count = stored.filter((n) => !readIds.includes(n.id) && !n.isRead).length;
        setUnreadNotifs(count);
      } catch {
        setNotificationsList([]);
        setUnreadNotifs(0);
      }
    };
    loadAlerts();
    window.addEventListener("storage", loadAlerts);
    return () => window.removeEventListener("storage", loadAlerts);
  }, [unreadCount]);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close driver menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setShowNotifDropdown(false);
  }, [location.pathname, location.search]);

  const handleMarkAllRead = () => {
    try {
      const readIds = notificationsList.map((n) => n.id);
      localStorage.setItem("moveSmart_readNotifIds", JSON.stringify(readIds));
      setUnreadNotifs(0);
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Mark read error:", e);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of the MoveSmart Driver Portal?")) {
      clearStoredSession();
      navigate("/login");
    }
  };

  const handleDutyToggle = () => {
    const nextState = !isOnline;
    if (setIsOnline) {
      setIsOnline(nextState);
    }
    localStorage.setItem("moveSmart_driverOnline", JSON.stringify(nextState));
    window.dispatchEvent(new Event("storage"));
  };

  // Google Translate Toggle Helper
  const toggleGoogleTranslate = () => {
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      const targetLang = isMalayalam ? "en" : "ml";
      select.value = targetLang;
      select.dispatchEvent(new Event("change"));
      setIsMalayalam(!isMalayalam);
    } else {
      setIsMalayalam(!isMalayalam);
    }
  };

  // Determine current active navigation name
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTabParam = searchParams.get("tab");

  const getActivePageLabel = () => {
    if (activeNav === "live-drive" || currentPath.includes("/live-drive")) return { icon: "🚍", label: "Live Drive" };
    if (activeNav === "rfid" || currentPath.includes("/rfid-device")) return { icon: "📡", label: "RFID Reader" };
    if (activeNav === "buses" || currentTabParam === "buses" || currentPath === "/driver/my-bus") return { icon: "🚌", label: "My Bus" };
    if (activeNav === "trips" || currentTabParam === "trips" || currentPath === "/driver/trips") return { icon: "⏰", label: "Trips" };
    if (activeNav === "leave" || currentTabParam === "leave" || currentPath === "/driver/leave") return { icon: "📅", label: "Leave" };
    if (activeNav === "payments" || activeNav === "collections" || currentTabParam === "payments" || currentPath === "/driver/collections") return { icon: "💰", label: "Collections" };
    if (activeNav === "verification" || activeNav === "profile" || currentTabParam === "verification" || currentPath === "/driver/profile") return { icon: "👤", label: "Profile" };
    if (activeNav === "lostfound" || currentTabParam === "lostfound" || currentPath === "/driver/lost-found") return { icon: "📦", label: "Lost & Found" };
    if (activeNav === "notifications" || currentTabParam === "notifications" || currentPath.includes("/notifications")) return { icon: "🔔", label: "Notifications" };
    return { icon: "📊", label: "Dashboard" };
  };

  const activeInfo = getActivePageLabel();

  return (
    <header className="driver-global-header">
      <div className="driver-header-container">
        {/* LEFT: MoveSmart Logo & Portal Branding */}
        <div className="driver-header-brand">
          <Link to="/driver" className="driver-brand-link">
            <div className="driver-logo-badge">
              <img src="/logo.png" alt="MoveSmart Logo" className="driver-logo-img" />
            </div>
            <div className="driver-brand-text-col">
              <div className="driver-brand-title-row">
                <span className="driver-brand-title">MoveSmart</span>
                <span className="driver-portal-pill">DRIVER PORTAL</span>
              </div>
              <span className="driver-brand-sub">Kerala Private Transit Portal</span>
            </div>
          </Link>
        </div>

        {/* CENTER: Clean All-in-One Driver Menu Dropdown */}
        <nav className="driver-header-nav" aria-label="Main Driver Navigation">
          <div ref={menuContainerRef} className="driver-menu-dropdown-wrapper">
            <button
              id="driver-menu-toggle-btn"
              type="button"
              className={`driver-menu-btn ${isMenuOpen ? "open" : ""}`}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              title="Open all driver navigation and services"
            >
              <span className="driver-menu-btn-icon">☰</span>
              <span className="driver-menu-active-chip">
                <span>{activeInfo.icon}</span>
                <span>{activeInfo.label}</span>
              </span>
              <span className="driver-menu-divider">|</span>
              <span className="driver-menu-btn-label">Driver Menu</span>
              <span className={`driver-menu-chevron ${isMenuOpen ? "rotated" : ""}`}>▾</span>
            </button>

            {/* Complete All-in-One Driver Menu Popover */}
            <DriverMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              activeNav={activeNav}
              user={user}
              assignedBus={assignedBus}
              isOnline={isOnline}
              unreadNotifs={unreadNotifs}
            />
          </div>
        </nav>

        {/* RIGHT: Notifications, Language, Duty Badge, Profile & Sign Out */}
        <div className="driver-header-actions">
          {/* Notification Bell with Quick Popover */}
          <div ref={notifDropdownRef} className="driver-notif-wrapper">
            <button
              type="button"
              className={`driver-icon-btn ${showNotifDropdown ? "active" : ""}`}
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              title="Notifications & Fleet Alerts"
              aria-label="View notifications"
            >
              <span>🔔</span>
              {unreadNotifs > 0 && (
                <span className="driver-header-notif-badge">{unreadNotifs}</span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="driver-notif-popover">
                <div className="driver-popover-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "800", fontSize: "14px", color: "#182033" }}>
                      Notifications
                    </span>
                    {unreadNotifs > 0 && (
                      <span className="driver-unread-chip">{unreadNotifs} New</span>
                    )}
                  </div>
                  {unreadNotifs > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="driver-mark-read-btn"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="driver-popover-body">
                  {notificationsList.length === 0 ? (
                    <div className="driver-popover-empty">No alerts or fleet notices.</div>
                  ) : (
                    notificationsList.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className="driver-popover-item"
                        onClick={() => {
                          setShowNotifDropdown(false);
                          navigate("/driver/notifications");
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "3px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "800",
                              fontSize: "13px",
                              color: "#182033",
                            }}
                          >
                            {n.title || "Notification"}
                          </span>
                          <span style={{ fontSize: "10.5px", color: "#667085" }}>
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Live"}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#667085",
                            lineHeight: "1.4",
                          }}
                        >
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="driver-popover-footer">
                  <Link
                    to="/driver/notifications"
                    onClick={() => setShowNotifDropdown(false)}
                    className="driver-view-all-link"
                  >
                    View All Notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Bilingual Malayalam / English Toggle */}
          <button
            type="button"
            className="driver-lang-btn"
            onClick={toggleGoogleTranslate}
            title="Toggle Malayalam / English Language"
          >
            <span>🌐</span>
            <span>{isMalayalam ? "English" : "മലയാളം (ML)"}</span>
          </button>

          {/* ON DUTY Pulsing Indicator Badge Toggle */}
          <button
            type="button"
            className={`driver-duty-badge ${isOnline ? "online" : "offline"}`}
            onClick={handleDutyToggle}
            title="Toggle Driver Duty Status"
          >
            <span className={isOnline ? "driver-duty-dot pulsing" : "driver-duty-dot offline"} />
            <span>{isOnline ? "ON DUTY" : "OFF DUTY"}</span>
          </button>

          {/* Driver Profile Chip */}
          <div className="driver-profile-chip" title={`Driver: ${user?.name || "Driver"}`}>
            <div className="driver-avatar-mini">
              {user?.profilePic ? (
                <img
                  src={user.profilePic}
                  alt={user?.name || "Driver"}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span>
                  {typeof user?.name === "string" && user.name.trim()
                    ? user.name
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                    : "DR"}
                </span>
              )}
            </div>
            <span className="driver-profile-name">{user?.name || "Driver"}</span>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="driver-signout-btn"
            title="Sign Out from Driver Portal"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
