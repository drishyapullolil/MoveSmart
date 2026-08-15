import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Bus,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Layers,
  Info,
  Check,
  Megaphone
} from "lucide-react";
import { getStoredUser, getStoredToken, clearStoredSession } from "../utils/session";

// ----------------------------------------------------
// BILINGUAL TRANSLATIONS (English & Malayalam)
// ----------------------------------------------------
const NOTIF_TRANSLATIONS = {
  en: {
    langToggle: "മലയാളം (ML)",
    brandTitle: "MoveSmart",
    driverBadge: "DRIVER PORTAL",
    subTitle: "Kerala Private Transit Portal",
    pageTitle: "Notifications & Alerts",
    pageSubtitle: "Important route assignments, leave status, and schedule updates",
    unreadCountBadge: "Unread",
    markAllRead: "✓ Mark All as Read",
    refreshBtn: "Refresh Notifications",
    emptyTitle: "No Notifications Yet",
    emptySubtitle: "You are all caught up! New schedule changes and leave updates will appear here.",
    loadingMsg: "Loading Driver Notifications...",
    errorMsg: "Failed to load notifications",
    retryBtn: "Retry Loading",
    backToDashboard: "← Back to Dashboard",
    readStatus: "Read",
    unreadStatus: "New Alert",
    tapToRead: "Tap to mark as read",

    // Notification Titles
    leaveApprovedTitle: "Leave Application Approved ✅",
    leaveRejectedTitle: "Leave Application Rejected ❌",
    scheduleAssignedTitle: "New Departure Schedule Assigned ⏰",
    busReassignedTitle: "Fleet Vehicle Reassigned 🚌",
    delayAlertTitle: "Traffic Delay Buffer Added ⚠️",
    announcementTitle: "Admin System Announcement 📢",

    // Time Ago
    justNow: "Just now",
    minsAgo: "mins ago",
    hoursAgo: "hours ago",
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: "days ago"
  },
  ml: {
    langToggle: "English (EN)",
    brandTitle: "മൂവ്സ്മാർട്ട്",
    driverBadge: "ഡ്രൈവർ പോർട്ടൽ",
    subTitle: "കേരള പ്രൈവറ്റ് ബസ്സ് സിസ്റ്റം",
    pageTitle: "അറിയിപ്പുകളും മുന്നറിയിപ്പുകളും",
    pageSubtitle: "നിങ്ങളുടെ റൂട്ട്, ലീവ്, ഷെഡ്യൂൾ വിവരങ്ങൾ ഇവിടുത്തെ ബോർഡിൽ കാണാം",
    unreadCountBadge: "വായിക്കാത്തത്",
    markAllRead: "✓ എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക",
    refreshBtn: "വീണ്ടും കാണുക (Refresh)",
    emptyTitle: "അറിയിപ്പുകൾ ഒന്നും ഇല്ല",
    emptySubtitle: "നിങ്ങൾക്ക് പുതിയ അറിയിപ്പുകളോ മാറ്റിനിശ്ചയിക്കലുകളോ ഇല്ല.",
    loadingMsg: "അറിയിപ്പുകൾ ലോഡ് ചെയ്യുന്നു...",
    errorMsg: "അറിയിപ്പുകൾ കണ്ടെത്താനായില്ല",
    retryBtn: "വീണ്ടും ശ്രമിക്കുക",
    backToDashboard: "← ഡാഷ്ബോർഡിലേക്ക് മടങ്ങുക",
    readStatus: "വായിച്ചത്",
    unreadStatus: "പുതിയത്",
    tapToRead: "വായിച്ചതായി മാറ്റാൻ ടാപ്പ് ചെയ്യുക",

    // Notification Titles
    leaveApprovedTitle: "ലീവ് അപേക്ഷ അഡ്മിൻ അംഗീകരിച്ചു ✅",
    leaveRejectedTitle: "ലീവ് അപേക്ഷ നിരസിക്കപ്പെട്ടു ❌",
    scheduleAssignedTitle: "പുതിയ യാത്ര ഷെഡ്യൂൾ നൽകിയിട്ടുണ്ട് ⏰",
    busReassignedTitle: "ബസ്സ് വാഹനം മാറ്റി നൽകിയിട്ടുണ്ട് 🚌",
    delayAlertTitle: "ട്രാഫിക് തടസ്സ മുന്നറിയിപ്പ് ⚠️",
    announcementTitle: "അഡ്മിൻ പൊതു അറിയിപ്പ് 📢",

    // Time Ago
    justNow: "ഇപ്പോൾ",
    minsAgo: "മിനിറ്റ് മുൻപ്",
    hoursAgo: "മണിക്കൂർ മുൻപ്",
    today: "ഇന്ന്",
    yesterday: "ഇന്നലെ",
    daysAgo: "ദിവസം മുൻപ്"
  }
};

