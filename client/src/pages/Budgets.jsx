import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Button, ConfirmDialog, EmptyState, Field, Modal, Progress, Skeleton, stagger, useToast } from "../components/ui";
import Icon from "../components/Icon";
import { api } from "../lib/api";
import { useCategories } from "../lib/categories";
import { money } from "../lib/format";
import { useFetch } from "../lib/hooks";

export default function Budgets() {
  const toast = useToast();
  const { data, loading, reload } = useFetch("/api/budgets");
  const { categories, info } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const budgets = data?.budgets || [];
  const overall = budgets.find((b) => b.category === "overall");
  const catBudgets = budgets.filter((b) => b.category !== "overall");
  const overCount = catBudgets.filter((b) => b.spent > b.amount).length;

  const usedSlugs = new Set(budgets.map((b) => b.category));
  const available = useMemo(
    () => categories.filter((c) => !usedSlugs.has(c.slug) && c.slug !== "salary"),
    [categories, budgets] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (loading) {
    return <div className="grid" style={{ gap: 16 }}>
      <Skeleton h={40} w={300} /><Skeleton h={140} r={22} />
      <div className="grid cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} h={110} r={22} />)}</div>
    </div>;
  }

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate">
      <div className="page-head">
        <div>
          <h2>Budgets</h2>
          <div className="sub">
            {overCount > 0
              ? `${overCount} categor${overCount > 1 ? "ies are" : "y is"} over cap this month`
              : "Everything within limits — lovely."}
          </div>
        </div>
        <Button magnetic onClick={() => { setEditBudget(null); setModalOpen(true); }}>+ New budget</Button>
      </div>

      {/* overall budget hero card */}
      {overall ? (
        <motion.div className="card card-pad hoverable" variants={stagger.item} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>
                Monthly budget · {data.month}
              </div>
              <div className="num" style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                {money(overall.spent)} <span style={{ fontSize: 17, color: "var(--muted)", fontWeight: 500 }}>of {money(overall.amount)}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-icon" onClick={() => { setEditBudget(overall); setModalOpen(true); }}><Icon name="edit" size={18} /></button>
              <button className="btn-icon" onClick={() => setConfirmDel(overall)}><Icon name="delete" size={18} /></button>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Progress value={overall.spent} max={overall.amount} height={14}
              over={overall.spent > overall.amount}
              color={overall.spent / overall.amount > 0.8 ? "var(--warn)" : "var(--primary)"} />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: overall.spent > overall.amount ? "var(--danger)" : "var(--text-2)" }}>
            {overall.spent > overall.amount
              ? `${money(overall.spent - overall.amount)} over — it happens, tomorrow's a fresh day`
              : `${money(overall.amount - overall.spent)} breathing room left`}
          </div>
        </motion.div>
      ) : (
        <motion.div className="card" variants={stagger.item} style={{ marginBottom: 16 }}>
          <EmptyState title="No monthly budget yet"
            body="Set an overall cap and IshiFi will pace you through the month."
            action={<Button onClick={() => { setEditBudget({ category: "overall" }); setModalOpen(true); }}>Set monthly budget</Button>} />
        </motion.div>
      )}

      {/* per-category budgets */}
      <div className="grid cols-2">
        {catBudgets.map((b, i) => {
          const c = info(b.category);
          const pct = b.amount ? b.spent / b.amount : 0;
          const over = b.spent > b.amount;
          return (
            <motion.div key={b.id} className="card card-pad hoverable" variants={stagger.item}
              style={over ? { borderColor: "color-mix(in srgb, var(--danger) 45%, var(--border))" } : {}}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span className="tx-ico" style={{ background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14.5 }}>{c.name}</b>
                  <div className="num" style={{ fontSize: 12.5, color: over ? "var(--danger)" : "var(--text-2)" }}>
                    {money(b.spent)} / {money(b.amount)}{over && " · over cap"}
                  </div>
                </div>
                <button className="btn-icon" onClick={() => { setEditBudget(b); setModalOpen(true); }}><Icon name="edit" size={18} /></button>
                <button className="btn-icon" onClick={() => setConfirmDel(b)}><Icon name="delete" size={18} /></button>
              </div>
              <Progress value={b.spent} max={b.amount} color={c.color} over={over} height={10} />
              <div style={{ marginTop: 7, fontSize: 12, color: "var(--muted)" }}>
                {over ? `${Math.round(pct * 100)}% used` : `${Math.round((1 - pct) * 100)}% remaining`}
              </div>
            </motion.div>
          );
        })}
      </div>

      {catBudgets.length === 0 && overall && (
        <div className="card" style={{ marginTop: 4 }}>
          <EmptyState title="No category caps yet"
            body="Add caps for food, travel, shopping… the bars will glow red if you cross them."
            action={<Button variant="soft" onClick={() => { setEditBudget(null); setModalOpen(true); }}>+ Add a category cap</Button>} />
        </div>
      )}

      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { reload(); }}
        editBudget={editBudget}
        available={available}
        info={info}
        toast={toast}
        hasOverall={Boolean(overall)}
      />
      <ConfirmDialog
        open={Boolean(confirmDel)}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          await api.del(`/api/budgets/${confirmDel.id}`);
          toast.success("Budget removed");
          reload();
        }}
        title={`Remove ${confirmDel?.category === "overall" ? "monthly budget" : "this cap"}?`}
        body="Transactions stay — only the cap goes away."
        confirmLabel="Remove"
      />
    </motion.div>
  );
}

function BudgetModal({ open, onClose, onSaved, editBudget, available, info, toast, hasOverall }) {
  const editing = Boolean(editBudget?.id);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  // reset when opened
  useMemo(() => {
    if (open) {
      setCategory(editBudget?.category || (hasOverall ? "" : "overall"));
      setAmount(editBudget?.amount ?? "");
    }
  }, [open, editBudget]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!category || !amt || amt <= 0) return;
    setBusy(true);
    try {
      await api.put("/api/budgets", { category, amount: amt });
      toast.success(editing ? "Budget updated" : "Budget set");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Couldn't save", ` ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}
      title={editing ? "Edit budget" : "New budget"}
      subtitle="Soft caps, gentle nudges — no guilt.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Scope">
          {editing ? (
            <div className="tag" style={{ alignSelf: "flex-start", fontSize: 13.5, padding: "8px 14px" }}>
              {category === "overall" ? "Whole month" : `${info(category).icon} ${info(category).name}`}
            </div>
          ) : (
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="" disabled>Choose scope…</option>
              {!hasOverall && <option value="overall">Whole month (overall)</option>}
              {available.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="Cap amount">
          <input className="input num" type="number" min="1" step="1" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 9000" autoFocus
            style={{ fontSize: 19, fontWeight: 700 }} required />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save cap" : "Set cap"}</Button>
      </form>
    </Modal>
  );
}
