import axios from "axios";
import toast from "react-hot-toast";

const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const api = axios.create({
  baseURL,
  timeout: 120000,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("reposense_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const response = error.response;
    const status = response?.status;
    const data = response?.data;
    const message = data?.message || error.message || "Request failed";
    const normalizedError = new Error(message);
    normalizedError.name = error.name === "CanceledError" ? error.name : "Error";
    normalizedError.status = status;
    normalizedError.code = error.code;
    normalizedError.errors = data?.errors;
    normalizedError.responseData = data;

    if (status === 401) {
      const requestUrl = error.config?.url || "";
      const isAuthSubmission = /\/auth\/(login|register)\/?$/.test(requestUrl);
      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("reposense_user") || "null");
        } catch {
          return null;
        }
      })();
      const isGuest = storedUser?.id === "guest";

      if (!isAuthSubmission) {
        localStorage.removeItem("reposense_token");
        if (!isGuest) {
          localStorage.removeItem("reposense_user");
          if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
            window.location.assign("/login");
          }
        }
      }
    } else if (status === 429) {
      toast.error("Too many requests, please wait");
    } else if (!response && error.code !== "ERR_CANCELED") {
      toast.error("Cannot reach the server. Is the backend running?");
    }

    return Promise.reject(normalizedError);
  }
);

export const useMocks = import.meta.env.VITE_USE_MOCK !== "false";
export const mockDelay = (value, ms = 450) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
export default api;
