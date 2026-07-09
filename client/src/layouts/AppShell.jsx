import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/ui";
import Icon from "../components/Icon";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/app", label: "Dashboard", ico: "dashboard", end: true },
  { to: "/app/transactions", label: "Transactions", ico: "transactions" },
  { to: "/app/budgets", label: "Budgets", ico: "budgets" },
  { to: "/app/analytics", label: "Analytics", ico: "analytics" },
  { to: "/app/insights", label: "AI Insights", ico: "insights" },
  { to: "/app/advanced", label: "Advanced", ico: "advanced" },
  { to: "/app/goals", label: "Savings Goals", ico: "goals" },
  { to: "/app/categories", label: "Categories", ico: "categories" },
  { to: "/app/subscriptions", label: "Subscriptions", ico: "subscriptions" },
];
const NAV_FOOT = [
  { to: "/app/profile", label: "Profile", ico: "profile" },
  { to: "/app/settings", label: "Settings", ico: "settings" },
];
const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[4], NAV_FOOT[1]];

function SideLink({ item, collapsed }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-pill" className="nav-pill"
            transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className="ico"><Icon name={item.ico} size={20} /></span>
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("ishifi-side") === "1");
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("ishifi-side", c ? "0" : "1");
      return !c;
    });
  };

  const title = [...NAV, ...NAV_FOOT].find(
    (n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))
  )?.label || "IshiFi";

  return (
    <div className="shell">
      <motion.aside
        className="sidebar"
        animate={{ width: collapsed ? 74 : 236 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
      >
        <NavLink to="/app" className="side-logo">
          <svg width="28" height="28" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flex: "0 0 auto" }}>
            <defs>
              <linearGradient id="piggyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#FFB3D9", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#FF6B9D", stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            {/* Piggy body */}
            <ellipse cx="200" cy="220" rx="95" ry="110" fill="url(#piggyGrad)" />
            {/* Head */}
            <ellipse cx="200" cy="100" rx="60" ry="70" fill="url(#piggyGrad)" />
            {/* Ears */}
            <ellipse cx="150" cy="60" rx="18" ry="32" fill="url(#piggyGrad)" />
            <ellipse cx="250" cy="60" rx="18" ry="32" fill="url(#piggyGrad)" />
            {/* Eyes */}
            <circle cx="180" cy="95" r="8" fill="white" />
            <circle cx="220" cy="95" r="8" fill="white" />
            <circle cx="182" cy="93" r="5" fill="#333" />
            <circle cx="222" cy="93" r="5" fill="#333" />
            {/* Snout */}
            <ellipse cx="200" cy="135" rx="28" ry="20" fill="#FFB3D9" />
          </svg>
          {!collapsed && <span>IshiFi</span>}
        </NavLink>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => <SideLink key={n.to} item={n} collapsed={collapsed} />)}
        </div>

        <div className="side-foot" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_FOOT.map((n) => <SideLink key={n.to} item={n} collapsed={collapsed} />)}
          <button className="nav-item" style={{ border: "none", background: "none", cursor: "pointer", width: "100%" }}
            onClick={async () => { await logout(); toast.info("Signed out", " See you soon"); nav("/login"); }}>
            <span className="ico"><Icon name="logout" size={20} /></span>
            {!collapsed && <span>Sign out</span>}
          </button>
          <button className="nav-item" style={{ border: "none", background: "none", cursor: "pointer", width: "100%" }}
            onClick={toggle} aria-label="Toggle sidebar">
            <motion.span className="ico" animate={{ rotate: collapsed ? 180 : 0 }}><Icon name="chevron" size={20} /></motion.span>
            {!collapsed && <span style={{ color: "var(--muted)" }}>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      <div className="main-col">
        <header className="topbar">
          <h1>{title}</h1>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {user && !user.verified && <VerifyChip />}
            <NavLink to="/app/profile" style={{ textDecoration: "none" }}>
              <motion.span
                whileHover={{ scale: 1.08, rotate: -4 }}
                style={{
                  width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 19, background: "var(--primary-soft)",
                  border: "1px solid var(--border)", cursor: "pointer",
                }}
                title={user?.name}
              >
                {user?.avatar || "🙂"}
              </motion.span>
            </NavLink>
          </div>
        </header>

        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.997 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="mobile-nav">
        {MOBILE_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="ico">{n.ico}</span>
            {n.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function VerifyChip() {
  const toast = useToast();
  return (
    <button
      className="tag" style={{ cursor: "pointer", color: "var(--warn)", background: "var(--warn-soft)", borderColor: "transparent" }}
      onClick={async () => {
        try {
          const data = await api.post("/api/auth/resend-verification");
          if (data.devVerifyLink) window.open(data.devVerifyLink, "_blank");
          else toast.info("Verification sent", " Check your inbox.");
        } catch (e) {
          toast.error("Couldn't resend", ` ${e.message}`);
        }
      }}
      title="Resend verification email"
    >
      ✉️ Verify email
    </button>
  );
}
