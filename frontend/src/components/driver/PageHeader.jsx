import React from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className = "",
}) {
  return (
    <div className={`driver-page-header-wrap ${className}`}>
      <div className="driver-page-header-left">
        {eyebrow && (
          <div className="driver-page-eyebrow">
            {eyebrow}
          </div>
        )}
        <div className="driver-page-title-row">
          <h1 className="driver-page-title">{title}</h1>
          {badge && <div className="driver-page-title-badge">{badge}</div>}
        </div>
        {description && (
          <p className="driver-page-desc">{description}</p>
        )}
      </div>

      {actions && (
        <div className="driver-page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
