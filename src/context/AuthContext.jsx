import { createContext, useContext, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { clearMockHistory } from "../mock/store";

const AuthContext = createContext(null);
const USER_DATA_KEYS = [
  "reposense_user",
  "reposense_token",
  "reposense_github_token",
  "reposense_analysis_history",
  "reposense_saved_comparisons",
  "reposense_mock_health_reports",
  "reposense_mock_security_reports",
  "reposense_mock_ai_action_cache",
  "reposense_mock_document_studio",
  "reposense_bookmarks",
  "reposense_ai_preferences",
  "reposense_ai_last_action"
];
const USER_DATA_PREFIXES = [
  "reposense_chat_",
  "reposense_document_draft:",
  "reposense_document_options:"
];

function clearUserData() {
  USER_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
  const dynamicKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key) => key && USER_DATA_PREFIXES.some((prefix) => key.startsWith(prefix)));
  dynamicKeys.forEach((key) => localStorage.removeItem(key));
  clearMockHistory();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("reposense_user") || "null"); } catch { return null; }
  });
  const persist = (result) => {
    clearUserData();
    setUser(result.user);
    localStorage.setItem("reposense_user", JSON.stringify(result.user));
    if (result.token) localStorage.setItem("reposense_token", result.token);
    return result.user;
  };
  const value = useMemo(() => ({
    user,
    updateUser: (updates) => {
      setUser((current) => {
        const next = { ...current, ...updates };
        localStorage.setItem("reposense_user", JSON.stringify(next));
        return next;
      });
    },
    login: async (credentials) => persist(await authService.login(credentials)),
    register: async (payload) => persist(await authService.register(payload)),
    continueAsGuest: () => persist({ user: { id: "guest", name: "Guest", email: "guest@reposense.dev" } }),
    logout: () => { clearUserData(); setUser(null); }
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
