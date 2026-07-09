import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field, PasswordInput, useToast } from "../../components/ui";
import AuthLayout from "../../layouts/AuthLayout";
import { useAuth } from "../../lib/auth";

const STRENGTH = [
  { label: "", color: "var(--surface-2)" },
  { label: "weak", color: "var(--danger)" },
  { label: "okay", color: "var(--warn)" },
  { label: "good", color: "var(--good)" },
  { label: "excellent", color: "var(--good)" },
];

function scorePassword(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const strength = useMemo(() => scorePassword(password), [password]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (name.trim().length < 2) errs.name = "Tell us your name";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email";
    if (password.length < 8) errs.password = "At least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const data = await signup(name.trim(), email, password);
      toast.success("Account created", " A verification link was sent to your email.");
      if (data.devVerifyLink) {
        sessionStorage.setItem("aurum-dev-verify", data.devVerifyLink);
      }
      nav("/app", { replace: true });
    } catch (err) {
      setErrors({ email: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout quote="Give every rupee a lovely home.">
      <h2>Create your account</h2>
      <div className="sub">Already have one? <Link to="/login" style={{ color: "var(--primary-2)", fontWeight: 600 }}>Sign in</Link></div>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name" error={errors.name}>
          <input className={`input ${errors.name ? "has-error" : ""}`} value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Ishita Singh" autoComplete="name" autoFocus />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className={`input ${errors.email ? "has-error" : ""}`} type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
            error={errors.password} autoComplete="new-password" placeholder="Create a password" />
          <div className="strength">
            {[1, 2, 3, 4].map((i) => (
              <motion.span key={i}
                animate={{ background: strength >= i ? STRENGTH[strength].color : "var(--surface-2)" }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
          {password && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontSize: 12, color: STRENGTH[strength].color, fontWeight: 600 }}>
              {STRENGTH[strength].label}
            </motion.span>
          )}
        </Field>
        <Button type="submit" magnetic disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "Creating…" : "Create account"}
        </Button>
        <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
          Your data stays on this machine. No ads, no tracking, ever.
        </p>
      </form>
    </AuthLayout>
  );
}
