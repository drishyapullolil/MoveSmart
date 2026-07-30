/**
 * MoveSmart Unified Session Management Utility
 */

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Error parsing stored user session:", err);
    return null;
  }
};

export const getStoredToken = () => {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || null;
};

export const setStoredUser = (user, rememberMe = true) => {
  if (!user) {
    clearStoredSession();
    return;
  }
  const userStr = JSON.stringify(user);
  if (rememberMe) {
    localStorage.setItem("user", userStr);
    sessionStorage.removeItem("user");
  } else {
    sessionStorage.setItem("user", userStr);
    localStorage.removeItem("user");
  }
};

export const setStoredToken = (token, rememberMe = true) => {
  if (!token) return;
  if (rememberMe) {
    localStorage.setItem("authToken", token);
    sessionStorage.removeItem("authToken");
  } else {
    sessionStorage.setItem("authToken", token);
    localStorage.removeItem("authToken");
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("authToken");
};