export default function DriverNotifications({ isEmbedded = false }) {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");

  const t = (key) => {
    if (NOTIF_TRANSLATIONS[lang] && NOTIF_TRANSLATIONS[lang][key]) {
      return NOTIF_TRANSLATIONS[lang][key];
    }
    return NOTIF_TRANSLATIONS.en[key] || key;
  };

  const [user, setUser] = useState(() => getStoredUser());
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem("moveSmart_readNotifIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist read IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("moveSmart_readNotifIds", JSON.stringify(readIds));
    } catch (err) {
      console.warn("Failed to persist read notification IDs:", err);
    }
  }, [readIds]);

  // Format relative timestamp
  const formatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return t("today");
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 2) return t("justNow");
    if (diffMins < 60) return `${diffMins} ${t("minsAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("hoursAgo")}`;
    if (diffDays === 1) return t("yesterday");
    if (diffDays < 7) return `${diffDays} ${t("daysAgo")}`;
    return date.toLocaleDateString();
  }, [lang]);

  // ----------------------------------------------------------------------
  // FETCH NOTIFICATIONS WITH FALLBACK & LOCAL DATA DERIVATION
  // ----------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getStoredToken();
      const currentUser = getStoredUser();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let combinedNotifs = [];

      // 1. Attempt Primary API Call: GET /api/driver/notifications
      try {
        const res = await axios.get("/api/driver/notifications", { headers, timeout: 5000 });
        if (res.data && Array.isArray(res.data.notifications)) {
          combinedNotifs = res.data.notifications;
        }
      } catch (apiErr) {
        console.info("Driver notifications endpoint unavailable. Compiling client-side driver notifications fallback.", apiErr.message);
      }

      // 2. Load LocalStorage Notifications (e.g. dispatched from admin actions)
      let localNotifs = [];
      try {
        const stored = localStorage.getItem("moveSmart_driverNotifications");
        if (stored) {
          localNotifs = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Failed to parse local driver notifications:", e);
      }

      // 3. Derive Leave Request Notifications
      let derivedLeaveNotifs = [];
      if (currentUser?.email) {
        try {
          const leaveRes = await axios.get(`/api/driver/leave/my?driverEmail=${encodeURIComponent(currentUser.email)}`, { headers, timeout: 5000 });
          const leaves = leaveRes.data?.leaves || [];

          leaves.forEach((lv) => {
            const statusStr = (lv.status || lv.leaveStatus || "pending").toLowerCase();
            if (statusStr === "approved" || statusStr === "rejected") {
              const notifId = `leave-notif-${lv._id || lv.id || Date.now()}`;
              const isApproved = statusStr === "approved";
              const formattedDate = lv.leaveDate ? new Date(lv.leaveDate).toLocaleDateString() : "Upcoming Date";

              derivedLeaveNotifs.push({
                id: notifId,
                type: "leave",
                severity: isApproved ? "success" : "danger",
                title: isApproved ? t("leaveApprovedTitle") : t("leaveRejectedTitle"),
                message: isApproved
                  ? (lang === "ml"
                      ? `നിങ്ങളുടെ ${formattedDate} ലെ ലീവ് അപേക്ഷ അഡ്മിൻ അംഗീകരിച്ചു ✅`
                      : `Your leave request for ${formattedDate} has been APPROVED by MoveSmart Admin.`)
                  : (lang === "ml"
                      ? `നിങ്ങളുടെ ${formattedDate} ലെ ലീവ് അപേക്ഷ അഡ്മിൻ നിരസിച്ചു ❌`
                      : `Your leave request for ${formattedDate} was REJECTED by MoveSmart Admin.`),
                createdAt: lv.updatedAt || lv.createdAt || Date.now() - 3600000,
                isRead: readIds.includes(notifId),
              });
            }
          });
        } catch (lErr) {
          console.warn("Could not fetch driver leave notifications:", lErr.message);
        }
      }

      // 4. Derive Assigned Bus / Schedule / Delay Buffer Alerts
      let derivedScheduleNotifs = [];
      try {
        const schedRes = await axios.get("/api/admin/schedules", { headers, timeout: 5000 });
        const schedules = schedRes.data?.schedules || [];

        const driverIdStr = currentUser?._id || currentUser?.id || "";
        const driverNameStr = (currentUser?.name || "").toLowerCase().trim();

        schedules.forEach((sch) => {
          const schDriverId = typeof sch.driver_id === "object" ? sch.driver_id?._id : sch.driver_id;
          const schDriverName = (sch.driverName || "").toLowerCase().trim();

          const isAssigned = (driverIdStr && String(schDriverId) === String(driverIdStr)) ||
                             (driverNameStr && schDriverName === driverNameStr);

          if (isAssigned) {
            const routeObj = typeof sch.route_id === "object" ? sch.route_id : null;
            const routeTitle = routeObj?.routeName || sch.routeName || "Assigned Express Route";
            const busNo = sch.busNumber || "Fleet Bus";

            // Schedule Assignment Notification
            derivedScheduleNotifs.push({
              id: `sched-notif-${sch._id || Date.now()}`,
              type: "schedule",
              severity: "info",
              title: t("scheduleAssignedTitle"),
              message: lang === "ml"
                ? `വാഹനം ${busNo} ൽ റൂട്ട് "${routeTitle}" ന് സമയാധിഷ്ഠിത യാത്ര പുറപ്പെടൽ സമയം: ${sch.start_time}`
                : `Assigned to drive Vehicle ${busNo} on "${routeTitle}" departing at ${sch.start_time}.`,
              createdAt: sch.createdAt || Date.now() - 7200000,
              isRead: readIds.includes(`sched-notif-${sch._id}`),
            });

            // Traffic Delay Buffer Notification (If > 0)
            if (Number(sch.delay_buffer_minutes) > 0) {
              derivedScheduleNotifs.push({
                id: `delay-notif-${sch._id || Date.now()}`,
                type: "delay",
                severity: "warning",
                title: t("delayAlertTitle"),
                message: lang === "ml"
                  ? `നിങ്ങളുടെ റൂട്ടിൽ +${sch.delay_buffer_minutes} മിനിറ്റ് ട്രാഫിക് തടസ്സ സമയം അഡ്മിൻ നൽകിയിട്ടുണ്ട്.`
                  : `Admin added a +${sch.delay_buffer_minutes} mins traffic delay buffer to your schedule today.`,
                createdAt: sch.updatedAt || sch.createdAt || Date.now() - 1800000,
                isRead: readIds.includes(`delay-notif-${sch._id}`),
              });
            }
          }
        });
      } catch (sErr) {
        console.warn("Could not derive schedule notifications:", sErr.message);
      }

      // TODO: Connect future GET /api/admin/announcements endpoint for system-wide admin broadcasts
      /*
        // TODO (Future Backend Integration):
        // Fetch global admin announcements once endpoint is created
        try {
          const annRes = await axios.get("/api/admin/announcements", { headers });
          if (annRes.data?.announcements) { ... }
        } catch (annErr) { console.info("Announcements API pending implementation."); }
      */

      // Combine all notifications & deduplicate by ID
      const allList = [...combinedNotifs, ...localNotifs, ...derivedLeaveNotifs, ...derivedScheduleNotifs];
      const uniqueMap = new Map();

      allList.forEach((item) => {
        const itemDriverId = item.driverId ? String(item.driverId) : null;
        const myDriverId = currentUser?._id || currentUser?.id;
        // Ensure notification belongs to logged-in driver if specified
        if (itemDriverId && myDriverId && itemDriverId !== String(myDriverId)) {
          return;
        }

        const isReadState = item.isRead || readIds.includes(item.id);
        const entry = { ...item, isRead: isReadState };

        if (!uniqueMap.has(entry.id)) {
          uniqueMap.set(entry.id, entry);
        }
      });

      // Sort newest first
      const sorted = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(sorted);
    } catch (err) {
      console.error("Error building driver notifications list:", err);
      setError(t("errorMsg"));
    } finally {
      setLoading(false);
    }
  }, [readIds, lang]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark single notification as read (Optimistic Update)
  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }

    // Fire & forget PATCH request (optimistic, non-blocking)
    axios.patch(`/api/driver/notifications/${id}/read`).catch(() => {
      /* Graceful fallback if endpoint pending */
    });
  };

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setReadIds((prev) => Array.from(new Set([...prev, ...allIds])));

    axios.patch("/api/driver/notifications/mark-all-read").catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Render Card Icon based on Notification Type & Severity
  const renderNotifIcon = (type, severity) => {
    switch (type) {
      case "leave":
        return severity === "danger" ? (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#ffe4e6", display: "flex", alignItems: "center", justifyContent: "center", color: "#e11d48", flexShrink: 0 }}>
            <XCircle size={26} />
          </div>
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", flexShrink: 0 }}>
            <CheckCircle size={26} />
          </div>
        );

      case "schedule":
        return (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", flexShrink: 0 }}>
            <Clock size={26} />
          </div>
        );

      case "reassignment":
        return (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea", flexShrink: 0 }}>
            <Bus size={26} />
          </div>
        );

      case "delay":
        return (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", flexShrink: 0 }}>
            <AlertTriangle size={26} />
          </div>
        );

      case "announcement":
        return (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fae8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#c026d3", flexShrink: 0 }}>
            <Megaphone size={26} />
          </div>
        );

      default:
        return (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", flexShrink: 0 }}>
            <Bell size={26} />
          </div>
        );
    }
  };

  // Border & Accent Styling by Severity
  const getCardBorderStyle = (n) => {
    if (n.isRead) return { borderLeft: "4px solid #cbd5e1", background: "#ffffff" };
    switch (n.severity) {
      case "success":
        return { borderLeft: "6px solid #16a34a", background: "linear-gradient(135deg, #ffffff 80%, #f0fdf4 100%)" };
      case "danger":
        return { borderLeft: "6px solid #e11d48", background: "linear-gradient(135deg, #ffffff 80%, #fff1f2 100%)" };
      case "warning":
        return { borderLeft: "6px solid #f59e0b", background: "linear-gradient(135deg, #ffffff 80%, #fffbe2 100%)" };
      case "info":
      default:
        return { borderLeft: "6px solid #2563eb", background: "linear-gradient(135deg, #ffffff 80%, #eff6ff 100%)" };
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* 🧭 HEADER WITH LOGO & LANGUAGE TOGGLE */}
      {!isEmbedded && (
        <header style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50, padding: "14px 20px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <Link to="/driver" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "12px", background: "linear-gradient(135deg, #6d28d9, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "900", fontSize: 18 }}>
                  🚌
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>{t("brandTitle")}</div>
                  <div style={{ fontSize: "11px", color: "#6d28d9", fontWeight: "800" }}>{t("driverBadge")}</div>
                </div>
              </Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "ml" : "en")}
                style={{ padding: "8px 16px", borderRadius: "20px", border: "1.5px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}
              >
                🌐 {t("langToggle")}
              </button>

              <Link
                to="/driver"
                style={{ textDecoration: "none", padding: "8px 16px", borderRadius: "14px", background: "#f1f5f9", color: "#475569", fontSize: "13px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {t("backToDashboard")}
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* MAIN NOTIFICATION BOARD CONTENT */}
      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "24px 16px" }}>

        {/* TOP TITLE & CONTROLS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <Bell size={26} style={{ color: "#6d28d9" }} /> {t("pageTitle")}
              </h1>

              {unreadCount > 0 && (
                <span style={{ background: "#ef4444", color: "#ffffff", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)" }}>
                  {unreadCount} {t("unreadCountBadge")}
                </span>
              )}
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0", fontWeight: "600" }}>
              {t("pageSubtitle")}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={fetchNotifications}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", background: "#ffffff", border: "1.5px solid #cbd5e1", color: "#475569", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} /> {t("refreshBtn")}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px", background: "#e0e7ff", border: "1px solid #c7d2fe", color: "#3730a3", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}
              >
                {t("markAllRead")}
              </button>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "20px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
            <RefreshCw size={32} className="spin" style={{ color: "#6d28d9", marginBottom: "12px" }} />
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{t("loadingMsg")}</div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div style={{ background: "#fef2f2", padding: "24px", borderRadius: "20px", textAlign: "center", border: "1px solid #fecdd3", color: "#991b1b" }}>
            <AlertTriangle size={36} style={{ color: "#dc2626", marginBottom: "10px" }} />
            <div style={{ fontSize: "16px", fontWeight: "800", marginBottom: "12px" }}>{error}</div>
            <button
              type="button"
              onClick={fetchNotifications}
              style={{ padding: "10px 20px", borderRadius: "12px", background: "#dc2626", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}
            >
              {t("retryBtn")}
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && notifications.length === 0 && (
          <div style={{ background: "#ffffff", padding: "48px 24px", borderRadius: "24px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f1f5f9", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", marginBottom: "16px" }}>
              <Bell size={36} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: "0 0 6px 0" }}>
              {t("emptyTitle")}
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
              {t("emptySubtitle")}
            </p>
          </div>
        )}

        {/* NOTIFICATION CARDS LIST */}
        {!loading && !error && notifications.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {notifications.map((n) => {
              const cardStyles = getCardBorderStyle(n);
              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  style={{
                    ...cardStyles,
                    padding: "18px 20px",
                    borderRadius: "18px",
                    borderTop: "1px solid #f1f5f9",
                    borderRight: "1px solid #f1f5f9",
                    borderBottom: "1px solid #f1f5f9",
                    boxShadow: n.isRead ? "none" : "0 4px 16px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    {/* TYPE ICON */}
                    {renderNotifIcon(n.type, n.severity)}

                    {/* CONTENT DETAILS */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                          {n.title}
                        </h4>

                        {!n.isRead && (
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} title={t("unreadStatus")} />
                        )}
                      </div>

                      <p style={{ fontSize: "14px", color: "#334155", margin: "4px 0 8px 0", lineHeight: "1.5", fontWeight: "600" }}>
                        {n.message}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
                        <span style={{ fontWeight: "700", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={13} /> {formatTimeAgo(n.createdAt)}
                        </span>

                        <span style={{ fontSize: "11px", fontWeight: "800", color: n.isRead ? "#94a3b8" : "#2563eb" }}>
                          {n.isRead ? t("readStatus") : t("tapToRead")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
