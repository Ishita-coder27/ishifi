import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function Verify() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, adopt } = useAuth();
  const [state, setState] = useState(token ? "working" : "missing");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await api.post("/api/auth/verify", { token });
        setState("done");
        if (user) adopt({ ...user, verified: true });
      } catch {
        setState("failed");
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const content = {
    working: { art: "⏳", title: "Verifying…", body: "One moment while we confirm your email." },
    done: { art: "🎉", title: "Email verified!", body: "Your account is fully unlocked. Welcome to IshiFi." },
    failed: { art: "🥀", title: "Link expired", body: "This verification link is invalid or already used." },
    missing: { art: "🤔", title: "No token found", body: "Open the verification link from your email." },
  }[state];

  return (
    <AuthLayout quote="One tiny step for security.">
      <motion.div key={state} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{content.art}</div>
        <h2>{content.title}</h2>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 22px" }}>{content.body}</p>
        <Link className="btn btn-primary" to={user ? "/app" : "/login"}>
          {user ? "Go to dashboard" : "Sign in"}
        </Link>
      </motion.div>
    </AuthLayout>
  );
}
