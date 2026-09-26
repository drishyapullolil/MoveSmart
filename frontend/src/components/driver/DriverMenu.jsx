import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { getStoredUser } from "../../utils/session";

export default function DriverMenu({
  isOpen,
  onClose,
  activeNav,
  user: propUser,
  assignedBus,
  isOnline = true,
  unreadNotifs = 0,
}) {
  const location = useLocation();
  const menuRef = useRef(null);

  const currentUser = propUser || getStoredUser() || { name: "Driver", role: "driver" };
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTabParam = searchParams.get("tab");

  // Keyboard Escape and Outside Click handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        const toggleBtn = document.getElementById("driver-menu-toggle-btn");
        if (!toggleBtn || !toggleBtn.contains(e.target)) {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Helper to check if a menu item is active
  const isItemActive = (key) => {
    if (activeNav === key) return true;
    if (key === "dashboard") {
      return (
        (currentPath === "/driver" || currentPath === "/dashboard/driver") &&
        (!currentTabParam || currentTabParam === "dashboard")
      );
    }
    if (key === "live-drive") return currentPath.includes("/live-drive");
    if (key === "rfid") return currentPath.includes("/rfid-device");
    if (key === "buses") {
      return (
        currentPath === "/driver/my-bus" ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "buses")
      );
    }
    if (key === "trips") {
      return (
        currentPath === "/driver/trips" ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "trips")
      );
    }
    if (key === "leave") {
      return (
        currentPath === "/driver/leave" ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "leave")
      );
    }
    if (key === "profile") {
      return (
        currentPath === "/driver/profile" ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "verification")
      );
    }
    if (key === "collections") {
      return (
        currentPath === "/driver/collections" ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "payments")
      );
    }
    if (key === "lostfound") {
      return (
        currentPath === "/driver/lost-found" ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "lostfound")
      );
    }
    if (key === "notifications") {
      return (
        currentPath.includes("/notifications") ||
        ((currentPath === "/driver" || currentPath === "/dashboard/driver") && currentTabParam === "notifications")
      );
    }
    return false;
  };

  const sections = [
    {
      id: "main_ops",
      label: "MAIN OPERATIONS",
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: "📊",
          path: "/driver",
          description: "Live overview & daily summary",
        },
        {
          key: "live-drive",
          label: "Live Drive",
          icon: "🚍",
          path: "/driver/live-drive",
          description: "Live cockpit, route & stop control",
        },
        {
          key: "rfid",
          label: "RFID Reader",
          icon: "📡",
          path: "/driver/rfid-device",
          description: "Hardware telemetry & card sync",
        },
      ],
    },
    {
      id: "bus_trips",
      label: "BUS & SCHEDULES",
      items: [
        {
          key: "buses",
          label: "My Bus",
          icon: "🚌",
          path: "/driver?tab=buses",
          description: "Assigned vehicle & details",
        },
        {
          key: "trips",
          label: "Trips",
          icon: "⏰",
          path: "/driver?tab=trips",
          description: "Scheduled transit shifts",
        },
      ],
    },
    {
      id: "driver_management",
      label: "DRIVER MANAGEMENT",
      items: [
        {
          key: "leave",
          label: "Leave",
          icon: "📅",
          path: "/driver?tab=leave",
          description: "Apply & track time off",
        },
        {
          key: "profile",
          label: "Profile & License",
          icon: "👤",
          path: "/driver?tab=verification",
          description: "Credentials & KYC status",
        },
      ],
    },
    {
      id: "finance_services",
      label: "FINANCE & SERVICES",
      items: [
        {
          key: "collections",
          label: "Collections",
          icon: "💰",
          path: "/driver?tab=payments",
          description: "Fares & cash revenue logs",
        },
        {
          key: "lostfound",
          label: "Lost & Found",
          icon: "📦",
          path: "/driver?tab=lostfound",
          description: "Passenger baggage logs",
        },
        {
          key: "notifications",
          label: "Notifications",
          icon: "🔔",
          path: "/driver/notifications",
          badge: unreadNotifs > 0 ? unreadNotifs : null,
          description: "Alerts & fleet bulletins",
        },
      ],
    },
  ];

  if (!isOpen) return null;

  const busNumber = assignedBus?.busNumber || currentUser?.busNumber || "KL-06-345";
  const driverName = currentUser?.name || "Driver";

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="driver-menu-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Driver Menu Popover / Mobile Drawer Container */}
      <div
        ref={menuRef}
        id="driver-menu-popover"
        className={`driver-menu-popover ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Driver Navigation Menu"
      >
        {/* Menu Header with Driver Info */}
        <div className="driver-menu-header">
          <div className="driver-menu-header-main">
            <div>
              <span className="driver-menu-eyebrow">DRIVER MENU</span>
              <h3 className="driver-menu-title">Driver Portal Navigation</h3>
            </div>
            {/* Mobile Close Button */}
            <button
              type="button"
              className="driver-menu-close-btn"
              onClick={onClose}
              aria-label="Close Driver Menu"
              title="Close Menu (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Real Driver Summary Strip */}
          <div className="driver-menu-summary-chip">
            <div className="driver-menu-summary-left">
              <span className={isOnline ? "driver-duty-dot pulsing" : "driver-duty-dot offline"} />
              <span className="driver-menu-driver-name">{driverName}</span>
              <span className="driver-menu-bus-plate">{busNumber}</span>
            </div>
            <span className={`driver-menu-duty-pill ${isOnline ? "online" : "offline"}`}>
              {isOnline ? "On Duty" : "Off Duty"}
            </span>
          </div>
        </div>

        {/* Menu Scrollable Content */}
        <div className="driver-menu-content">
          {sections.map((sec) => (
            <div key={sec.id} className="driver-menu-section">
              <div className="driver-menu-section-heading">{sec.label}</div>
              <div className="driver-menu-items-group">
                {sec.items.map((item) => {
                  const active = isItemActive(item.key);
                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      onClick={onClose}
                      className={`driver-menu-item ${active ? "active" : ""}`}
                    >
                      <div className="driver-menu-item-left">
                        <span className="driver-menu-item-icon">{item.icon}</span>
                        <div className="driver-menu-item-text">
                          <span className="driver-menu-item-name">{item.label}</span>
                          {item.description && (
                            <span className="driver-menu-item-sub">{item.description}</span>
                          )}
                        </div>
                      </div>

                      <div className="driver-menu-item-right">
                        {item.badge && (
                          <span className="driver-menu-item-badge">{item.badge}</span>
                        )}
                        {active ? (
                          <span className="driver-menu-item-active-check" title="Active Page">
                            ✓
                          </span>
                        ) : (
                          <span className="driver-menu-item-arrow">›</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
