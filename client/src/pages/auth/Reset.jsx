import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Field, PasswordInput, useToast } from "../../components/ui";
import AuthLayout from "../../layouts/AuthLayout";
import { api } from "../../lib/api";

export default function Reset() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (password.length < 8) errs.password = "At least 8 characters";
    if (confirm !== password) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.post("/api/auth/reset", { token, password });
      setDone(true);
      toast.success("Password updated", " Sign in with your new password.");
      setTimeout(() => nav("/login"), 1800);
    } catch (err) {
      setErrors({ confirm: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout quote="Hmm, that link looks incomplete.">
        <h2>Invalid link</h2>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: "10px 0 18px" }}>
          This reset link is missing its token. Request a fresh one.
        </p>
        <Link className="btn btn-primary" to="/forgot">Request new link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout quote="A fresh start for your password.">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2>Set a new password</h2>
            <div className="sub">Make it strong — you'll be signed out everywhere else.</div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="New password" error={errors.password}>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
                  error={errors.password} autoComplete="new-password" placeholder="New password" />
              </Field>
              <Field label="Confirm password" error={errors.confirm}>
                <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm} autoComplete="new-password" placeholder="Same password again" />
              </Field>
              <Button type="submit" magnetic disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center" }}>
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 15 }} style={{ fontSize: 52, marginBottom: 12 }}>
              ✅
            </motion.div>
            <h2>All set!</h2>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginTop: 8 }}>Taking you to sign in…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
