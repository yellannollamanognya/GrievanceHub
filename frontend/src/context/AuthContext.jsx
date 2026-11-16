import React, { createContext, useContext, useMemo, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

function readUser() {
  try { return JSON.parse(localStorage.getItem("gh_user") || "null"); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(() => localStorage.getItem("gh_token"));

  async function login(credentials) {
    const response = await authService.login(credentials);
    const data = response.data;
    if (!data?.token || !data?.user?.role) {
      throw new Error("Login response must contain token and user.role.");
    }
    localStorage.setItem("gh_token", data.token);
    localStorage.setItem("gh_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function registerStudent(payload) {
    return authService.registerStudent(payload);
  }

  function logout() {
    localStorage.removeItem("gh_token");
    localStorage.removeItem("gh_user");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({
    user, token, isAuthenticated: Boolean(token && user), login, logout, registerStudent
  }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
};
