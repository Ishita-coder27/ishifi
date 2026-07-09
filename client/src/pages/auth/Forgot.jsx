import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Field } from "../../components/ui";
import AuthLayout from "../../layouts/AuthLayout";
import { api } from "../../lib/api";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email");
    setError("");
    setBusy(true);
    try {
      const data = await api.post("/api/auth/forgot", { email });
      setDevLink(data.devResetLink || null);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout quote="Deep breaths. We'll get you back in.">
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h2>Forgot password</h2>
            <div className="sub">Enter your email and we'll send a reset link.</div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Email" error={error}>
                <input className={`input ${error ? "has-error" : ""}`} type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
              </Field>
              <Button type="submit" magnetic disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
              <Link to="/login" style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-2)" }}>← Back to sign in</Link>
            </form>
          </motion.div>
        ) : (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }} style={{ textAlign: "center" }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              style={{ fontSize: 52, marginBottom: 12 }}
            >💌</motion.div>
            <h2>Check your inbox</h2>
            <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 20px" }}>
              If an account exists for <b>{email}</b>, a reset link is on its way.
            </p>
            {devLink && (
              <a className="btn btn-soft" href={devLink} style={{ marginBottom: 14 }}>
                🔧 Dev mode: open the reset link
              </a>
            )}
            <div><Link to="/login" style={{ fontSize: 13.5, color: "var(--text-2)" }}>← Back to sign in</Link></div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
