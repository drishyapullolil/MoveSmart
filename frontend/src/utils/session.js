/**
 * MoveSmart Unified Session Management Utility
 */

/**
 * Check if a JWT token is expired
 * @param {string} token 
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || !payload.exp) return false;
    // Expired if current time exceeds expiration timestamp (exp is in seconds)
    return payload.exp * 1000 <= Date.now();
  } catch (err) {
    return true;
  }
};

export const getStoredToken = () => {
  const token =
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    null;

  if (!token || token === "undefined" || token === "null" || typeof token !== "string" || token.trim() === "") {
    return null;
  }

  if (isTokenExpired(token)) {
    clearStoredSession();
    return null;
  }

  return token;
};

export const getStoredUser = () => {
  try {
    // If the token is already expired, clear the stored user as well
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      null;

    if (token && isTokenExpired(token)) {
      clearStoredSession();
      return null;
    }

    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null" || raw.trim() === "") return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (err) {
    console.error("Error parsing stored user session:", err);
    return null;
  }
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
  localStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("token");
};

