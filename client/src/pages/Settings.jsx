import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ConfirmDialog, Field, Switch, stagger, useToast } from "../components/ui";
import Icon from "../components/Icon";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { setCurrency } from "../lib/format";
import { useTheme } from "../lib/theme";

const CURRENCIES = [
  { sym: "₹", name: "Indian Rupee" },
  { sym: "$", name: "US Dollar" },
  { sym: "€", name: "Euro" },
  { sym: "£", name: "British Pound" },
  { sym: "¥", name: "Yen" },
];
const LANGS = [
  { id: "en", name: "English" },
  { id: "hi", name: "हिन्दी (coming soon)", disabled: true },
];
const NOTIF_LABELS = {
  budgetAlerts: ["Budget alerts", "when a category crosses its cap"],
  weeklyDigest: ["Weekly digest", "a Sunday summary of your week"],
  goalMilestones: ["Goal milestones", "confetti-worthy moments"],
  renewalReminders: ["Renewal reminders", "before subscriptions bill you"],
};

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme, THEMES } = useTheme();
  const toast = useToast();
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const beforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);

    // Check if already installed
    window.matchMedia("(display-mode: standalone)").matches && setIsInstalled(true);

    return () => window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
  }, []);

  const pickTheme = (id, e) => {
    setTheme(id, { x: e.clientX, y: e.clientY });
    updateProfile({ theme: id }).catch(() => {});
  };

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      toast.success("App installed! 📱", " Look for IshiFi on your home screen.");
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const exportData = async () => {
    try {
      const data = await api.get("/api/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `aurum-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported", ` ${data.transactions.length} transactions in the file.`);
    } catch (e) {
      toast.error("Export failed", ` ${e.message}`);
    }
  };

  const importData = async (file) => {
    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const txns = (json.transactions || []).map((t) => ({
        type: t.type, amount: t.amount, category: t.category,
        note: t.note || "", date: t.date,
      }));
      if (!txns.length) throw new Error("No transactions found in that file");
      const res = await api.post("/api/users/me/import", { transactions: txns });
      toast.success(`Imported ${res.imported} transactions 📥`);
    } catch (e) {
      toast.error("Import failed", ` ${e.message}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <div className="sub">Tune IshiFi until it feels like yours.</div>
        </div>
      </div>

      {/* INSTALL APP */}
      {(isInstallable || isInstalled) && (
        <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16, borderColor: isInstallable ? "var(--primary)" : "var(--border)", background: isInstallable ? "var(--primary-soft)" : "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, marginBottom: isInstalled ? 0 : 12 }}>
            <Icon name="phone" size={20} />
            App installation
          </div>
          {isInstalled ? (
            <div style={{ fontSize: 12.5, color: "var(--good)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={16} /> IshiFi is installed on this device. Works offline!
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12, marginTop: 6 }}>
                Install IshiFi on your home screen for quick access and offline use.
              </div>
              <Button onClick={installApp} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <Icon name="download" size={16} />
                Install app
              </Button>
            </>
          )}
        </motion.div>
      )}

      {/* THEME */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
        <b style={{ fontSize: 15 }}>Theme</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>
          switches instantly, remembered on this device
        </div>
        <div className="grid cols-3">
          {THEMES.map((t) => (
            <motion.button key={t.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
              onClick={(e) => pickTheme(t.id, e)}
              style={{
                textAlign: "left", cursor: "pointer", borderRadius: 18, padding: 14,
                border: `2px solid ${theme === t.id ? "var(--primary)" : "var(--border)"}`,
                background: theme === t.id ? "var(--primary-soft)" : "var(--surface)",
                transition: "border-color 0.25s, background 0.25s",
              }}>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {t.swatch.map((c) => (
                  <span key={c} style={{
                    width: 22, height: 22, borderRadius: "50%", background: c,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }} />
                ))}
              </div>
              <b style={{ fontSize: 13.5 }}>{t.name}</b>
              {theme === t.id && <div style={{ fontSize: 11.5, color: "var(--primary-2)", fontWeight: 600 }}>active</div>}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* locale */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, display: "block", marginBottom: 14 }}>Currency & language</b>
          <Field label="Currency">
            <select className="input" value={user?.currency || "₹"}
              onChange={async (e) => {
                setCurrency(e.target.value);
                await updateProfile({ currency: e.target.value });
                toast.success("Currency updated", ` Showing amounts in ${e.target.value}`);
              }}>
              {CURRENCIES.map((c) => <option key={c.sym} value={c.sym}>{c.sym} — {c.name}</option>)}
            </select>
          </Field>
          <div style={{ height: 12 }} />
          <Field label="Language">
            <select className="input" value={user?.language || "en"}
              onChange={async (e) => { await updateProfile({ language: e.target.value }); }}>
              {LANGS.map((l) => <option key={l.id} value={l.id} disabled={l.disabled}>{l.name}</option>)}
            </select>
          </Field>
        </motion.div>

        {/* notifications */}
        <motion.div className="card card-pad" variants={stagger.item}>
          <b style={{ fontSize: 15, display: "block", marginBottom: 14 }}>Notifications</b>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(NOTIF_LABELS).map(([key, [label, hint]]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</div>
                </div>
                <Switch checked={user?.notifications?.[key] ?? true}
                  onChange={async (v) => {
                    await updateProfile({ notifications: { [key]: v } });
                  }} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* data */}
      <motion.div className="card card-pad" variants={stagger.item} style={{ marginBottom: 16 }}>
        <b style={{ fontSize: 15 }}>Your data</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
          everything lives in a local SQLite file — take it anywhere
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="soft" onClick={exportData} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="upload" size={16} />
            Export JSON
          </Button>
          <Button variant="soft" disabled={importing} onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="download" size={16} />
            {importing ? "Importing…" : "Import JSON"}
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <span className="tag" style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="backup" size={14} />
            backup = the exported file
          </span>
        </div>
      </motion.div>

      {/* danger zone */}
      <motion.div className="card card-pad" variants={stagger.item}
        style={{ borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))" }}>
        <b style={{ fontSize: 15, color: "var(--danger)" }}>Danger zone</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 14px" }}>
          deletes your account and every transaction, goal, and budget — forever
        </div>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete my account</Button>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await api.del("/api/users/me");
          await logout();
          toast.info("Account deleted", " Take care 🌷");
          nav("/", { replace: true });
        }}
        title="Delete your account?"
        body="This wipes everything permanently. Export your data first if you might want it later."
        confirmLabel="Yes, delete everything"
      />
    </motion.div>
  );
}
