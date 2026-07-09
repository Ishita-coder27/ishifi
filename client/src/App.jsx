import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import { RedirectIfAuthed, RequireAuth } from "./lib/auth";
import AdminDashboard from "./pages/AdminDashboard";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import Analytics from "./pages/Analytics";
import Budgets from "./pages/Budgets";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Insights from "./pages/Insights";
import Profile from "./pages/Profile";
import SecuritySettings from "./pages/SecuritySettings";
import Settings from "./pages/Settings";
import Subscriptions from "./pages/Subscriptions";
import Transactions from "./pages/Transactions";
import Forgot from "./pages/auth/Forgot";
import Landing from "./pages/auth/Landing";
import Login from "./pages/auth/Login";
import Reset from "./pages/auth/Reset";
import Signup from "./pages/auth/Signup";
import Verify from "./pages/auth/Verify";

export default function App() {
  const location = useLocation();
  // key top-level transitions by area so auth pages cross-fade among themselves
  const area = location.pathname.startsWith("/app") ? "app" : location.pathname;

  return (
    <>
      <div className="ambient" aria-hidden>
        <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
        <div className="grain" />
      </div>
      <AnimatePresence mode="wait">
        <Routes location={location} key={area}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="insights" element={<Insights />} />
            <Route path="advanced" element={<AdvancedAnalytics />} />
            <Route path="goals" element={<Goals />} />
            <Route path="categories" element={<Categories />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
