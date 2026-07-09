import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Field, PasswordInput, useToast } from "../../components/ui";
import AuthLayout from "../../layouts/AuthLayout";
import { useAuth } from "../../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Enter your password";
    setErrors(errs);
    if (Object.keys(errs).length) return setShake((s) => s + 1);
    setBusy(true);
    try {
      await login(email, password, remember);
      toast.success("Welcome back!", " Good to see you again.");
      nav(loc.state?.from || "/app", { replace: true });
    } catch (err) {
      setErrors({ password: err.message });
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout quote="Welcome back. Your money missed you.">
      <h2>Sign in</h2>
      <div className="sub">New here? <Link to="/signup" style={{ color: "var(--primary-2)", fontWeight: 600 }}>Create an account</Link></div>
      <motion.form
        key={shake}
        animate={shake ? { x: [0, -9, 9, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field label="Email" error={errors.email}>
          <input className={`input ${errors.email ? "has-error" : ""}`} type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        </Field>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: "var(--text-2)" }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              style={{ accentColor: "var(--primary)", width: 15, height: 15 }} />
            Remember me
          </label>
          <Link to="/forgot" style={{ color: "var(--primary-2)", fontWeight: 600, textDecoration: "none" }}>Forgot password?</Link>
        </div>
        <Button type="submit" magnetic disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </motion.form>
      <p style={{ marginTop: 22, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
        Demo account: <b>demo@aurum.app</b> / <b>demo1234</b>
      </p>
    </AuthLayout>
  );
}
