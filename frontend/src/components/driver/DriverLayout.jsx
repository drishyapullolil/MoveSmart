import React from "react";
import DriverHeader from "./DriverHeader";
import DriverContextBar from "./DriverContextBar";
import PageHeader from "./PageHeader";
import AdminFooter from "../AdminFooter";
import "./driver.css";

export default function DriverLayout({
  children,
  activeNav,
  user,
  assignedBus,
  isOnline = true,
  setIsOnline,
  tripStatus,
  attendanceMarked,
  attendanceTime,
  onMarkAttendance,
  contextRightAction,
  eyebrow,
  title,
  description,
  pageBadge,
  pageActions,
  maxWidth = "1220px",
}) {
  return (
    <div className="driver-portal-wrapper">
      {/* 1. Master Global Driver Header */}
      <DriverHeader
        activeNav={activeNav}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
      />

      {/* 2. Driver Context Bar */}
      <DriverContextBar
        user={user}
        assignedBus={assignedBus}
        isOnline={isOnline}
        tripStatus={tripStatus}
        attendanceMarked={attendanceMarked}
        attendanceTime={attendanceTime}
        onMarkAttendance={onMarkAttendance}
        rightAction={contextRightAction}
      />

      {/* 3. Main Page Content Container */}
      <main
        style={{
          maxWidth,
          width: "100%",
          margin: "24px auto 36px auto",
          padding: "0 20px",
          flex: 1,
        }}
      >
        {/* Optional Standard Page Header */}
        {title && (
          <PageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            badge={pageBadge}
            actions={pageActions}
          />
        )}

        {/* Page Content */}
        {children}
      </main>

      {/* 4. Unified Footer */}
      <AdminFooter />
    </div>
  );
}
