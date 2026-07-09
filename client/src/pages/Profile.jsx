import Icon from "../components/Icon";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button, Field, PasswordInput, Skeleton, stagger, useToast } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money, niceDate } from "../lib/format";
import { useFetch } from "../lib/hooks";

const AVATARS = ["🦊", "🦩", "🐼", "🐰", "🦉", "🐱", "🦄", "🐧", "🦋", "🐢", "🦁", "🐙"];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { data: stats, loading } = useFetch("/api/users/me/stats");
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    if (name.trim().length < 2 || name === user.name) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Name updated");
    } catch (e) {
      toast.error("Couldn't save", ` ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const badges = [];
  if (stats) {
    if (stats.txCount >= 1) badges.push({ icon: "🌱", label: "First log", got: true });
    if (stats.txCount >= 100) badges.push({ icon: "📚", label: "100 transactions", got: true });
    else badges.push({ icon: "📚", label: "100 transactions", got: false, hint: `${stats.txCount}/100` });
    badges.push({ icon: "🏆", label: "Goal achiever", got: stats.goalsCompleted > 0, hint: stats.goalsCompleted ? `×${stats.goalsCompleted}` : "complete a goal" });
    badges.push({ icon: "💰", label: "Lakh club", got: stats.totalIncome >= 100000, hint: "₹1L+ income logged" });
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Profile</h2>
          <div className="sub">You, in IshiFi.</div>
        </div>
      </div>

      <div className="grid cols-2">
        {/* identity card */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
            <motion.span
              key={user?.avatar}
              initial={{ scale: 0.5, rotate: -18 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              style={{
                width: 76, height: 76, borderRadius: 24, fontSize: 40, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: "var(--primary-soft)", border: "1px solid var(--border)",
              }}>
              {user?.avatar}
            </motion.span>
            <div>
              <b style={{ fontSize: 18 }}>{user?.name}</b>
              <div style={{ fontSize: 13.5, color: "var(--text-2)" }}>{user?.email}</div>
              <div style={{ marginTop: 6 }}>
                {user?.verified
                  ? <span className="tag" style={{ color: "var(--good)", background: "var(--good-soft)", borderColor: "transparent" }}>✓ verified</span>
                  : <span className="tag" style={{ color: "var(--warn)", background: "var(--warn-soft)", borderColor: "transparent" }}>✉️ unverified</span>}
              </div>
            </div>
          </div>

          <Field label="Pick your avatar">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {AVATARS.map((a) => (
                <motion.button key={a} whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.12, rotate: -6 }}
                  onClick={async () => { await updateProfile({ avatar: a }); toast.success(`Hello, ${a}`); }}
                  style={{
                    width: 42, height: 42, fontSize: 21, borderRadius: 13, cursor: "pointer",
                    border: `2px solid ${user?.avatar === a ? "var(--primary)" : "var(--border)"}`,
                    background: user?.avatar === a ? "var(--primary-soft)" : "var(--surface)",
                  }}>
                  {a}
                </motion.button>
              ))}
            </div>
          </Field>

          <div style={{ marginTop: 16 }}>
            <Field label="Display name">
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                <Button variant="soft" onClick={saveName} disabled={saving || name.trim() === user?.name}>
                  {saving ? "…" : "Save"}
                </Button>
              </div>
            </Field>
          </div>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* stats */}
          <motion.div className="card card-pad" variants={stagger.item}>
            <b style={{ fontSize: 15, display: "block", marginBottom: 14 }}>Your numbers</b>
            {loading ? <Skeleton h={80} /> : (
              <div className="grid cols-2" style={{ gap: 12 }}>
                {[
                  { label: "Transactions", value: stats?.txCount ?? 0 },
                  { label: "Goals achieved", value: `${stats?.goalsCompleted ?? 0}/${stats?.goalCount ?? 0}` },
                  { label: "Income logged", value: money(stats?.totalIncome) },
                  { label: "Tracking since", value: stats?.trackingSince ? niceDate(stats.trackingSince) : "—" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--surface-2)", borderRadius: 14, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div className="num" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* achievements */}
          <motion.div className="card card-pad" variants={stagger.item}>
            <b style={{ fontSize: 15, display: "block", marginBottom: 14 }}>Achievements</b>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {badges.map((b) => (
                <motion.span key={b.label} whileHover={{ y: -3 }}
                  className="tag"
                  title={b.hint || b.label}
                  style={{
                    padding: "9px 14px", fontSize: 13,
                    opacity: b.got ? 1 : 0.45,
                    background: b.got ? "var(--primary-soft)" : "var(--surface-2)",
                    borderColor: b.got ? "var(--primary)" : "var(--border)",
                  }}>
                  {b.icon} {b.label}{!b.got && b.hint ? ` · ${b.hint}` : ""}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* password */}
          <PasswordCard toast={toast} />
        </div>
      </div>
    </motion.div>
  );
}

function PasswordCard({ toast }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("Too short", " New password needs 8+ characters.");
    setBusy(true);
    try {
      await api.post("/api/users/me/password", { current, next });
      toast.success("Password changed", " Other sessions were signed out.");
      setCurrent(""); setNext("");
    } catch (err) {
      toast.error("Couldn't change password", ` ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="card card-pad" variants={stagger.item}>
      <b style={{ fontSize: 15, display: "block", marginBottom: 12 }}>Security</b>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Current password">
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password">
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="8+ characters" />
        </Field>
        <Button type="submit" variant="soft" disabled={busy || !current || !next}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </motion.div>
  );
}
