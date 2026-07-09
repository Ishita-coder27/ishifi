import Icon from "../components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Piggy from "../components/Piggy";
import { useFx } from "../components/effects";
import { Button, ConfirmDialog, EmptyState, Field, Modal, Progress, Skeleton, stagger, useToast } from "../components/ui";
import { api } from "../lib/api";
import { daysUntil, money } from "../lib/format";
import { useFetch } from "../lib/hooks";

const GOAL_ICONS = ["🎯", "🏖️", "📷", "🛟", "🏠", "🚗", "💍", "🎓", "🎸", "✈️", "🐕", "💻"];
const GOAL_COLORS = ["#FF6FAE", "#8D7BE8", "#FFA26B", "#5BC8AF", "#7FB5FF", "#FFC94D"];

export default function Goals() {
  const toast = useToast();
  const fx = useFx();
  const { data, loading, reload } = useFetch("/api/goals");
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [contribGoal, setContribGoal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const goals = data?.goals || [];
  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);

  if (loading) {
    return <div className="grid cols-3" style={{ gap: 16 }}>
      {[1, 2, 3].map((i) => <Skeleton key={i} h={300} r={22} />)}
    </div>;
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Savings goals</h2>
          <div className="sub">
            {active.length ? `${active.length} in flight · ${done.length} achieved, achieved` : "Every big thing starts as a small jar."}
          </div>
        </div>
        <Button magnetic onClick={() => { setEditGoal(null); setModalOpen(true); }}>＋ New goal</Button>
      </div>

      {goals.length === 0 && (
        <div className="card">
          <EmptyState art="🎯" title="No goals yet"
            body="A trip, a camera, a cushion for rainy days — name it and start filling the piggy."
            action={<Button onClick={() => setModalOpen(true)}>Dream one up</Button>} />
        </div>
      )}

      <div className="grid cols-3">
        <AnimatePresence>
          {active.map((g) => (
            <GoalCard key={g.id} goal={g}
              onContribute={() => setContribGoal(g)}
              onEdit={() => { setEditGoal(g); setModalOpen(true); }}
              onDelete={() => setConfirmDel(g)} />
          ))}
        </AnimatePresence>
      </div>

      {done.length > 0 && (
        <>
          <b style={{ fontSize: 15, display: "block", margin: "26px 0 12px" }}>Achievements, achieved</b>
          <div className="grid cols-3">
            {done.map((g) => (
              <motion.div key={g.id} className="card card-pad" variants={stagger.item}
                style={{ opacity: 0.92, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 14, right: 14, fontSize: 22 }}>🏅</div>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{g.icon}</div>
                <b>{g.name}</b>
                <div className="num" style={{ fontSize: 13, color: "var(--good)", fontWeight: 600, marginTop: 3 }}>
                  {money(g.target)} saved · complete
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  {[25, 50, 75, 100].map((m) => (
                    <span key={m} className="tag" style={{ fontSize: 10.5, padding: "2px 8px", background: "var(--good-soft)", color: "var(--good)", borderColor: "transparent" }}>
                      {m}%
                    </span>
                  ))}
                </div>
                <button className="btn-icon" style={{ position: "absolute", bottom: 10, right: 10 }}
                  onClick={() => setConfirmDel(g)}>🗑️</button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <GoalModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={reload}
        editGoal={editGoal} toast={toast} />
      <ContributeModal goal={contribGoal} onClose={() => setContribGoal(null)}
        onSaved={reload} toast={toast} fx={fx} />
      <ConfirmDialog open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          await api.del(`/api/goals/${confirmDel.id}`);
          toast.success("Goal removed");
          reload();
        }}
        title={`Delete "${confirmDel?.name}"?`} body="The saved amount record goes with it." />
    </motion.div>
  );
}

function GoalCard({ goal: g, onContribute, onEdit, onDelete }) {
  const pct = Math.min(g.saved / g.target, 1);
  const dleft = daysUntil(g.deadline);
  return (
    <motion.div layout className="card card-pad hoverable" variants={stagger.item}
      exit={{ opacity: 0, scale: 0.92 }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="tx-ico" style={{ background: g.color + "22", fontSize: 22 }}>{g.icon}</span>
        <span style={{ display: "flex", gap: 2 }}>
          <button className="btn-icon" onClick={onEdit}>✏️</button>
          <button className="btn-icon" onClick={onDelete}>🗑️</button>
        </span>
      </div>
      <div>
        <b style={{ fontSize: 16 }}>{g.name}</b>
        {dleft != null && (
          <div style={{ fontSize: 12, color: dleft < 14 ? "var(--warn)" : "var(--muted)" }}>
            {dleft > 0 ? `${dleft} days to go` : "deadline passed"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
        <Piggy size={120} fill={pct} />
      </div>

      <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
        <b>{money(g.saved)}</b>
        <span style={{ color: "var(--muted)" }}>of {money(g.target)}</span>
      </div>
      <Progress value={g.saved} max={g.target} color={g.color} height={9} />

      {/* milestone dots */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
        {[25, 50, 75, 100].map((m) => {
          const hit = g.reached?.includes(m);
          return (
            <motion.span key={m}
              animate={hit ? { scale: [1, 1.35, 1] } : {}}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: 10.5, fontWeight: 700,
                color: hit ? g.color : "var(--muted)",
                opacity: hit ? 1 : 0.55,
              }}>
              {hit ? "●" : "○"} {m}%
            </motion.span>
          );
        })}
      </div>

      <Button variant="soft" size="sm" onClick={onContribute} style={{ marginTop: 4 }}>
        🪙 Add savings
      </Button>
    </motion.div>
  );
}

function GoalModal({ open, onClose, onSaved, editGoal, toast }) {
  const editing = Boolean(editGoal?.id);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editGoal?.name || "");
      setIcon(editGoal?.icon || "🎯");
      setColor(editGoal?.color || GOAL_COLORS[0]);
      setTarget(editGoal?.target ?? "");
      setDeadline(editGoal?.deadline ? editGoal.deadline.slice(0, 10) : "");
    }
  }, [open, editGoal]);

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(target);
    if (!name.trim() || !amt || amt <= 0) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(), icon, color, target: amt,
        ...(deadline ? { deadline: `${deadline}T12:00:00` } : {}),
      };
      if (editing) {
        await api.patch(`/api/goals/${editGoal.id}`, body);
        toast.success("Goal updated");
      } else {
        await api.post("/api/goals", body);
        toast.success("Goal created", " Now feed that piggy.");
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
    <Modal open={open} onClose={onClose} title={editing ? "Edit goal" : "New savings goal"}
      subtitle="Name it, aim it, fill it.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Goal name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Goa trip, new camera…" autoFocus required maxLength={60} />
        </Field>
        <Field label="Icon">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GOAL_ICONS.map((i) => (
              <motion.button key={i} type="button" whileTap={{ scale: 0.85 }}
                onClick={() => setIcon(i)}
                style={{
                  width: 40, height: 40, fontSize: 19, borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${icon === i ? "var(--primary)" : "var(--border)"}`,
                  background: icon === i ? "var(--primary-soft)" : "var(--surface)",
                }}>
                {i}
              </motion.button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div style={{ display: "flex", gap: 8 }}>
            {GOAL_COLORS.map((c) => (
              <motion.button key={c} type="button" whileTap={{ scale: 0.85 }}
                onClick={() => setColor(c)}
                style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                  background: c, border: "3px solid",
                  borderColor: color === c ? "var(--text)" : "transparent",
                }} />
            ))}
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Target amount">
            <input className="input num" type="number" min="1" value={target}
              onChange={(e) => setTarget(e.target.value)} placeholder="25000" required />
          </Field>
          <Field label="Deadline (optional)">
            <input className="input" type="date" value={deadline}
              onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save goal" : "Create goal"}</Button>
      </form>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onSaved, toast, fx }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (goal) setAmount(""); }, [goal]);

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt) return;
    setBusy(true);
    try {
      const res = await api.post(`/api/goals/${goal.id}/contribute`, { amount: amt });
      const hitMilestones = res.newMilestones || [];
      if (hitMilestones.includes(100)) {
        fx.confetti();
        toast.success(`${goal.name} complete!, achieved`, " Goal reached — celebrate a little.");
      } else if (hitMilestones.length) {
        fx.confetti();
        toast.success(`${Math.max(...hitMilestones)}% milestone!, milestone`, ` ${goal.name} is getting closer.`);
      } else {
        toast.success("Savings added");
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
    <Modal open={Boolean(goal)} onClose={onClose}
      title={`Add to ${goal?.name || ""}`} subtitle={goal ? `${money(goal.saved)} of ${money(goal.target)} so far` : ""} width={380}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Amount (negative to withdraw)">
          <input className="input num" type="number" step="1" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="1000" autoFocus required
            style={{ fontSize: 20, fontWeight: 700 }} />
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          {[500, 1000, 2000].map((v) => (
            <button key={v} type="button" className="tag" style={{ cursor: "pointer", flex: 1, justifyContent: "center" }}
              onClick={() => setAmount(String(v))}>
              +{money(v)}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add savings 🪙"}</Button>
      </form>
    </Modal>
  );
}
