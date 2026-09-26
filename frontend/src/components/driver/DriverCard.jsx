import React from "react";

export default function DriverCard({
  children,
  title,
  subtitle,
  icon,
  badge,
  action,
  accent = "none", // "none" | "green" | "purple" | "blue" | "danger"
  className = "",
  style = {},
  onClick,
}) {
  return (
    <div
      className={`driver-card ${accent !== "none" ? `accent-${accent}` : ""} ${onClick ? "clickable" : ""} ${className}`}
      style={style}
      onClick={onClick}
    >
      {(title || icon || badge || action) && (
        <div className="driver-card-header">
          <div className="driver-card-title-col">
            <div className="driver-card-title-row">
              {icon && <span className="driver-card-icon">{icon}</span>}
              {title && <h3 className="driver-card-title">{title}</h3>}
              {badge && <div className="driver-card-badge-slot">{badge}</div>}
            </div>
            {subtitle && <p className="driver-card-subtitle">{subtitle}</p>}
          </div>

          {action && (
            <div className="driver-card-action-slot">
              {action}
            </div>
          )}
        </div>
      )}

      <div className="driver-card-content">
        {children}
      </div>
    </div>
  );
}
