import api, { mockDelay, useMocks } from "./api";
import { currentUser } from "../mock/data";

function saveUser(user) {
  localStorage.setItem("reposense_user", JSON.stringify(user));
  return user;
}

function saveSession(result) {
  const user = saveUser(result.user);
  if (result.token) localStorage.setItem("reposense_token", result.token);
  return { user, token: result.token };
}

function attachFieldErrors(error) {
  if (!Array.isArray(error.errors)) return error;

  error.fieldErrors = error.errors.reduce((fields, item) => {
    const path = Array.isArray(item.path) ? item.path.join(".") : item.path;
    if (path && item.message && !fields[path]) fields[path] = item.message;
    return fields;
  }, {});
  return error;
}

export const authService = {
  async login(credentials) {
    try {
      if (!useMocks) {
        const { data } = await api.post("/auth/login", credentials);
        return saveSession({ user: data.user, token: data.token });
      }
      await mockDelay(true, 400);
      return saveSession({ user: { ...currentUser, email: credentials.email }, token: "mock-jwt-token" });
    } catch (error) {
      throw attachFieldErrors(error);
    }
  },
  async register(payload) {
    try {
      if (!useMocks) {
        const { data } = await api.post("/auth/register", payload);
        return saveSession({ user: data.user, token: data.token });
      }
      await mockDelay(true, 500);
      return saveSession({ user: { ...currentUser, name: payload.name, email: payload.email }, token: "mock-jwt-token" });
    } catch (error) {
      throw attachFieldErrors(error);
    }
  },
  async getMe() {
    if (!useMocks) {
      const { data } = await api.get("/auth/me");
      return saveUser(data.user);
    }
    return mockDelay(currentUser, 250);
  },
  async me() {
    return this.getMe();
  },
  logout() {
    localStorage.removeItem("reposense_token");
    localStorage.removeItem("reposense_user");
  }
};
