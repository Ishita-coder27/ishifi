/* Tiny API client: attaches the in-memory access token, transparently
   refreshes it once on 401 (refresh token lives in an httpOnly cookie),
   and emits "aurum:logout" when the session is truly gone. */

// In dev, Vite proxies /api to localhost:8000 (see vite.config.js), so
// relative paths work. In prod the frontend and API live on different
// domains (Vercel + Render), so VITE_API_URL must point at the API host.
const API_BASE = import.meta.env.VITE_API_URL || "";

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

async function raw(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res;
}

let refreshing = null;
async function refreshSession() {
  refreshing ||= (async () => {
    try {
      const res = await raw("/api/auth/refresh", { method: "POST" });
      if (!res.ok) return false;
      const data = await res.json();
      accessToken = data.accessToken;
      return data;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 0);
    }
  })();
  return refreshing;
}

export async function request(path, opts = {}) {
  let res = await raw(path, opts);
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await raw(path, opts);
    } else {
      window.dispatchEvent(new Event("aurum:logout"));
    }
  }
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  patch: (p, body) => request(p, { method: "PATCH", body }),
  del: (p) => request(p, { method: "DELETE" }),
  refreshSession,
};
