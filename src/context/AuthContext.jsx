import { createContext, useContext, useMemo, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("reposense_user") || "null"); } catch { return null; }
  });
  const persist = (result) => {
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
    logout: () => { setUser(null); localStorage.removeItem("reposense_user"); localStorage.removeItem("reposense_token"); }
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
