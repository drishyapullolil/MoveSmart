import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import { getStoredToken, clearStoredSession } from './utils/session'

// Configure Axios Base URL for Production & Local Development
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "";

// Global Axios Request Interceptor for Instant Auth Header
axios.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global Axios Response Interceptor for Auto-Logout on Expired or Invalid Token
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      const msg = (error.response.data?.message || "").toLowerCase();
      if (
        code === "TOKEN_EXPIRED" ||
        code === "INVALID_TOKEN" ||
        code === "USER_NOT_FOUND" ||
        msg.includes("expired") ||
        msg.includes("token failed")
      ) {
        clearStoredSession();
        if (
          typeof window !== "undefined" &&
          !["/login", "/signup", "/"].includes(window.location.pathname)
        ) {
          window.location.href = "/login?expired=1";
        }
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
