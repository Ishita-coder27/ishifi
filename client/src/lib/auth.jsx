import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, setAccessToken } from "./api";
import { setCurrency } from "./format";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const adopt = useCallback((u) => {
    setUser(u);
    if (u?.currency) setCurrency(u.currency);
  }, []);

  // restore session from the httpOnly refresh cookie on first load
  useEffect(() => {
    (async () => {
      const data = await api.refreshSession();
      if (data?.user) adopt(data.user);
      setBooting(false);
    })();
  }, [adopt]);

  useEffect(() => {
    const onLogout = () => { setAccessToken(null); setUser(null); };
    window.addEventListener("aurum:logout", onLogout);
    return () => window.removeEventListener("aurum:logout", onLogout);
  }, []);

  const login = useCallback(async (email, password, remember) => {
    const data = await api.post("/api/auth/login", { email, password, remember });
    setAccessToken(data.accessToken);
    adopt(data.user);
    return data;
  }, [adopt]);

  const signup = useCallback(async (name, email, password) => {
    const data = await api.post("/api/auth/signup", { name, email, password });
    setAccessToken(data.accessToken);
    adopt(data.user);
    return data;
  }, [adopt]);

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const data = await api.patch("/api/users/me", patch);
    adopt(data.user);
    return data.user;
  }, [adopt]);

  return (
    <AuthCtx.Provider value={{ user, booting, login, signup, logout, updateProfile, adopt }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function RequireAuth({ children }) {
  const { user, booting } = useAuth();
  const loc = useLocation();
  if (booting) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="skeleton" style={{ width: 54, height: 54, borderRadius: "50%" }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export function RedirectIfAuthed({ children }) {
  const { user, booting } = useAuth();
  if (booting) return null;
  if (user) return <Navigate to="/app" replace />;
  return children;
}
