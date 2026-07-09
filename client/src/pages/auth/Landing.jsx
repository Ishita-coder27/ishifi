import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Piggy from "../../components/Piggy";
import { Button } from "../../components/ui";
import { useAuth } from "../../lib/auth";

/* Compact product entry — a doorway, not a scroll. */
export default function Landing() {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ minHeight: "100vh", position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}
    >
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px clamp(20px, 6vw, 70px)" }}>
        <span style={{ fontWeight: 700, fontSize: 21, fontFamily: "var(--font-display)", display: "flex", gap: 9, alignItems: "center" }}>
          <svg width="28" height="28" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flex: "0 0 auto" }}>
            <defs>
              <linearGradient id="piggyGradLanding" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#FFB3D9", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#FF6B9D", stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <ellipse cx="200" cy="220" rx="95" ry="110" fill="url(#piggyGradLanding)" />
            <ellipse cx="200" cy="100" rx="60" ry="70" fill="url(#piggyGradLanding)" />
            <ellipse cx="150" cy="60" rx="18" ry="32" fill="url(#piggyGradLanding)" />
            <ellipse cx="250" cy="60" rx="18" ry="32" fill="url(#piggyGradLanding)" />
            <circle cx="180" cy="95" r="8" fill="white" />
            <circle cx="220" cy="95" r="8" fill="white" />
            <circle cx="182" cy="93" r="5" fill="#333" />
            <circle cx="222" cy="93" r="5" fill="#333" />
            <ellipse cx="200" cy="135" rx="28" ry="20" fill="#FFB3D9" />
          </svg>
          IshiFi
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          {user ? (
            <Link className="btn btn-primary btn-sm" to="/app">Open app →</Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">Sign in</Link>
              <Link className="btn btn-primary btn-sm" to="/signup">Get started</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{
        flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        alignItems: "center", gap: 30, padding: "20px clamp(20px, 6vw, 70px) 60px", maxWidth: 1160, margin: "0 auto", width: "100%",
      }}>
        <div>
          <motion.span
            className="tag" style={{ marginBottom: 20, background: "var(--surface)", boxShadow: "var(--shadow-1)" }}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            🌸 the expense tracker that feels like a treat
          </motion.span>
          <motion.h1
            style={{ fontSize: "clamp(38px, 5vw, 58px)", margin: "14px 0 18px" }}
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Money, made{" "}
            <span style={{
              background: "linear-gradient(100deg, var(--primary), var(--primary-2) 50%, #C9932B)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}>lovely</span>.
          </motion.h1>
          <motion.p
            style={{ color: "var(--text-2)", fontSize: 17, maxWidth: 440, marginBottom: 30 }}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5 }}
          >
            IshiFi is a personal finance home with real budgets, savings goals, gentle insights —
            and six themes to make it unmistakably yours.
          </motion.p>
          <motion.div
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          >
            <Link to={user ? "/app" : "/signup"}><Button magnetic size="lg">Start free →</Button></Link>
            <Link to="/login"><Button variant="ghost" size="lg" magnetic>I have an account</Button></Link>
          </motion.div>
          <motion.div
            style={{ display: "flex", gap: 22, marginTop: 34, fontSize: 13, color: "var(--muted)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          >
            <span><b style={{ color: "var(--text-2)" }}>9</b> app screens</span>
            <span><b style={{ color: "var(--text-2)" }}>6</b> themes</span>
            <span><b style={{ color: "var(--text-2)" }}>0</b> ads · local-first</span>
          </motion.div>
        </div>

        <motion.div
          style={{ display: "flex", justifyContent: "center", position: "relative" }}
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="card card-pad" style={{ borderRadius: 34, padding: 38 }}>
            <Piggy size={280} />
            <motion.div
              className="card" style={{
                position: "absolute", top: 24, right: -14, padding: "10px 16px",
                display: "flex", gap: 9, alignItems: "center", borderRadius: 16, fontSize: 13.5, fontWeight: 600,
              }}
              animate={{ y: [0, -9, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              🌱 <span>Savings rate <b style={{ color: "var(--good)" }}>31%</b></span>
            </motion.div>
            <motion.div
              className="card" style={{
                position: "absolute", bottom: 40, left: -18, padding: "10px 16px",
                display: "flex", gap: 9, alignItems: "center", borderRadius: 16, fontSize: 13.5, fontWeight: 600,
              }}
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            >
              🎯 <span>Goa trip <b style={{ color: "var(--primary-2)" }}>74%</b></span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <footer style={{ textAlign: "center", padding: "18px 0 26px", color: "var(--muted)", fontSize: 12.5 }}>
        Crafted with care · your data never leaves your machine
      </footer>
    </motion.div>
  );
}
