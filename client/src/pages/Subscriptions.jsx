import Icon from "../components/Icon";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, ConfirmDialog, EmptyState, Field, Modal, Skeleton, Switch, stagger, useToast } from "../components/ui";
import { api } from "../lib/api";
import { daysUntil, money, niceDate, todayISO } from "../lib/format";
import { useFetch } from "../lib/hooks";

const SUB_ICONS = ["🎬", "🎧", "☁️", "🏋️", "📦", "📰", "🎮", "📺", "🧘", "🚀", "💾", "🔁"];
const SUB_COLORS = ["#C79BFF", "#FF8FA3", "#7FB5FF", "#FFA26B", "#5BC8AF", "#FFC94D"];

export default function Subscriptions() {
  const toast = useToast();
  const { data, loading, reload } = useFetch("/api/subscriptions");
  const [modalOpen, setModalOpen] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const subs = data?.subscriptions || [];
  const active = subs.filter((s) => s.active);
  const soon = active.filter((s) => {
    const d = daysUntil(s.nextRenewal);
    return d != null && d <= 7 && d >= 0;
  });

  if (loading) {
    return <div className="grid cols-3" style={{ gap: 16 }}>{[1, 2, 3].map((i) => <Skeleton key={i} h={180} r={22} />)}</div>;
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Subscriptions</h2>
          <div className="sub">
            {active.length
              ? <>≈ <b className="num">{money(data.monthlyTotal)}</b>/month across {active.length} active</>
              : "Track the quiet monthly leaks."}
          </div>
        </div>
        <Button magnetic onClick={() => { setEditSub(null); setModalOpen(true); }}>＋ Add subscription</Button>
      </div>

      {soon.length > 0 && (
        <motion.div className="card card-pad" variants={stagger.item}
          style={{ marginBottom: 16, borderColor: "color-mix(in srgb, var(--warn) 40%, var(--border))", background: "var(--warn-soft)" }}>
          <b style={{ fontSize: 14 }}>🔔 Renewing this week</b>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
            {soon.map((s) => (
              <span key={s.id} className="tag" style={{ background: "var(--surface)" }}>
                {s.icon} {s.name} · {money(s.amount)} · {daysUntil(s.nextRenewal) === 0 ? "today" : `in ${daysUntil(s.nextRenewal)}d`}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {subs.length === 0 ? (
        <div className="card">
          <EmptyState art="🔁" title="No subscriptions tracked"
            body="Netflix, gym, cloud storage — add them and never be surprised by a renewal again."
            action={<Button onClick={() => setModalOpen(true)}>＋ Add one</Button>} />
        </div>
      ) : (
        <div className="grid cols-3">
          {subs.map((s) => {
            const d = daysUntil(s.nextRenewal);
            return (
              <motion.div key={s.id} className="card card-pad hoverable" variants={stagger.item}
                style={{ opacity: s.active ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="tx-ico" style={{ background: s.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>{s.icon}</span>
                  <span style={{ display: "flex", gap: 2 }}>
                    <button className="btn-icon" onClick={() => { setEditSub(s); setModalOpen(true); }}><Icon name="edit" size={18} /></button>
                    <button className="btn-icon" onClick={() => setConfirmDel(s)}><Icon name="delete" size={18} /></button>
                  </span>
                </div>
                <b style={{ fontSize: 15.5 }}>{s.name}</b>
                <div className="num" style={{ fontSize: 21, fontWeight: 700, margin: "3px 0" }}>
                  {money(s.amount)}<span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>/{s.cycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: d != null && d <= 7 && s.active ? "var(--warn)" : "var(--muted)" }}>
                  {s.active
                    ? d != null && d >= 0
                      ? `renews ${d === 0 ? "today" : niceDate(s.nextRenewal)}`
                      : `renewal date passed`
                    : "paused"}
                </div>
                <div style={{ marginTop: 12 }}>
                  <Switch checked={s.active} label={s.active ? "Active" : "Paused"}
                    onChange={async (v) => {
                      await api.patch(`/api/subscriptions/${s.id}`, { active: v });
                      reload();
                    }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <SubModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload}
        editSub={editSub} toast={toast} />
      <ConfirmDialog open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          await api.del(`/api/subscriptions/${confirmDel.id}`);
          toast.success("Subscription removed");
          reload();
        }}
        title={`Remove "${confirmDel?.name}"?`} body="It stops being tracked — no transactions are touched." />
    </motion.div>
  );
}

function SubModal({ open, onClose, onSaved, editSub, toast }) {
  const editing = Boolean(editSub?.id);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🔁");
  const [color, setColor] = useState(SUB_COLORS[0]);
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [nextRenewal, setNextRenewal] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editSub?.name || "");
      setIcon(editSub?.icon || "🔁");
      setColor(editSub?.color || SUB_COLORS[0]);
      setAmount(editSub?.amount ?? "");
      setCycle(editSub?.cycle || "monthly");
      setNextRenewal(editSub?.nextRenewal ? editSub.nextRenewal.slice(0, 10) : todayISO());
    }
  }, [open, editSub]);

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || !amt || amt <= 0) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(), icon, color, amount: amt, cycle,
        nextRenewal: `${nextRenewal}T12:00:00`,
      };
      if (editing) {
        await api.patch(`/api/subscriptions/${editSub.id}`, body);
        toast.success("Subscription updated");
      } else {
        await api.post("/api/subscriptions", body);
        toast.success("Subscription tracked");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Couldn't save", ` ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit subscription" : "Track a subscription"}
      subtitle="Know exactly when the money leaves.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Netflix, Gym…" autoFocus required maxLength={60} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Amount">
            <input className="input num" type="number" min="1" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="649" required />
          </Field>
          <Field label="Billing cycle">
            <select className="input" value={cycle} onChange={(e) => setCycle(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
        </div>
        <Field label="Next renewal">
          <input className="input" type="date" value={nextRenewal}
            onChange={(e) => setNextRenewal(e.target.value)} required />
        </Field>
        <Field label="Icon & color">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {SUB_ICONS.map((i) => (
              <motion.button key={i} type="button" whileTap={{ scale: 0.85 }} onClick={() => setIcon(i)}
                style={{
                  width: 36, height: 36, fontSize: 17, borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${icon === i ? "var(--primary)" : "var(--border)"}`,
                  background: icon === i ? "var(--primary-soft)" : "var(--surface)",
                }}>{i}</motion.button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {SUB_COLORS.map((c) => (
              <motion.button key={c} type="button" whileTap={{ scale: 0.85 }} onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: "50%", cursor: "pointer", background: c,
                  border: "3px solid", borderColor: color === c ? "var(--text)" : "transparent",
                }} />
            ))}
          </div>
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Track it"}</Button>
      </form>
    </Modal>
  );
}
