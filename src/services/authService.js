import api, { mockDelay, useMocks } from "./api";
import { currentUser } from "../mock/data";

export const authService = {
  async login(credentials) {
    if (!useMocks) return (await api.post("/api/auth/login", credentials)).data;
    await mockDelay(true, 400);
    return { user: { ...currentUser, email: credentials.email }, token: "mock-jwt-token" };
  },
  async register(payload) {
    if (!useMocks) return (await api.post("/api/auth/register", payload)).data;
    await mockDelay(true, 500);
    return { user: { ...currentUser, name: payload.name, email: payload.email }, token: "mock-jwt-token" };
  },
  async me() {
    if (!useMocks) return (await api.get("/api/auth/me")).data;
    return mockDelay(currentUser, 250);
  }
};
