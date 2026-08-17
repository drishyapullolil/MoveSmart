import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, getStoredToken } from "../utils/session";

/**
 * ProtectedRoute: Enforces role-based access control across MoveSmart routes.
 * 
 * Rules:
 * 1. Unauthenticated users -> redirected to /login
 * 2. Drivers attempting to access admin/user-only routes -> redirected to /dashboard/driver
 * 3. Regular users/passengers attempting to access admin/driver-only routes -> redirected to /dashboard
 * 4. Admins attempting to access driver-only routes -> redirected to /admin
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const user = getStoredUser();
  const token = getStoredToken();

  // If not logged in at all, redirect to login
  if (!user && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = (user?.role || "passenger").toLowerCase().trim();

  // Normalize allowed roles to lower case
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(role)) {
    // If the logged-in user is a driver, they can ONLY access driver pages
    if (role === "driver") {
      return <Navigate to="/dashboard/driver" replace />;
    }

    // If the logged-in user is an admin
    if (role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    // Default regular user/passenger redirect
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
