import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Piggy from "../components/Piggy";

/* Split auth screen: form right, brand-story left. */
export default function AuthLayout({ children, quote = "Money looks better when it's cared for." }) {
  return (
    <motion.div
      className="auth-wrap"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="auth-side">
        <Link to="/" style={{ position: "absolute", top: 30, left: "7vw", textDecoration: "none", fontWeight: 700, fontSize: 20, fontFamily: "var(--font-display)", display: "flex", gap: 9, alignItems: "center" }}>
          <svg width="26" height="26" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="piggyGradAuth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#FFB3D9", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#FF6B9D", stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <ellipse cx="200" cy="220" rx="95" ry="110" fill="url(#piggyGradAuth)" />
            <ellipse cx="200" cy="100" rx="60" ry="70" fill="url(#piggyGradAuth)" />
            <ellipse cx="150" cy="60" rx="18" ry="32" fill="url(#piggyGradAuth)" />
            <ellipse cx="250" cy="60" rx="18" ry="32" fill="url(#piggyGradAuth)" />
            <circle cx="180" cy="95" r="8" fill="white" />
            <circle cx="220" cy="95" r="8" fill="white" />
            <circle cx="182" cy="93" r="5" fill="#333" />
            <circle cx="222" cy="93" r="5" fill="#333" />
            <ellipse cx="200" cy="135" rx="28" ry="20" fill="#FFB3D9" />
          </svg>
          IshiFi
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ marginBottom: 26 }}><Piggy size={230} /></div>
          <h1 style={{ fontSize: "clamp(28px, 3vw, 38px)", maxWidth: 420, marginBottom: 14 }}>{quote}</h1>
          <p style={{ color: "var(--text-2)", maxWidth: 380, fontSize: 15.5 }}>
            Budgets, goals and gentle insights — in a home your money actually enjoys living in.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            {["🌸 6 hand-made themes", "🔒 private by default", "✨ delightfully fast"].map((t) => (
              <span key={t} className="tag" style={{ background: "var(--surface)", boxShadow: "var(--shadow-1)" }}>{t}</span>
            ))}
          </div>
        </motion.div>
      </div>
      <div className="auth-form-col">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}
